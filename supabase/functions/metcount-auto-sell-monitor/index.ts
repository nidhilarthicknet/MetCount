import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const url = Deno.env.get('SUPABASE_URL')!
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const secretKey = secretKeys.default
if (!secretKey) throw new Error('Supabase server key is not configured')
const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })

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
async function fetchQuote(ticker: string) {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?range=1d&interval=5m&includePrePost=false&events=div%2Csplits'
  const r = await fetch(url, { headers: { 'User-Agent': 'Metxon/1.0 AutoSellMonitor' } })
  if (!r.ok) throw new Error('Quote request failed (' + r.status + ')')
  const j = await r.json()
  const x = j?.chart?.result?.[0]
  if (!x) throw new Error(j?.chart?.error?.description || 'No quote for ticker')
  const meta = x.meta || {}
  const quote = x?.indicators?.quote?.[0] || {}
  const closes = (quote.close || []).map(num).filter((v: number | null): v is number => v !== null)
  const currentPrice = num(meta.regularMarketPrice) ?? closes.at(-1)
  if (currentPrice === null || currentPrice === undefined || currentPrice <= 0) throw new Error('No current price')
  const previousClose = num(meta.chartPreviousClose) ?? num(meta.previousClose) ?? closes.at(-2) ?? currentPrice
  const highs = (quote.high || []).map(num).filter((v: number | null): v is number => v !== null)
  const lows = (quote.low || []).map(num).filter((v: number | null): v is number => v !== null)
  const asOf = new Date().toISOString()
  return {
    ticker,
    asOf,
    payload: {
      ticker,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || null,
      marketState: meta.marketState || null,
      currentPrice,
      previousClose,
      todayChangePct: previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
      dayHigh: num(meta.regularMarketDayHigh) ?? Math.max(...highs.slice(-1), currentPrice),
      dayLow: num(meta.regularMarketDayLow) ?? Math.min(...lows.slice(-1), currentPrice),
      asOf,
      quoteSource: 'Scheduled MetCount auto-sell refresh',
    },
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
  try {
    const token = req.headers.get('x-cron-secret') || ''
    const verified = await admin.rpc('metcount_verify_auto_sell_cron', { p_secret: token })
    if (verified.error || verified.data !== true) return json({ error: 'Not authorized' }, 401)

    const { data: pending, error: pendingError } = await admin
      .from('metcount_auto_sell_orders')
      .select('ticker')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100)
    if (pendingError) throw pendingError
    const tickers = [...new Set((pending || []).map((o: { ticker: string }) => cleanTicker(o.ticker)))]
    if (!tickers.length) return json({ ok: true, tickers_checked: 0, snapshots_saved: 0 })

    let saved = 0
    const errors: string[] = []
    for (const ticker of tickers) {
      try {
        const quote = await fetchQuote(ticker)
        const { error } = await admin.from('market_snapshots').insert({
          ticker: quote.ticker,
          as_of: quote.asOf,
          payload: quote.payload,
        })
        if (error) throw error
        saved += 1
      } catch (e) {
        errors.push(ticker + ': ' + (e instanceof Error ? e.message : 'Quote refresh failed'))
      }
    }
    return json({ ok: true, tickers_checked: tickers.length, snapshots_saved: saved, errors })
  } catch (e) {
    console.error('MetCount auto-sell monitor error:', e)
    return json({ error: 'Scheduled auto-sell refresh failed' }, 500)
  }
})
