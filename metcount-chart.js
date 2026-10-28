const graphRangeLabels={'1d':'1 day','5d':'5 day','1mo':'1 month','1y':'1 year','5y':'5 year','max':'Max'};
function renderGraphTickerOptions(holdings){const sel=$('graphTicker');const previous=sel.value;const list=(holdings||[]).filter(h=>Number(h.shares)>0);autoSellHoldingMap={};list.forEach(h=>autoSellHoldingMap[h.ticker]=Number(h.shares));sel.innerHTML='<option value="">Select a stock holding</option>'+list.map(h=>'<option value="'+esc(h.ticker)+'">'+esc(h.ticker)+' · '+esc(h.shares)+' share(s)</option>').join('');if(list.some(h=>h.ticker===previous))sel.value=previous;else if(list.length)sel.value=list[0].ticker;else sel.value='';}
async function setGraphRange(range){if(!subscriptionIsElite()){setEliteUI();return;}if(!graphRangeLabels[range])return;graphRange=range;document.querySelectorAll('[data-graph-range]').forEach(b=>b.classList.toggle('active',b.dataset.graphRange===range));if($('graphTicker').value)await drawEliteGraph($('graphTicker').value);}
$('graphTicker').addEventListener('change',()=>{if(subscriptionIsElite())drawEliteGraph($('graphTicker').value);});
function prepareGraphCanvas(cv){
 const dpr=Math.max(1,window.devicePixelRatio||1);
 const rect=cv.getBoundingClientRect();
 const w=Math.max(320,Math.floor(rect.width||cv.parentElement?.clientWidth||320));
 const h=Math.max(210,Math.floor(rect.height||240));
 const bw=Math.round(w*dpr),bh=Math.round(h*dpr);
 if(cv.width!==bw)cv.width=bw;
 if(cv.height!==bh)cv.height=bh;
 const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
 return {ctx,w,h};
}
function paintEmptyGraph(message){
 const cv=$('eliteGraph'),size=prepareGraphCanvas(cv);
 size.ctx.clearRect(0,0,size.w,size.h);graphPoints=[];
 $('graphLatestValue').textContent='—';$('graphHover').classList.add('hidden');$('graphStatus').textContent=message;
}
async function drawEliteGraph(t){
 if(!subscriptionIsElite())return;
 if(!t){paintEmptyGraph('Buy a stock first. Your portfolio holdings appear in the selector above.');return;}
 const cv=$('eliteGraph');
 $('graphStatus').textContent='Loading '+graphRangeLabels[graphRange]+' history for '+t+'…';
 try{
  const m=await marketQuote(t,graphRange),currency=m.currency||'USD';
  let pts=(m.history||[]).map(p=>({at:p.at,priceInr:priceToInr(Number(p.price),currency,m.inrRate)}))
   .filter(p=>Number.isFinite(p.priceInr)&&p.priceInr>0&&Number.isFinite(Date.parse(p.at)))
   .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  if(!pts.length){
   const r=await sb.from('stock_observations').select('price,observed_at,ticker').eq('user_id',profile.id).eq('ticker',t).order('observed_at',{ascending:true}).limit(1200);
   if(!r.error)pts=(r.data||[]).map(p=>({at:p.observed_at,priceInr:Number(p.price)})).filter(p=>Number.isFinite(p.priceInr)&&p.priceInr>0);
  }
  const cutoffs={'1d':86400000,'5d':5*86400000,'1mo':31*86400000,'1y':366*86400000,'5y':5*366*86400000};
  if(graphRange!=='max'&&cutoffs[graphRange])pts=pts.filter(p=>Date.parse(p.at)>=Date.now()-cutoffs[graphRange]);
  if(!pts.length){paintEmptyGraph('No quote history is available for '+t+' in '+graphRangeLabels[graphRange]+'. Try Max or refresh this holding.');return;}
  const size=prepareGraphCanvas(cv),ctx=size.ctx,w=size.w,h=size.h;
  const left=108,right=16,top=18,bottom=42,plotW=Math.max(40,w-left-right),plotH=Math.max(40,h-top-bottom);
  const values=pts.map(p=>p.priceInr),min=Math.min(...values),max=Math.max(...values),span=max-min||Math.max(1,max*.02);
  const lo=Math.max(0,min-span*.08),hi=max+span*.08,range=hi-lo||1;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#081321';ctx.fillRect(0,0,w,h);
  ctx.font='13px system-ui, sans-serif';ctx.textBaseline='middle';ctx.lineWidth=1;ctx.strokeStyle='#29435f';ctx.fillStyle='#c0d3eb';
  for(let i=0;i<=4;i++){
   const y=top+plotH*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
   ctx.textAlign='left';ctx.fillText(fmt(hi-(hi-lo)*i/4),5,y);
  }
  ctx.textBaseline='alphabetic';ctx.font='12px system-ui, sans-serif';ctx.fillStyle='#bfd1e7';
  for(let i=0;i<=4;i++){
   const x=left+plotW*i/4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();
   const idx=Math.min(pts.length-1,Math.round((pts.length-1)*i/4)),d=new Date(pts[idx].at);
   const label=graphRange==='1d'||graphRange==='5d'?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',year:graphRange==='1mo'?undefined:'2-digit'});
   ctx.textAlign=i===0?'left':i===4?'right':'center';ctx.fillText(label,x,h-12);
  }
  const coords=pts.map((p,i)=>({x:left+plotW*(pts.length===1?.5:i/(pts.length-1)),y:top+plotH*(hi-p.priceInr)/range,priceInr:p.priceInr,at:p.at,ticker:t}));
  ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.lineWidth=2.5;ctx.strokeStyle='#48d7f4';ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  if(coords.length>1){
   const area=ctx.createLinearGradient(0,top,0,top+plotH);area.addColorStop(0,'rgba(56,217,245,.20)');area.addColorStop(1,'rgba(56,217,245,0)');
   ctx.lineTo(coords[coords.length-1].x,top+plotH);ctx.lineTo(coords[0].x,top+plotH);ctx.closePath();ctx.fillStyle=area;ctx.fill();
  }
  const last=coords[coords.length-1];ctx.beginPath();ctx.arc(last.x,last.y,4,0,Math.PI*2);ctx.fillStyle='#d7f9ff';ctx.fill();
  graphPoints=coords;$('graphTickerLabel').textContent=(m.companyName||t)+' ('+t+') · '+graphRangeLabels[graphRange];
  $('graphLatestValue').textContent=fmt(last.priceInr);
  $('graphStatus').textContent='Showing '+pts.length+' historical prices. Axis labels and hover values use your selected currency. Click a point to configure a simulated auto-sell target; sales use the current server quote.';
 }catch(err){paintEmptyGraph('Could not load chart history: '+(err.message||'market data unavailable'));}
}

let selectedAutoSellTargetInr=null,graphEventsBound=false;
function bindGraphEvents(){if(graphEventsBound)return;graphEventsBound=true;const cv=$('eliteGraph');function closest(e){const r=cv.getBoundingClientRect(),x=(e.clientX-r.left),y=(e.clientY-r.top);let best=null,d=Infinity;for(const p of graphPoints){const n=Math.hypot(p.x-x,p.y-y);if(n<d){d=n;best=p;}}return d<44?best:null;}cv.addEventListener('mousemove',e=>{const p=closest(e),tip=$('graphHover');if(!p){tip.classList.add('hidden');return;}tip.textContent=new Date(p.at).toLocaleString()+' · '+fmt(p.priceInr)+' per share';tip.classList.remove('hidden');});cv.addEventListener('mouseleave',()=>$('graphHover').classList.add('hidden'));cv.addEventListener('click',e=>{const p=closest(e);if(p&&subscriptionIsElite())openAutoSellDialog(p);});$('autoSellStock').addEventListener('change',syncAutoSellShareLimit);$('closeAutoSellDialog').addEventListener('click',()=>$('autoSellDialog').classList.add('hidden'));$('autoSellForm').addEventListener('submit',submitAutoSellRule);}
async function openAutoSellDialog(point){if(!subscriptionIsElite())return;const r=await sb.from('portfolio_holdings').select('ticker,shares').eq('user_id',profile.id).gt('shares',0).order('ticker');if(r.error){setStatus('graphStatus','Could not load holdings for your sell rule.','error');return;}const holdings=r.data||[];if(!holdings.length){setStatus('graphStatus','You must own a stock before configuring auto-sell.','error');return;}autoSellHoldingMap={};holdings.forEach(h=>autoSellHoldingMap[h.ticker]=Number(h.shares));$('autoSellStock').innerHTML='<option value="">Choose a stock you own…</option>'+holdings.map(h=>'<option value="'+esc(h.ticker)+'">'+esc(h.ticker)+' · '+esc(h.shares)+' share(s)</option>').join('');$('autoSellStock').value='';selectedAutoSellTargetInr=Number(point.priceInr);$('autoSellTargetCaption').textContent='The clicked line value is '+fmt(selectedAutoSellTargetInr)+' per share · '+new Date(point.at).toLocaleString()+' · '+point.ticker+'. Do you want to use it as an auto-sell target?';$('autoSellShares').value='1';$('autoSellCondition').value='';$('autoSellStatus').textContent='';syncAutoSellShareLimit();$('autoSellDialog').classList.remove('hidden');}
function syncAutoSellShareLimit(){const max=autoSellHoldingMap[$('autoSellStock').value]||1;$('autoSellShares').max=String(max);if(Number($('autoSellShares').value)>max)$('autoSellShares').value=String(max);}
async function submitAutoSellRule(e){e.preventDefault();if(!subscriptionIsElite()){setStatus('autoSellStatus','An active Elite subscription is required.','error');return;}const ticker=$('autoSellStock').value,shares=Number($('autoSellShares').value),condition=$('autoSellCondition').value;if(!selectedAutoSellTargetInr||!ticker||!Number.isInteger(shares)||shares<1||!condition)return setStatus('autoSellStatus','Select a stock, whole-share quantity and trigger condition.','error');if(shares>(autoSellHoldingMap[ticker]||0))return setStatus('autoSellStatus','You do not own that many shares.','error');try{await rpc('metcount_create_auto_sell_order',{p_ticker:ticker,p_target_price_inr:selectedAutoSellTargetInr,p_condition:condition,p_shares:shares,p_vault_password:vaultPassword,p_extra_pin:extraPin||null});$('autoSellDialog').classList.add('hidden');setStatus('graphStatus','Rule saved. A sale is simulated only when a fresh server quote reaches your condition and Elite is still active.','success');await loadAutoSellOrders();}catch(err){setStatus('autoSellStatus',err.message||'Could not save the simulated sell rule.','error');}}
async function loadAutoSellOrders(){const root=$('autoSellOrders');if(!root||!profile)return;const r=await sb.from('metcount_auto_sell_orders').select('id,ticker,target_price_inr,condition,shares_to_sell,status,created_at,triggered_at,executed_price_inr,proceeds_jp').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(30);if(r.error){root.innerHTML='<div class="muted">Rules unavailable: '+esc(r.error.message)+'</div>';return;}const rows=r.data||[];if(!rows.length){root.innerHTML='<div class="muted">No rules yet. Click a point on the line to configure one.</div>';return;}root.innerHTML=rows.map(o=>{const cond=o.condition==='at_or_above'?'at or above':'at or below',status=o.status==='pending'?'Pending':o.status==='triggered'?'Simulated sale completed':o.status==='cancelled'?'Cancelled':o.status==='expired'?'Elite expired':'Not enough shares';const detail=o.status==='triggered'?'sold at '+esc(fmt(o.executed_price_inr))+' per share · proceeds '+esc(fmtJp(o.proceeds_jp))+' · '+esc(fmtDate(o.triggered_at)):'target '+esc(fmt(o.target_price_inr))+' per share · '+cond+' · '+esc(o.shares_to_sell)+' share(s)';return '<div class="list-item"><div class="split"><strong>'+esc(o.ticker)+' · '+detail+'</strong><span class="pill '+(o.status==='pending'?'purple':o.status==='triggered'?'green':'')+'">'+status+'</span></div><small>Created '+esc(fmtDate(o.created_at))+'</small>'+(o.status==='pending'&&subscriptionIsElite()?'<div style="margin-top:9px"><button class="btn ghost" data-cancel-auto="'+esc(o.id)+'">Cancel rule</button></div>':'')+'</div>';}).join('');root.querySelectorAll('[data-cancel-auto]').forEach(b=>b.addEventListener('click',async()=>{if(!(await confirmAction('Cancel simulated sell rule','The rule will no longer sell shares.')))return;try{await rpc('metcount_cancel_auto_sell_order',{p_order_id:b.dataset.cancelAuto,p_vault_password:vaultPassword,p_extra_pin:extraPin||null});await loadAutoSellOrders();}catch(err){alert(err.message||'Could not cancel the rule.');}}));}
async function monitorAutoSellOrders(){if(!unlocked||document.hidden||!subscriptionIsElite()||autoSellMonitorBusy)return;autoSellMonitorBusy=true;try{const r=await sb.from('metcount_auto_sell_orders').select('ticker').eq('user_id',profile.id).eq('status','pending').limit(20);if(!r.error){const tickers=[...new Set((r.data||[]).map(x=>x.ticker))];for(const t of tickers){if(!unlocked||!subscriptionIsElite())break;try{await marketQuote(t,'1d');}catch(err){console.warn('Quote refresh failed for '+t,err.message);}}await loadAutoSellOrders();await refreshAll();await loadPortfolio();}}catch(err){console.warn('Sell-rule monitor failed',err.message);}finally{autoSellMonitorBusy=false;}}
const metcountOriginalLoadPortfolio=loadPortfolio;
loadPortfolio=async function(){await metcountOriginalLoadPortfolio();const r=await sb.from('portfolio_holdings').select('ticker,shares').eq('user_id',profile.id).gt('shares',0).order('ticker');if(!r.error)renderGraphTickerOptions(r.data||[]);};
const metcountOriginalSetEliteUI=setEliteUI;
setEliteUI=function(){metcountOriginalSetEliteUI();const elite=subscriptionIsElite();let locked=$('eliteChartLocked');if(!locked){locked=document.createElement('div');locked.id='eliteChartLocked';locked.className='card hidden';locked.style.cssText='filter:grayscale(1);opacity:.7';locked.innerHTML='<span class="pill">ELITE FEATURE LOCKED</span><h3 style="margin-top:12px">Portfolio graph & simulated auto-sell</h3><p>Your Elite subscription has expired. Graph controls and automation are disabled until Elite is active again.</p><button class="btn" type="button" id="eliteRenewBtn">View subscriptions</button>';const graph=$('elitePortfolioExtras');graph.parentNode.insertBefore(locked,graph);$('eliteRenewBtn').addEventListener('click',()=>showPage('subscriptions'));}locked.classList.toggle('hidden',elite);};
const metcountOriginalShowPage=showPage;
showPage=async function(page){await metcountOriginalShowPage(page);if(page==='metrade'){setEliteUI();await loadAutoSellOrders();if(subscriptionIsElite()&&$('graphTicker').value)await drawEliteGraph($('graphTicker').value);}};
bindGraphEvents();
document.querySelectorAll('[data-graph-range]').forEach(b=>b.classList.toggle('active',b.dataset.graphRange===graphRange));
setInterval(()=>{if(unlocked&&!subscriptionIsElite())setEliteUI();monitorAutoSellOrders();},60000);

window.addEventListener('resize',()=>{if(unlocked&&subscriptionIsElite()&&$('graphTicker')?.value)drawEliteGraph($('graphTicker').value);});
