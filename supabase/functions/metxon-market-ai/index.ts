import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const PUBLISHABLE_KEYS = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}')
const SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const PUBLISHABLE_KEY = PUBLISHABLE_KEYS.default
const SECRET_KEY = SECRET_KEYS.default
const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function cleanTicker(v: unknown) {
  const t = String(v ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9.^=-]{1,20}$/.test(t)) throw new Error('Invalid ticker')
  return t
}

async function yahooChart(symbol: string, range: string, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false&events=div%2Csplits`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Metxon/1.0' } })
  if (!r.ok) throw new Error(`Market data provider returned HTTP ${r.status}`)
  const j = await r.json()
  const result = j?.chart?.result?.[0]
  const error = j?.chart?.error
  if (!result) throw new Error(error?.description || 'No market data found for this ticker')
  return result
}

function closes(result: any): number[] {
  const values = result?.indicators?.quote?.[0]?.close || []
  return values.map(num).filter((x: number | null): x is number => x !== null)
}

function pct(current: number, base: number) {
  return base ? ((current - base) / base) * 100 : 0
}

async function tryOpenAI(data: any) {
  const key = Deno.env.get('OPENAI_API_KEY')?.trim()
  if (!key) return { text: null, provider: 'METXON_RULES_ENGINE', reason: 'OPENAI_API_KEY is not configured' }

  const prompt = `You are MET AI, the stock-analysis assistant inside Metxon. Use ONLY the supplied market snapshot. Do not invent facts. Do not give personalized financial advice and do not say buy or sell. Write a concise 2-paragraph summary followed by exactly 4 short bullet insights. Mention that market data may be delayed and that this is informational analysis only.\n\nMARKET SNAPSHOT:\n${JSON.stringify(data)}`
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-5.6', input: prompt })
    })
    const text = await r.text()
    if (!r.ok) {
      let detail = ''
      try { detail = JSON.parse(text)?.error?.message || '' } catch (_) {}
      return { text: null, provider: 'METXON_RULES_ENGINE', reason: `OpenAI HTTP ${r.status}${detail ? `: ${detail}` : ''}` }
    }
    const j = JSON.parse(text)
    return { text: j?.output_text || null, provider: 'OpenAI', reason: j?.output_text ? null : 'OpenAI returned no output_text' }
  } catch (e) {
    return { text: null, provider: 'METXON_RULES_ENGINE', reason: e instanceof Error ? e.message : 'OpenAI request failed' }
  }
}

function rulesSummary(p: any) {
  const direction = p.trend === 'Positive' ? 'positive' : p.trend === 'Negative' ? 'negative' : 'mostly sideways'
  const today = p.todayChangePct >= 0 ? `up ${p.todayChangePct.toFixed(2)}%` : `down ${Math.abs(p.todayChangePct).toFixed(2)}%`
  return `MET AI market summary for ${p.ticker}: the latest available market snapshot shows ${direction} one-month momentum. The current price is ${p.currentPrice.toFixed(2)} ${p.currency}, and today's session is ${today} versus the previous close. The intraday range is ${p.dayLow.toFixed(2)}–${p.dayHigh.toFixed(2)} ${p.currency}, while the one-month observed range is ${p.oneMonthLow.toFixed(2)}–${p.oneMonthHigh.toFixed(2)}.\n\nThis analysis is based on the supplied market snapshot and is intended for information only; it is not personalized financial advice. Market data can be delayed.\n\n• Trend: ${p.trend}\n• 1-month change: ${p.oneMonthChangePct >= 0 ? '+' : ''}${p.oneMonthChangePct.toFixed(2)}%\n• Today's move: ${p.todayChangePct >= 0 ? '+' : ''}${p.todayChangePct.toFixed(2)}%\n• Market state: ${p.marketState || 'Not reported'}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return json({ error: 'Authentication required' }, 401)

    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401)

    const body = await req.json()
    const ticker = cleanTicker(body.ticker)
    const profileId = userData.user.id
    const { data: profile, error: profileError } = await admin.from('profiles').select('subscription_tier,subscription_until').eq('id', profileId).maybeSingle()
    if (profileError || !profile) return json({ error: 'Metxon profile not found' }, 404)
    const eliteUntil = profile.subscription_until ? new Date(profile.subscription_until).getTime() : 0
    const eliteIsActive = profile.subscription_tier === 'Elite' && Number.isFinite(eliteUntil) && eliteUntil > Date.now()
    if (!eliteIsActive) return json({ error: 'MET AI stock analysis requires an active Elite subscription' }, 403)

    let intraday: any, daily: any
    try {
      intraday = await yahooChart(ticker, '1d', '5m')
      daily = await yahooChart(ticker, '1mo', '1d')
    } catch (marketError) {
      return json({ error: marketError instanceof Error ? marketError.message : 'Market data request failed' }, 200)
    }

    const intradayMeta = intraday?.meta || {}
    const dailyMeta = daily?.meta || {}
    const intradayCloses = closes(intraday)
    const dailyCloses = closes(daily)
    const current = num(intradayMeta.regularMarketPrice) ?? intradayCloses.at(-1) ?? dailyCloses.at(-1)
    const prev = num(intradayMeta.chartPreviousClose) ?? num(intradayMeta.previousClose) ?? intradayCloses.at(0)
    if (current == null || prev == null) return json({ error: 'Market price unavailable for this ticker' }, 200)

    const highValues = (intraday?.indicators?.quote?.[0]?.high || []).map(num).filter((x: number | null): x is number => x !== null)
    const lowValues = (intraday?.indicators?.quote?.[0]?.low || []).map(num).filter((x: number | null): x is number => x !== null)
    const volumes = (intraday?.indicators?.quote?.[0]?.volume || []).map(num).filter((x: number | null): x is number => x !== null)
    const dayHigh = Math.max(...highValues, current)
    const dayLow = Math.min(...lowValues, current)
    const dayVolume = volumes.reduce((a: number, b: number) => a + b, 0)
    const monthStart = dailyCloses[0] ?? current
    const todayChangePct = pct(current, prev)
    const monthChangePct = pct(current, monthStart)
    const monthHigh = Math.max(...dailyCloses, current)
    const monthLow = Math.min(...dailyCloses, current)
    let trend = 'Sideways'
    if (monthChangePct > 3) trend = 'Positive'
    else if (monthChangePct < -3) trend = 'Negative'

    const payload = {
      ticker,
      currency: intradayMeta.currency || dailyMeta.currency || 'USD',
      exchange: intradayMeta.exchangeName || dailyMeta.exchangeName || null,
      marketState: intradayMeta.marketState || null,
      currentPrice: current,
      previousClose: prev,
      todayChangePct,
      dayHigh,
      dayLow,
      dayVolume,
      oneMonthChangePct: monthChangePct,
      oneMonthHigh: monthHigh,
      oneMonthLow: monthLow,
      trend,
      asOf: new Date().toISOString(),
    }

    const ai = await tryOpenAI(payload)
    const summary = ai.text || rulesSummary(payload)

    const { error: insertError } = await admin.from('market_snapshots').insert({
      ticker,
      as_of: payload.asOf,
      payload: { ...payload, ai_summary: summary, ai_provider: ai.provider, ai_fallback_reason: ai.reason }
    })
    if (insertError) console.warn('market_snapshots insert failed:', insertError.message)

    return json({
      ok: true,
      ticker,
      market: payload,
      summary,
      aiPowered: Boolean(ai.text),
      source: 'Yahoo Finance chart data',
      aiProvider: ai.provider,
      fallbackReason: ai.reason,
      disclaimer: 'Market data may be delayed. This is informational analysis, not financial advice.'
    }, 200)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 200)
  }
})
