/* MetConnect client runtime: Supabase Realtime + WebRTC */
(function(){
'use strict';
if(window.__metconnectCodeLoaded)return;window.__metconnectCodeLoaded=true;
const MC=window.__metconnect={setup:false,currentTab:'contacts',contacts:[],bunContacts:[],bunClients:[],bunProfiles:[],ownBun:null,bunStatus:null,editingBunId:null,activeBunContact:null,activeBunClient:null,replyBunId:null,selected:null,selectedKind:'regular',selectedBunId:null,active:null,incoming:null,peer:null,local:null,screen:null,remote:null,ice:[],signals:null,incomingChannel:null,messageChannel:null,audio:null,ring:null,ringTimer:null,timeout:null,busy:false,held:false,mic:true,cam:true,speaker:null,pushReady:false,ringtoneEnabled:true};
const labels={talk:'Talk',screen:'Share Screen Call',voice:'Voice Call',video:'Video Call'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person=id=>MC.selectedKind==='bun'?(MC.activeBunContact||MC.bunContacts.find(x=>x.owner_id===id)||MC.contacts.find(x=>x.contact_id===id)||null):MC.selectedKind==='bunClient'?(MC.activeBunClient||MC.bunClients.find(x=>x.owner_id===id)||null):(MC.contacts.find(x=>x.contact_id===id)||MC.bunContacts.find(x=>x.owner_id===id)||null);
function status(s,bad){const e=document.getElementById('mc-status');if(e){e.textContent=s||'';e.style.color=bad?'#ffaaaa':'#a8c3d8';}else if(s&&typeof toast==='function')toast(s,bad?'error':'success');}
function appMarkup(){return '<style>'+
'.mc{background:#071320;color:#eef7ff;border:1px solid #29445b;border-radius:15px;min-height:540px;overflow:hidden}.mc-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 17px;background:#0b1b2b;border-bottom:1px solid #29465d;flex-wrap:wrap}.mc-brand{display:flex;align-items:center;gap:10px}.mc-logo{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#51dfbd,#6bbdff);display:grid;place-items:center;color:#06131d;box-shadow:0 0 22px #4fdac455}.mc-logo svg{width:27px;height:27px;display:block}.mc-brand strong{display:block;font-size:18px}.mc-brand small{color:#9eb5ca}.mc-btn{border:1px solid #34536b;border-radius:10px;background:#142d42;color:#edf7ff;padding:9px 12px;font-weight:750}.mc-btn.primary{background:linear-gradient(110deg,#087d70,#176eaa);border-color:#37c9b4}.mc-btn.danger{background:#482231;border-color:#804357}.mc-btn:disabled{opacity:.42}.mc-hidden{display:none!important}.mc-setup{max-width:760px;margin:24px auto;padding:clamp(18px,4vw,32px);border:1px solid #35546b;border-radius:20px;background:linear-gradient(145deg,#112d43,#151d30)}.mc-setup h2{font-size:clamp(25px,4vw,36px);margin:8px 0}.mc-setup p,.mc-note{color:#acc1d3;line-height:1.55}.mc-perms{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:18px 0}.mc-perm{background:#0b1e2d;border:1px solid #2b4a62;border-radius:13px;padding:12px}.mc-perm b{display:block;margin:6px 0}.mc-perm small{color:#9bb3c8}.mc-actions{display:flex;gap:7px;flex-wrap:wrap}.mc-note{font-size:12px;margin-top:11px}.mc-menu{display:flex;gap:7px;overflow-x:auto;padding:10px 12px;background:#091a29;border-bottom:1px solid #294157}.mc-menu button{white-space:nowrap;border:1px solid #2c4a60;background:#10283a;color:#ddecf8;border-radius:10px;padding:10px 13px;font-weight:750}.mc-menu button.active{border-color:#45ccb8;background:#144557}.mc-grid{display:grid;grid-template-columns:minmax(210px,300px) minmax(0,1fr);gap:11px;padding:12px}.mc-grid.mc-saved-only{grid-template-columns:minmax(0,1fr)}.mc-grid.mc-saved-only>.mc-chat,.mc-grid.mc-list-only>.mc-chat{display:none!important}.mc-grid.mc-list-only{grid-template-columns:minmax(0,1fr)!important}.mc.mc-subpage>.mc-top,.mc.mc-subpage .mc-menu{display:none!important}.mc-sectionbar{display:none;align-items:center;gap:10px;padding:10px 14px;background:#0b1b2b;border-bottom:1px solid #29465d}.mc.mc-subpage .mc-sectionbar{display:flex}.mc-sectionbar button{border:1px solid #34536b;border-radius:10px;background:#142d42;color:#edf7ff;padding:9px 13px;font-weight:750}.mc-sectionbar strong{font-size:15px}.mc-grid.mc-bun-message>.mc-panel:first-child{display:none}.mc-grid.mc-bun-message{grid-template-columns:minmax(0,1fr)!important;height:100%}.mc.mc-bun-chat-mode #mc-bun-account,.mc.mc-bun-chat-mode #mc-call-controls{display:none!important}.mc-panel{min-width:0;border:1px solid #294358;border-radius:14px;background:#0a1927;overflow:hidden}.mc-head{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:11px;border-bottom:1px solid #263d50}.mc-body{padding:11px}.mc-form{display:flex;gap:7px;margin-bottom:10px}.mc-input{min-width:0;flex:1;background:#06121d;border:1px solid #2d4a60;color:#fff;border-radius:10px;padding:11px}.mc-contacts{display:grid;gap:7px;max-height:420px;overflow:auto}.mc-person{width:100%;display:flex;justify-content:space-between;gap:8px;text-align:left;padding:10px;border-radius:10px;border:1px solid #29445a;background:#0d2030;color:#eff7ff}.mc-person.active{border-color:#48cbb7;background:#124052}.mc-person small{display:block;color:#9ab1c5}.mc-chat{display:flex;flex-direction:column;min-height:450px}.mc-messages{flex:1;min-height:220px;max-height:470px;overflow:auto;padding:11px;display:flex;flex-direction:column;gap:8px}.mc-bubble{max-width:84%;background:#112b40;border:1px solid #2a4a63;border-radius:13px;padding:10px 12px;overflow-wrap:anywhere;white-space:pre-wrap}.mc-bubble.mine{align-self:flex-end;background:#12483f;border-color:#31796b}.mc-bubble small{display:block;color:#9eb4c8;font-size:10px;margin-top:5px}.mc-send{display:flex;gap:7px;padding:10px;border-top:1px solid #294157}.mc-empty{display:grid;place-items:center;text-align:center;color:#91aabf;padding:28px 12px}.mc-global{position:fixed;inset:0;z-index:1000000;pointer-events:none}.mc-modalwrap,.mc-stagewrap{position:absolute;inset:0;pointer-events:auto;display:flex;align-items:center;justify-content:center;padding:12px;background:#020912dd}.mc-modal{width:min(520px,100%);padding:22px;border-radius:20px;border:1px solid #42617a;background:linear-gradient(150deg,#112e44,#131b2d);text-align:center;box-shadow:0 22px 80px #000a}.mc-callicon{width:62px;height:62px;margin:0 auto 11px;border-radius:50%;display:grid;place-items:center;background:#154358;color:#6ce3d0;font-size:27px}.mc-stage{width:min(1050px,100%);height:min(820px,100%);display:flex;flex-direction:column;border:1px solid #36566e;border-radius:17px;background:#071421;overflow:hidden}.mc-stagehead{display:flex;justify-content:space-between;gap:8px;padding:13px;border-bottom:1px solid #294459}.mc-videos{flex:1;min-height:190px;position:relative;display:grid;place-items:center;background:#020910}.mc-remote{width:100%;height:100%;max-height:650px;object-fit:contain}.mc-local{position:absolute;right:12px;bottom:12px;width:min(27%,220px);aspect-ratio:4/3;object-fit:cover;background:#0d2030;border:1px solid #7892a8;border-radius:12px}.mc-audio{text-align:center;color:#bfd1e0;padding:40px}.mc-stageactions{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;padding:12px;background:#0b1b29;border-top:1px solid #2b455a}.mc-stageactions button{min-width:70px}.mc-stage-status{text-align:center;color:#a9bfd1;font-size:12px;padding:0 12px 10px}@media(max-width:760px){.mc-perms{grid-template-columns:1fr}.mc-grid{grid-template-columns:1fr}.mc-contacts{max-height:210px}.mc-chat{min-height:380px}.mc-stage{height:100%;border-radius:10px}.mc-local{width:34%;right:7px;bottom:7px}}'+
'.mc-bun-card{border:1px solid #2d4b61;border-radius:14px;padding:12px;background:#0b1d2c;margin:8px 0}.mc-bun-actions{display:flex;gap:8px;flex-wrap:wrap}.mc-bun-actions>*{flex:1;min-width:160px}.mc-bun-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.mc-bun-label{font-size:12px;color:#9eb9cb}.mc-bun-chip{display:inline-block;border:1px solid #49677f;border-radius:999px;padding:3px 8px;font-size:11px;color:#c9dced;margin:4px 4px 0 0}.mc-bun-chip.warn{border-color:#ad7950;color:#ffd7ad}.mc-bun-chip.good{border-color:#398c7b;color:#9debd6}.mc{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;border:0;border-radius:0}.mc-grid{flex:1;min-height:0;overflow:hidden}.mc-chat{height:100%;min-height:0}.mc-messages{min-height:0;max-height:none}.mc-grid.mc-chat-focus{grid-template-columns:minmax(0,1fr);height:100%}.mc-grid.mc-chat-focus>.mc-panel:first-child{display:none}.mc-grid.mc-chat-focus>.mc-chat{width:100%;min-height:0;height:100%}#mc-main:not(.mc-hidden){display:flex;flex:1;flex-direction:column;min-height:0}.mc-menu{flex:0 0 auto}.mc-chat .mc-head{flex-wrap:wrap}.mc-chat .mc-head>div:last-child{max-width:100%}.mc-chat .mc-head .mc-actions{align-items:center}.mc-call-controls{flex:0 0 auto}@media(max-width:760px){.mc{min-height:0}.mc-grid{min-height:0}.mc-chat{min-height:0}.mc-grid.mc-chat-focus{padding:0}.mc-grid.mc-chat-focus>.mc-chat{border:0;border-radius:0}}'+
'</style><div class="mc" id="mc-root"><header class="mc-top"><div class="mc-brand"><div class="mc-logo" aria-label="MetConnect"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M10 25.5c0-8.2 6.3-14.5 14-14.5s14 6.3 14 14.5-6.3 14-14 14S10 33.7 10 25.5Z" stroke="#06131d" stroke-width="3"/><path d="M16 25h5l3-7 4.5 14 3-7H36" stroke="#06131d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="25" r="3" fill="#06131d"/><circle cx="38" cy="25" r="3" fill="#06131d"/></svg></div><div><strong>MetConnect</strong><small>Private messages and calls · Metxon account</small></div></div><div class="mc-actions"><button class="mc-btn" id="mc-notify" type="button">Enable notifications</button><button class="mc-btn" id="mc-refresh" type="button">Refresh</button></div></header>'+
'<section id="mc-setup" class="mc-setup mc-hidden"><div class="eyebrow">METCONNECT SETUP</div><h2>Stay connected to everyone.</h2><p>Save Metxon usernames to message or call people who have installed MetConnect. Contacts are private. You can remove, block or report a user.</p><div class="mc-perms"><div class="mc-perm">🎙️<b>Microphone permission</b><small id="mc-mic-state">Not requested</small></div><div class="mc-perm">📷<b>Camera permission</b><small id="mc-cam-state">Not requested</small></div><div class="mc-perm">🔔<b>Speaker for ringing</b><small id="mc-speaker-state">Device default</small></div><div class="mc-perm">📣<b>Notifications</b><small id="mc-notify-state">Not enabled</small></div></div><div class="mc-actions"><button class="mc-btn primary" id="mc-permissions">Allow microphone and camera</button><button class="mc-btn" id="mc-speaker">Choose speaker</button><button class="mc-btn" id="mc-notify-setup">Enable notifications</button><button class="mc-btn" id="mc-continue">Continue</button></div><p class="mc-note">Browsers do not have a special speaker permission. Supported browsers can show an audio-output selector; otherwise the device speaker or headset is used. Camera and microphone are requested only after you press Allow. Notifications are optional and can be changed in browser site settings.</p><div class="mc-note" id="mc-setup-status" role="status"></div></section>'+
'<section id="mc-main" class="mc-hidden"><div class="mc-sectionbar" id="mc-sectionbar"><button type="button" id="mc-home-back" aria-label="Back to MetConnect home">← Home</button><strong id="mc-section-title">MetConnect</strong><span style="margin-left:auto"><button type="button" id="mc-section-home">Home</button></span></div><nav class="mc-menu"><button type="button" class="active" data-tab="contacts">Saved Usernames</button><button type="button" data-tab="talk">Talk</button><button type="button" data-tab="screen">Share Screen Call</button><button type="button" data-tab="voice">Voice Call</button><button type="button" data-tab="video">Video Call</button><button type="button" data-tab="bun">B-UN</button></nav><div id="mc-tab-help" class="mc-note" style="padding:10px 14px;margin:0;background:#091a29;border-bottom:1px solid #294157">Choose a saved username to view messages.</div><section id="mc-bun-account" class="mc-hidden" style="padding:12px;background:#0b1d2c;border-bottom:1px solid #294157"></section><div class="mc-grid"><aside class="mc-panel"><div class="mc-head"><b id="mc-list-title">Saved Usernames</b><span class="pill" id="mc-count">0</span></div><div class="mc-body"><form id="mc-add" class="mc-form"><input class="mc-input" id="mc-username" placeholder="Metxon username" maxlength="80" required><button class="mc-btn primary">Add</button></form><div id="mc-contacts" class="mc-contacts"><div class="mc-empty">Loading usernames…</div></div></div></aside><section class="mc-panel mc-chat"><div class="mc-head"><div><b id="mc-title">Choose a username</b><small id="mc-subtitle" style="display:block;color:#9bb3c8">End-to-end encrypted chats · messages auto-delete after 30 days</small></div><div class="mc-actions"><button class="mc-btn mc-hidden" id="mc-chat-back" type="button">Chats</button><button class="mc-btn" id="mc-remove" disabled>Remove</button><button class="mc-btn danger" id="mc-block" disabled>Block</button><button class="mc-btn" id="mc-report" disabled>Report</button></div></div><div id="mc-messages" class="mc-messages"><div class="mc-empty">Your private messages appear here.</div></div><form id="mc-send" class="mc-send"><input id="mc-text" class="mc-input" placeholder="Write an end-to-end encrypted message…" maxlength="700" disabled><button class="mc-btn primary" id="mc-send-btn" disabled>Send</button></form><div style="padding:0 11px 9px"><small id="mc-status" role="status" style="color:#a8c3d8">End-to-end encrypted · auto-delete after 30 days.</small></div><div class="mc-body mc-call-controls" id="mc-call-controls"><div class="mc-actions"><button class="mc-btn" data-call="screen" disabled>Start Share Screen Call</button><button class="mc-btn" data-call="voice" disabled>Start Voice Call</button><button class="mc-btn" data-call="video" disabled>Start Video Call</button></div><p class="mc-note">A screen call starts screen sharing for the caller. After answering, the other person can hold or share their own screen.</p></div></section></div></section></div>';
}
function ensureLayer(){
if(!document.getElementById('mc-global-style')){
 const style=document.createElement('style');style.id='mc-global-style';
 style.textContent='#mc-global{position:fixed;inset:0;z-index:2147483000;pointer-events:none}#mc-global .mc-hidden{display:none!important}#mc-global .mc-modalwrap,#mc-global .mc-stagewrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;pointer-events:auto;background:radial-gradient(circle at 50% 10%,rgba(28,88,112,.84),rgba(5,17,30,.96) 58%,rgba(1,6,13,.98));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}#mc-global .mc-modal{width:min(460px,100%);padding:clamp(24px,6vw,38px);box-sizing:border-box;border:1px solid rgba(111,190,216,.45);border-radius:28px;text-align:center;background:linear-gradient(150deg,rgba(19,55,78,.98),rgba(8,20,36,.99));color:#eff8ff;box-shadow:0 28px 90px rgba(0,0,0,.62),inset 0 1px rgba(255,255,255,.08)}#mc-global .mc-modal h2{font-size:clamp(25px,6vw,32px);margin:14px 0 8px}#mc-global .mc-modal p{color:#b7c9d9;line-height:1.55}#mc-global .mc-callicon{width:76px;height:76px;margin:0 auto 16px;border-radius:24px;display:grid;place-items:center;color:#06202b;font-size:34px;background:linear-gradient(135deg,#62e4c3,#66bdf5);box-shadow:0 10px 35px rgba(66,212,190,.26);animation:mc-ring-pulse 2s ease-in-out infinite}#mc-global .mc-actions{display:flex;gap:10px;flex-wrap:wrap}#mc-global .mc-actions button{flex:1;min-height:46px;border-radius:14px}#mc-global .mc-stage{width:min(1020px,100%);height:min(820px,100%);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(111,190,216,.42);border-radius:25px;background:linear-gradient(150deg,#102c43,#07121f);box-shadow:0 30px 100px rgba(0,0,0,.6);color:#eef7ff}#mc-global .mc-stagehead{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:18px 20px;border-bottom:1px solid rgba(113,160,190,.22);background:rgba(8,24,38,.6)}#mc-global .mc-videos{flex:1;min-height:190px;position:relative;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#173c54,#06101c 70%)}#mc-global .mc-audio{color:#d4e6f2;text-align:center;padding:40px;font-size:26px}#mc-global .mc-stageactions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;padding:14px;background:rgba(8,24,38,.86);border-top:1px solid rgba(113,160,190,.22)}#mc-global .mc-stageactions button{min-width:80px;min-height:44px;border-radius:13px}#mc-global .mc-stage-status{text-align:center;color:#b9cddd;font-size:13px;padding:0 14px 12px}@keyframes mc-ring-pulse{0%,100%{transform:scale(1);box-shadow:0 10px 30px rgba(66,212,190,.2)}50%{transform:scale(1.055);box-shadow:0 12px 42px rgba(66,212,190,.42)}}@media(max-width:600px){#mc-global .mc-modal{border-radius:24px;padding:26px 20px}#mc-global .mc-stage{height:100%;border-radius:0;border:0}#mc-global .mc-stageactions button{flex:1 1 28%;min-width:0}}';
 document.head.appendChild(style);
}
if(document.getElementById('mc-global'))return;
const el=document.createElement('div');el.id='mc-global';el.className='mc-global';
el.innerHTML='<section class="mc-modalwrap mc-hidden" id="mc-incoming" aria-live="assertive"><div class="mc-modal"><div class="mc-callicon">◉</div><small>INCOMING METCONNECT CALL</small><h2 id="mc-in-name">Metxon user</h2><p id="mc-in-mode">Voice Call</p><p class="mc-note">Answer or decline. Accept only calls from people you recognise.</p><div class="mc-actions" style="justify-content:center;margin-top:17px"><button class="mc-btn primary" id="mc-answer">Answer</button><button class="mc-btn danger" id="mc-decline">Decline</button></div></div></section><section class="mc-stagewrap mc-hidden" id="mc-stage-wrap"><div class="mc-stage"><header class="mc-stagehead"><div><b id="mc-stage-name">MetConnect</b><small id="mc-stage-mode" style="display:block;color:#9eb5c8"></small></div><span class="pill green" id="mc-stage-state">Connecting</span></header><div class="mc-videos"><div id="mc-audio" class="mc-audio">◉<p>Audio call</p></div><video id="mc-remote" class="mc-remote mc-hidden" autoplay playsinline muted></video><video id="mc-local" class="mc-local mc-hidden" autoplay playsinline muted></video></div><audio id="mc-remote-audio" autoplay></audio><div id="mc-stage-status" class="mc-stage-status">Connecting…</div><div class="mc-stageactions"><button class="mc-btn" id="mc-mute">Mute mic</button><button class="mc-btn" id="mc-camera-toggle">Camera off</button><button class="mc-btn" id="mc-hold">Hold</button><button class="mc-btn" id="mc-share-screen">Share screen</button><button class="mc-btn danger" id="mc-end">End call</button></div></div></section>';
document.body.appendChild(el);
document.getElementById('mc-answer').onclick=answerIncoming;document.getElementById('mc-decline').onclick=declineIncoming;document.getElementById('mc-end').onclick=endCall;document.getElementById('mc-mute').onclick=toggleMic;document.getElementById('mc-camera-toggle').onclick=toggleCam;document.getElementById('mc-hold').onclick=toggleHold;document.getElementById('mc-share-screen').onclick=shareScreen;
}
function metconnectDisplayCapture(){
 if(!window.isSecureContext)throw Error('Screen sharing requires the secure HTTPS version of this website.');
 const capture=navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices)||navigator.getDisplayMedia?.bind(navigator);
 if(!capture)throw Error('Your current browser does not provide screen capture. MetConnect screen sharing works in supported desktop browsers over HTTPS; Chrome on Android does not expose the browser screen-capture API. Open MetConnect on a desktop browser to share a screen.');
 return capture;
}
function audioContext(){if(!MC.audio){const C=window.AudioContext||window.webkitAudioContext;if(C)MC.audio=new C();}return MC.audio;}
function notificationPermissionLabel(){
 if(!('Notification' in window))return 'Unavailable in this browser';
 if(Notification.permission==='granted')return 'Enabled';
 if(Notification.permission==='denied')return 'Blocked in browser settings';
 return 'Not enabled';
}
function updateNotificationUi(){
 const permissionLabel=notificationPermissionLabel();
 const label=MC.pushReady?'Enabled on this device':permissionLabel==='Enabled'?'Permission granted — finish setup':permissionLabel;
 const state=document.getElementById('mc-notify-state');if(state)state.textContent=label;
 const buttons=['mc-notify','mc-notify-setup'].map(id=>document.getElementById(id)).filter(Boolean);
 buttons.forEach(b=>{b.textContent=MC.pushReady?'Call alerts enabled':'Enable call alerts';b.disabled=MC.pushReady||label==='Unavailable in this browser';});
}
const METCONNECT_VAPID_PUBLIC_KEY='BDeH3pwOAIUqPAS3D9i0xIzKX9h-KT0t3_1v8JS4rG8UHhf6EPG_nAuu0akxZTxICGA9REoRZNc3i18OxaYtqGc';
function urlBase64ToUint8Array(value){
 const pad='='.repeat((4-value.length%4)%4),raw=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function savePushSubscription(subscription){
 const r=await sb.from('metconnect_push_subscriptions').upsert({
  user_id:profile.id,endpoint:subscription.endpoint,subscription:subscription.toJSON(),
  user_agent:navigator.userAgent,updated_at:new Date().toISOString()
 },{onConflict:'user_id,endpoint'});
 if(r.error)throw r.error;MC.pushReady=true;updateNotificationUi();
}
async function syncPushSubscription(){
 if(!('Notification' in window)||Notification.permission!=='granted'||!('serviceWorker' in navigator)||!('PushManager' in window))return;
 try{
  const registration=await navigator.serviceWorker.getRegistration(location.href);
  if(!registration?.pushManager)return;
  const subscription=await registration.pushManager.getSubscription();
  if(subscription)await savePushSubscription(subscription);
 }catch(e){console.warn('MetConnect push sync:',e);}
}
async function requestNotifications(){
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
  status('This browser does not support background call notifications. Use an up-to-date Chrome browser and keep MetConnect installed.',true);updateNotificationUi();return;
 }
 try{
  let permission=Notification.permission;
  if(permission!=='granted')permission=await Notification.requestPermission();
  if(permission!=='granted'){
   updateNotificationUi();
   status(permission==='denied'?'Notifications are blocked for this site. Enable them in Android site settings.':'Notification permission was not granted.',true);
   return;
  }
  const registration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
  await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(METCONNECT_VAPID_PUBLIC_KEY)
  });
  await savePushSubscription(subscription);
  try{const ctx=audioContext();if(ctx&&ctx.state==='suspended')await ctx.resume();}catch(e){}
  status('Background call and message alerts are enabled. Your phone controls the notification sound and vibration.');
 }catch(e){
  MC.pushReady=false;updateNotificationUi();
  status(e.message||'Could not enable background notifications. Check Android notification settings and try again.',true);
 }
}
async function notifySystem(title,body,tag){
 if(!('Notification' in window)||Notification.permission!=='granted')return;
 try{
  if('serviceWorker' in navigator){
   const registration=await navigator.serviceWorker.getRegistration();
   if(registration?.showNotification){await registration.showNotification(title,{body,tag,renotify:true});return;}
  }
  const n=new Notification(title,{body,tag,renotify:true});
  n.onclick=()=>{try{window.focus();}catch(e){}n.close();};
 }catch(e){console.warn('MetConnect notification:',e);}
}
async function handleIncomingMessage(row){
 if(!row||row.sender_id===profile.id)return;
 let business=row.sender_bun_id?MC.bunContacts.find(x=>x.bun_id===row.sender_bun_id):null;
 if(row.sender_bun_id&&!business){const identity=await sb.rpc('metconnect_get_incoming_bun_identity',{p_record_id:row.id,p_kind:'message'});if(!identity.error&&identity.data)business=identity.data;}
 const current=person(row.sender_id);
 const senderName=business?.username||current?.username||'Metxon user';
 const foul=business?.foul_un?' · '+business.foul_un:'';
 if(!MC.pushReady)notifySystem('New MetConnect message','You have a new message from @'+senderName+foul+'.','metconnect-message-'+row.id);
 if(MC.selected)loadMessages(MC.selected);
}
// Incoming receiver tone: an original celestial-bell melody with short guitar-like plucks.
function ring(){
stopRing();const ctx=audioContext();if(!ctx)return;if(ctx.state==='suspended')ctx.resume().catch(()=>{});let live=true;
const notes=[392.00,493.88,587.33,783.99,587.33,493.88,349.23,440.00,523.25,698.46,523.25,440.00];
function strike(freq,at,duration){
 const bell=ctx.createOscillator(),bellGain=ctx.createGain(),bell2=ctx.createOscillator(),bell2Gain=ctx.createGain();
 bell.type='sine';bell.frequency.setValueAtTime(freq,at);
 bell2.type='sine';bell2.frequency.setValueAtTime(freq*2.01,at);
 bellGain.gain.setValueAtTime(.0001,at);bellGain.gain.exponentialRampToValueAtTime(.11,at+.018);bellGain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 bell2Gain.gain.setValueAtTime(.0001,at);bell2Gain.gain.exponentialRampToValueAtTime(.035,at+.015);bell2Gain.gain.exponentialRampToValueAtTime(.0001,at+duration*.65);
 bell.connect(bellGain);bellGain.connect(ctx.destination);bell2.connect(bell2Gain);bell2Gain.connect(ctx.destination);
 bell.start(at);bell2.start(at);bell.stop(at+duration);bell2.stop(at+duration*.7);
 const pluck=ctx.createOscillator(),pluckGain=ctx.createGain(),filter=ctx.createBiquadFilter();
 pluck.type='triangle';pluck.frequency.setValueAtTime(freq*.5,at);filter.type='lowpass';filter.frequency.setValueAtTime(1700,at);
 pluckGain.gain.setValueAtTime(.0001,at);pluckGain.gain.exponentialRampToValueAtTime(.055,at+.008);pluckGain.gain.exponentialRampToValueAtTime(.0001,at+.19);
 pluck.connect(filter);filter.connect(pluckGain);pluckGain.connect(ctx.destination);pluck.start(at);pluck.stop(at+.2);
}
function phrase(){if(!live)return;const now=ctx.currentTime+.04;notes.forEach((f,i)=>strike(f,now+i*.23,.55));MC.ringTimer=setTimeout(phrase,3900);}
MC.ring=()=>{live=false;clearTimeout(MC.ringTimer);MC.ringTimer=null;};phrase();
}
// Caller tone: familiar two-note telephone ringback, kept separate from the receiver melody.
function ringCaller(){
stopRing();const ctx=audioContext();if(!ctx)return;if(ctx.state==='suspended')ctx.resume().catch(()=>{});let live=true;
function phrase(){if(!live)return;const now=ctx.currentTime+.02;[440,480].forEach(freq=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.04);gain.gain.setValueAtTime(.075,now+.92);gain.gain.exponentialRampToValueAtTime(.0001,now+1.03);osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+1.05);});MC.ringTimer=setTimeout(phrase,4000);}
MC.ring=()=>{live=false;clearTimeout(MC.ringTimer);MC.ringTimer=null;};phrase();
}

function stopRing(){if(MC.ring){MC.ring();MC.ring=null;}if(MC.ringTimer)clearTimeout(MC.ringTimer);MC.ringTimer=null;}
function stopOutgoing(){if(MC.outgoing){MC.outgoing();MC.outgoing=null;}stopRing();}
function setStageStatus(s){const el=document.getElementById('mc-stage-status');if(el)el.textContent=s;}
function showStage(){
ensureLayer();const c=MC.active,w=document.getElementById('mc-stage-wrap');if(!c){w.classList.add('mc-hidden');return;}w.classList.remove('mc-hidden');
document.getElementById('mc-stage-name').textContent='@'+(c.peer?.username||'Metxon user');document.getElementById('mc-stage-mode').textContent=labels[c.mode]||'MetConnect';document.getElementById('mc-stage-state').textContent=c.status==='ringing'?'Calling…':'Active';
const video=document.getElementById('mc-remote'),audio=document.getElementById('mc-remote-audio'),local=document.getElementById('mc-local');
if(MC.remote){video.srcObject=MC.remote;audio.srcObject=MC.remote;const hasVideo=MC.remote.getVideoTracks().length>0;video.classList.toggle('mc-hidden',!hasVideo);document.getElementById('mc-audio').classList.toggle('mc-hidden',hasVideo);video.muted=true;}else{video.classList.add('mc-hidden');document.getElementById('mc-audio').classList.remove('mc-hidden');}
const preview=MC.screen||MC.local;if(preview?.getVideoTracks().length){local.srcObject=preview;local.classList.remove('mc-hidden');}else local.classList.add('mc-hidden');
if(audio)audio.play().catch(()=>{});if(video)video.play().catch(()=>{});if(MC.speaker&&audio.setSinkId)audio.setSinkId(MC.speaker).catch(()=>{});
}
async function loadSetup(){const r=await sb.from('metconnect_preferences').select('setup_completed,ringtone_enabled').eq('user_id',profile.id).maybeSingle();if(r.error)throw r.error;MC.setup=!!r.data?.setup_completed;MC.ringtoneEnabled=r.data?.ringtone_enabled!==false;return MC.setup;}
async function permissions(){
const el=document.getElementById('mc-setup-status');if(el)el.textContent='Requesting camera and microphone permissions…';let mic=false,cam=false,s;
try{s=await navigator.mediaDevices.getUserMedia({audio:true,video:true});mic=s.getAudioTracks().length>0;cam=s.getVideoTracks().length>0;}
catch(e){if(s)s.getTracks().forEach(t=>t.stop());try{s=await navigator.mediaDevices.getUserMedia({audio:true,video:false});mic=true;}catch(x){}if(s)s.getTracks().forEach(t=>t.stop());try{s=await navigator.mediaDevices.getUserMedia({audio:false,video:true});cam=true;}catch(x){}}
if(s)s.getTracks().forEach(t=>t.stop());document.getElementById('mc-mic-state').textContent=mic?'Permission granted':'Not granted yet';document.getElementById('mc-cam-state').textContent=cam?'Permission granted':'Not granted yet';if(el)el.textContent=(mic?'Microphone ready. ':'Microphone permission not granted. ')+(cam?'Camera ready.':'Camera may be enabled later for video calls.');try{const a=audioContext();if(a&&a.state==='suspended')await a.resume();}catch(x){}await finishSetup();
}
async function chooseSpeaker(){
const el=document.getElementById('mc-setup-status');if(!navigator.mediaDevices?.selectAudioOutput){document.getElementById('mc-speaker-state').textContent='Device default';if(el)el.textContent='No speaker picker is available in this browser; using the device default.';return;}
try{const d=await navigator.mediaDevices.selectAudioOutput();MC.speaker=d.deviceId;document.getElementById('mc-speaker-state').textContent=d.label||'Speaker selected';if(el)el.textContent='Speaker selected.';}catch(e){if(el)el.textContent='Speaker selection cancelled. Device default will be used.';}
}
async function finishSetup(){
try{const r=await sb.from('metconnect_preferences').upsert({user_id:profile.id,setup_completed:true,ringtone_enabled:true,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(r.error)throw r.error;MC.setup=true;document.getElementById('mc-setup').classList.add('mc-hidden');document.getElementById('mc-main').classList.remove('mc-hidden');await refreshContacts();await initMetConnectBackground();status('Setup complete. Add a Metxon username.');}
catch(e){const el=document.getElementById('mc-setup-status');if(el)el.textContent=e.message||'Setup could not be saved.';}
}
async function refreshContacts(){
 const r=await sb.rpc('metconnect_list_contacts');if(r.error)throw r.error;
 const normalContacts=Array.isArray(r.data)?r.data:[];
 const buns=await sb.rpc('metconnect_bun_list_contacts');
 MC.bunContacts=buns.error?[]:(Array.isArray(buns.data)?buns.data:[]);
 MC.contacts=normalContacts.concat(MC.bunContacts.map(b=>({contact_id:b.owner_id,username:b.username,display_name:b.business_name,is_bun:true,bun_id:b.bun_id,foul_un:b.foul_un})));
 const visible=MC.currentTab==='bun'?normalContacts:MC.contacts;
 const list=document.getElementById('mc-contacts');
 if(list){
  list.innerHTML=visible.map(c=>'<button class="mc-person'+(c.contact_id===MC.selected?' active':'')+'" data-id="'+esc(c.contact_id)+'" data-kind="'+(c.is_bun?'bun':'regular')+'" data-bun-id="'+esc(c.bun_id||'')+'"><span><b>@'+esc(c.username)+'</b><small>'+esc(c.display_name||(c.is_bun?'Business username':'Metxon user'))+'</small>'+(c.foul_un&&String(c.foul_un).startsWith('Foul UN')?'<small class="mc-bun-chip warn">'+esc(c.foul_un)+'</small>':'')+'</span><span>›</span></button>').join('')||'<div class="mc-empty">'+(MC.currentTab==='bun'?'Save a MetConnect username first.':'No saved usernames yet. Add a Metxon username above.')+'</div>';
  list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{if(MC.currentTab==='bun'&&MC.bunAction==='call'){selectContact(b.dataset.id,'regular').then(()=>startCall('voice'));return;}selectContact(b.dataset.id,b.dataset.kind||'regular',b.dataset.bunId||null);});
 }
 const count=document.getElementById('mc-count');if(count)count.textContent=String(visible.length);if(MC.currentTab==='talk'&&!MC.selected)renderTalkChooser();
 document.querySelectorAll('[data-call]').forEach(b=>b.disabled=!MC.selected);
 ['mc-remove','mc-block','mc-report'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=!MC.selected;});
}
async function addContact(e){
e.preventDefault();if(MC.currentTab==='bun')return addBunContact(e);const input=document.getElementById('mc-username'),username=input.value.trim();if(!username)return;status('Checking Metxon username…');
try{const q=await sb.rpc('metconnect_lookup_user',{p_username:username});if(q.error)throw q.error;const p=Array.isArray(q.data)?q.data[0]:null;if(!p){const bun=await sb.rpc('metconnect_bun_add_contact',{p_username:username});if(bun.error)throw Error('Metxon username or B-UN not found, blocked, or not installed. '+bun.error.message);input.value='';await refreshContacts();await selectContact(bun.data.owner_id,'bun',bun.data.bun_id);status('@'+bun.data.username+' B-UN saved. This business can contact you only while you keep it saved and unblocked.');return;}if(!p.has_metconnect)throw Error('@'+p.username+' has not installed MetConnect.');const ins=await sb.from('metconnect_contacts').insert({owner_id:profile.id,contact_id:p.id});if(ins.error){if(ins.error.code==='23505')throw Error('Username is already saved.');throw ins.error;}input.value='';MC.selected=p.id;await refreshContacts();await loadMessages(p.id);status('@'+p.username+' added to Saved Usernames.');}
catch(x){status(x.message||'Could not add that username.',true);}
}
async function selectContact(id,kind='regular',bunId=null){
MC.selected=id||null;MC.selectedKind=kind;MC.replyBunId=null;
const p=kind==='bun'?(MC.bunContacts.find(x=>x.owner_id===MC.selected&&(!bunId||x.bun_id===bunId))||person(MC.selected)):kind==='bunClient'?(MC.bunClients.find(x=>x.owner_id===MC.selected&&(!bunId||x.bun_id===bunId))||person(MC.selected)):person(MC.selected);MC.activeBunContact=kind==='bun'?p:null;MC.activeBunClient=kind==='bunClient'?p:null;MC.selectedBunId=kind==='bun'?(bunId||p?.bun_id||null):kind==='bunClient'?(bunId||p?.bun_id||null):null;
const name=p?p.username:null;
document.getElementById('mc-title').textContent=name?'@'+name:'Choose a username';
document.getElementById('mc-subtitle').textContent=p?(p.business_name||p.display_name||'Metxon user')+' · '+(kind==='bun'?'B-UN business contact':'MetConnect'):'Save a username to start texting';
document.getElementById('mc-text').disabled=!p;
document.getElementById('mc-send-btn').disabled=!p;
if(MC.currentTab==='talk'){const composer=document.getElementById('mc-send'),back=document.getElementById('mc-chat-back');if(composer)composer.classList.toggle('mc-hidden',!p);if(back)back.classList.toggle('mc-hidden',!p);}
if(kind==='bunClient')await refreshBunContacts();else if(kind==='regular'||kind==='bun')await refreshContacts();
await loadMessages(MC.selected);
const grid=document.querySelector('#mc-root .mc-grid');if(grid&&MC.currentTab==='talk')grid.classList.add('mc-chat-focus');if(grid&&MC.currentTab==='bun'&&MC.bunAction==='message'){grid.classList.remove('mc-list-only');grid.classList.add('mc-bun-message');document.getElementById('mc-root')?.classList.add('mc-bun-chat-mode');}const composer=document.getElementById('mc-send'),back=document.getElementById('mc-chat-back');if(MC.currentTab==='bun'&&MC.bunAction==='message'){composer?.classList.remove('mc-hidden');document.getElementById('mc-messages')?.classList.remove('mc-hidden');if(back){back.classList.remove('mc-hidden');back.textContent='Recipients';}}
}
const MC_CRYPTO_DB='metconnect-crypto-v1';
function cryptoDb(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(MC_CRYPTO_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('keys'))req.result.createObjectStore('keys');};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function cryptoRecord(){
 const db=await cryptoDb();return new Promise((resolve,reject)=>{
  const req=db.transaction('keys','readonly').objectStore('keys').get(profile.id);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 });
}
async function storeCryptoRecord(value){
 const db=await cryptoDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction('keys','readwrite');tx.objectStore('keys').put(value,profile.id);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
 });
}
async function ensureEncryptionIdentity(){
 if(!window.crypto?.subtle||!window.indexedDB)throw Error('This browser does not support MetConnect end-to-end encryption. Update your browser.');
 let saved=await cryptoRecord();
 if(!saved?.privateKey||!saved?.publicJwk){
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  const privateKey=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
  const publicJwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
  saved={privateKey,publicJwk};await storeCryptoRecord(saved);
 }
 MC.cryptoPrivateKey=saved.privateKey;MC.cryptoPublicJwk=saved.publicJwk;
 const result=await sb.from('metconnect_encryption_keys').upsert(
  {user_id:profile.id,public_key:saved.publicJwk,updated_at:new Date().toISOString()},
  {onConflict:'user_id'}
 );
 if(result.error)throw result.error;
 MC.cryptoReady=true;
}
async function peerEncryptionKey(userId){
 if(MC.cryptoPeerCache?.[userId])return MC.cryptoPeerCache[userId];
 const r=await sb.rpc('metconnect_get_encryption_key',{p_user_id:userId});
 if(r.error)throw r.error;
 if(!r.data)throw Error('The other person needs to open MetConnect once to activate encrypted messaging.');
 MC.cryptoPeerCache=MC.cryptoPeerCache||{};MC.cryptoPeerCache[userId]=r.data;return r.data;
}
async function sharedMessageKey(peerId){
 if(!MC.cryptoPrivateKey)await ensureEncryptionIdentity();
 const peerJwk=await peerEncryptionKey(peerId);
 const peerKey=await crypto.subtle.importKey('jwk',peerJwk,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const bits=await crypto.subtle.deriveBits({name:'ECDH',public:peerKey},MC.cryptoPrivateKey,256);
 const material=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
 const ids=[profile.id,peerId].sort().join(':');
 return crypto.subtle.deriveKey(
  {name:'HKDF',hash:'SHA-256',salt:new TextEncoder().encode('MetConnect E2EE v1'),info:new TextEncoder().encode(ids)},
  material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']
 );
}
function mcBytesToBase64(bytes){
 let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return btoa(binary);
}
function mcBase64ToBytes(value){
 const binary=atob(value);const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}
async function encryptMessageText(plain,peerId){
 const key=await sharedMessageKey(peerId),iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plain));
 return 'mc1:'+mcBytesToBase64(iv)+':'+mcBytesToBase64(new Uint8Array(data));
}
async function decryptMessageText(body,peerId){
 const value=String(body||'');if(!value.startsWith('mc1:'))return value;
 try{
  const parts=value.split(':');
  const key=await sharedMessageKey(peerId);
  let iv,data;
  if(parts.length===3){iv=mcBase64ToBytes(parts[1]);data=mcBase64ToBytes(parts[2]);}
  else{
   const packed=JSON.parse(atob(value.slice(4)));
   iv=new Uint8Array(packed.iv);data=new Uint8Array(packed.data);
  }
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);
  return new TextDecoder().decode(plain);
 }catch(e){console.warn('MetConnect message decryption failed:',e);return 'Unable to decrypt this message on this device. The sender or recipient may have changed devices or encryption keys.';}
}
function renderTalkChooser(){
 const box=document.getElementById('mc-messages');if(!box)return;
 const contacts=(MC.contacts||[]).filter(c=>!c.is_bun);
 if(!contacts.length){box.innerHTML='<div class="mc-empty">No saved personal usernames yet. Add a username in Saved Usernames first.</div>';return;}
 box.innerHTML='<div class="mc-empty" style="text-align:left">Your chats · select a saved username</div>'+contacts.map(c=>'<button type="button" class="mc-person" data-talk-id="'+esc(c.contact_id)+'"><span><b>@'+esc(c.username)+'</b><small>'+esc(c.display_name||'Metxon user')+'</small></span><span>›</span></button>').join('');
 box.querySelectorAll('[data-talk-id]').forEach(b=>b.onclick=()=>selectContact(b.dataset.talkId,'regular'));
}
function renderMessages(rows){
const box=document.getElementById('mc-messages');if(!box)return;if(!rows.length){box.innerHTML='<div class="mc-empty">No messages yet. Send the first message.</div>';return;}box.innerHTML=rows.map(m=>{
 const bun=m.sender_bun_id?(m.sender_id===profile.id?MC.ownBun:(m._senderBun||MC.bunContacts.find(x=>x.bun_id===m.sender_bun_id))):null;
 const sender=bun?('@'+bun.username+' · Business'):'';
 const rating=bun&&String(bun.foul_un||'').startsWith('Foul UN')?'<small class="mc-bun-chip warn">'+esc(bun.foul_un)+'</small>':'';
 return '<div class="mc-bubble'+(m.sender_id===profile.id?' mine':'')+'">'+(sender?'<small>'+esc(sender)+'</small>':'')+rating+esc(m.body)+'<small>'+new Date(m.created_at).toLocaleString()+'</small></div>';
}).join('');box.scrollTop=box.scrollHeight;
}
async function loadMessages(id){
const box=document.getElementById('mc-messages');if(!id){if(box)box.innerHTML='<div class="mc-empty">Choose a saved username.</div>';return;}
try{const [a,b]=await Promise.all([sb.from('metconnect_messages').select('id,sender_id,recipient_id,sender_bun_id,recipient_bun_id,body,created_at').eq('sender_id',profile.id).eq('recipient_id',id).order('created_at').limit(150),sb.from('metconnect_messages').select('id,sender_id,recipient_id,sender_bun_id,recipient_bun_id,body,created_at').eq('sender_id',id).eq('recipient_id',profile.id).order('created_at').limit(150)]);if(a.error)throw a.error;if(b.error)throw b.error;const rows=[...(a.data||[]),...(b.data||[])].sort((x,y)=>new Date(x.created_at)-new Date(y.created_at)).slice(-200);MC.replyBunId=rows.filter(m=>m.sender_id===id&&m.sender_bun_id).slice(-1)[0]?.sender_bun_id||null;for(const m of rows){const peerId=m.sender_id===profile.id?m.recipient_id:m.sender_id;m.body=await decryptMessageText(m.body,peerId);if(m.sender_id!==profile.id&&m.sender_bun_id){const identity=await sb.rpc('metconnect_get_incoming_bun_identity',{p_record_id:m.id,p_kind:'message'});if(!identity.error&&identity.data)m._senderBun=identity.data;}}renderMessages(rows);}
catch(e){if(box)box.innerHTML='<div class="mc-empty">Could not load messages: '+esc(e.message)+'</div>';}
}
async function sendMessage(e){
e.preventDefault();const input=document.getElementById('mc-text'),body=input.value.trim();if(!MC.selected||!body)return;input.disabled=true;
try{if(new TextEncoder().encode(body).length>2800)throw Error('This encrypted message is too long. Keep it under 700 characters.');if(MC.currentTab==='bun'&&(!MC.ownBun||!MC.bunStatus?.active))throw Error('Choose an active B-UN and make sure your membership is active before messaging.');if(!MC.cryptoReady)await ensureEncryptionIdentity();const encryptedBody=await encryptMessageText(body,MC.selected);const r=await sb.from('metconnect_messages').insert({sender_id:profile.id,recipient_id:MC.selected,sender_bun_id:MC.currentTab==='bun'?MC.ownBun?.id:null,recipient_bun_id:MC.currentTab==='bun'?null:(MC.replyBunId||null),body:encryptedBody});if(r.error)throw r.error;input.value='';await loadMessages(MC.selected);status('Message sent.');}
catch(x){status(x.message||'Message could not be sent.',true);}finally{input.disabled=false;input.focus();}
}
async function removeContact(){if(!MC.selected)return;const p=person(MC.selected);if(MC.selectedKind==='bun'){if(!confirm('Remove @'+(p?.username||'this B-UN')+' from saved business usernames?'))return;const r=await sb.rpc('metconnect_bun_remove_contact',{p_bun_id:MC.selectedBunId});if(r.error)return status(r.error.message,true);MC.selected=null;MC.selectedBunId=null;MC.activeBunContact=null;await refreshContacts();await loadMessages(null);return status('Business username removed.');}if(MC.selectedKind==='bunClient'){if(!confirm('Remove this customer from your B-UN saved contacts?'))return;const r=await sb.rpc('metconnect_bun_remove_client',{p_user_id:MC.selected,p_bun_id:MC.selectedBunId});if(r.error)return status(r.error.message,true);MC.selected=null;MC.selectedBunId=null;MC.activeBunClient=null;await refreshBunContacts();await loadMessages(null);return status('Customer removed from this B-UN contact list.');}if(!confirm('Remove @'+(p?.username||'this user')+'?'))return;const r=await sb.from('metconnect_contacts').delete().eq('owner_id',profile.id).eq('contact_id',MC.selected);if(r.error)return status(r.error.message,true);MC.selected=null;await refreshContacts();await loadMessages(null);status('Contact removed.');}
async function blockContact(){if(!MC.selected)return;const id=MC.selected,p=person(id);if(MC.selectedKind==='bun'){if(!confirm('Block @'+(p?.username||'this B-UN')+'? This block remains in place even if the business changes its username.'))return;const r=await sb.rpc('metconnect_bun_block_contact',{p_bun_id:MC.selectedBunId});if(r.error)return status(r.error.message,true);MC.selected=null;MC.selectedBunId=null;await refreshContacts();await loadMessages(null);return status('B-UN blocked for this account.');}if(MC.selectedKind==='bunClient'){if(!confirm('Block this customer from your B-UN?'))return;const r=await sb.from('metconnect_blocks').insert({owner_id:profile.id,blocked_user_id:id});if(r.error&&r.error.code!=='23505')return status(r.error.message,true);await sb.rpc('metconnect_bun_remove_client',{p_user_id:id,p_bun_id:MC.selectedBunId});MC.selected=null;await refreshBunContacts();await loadMessages(null);return status('Customer blocked from this account.');}if(!confirm('Block @'+(p?.username||'this user')+'?'))return;const r=await sb.from('metconnect_blocks').insert({owner_id:profile.id,blocked_user_id:id});if(r.error&&r.error.code!=='23505')return status(r.error.message,true);await sb.from('metconnect_contacts').delete().eq('owner_id',profile.id).eq('contact_id',id);if(MC.active?.peerId===id)await endCall();MC.selected=null;await refreshContacts();await loadMessages(null);status('User blocked.');}
async function reportContact(){if(!MC.selected)return;const id=MC.selected,p=person(id),reason=prompt('Why are you reporting @'+(p?.username||'this user')+'?');if(!reason||reason.trim().length<3)return;const r=await sb.from('metconnect_reports').insert({reporter_id:profile.id,reported_user_id:id,reason:reason.trim().slice(0,1000)});if(r.error)return status(r.error.message,true);await sb.from('metconnect_blocks').insert({owner_id:profile.id,blocked_user_id:id});await sb.from('metconnect_contacts').delete().eq('owner_id',profile.id).eq('contact_id',id);if(MC.active?.peerId===id)await endCall();MC.selected=null;await refreshContacts();await loadMessages(null);status('Report submitted and user blocked.');}
function signal(id,type,payload){return sb.from('metconnect_call_signals').insert({call_id:id,sender_id:profile.id,signal_type:type,payload:payload||{}});}
async function flushIce(){if(!MC.peer?.remoteDescription)return;for(const x of MC.ice.splice(0)){try{await MC.peer.addIceCandidate(new RTCIceCandidate(x));}catch(e){console.warn(e);}}}
async function subscribeCall(id){
if(MC.signals)sb.removeChannel(MC.signals);MC.signals=sb.channel('metconnect-call-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'metconnect_call_signals',filter:'call_id=eq.'+id},p=>handleSignal(p.new)).on('postgres_changes',{event:'UPDATE',schema:'public',table:'metconnect_calls',filter:'id=eq.'+id},p=>handleCallUpdate(p.new)).subscribe();
const old=await sb.from('metconnect_call_signals').select('id,sender_id,signal_type,payload,created_at').eq('call_id',id).order('created_at').limit(100);if(!old.error)for(const s of old.data||[])if(s.sender_id!==profile.id)await handleSignal(s);await flushIce();
const now=await sb.from('metconnect_calls').select('id,status,answer_sdp').eq('id',id).single();if(!now.error&&MC.active?.role==='caller'&&now.data.status==='accepted'&&now.data.answer_sdp)await handleCallUpdate({...now.data,id});
}
function newPeer(){
const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});MC.peer=pc;MC.remote=new MediaStream();MC.ice=[];
pc.ontrack=e=>{if(e.streams?.[0])MC.remote=e.streams[0];else if(!MC.remote.getTracks().some(t=>t.id===e.track.id))MC.remote.addTrack(e.track);showStage();};
pc.onicecandidate=e=>{if(!e.candidate)return;const c=e.candidate.toJSON?e.candidate.toJSON():e.candidate;if(MC.active?.id)signal(MC.active.id,'ice',c).then(r=>{if(r.error)console.warn(r.error);});else MC.ice.push(c);};
pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected'){stopOutgoing();if(MC.active)MC.active.status='accepted';showStage();setStageStatus('Connected peer-to-peer.');}if(pc.connectionState==='failed')setStageStatus('Connection failed. A TURN relay may be needed on this network.');};return pc;
}
async function startCall(mode){
if(MC.busy||MC.active||MC.incoming)return;const c=person(MC.selected);if(!c)return status('Choose a saved username.',true);if(MC.currentTab==='bun'&&mode!=='voice')return status('B-UN supports voice calls and messages only. Video and screen sharing are disabled.',true);if(MC.currentTab==='bun'&&(!MC.ownBun||!MC.bunStatus?.active))return status('Choose an active B-UN and make sure your membership is active before calling.',true);MC.busy=true;let local=null,screen=null;
try{
let screenPromise=null;if(mode==='screen'){screenPromise=metconnectDisplayCapture()({video:true,audio:false});}
if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone or camera access is unavailable.');
const pair=await Promise.all([navigator.mediaDevices.getUserMedia({audio:true,video:mode==='video'}),screenPromise||Promise.resolve(null)]);local=pair[0];screen=pair[1];MC.local=local;MC.screen=screen;const pc=newPeer();
local.getTracks().forEach(t=>pc.addTrack(t,local));if(screen)screen.getTracks().forEach(t=>pc.addTrack(t,screen));
const offer=await pc.createOffer();await pc.setLocalDescription(offer);
const calleeId=c.contact_id||c.owner_id;if(!calleeId)throw Error('The saved contact could not be resolved.');if(MC.currentTab==='bun'&&(!MC.ownBun||!MC.bunStatus?.active))throw Error('Activate your B-UN plan before calling.');
const row=await sb.from('metconnect_calls').insert({caller_id:profile.id,callee_id:calleeId,caller_bun_id:MC.currentTab==='bun'?MC.ownBun?.id:null,callee_bun_id:MC.selectedKind==='bun'?MC.selectedBunId:null,call_mode:mode,status:'ringing',offer_sdp:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}}).select('id,caller_id,callee_id,caller_bun_id,callee_bun_id,call_mode,status,offer_sdp,created_at').single();if(row.error)throw row.error;
MC.active={id:row.data.id,callerId:profile.id,peerId:calleeId,peer:c,mode,role:'caller',status:'ringing'};await subscribeCall(MC.active.id);
for(const item of MC.ice.splice(0)){const r=await signal(MC.active.id,'ice',item);if(r.error)throw r.error;}
showStage();ringCaller();MC.outgoing=MC.ring;MC.ring=null;status('Calling @'+c.username+'…');
MC.timeout=setTimeout(async()=>{if(MC.active?.id===row.data.id&&MC.active.status==='ringing'){await sb.from('metconnect_calls').update({status:'ended'}).eq('id',row.data.id).eq('caller_id',profile.id);cleanupCall('No answer.');}},45000);
if(screen)screen.getVideoTracks().forEach(t=>t.onended=()=>status('Screen sharing stopped.'));
}catch(e){if(local)local.getTracks().forEach(t=>t.stop());if(screen)screen.getTracks().forEach(t=>t.stop());if(MC.peer)MC.peer.close();MC.peer=null;MC.local=null;MC.screen=null;stopOutgoing();status(e.message||'Could not start the call.',true);}
finally{MC.busy=false;}
}
function showIncoming(call,peer){ensureLayer();MC.incoming=call;const bun=call?._bunIdentity||(call?.caller_bun_id?MC.bunContacts.find(x=>x.bun_id===call.caller_bun_id):null);const targetBun=call?.callee_bun_id?MC.bunProfiles.find(x=>x.id===call.callee_bun_id):null;if(bun)peer={...peer,username:bun.username,display_name:bun.business_name};document.getElementById('mc-in-name').textContent='@'+(peer?.username||'Metxon user');document.getElementById('mc-in-mode').textContent=(labels[call.call_mode]||'Call')+' · Incoming'+(bun&&String(bun.foul_un||'').startsWith('Foul UN')?' · '+bun.foul_un:'')+(targetBun?' · to B-UN @'+targetBun.username:'');document.getElementById('mc-incoming').classList.remove('mc-hidden');if(!MC.pushReady)notifySystem('Incoming '+(labels[call.call_mode]||'MetConnect call'),'@'+(peer?.username||'Metxon user')+' is calling you.','metconnect-call-'+call.id);if(MC.ringtoneEnabled)ring();MC.timeout=setTimeout(async()=>{if(MC.incoming?.id===call.id){await sb.from('metconnect_calls').update({status:'missed'}).eq('id',call.id).eq('callee_id',profile.id);hideIncoming();MC.incoming=null;}},40000);}
function hideIncoming(){stopRing();if(MC.timeout)clearTimeout(MC.timeout);MC.timeout=null;document.getElementById('mc-incoming')?.classList.add('mc-hidden');}
async function handleIncoming(call){if(!call||call.status!=='ringing'||MC.active||MC.incoming||!MC.setup)return;const q=await sb.rpc('metconnect_get_call_peer',{p_call_id:call.id});if(q.error)return;const p=Array.isArray(q.data)?q.data[0]:null;if(call.caller_bun_id){const identity=await sb.rpc('metconnect_get_incoming_bun_identity',{p_record_id:call.id,p_kind:'call'});if(!identity.error&&identity.data)call._bunIdentity=identity.data;}if(p)showIncoming(call,p);}
async function initMetConnectBackground(){
if(!profile?.id)return;
ensureLayer();
if(!MC.setup){try{await loadSetup();}catch(e){console.warn('MetConnect setup status:',e);return;}}
if(!MC.setup)return;
try{await ensureEncryptionIdentity();}catch(e){console.warn('MetConnect encryption setup:',e);status('Encrypted messaging setup needs attention: '+(e.message||'unsupported browser'),true);}
await syncPushSubscription();
try{const bunList=await sb.rpc('metconnect_bun_list_contacts');if(!bunList.error)MC.bunContacts=Array.isArray(bunList.data)?bunList.data:[];await loadBunStatus();}catch(e){console.warn('B-UN contacts:',e);}
if(!MC.incomingChannel){
 MC.incomingChannel=sb.channel('metconnect-incoming-'+profile.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'metconnect_calls',filter:'callee_id=eq.'+profile.id},p=>handleIncoming(p.new))
  .subscribe();
}
if(!MC.messageChannel){
 MC.messageChannel=sb.channel('metconnect-notify-messages-'+profile.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'metconnect_messages',filter:'recipient_id=eq.'+profile.id},p=>handleIncomingMessage(p.new))
  .subscribe();
}
const pending=await sb.from('metconnect_calls').select('id,caller_id,callee_id,caller_bun_id,callee_bun_id,call_mode,status,offer_sdp,created_at')
 .eq('callee_id',profile.id).eq('status','ringing').order('created_at',{ascending:false}).limit(1);
if(!pending.error&&pending.data?.[0])await handleIncoming(pending.data[0]);
}
async function answerIncoming(){
const call=MC.incoming;if(!call||MC.busy)return;MC.busy=true;let local=null;
try{hideIncoming();const r=await sb.from('metconnect_calls').select('id,caller_id,callee_id,caller_bun_id,callee_bun_id,call_mode,status,offer_sdp,created_at').eq('id',call.id).eq('callee_id',profile.id).single();if(r.error)throw r.error;if(r.data.status!=='ringing')throw Error('This call is no longer available.');
if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone or camera access is unavailable.');
local=await navigator.mediaDevices.getUserMedia({audio:true,video:r.data.call_mode==='video'});MC.local=local;
const q=await sb.rpc('metconnect_get_call_peer',{p_call_id:call.id});let peer=Array.isArray(q.data)?q.data[0]:null;if(q.error||!peer)throw Error(q.error?.message||'Caller unavailable.');if(r.data.caller_bun_id){const identity=call._bunIdentity||(await sb.rpc('metconnect_get_incoming_bun_identity',{p_record_id:call.id,p_kind:'call'})).data;const business=identity||MC.bunContacts.find(x=>x.bun_id===r.data.caller_bun_id);if(business)peer={...peer,username:business.username,display_name:business.business_name};}
MC.active={id:call.id,callerId:call.caller_id,peerId:peer.user_id,peer,mode:r.data.call_mode,role:'callee',status:'ringing'};const pc=newPeer();await pc.setRemoteDescription(new RTCSessionDescription(r.data.offer_sdp));local.getTracks().forEach(t=>pc.addTrack(t,local));await subscribeCall(call.id);
const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
const u=await sb.from('metconnect_calls').update({status:'accepted',answer_sdp:{type:pc.localDescription.type,sdp:pc.localDescription.sdp},answered_at:new Date().toISOString()}).eq('id',call.id).eq('callee_id',profile.id).eq('status','ringing');if(u.error)throw u.error;
MC.active.status='accepted';MC.incoming=null;showStage();setStageStatus('Connecting…');status('Connected to @'+peer.username+'.');
}catch(e){if(local)local.getTracks().forEach(t=>t.stop());if(MC.peer)MC.peer.close();MC.peer=null;MC.local=null;MC.active=null;MC.incoming=null;document.getElementById('mc-stage-wrap')?.classList.add('mc-hidden');status(e.message||'Could not answer.',true);}
finally{MC.busy=false;}
}
async function declineIncoming(){const c=MC.incoming;if(!c)return;hideIncoming();await sb.from('metconnect_calls').update({status:'declined'}).eq('id',c.id).eq('callee_id',profile.id);MC.incoming=null;status('Call declined.');}
async function handleCallUpdate(row){
if(MC.active?.id===row.id&&MC.active.role==='caller'&&row.status==='accepted'&&row.answer_sdp&&MC.peer&&!MC.peer.remoteDescription){try{await MC.peer.setRemoteDescription(new RTCSessionDescription(row.answer_sdp));MC.active.status='accepted';stopOutgoing();if(MC.timeout)clearTimeout(MC.timeout);await flushIce();showStage();setStageStatus('Connecting…');}catch(e){setStageStatus('Could not apply answer.');}}
else if(MC.active?.id===row.id&&['declined','missed','ended'].includes(row.status))cleanupCall(row.status==='declined'?'The other person declined.':row.status==='missed'?'Call missed.':'Call ended.');
if(MC.incoming?.id===row.id&&row.status!=='ringing'){hideIncoming();MC.incoming=null;}
}
async function handleSignal(row){
if(!row||row.sender_id===profile.id||!MC.active||row.call_id!==MC.active.id)return;const p=row.payload||{};
try{if(row.signal_type==='ice'){if(MC.peer?.remoteDescription)await MC.peer.addIceCandidate(new RTCIceCandidate(p));else MC.ice.push(p);}
else if(row.signal_type==='renegotiate_offer'){await MC.peer.setRemoteDescription(new RTCSessionDescription(p));const a=await MC.peer.createAnswer();await MC.peer.setLocalDescription(a);await signal(MC.active.id,'renegotiate_answer',{type:MC.peer.localDescription.type,sdp:MC.peer.localDescription.sdp});}
else if(row.signal_type==='renegotiate_answer'){if(MC.peer&&MC.peer.signalingState!=='stable'){await MC.peer.setRemoteDescription(new RTCSessionDescription(p));await flushIce();}}
else if(row.signal_type==='hold')setStageStatus('The other person has put the call on hold.');else if(row.signal_type==='resume')setStageStatus('The other person resumed the call.');else if(row.signal_type==='hangup')cleanupCall('The other person ended the call.');
}catch(e){console.warn('MetConnect signal:',e);}
}
async function endCall(){const c=MC.active;if(!c)return;await sb.from('metconnect_calls').update({status:'ended'}).eq('id',c.id);cleanupCall('Call ended.');}
function cleanupCall(message){
stopOutgoing();stopRing();if(MC.timeout)clearTimeout(MC.timeout);if(MC.signals){sb.removeChannel(MC.signals);MC.signals=null;}if(MC.peer){MC.peer.onicecandidate=null;MC.peer.close();}
if(MC.local)MC.local.getTracks().forEach(t=>t.stop());if(MC.screen)MC.screen.getTracks().forEach(t=>t.stop());
MC.peer=null;MC.local=null;MC.screen=null;MC.remote=null;MC.active=null;MC.ice=[];MC.held=false;document.getElementById('mc-stage-wrap')?.classList.add('mc-hidden');status(message||'Call ended.');
}
function toggleMic(){if(!MC.local)return;const tracks=MC.local.getAudioTracks();if(!tracks.length)return;MC.mic=!MC.mic;tracks.forEach(t=>t.enabled=MC.mic);document.getElementById('mc-mute').textContent=MC.mic?'Mute mic':'Unmute mic';}
function toggleCam(){if(!MC.local)return;const tracks=MC.local.getVideoTracks();if(!tracks.length)return;MC.cam=!MC.cam;tracks.forEach(t=>t.enabled=MC.cam);document.getElementById('mc-camera-toggle').textContent=MC.cam?'Camera off':'Camera on';}
async function toggleHold(){if(!MC.active||!MC.local)return;MC.held=!MC.held;MC.local.getTracks().forEach(t=>t.enabled=!MC.held);if(MC.screen)MC.screen.getTracks().forEach(t=>t.enabled=!MC.held);const output=document.getElementById('mc-remote-audio');if(output)output.muted=MC.held;document.getElementById('mc-hold').textContent=MC.held?'Resume':'Hold';setStageStatus(MC.held?'You put the call on hold.':'Call resumed.');const r=await signal(MC.active.id,MC.held?'hold':'resume',{});if(r.error)console.warn(r.error);}
async function shareScreen(){
if(!MC.active||!MC.peer)return;
try{const s=await metconnectDisplayCapture()({video:true,audio:false});MC.screen=s;s.getTracks().forEach(t=>MC.peer.addTrack(t,s));const offer=await MC.peer.createOffer();await MC.peer.setLocalDescription(offer);const r=await signal(MC.active.id,'renegotiate_offer',{type:MC.peer.localDescription.type,sdp:MC.peer.localDescription.sdp});if(r.error)throw r.error;setStageStatus('You are sharing your screen. Stop sharing with the browser control.');s.getVideoTracks().forEach(t=>t.onended=()=>setStageStatus('Screen sharing stopped.'));showStage();}
catch(e){setStageStatus(e.message||'Screen sharing cancelled.');}
}

async function refreshBunContacts(){
 if(MC.currentTab==='bun'){
  const list=document.getElementById('mc-contacts');
  if(list){
   list.innerHTML=MC.contacts.map(c=>'<button class="mc-person'+(c.contact_id===MC.selected?' active':'')+'" data-id="'+esc(c.contact_id)+'" data-kind="'+(c.is_bun?'bun':'regular')+'" data-bun-id="'+esc(c.bun_id||'')+'"><span><b>@'+esc(c.username)+'</b><small>'+esc(c.display_name||(c.is_bun?'B-UN business':'Metxon user'))+'</small>'+(c.foul_un&&String(c.foul_un).startsWith('Foul UN')?'<small class="mc-bun-chip warn">'+esc(c.foul_un)+'</small>':'')+'</span><span>›</span></button>').join('')||'<div class="mc-empty">Add MetConnect usernames in Saved Usernames first. Your selected business handle will be used for messages and voice calls.</div>';
   list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectContact(b.dataset.id,b.dataset.kind||'regular',b.dataset.bunId||null));
  }
  const count=document.getElementById('mc-count');if(count)count.textContent=String(MC.contacts.length);
 }
 ['mc-remove','mc-block','mc-report'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=!MC.selected;});
}
async function loadBunStatus(){
 const r=await sb.rpc('metconnect_bun_status');
 if(r.error){status(r.error.message,true);return;}
 MC.bunStatus=r.data||{};
 MC.bunProfiles=Array.isArray(MC.bunStatus.buns)?MC.bunStatus.buns:[];
 MC.ownBun=MC.bunProfiles.find(b=>b.id===MC.ownBun?.id)||MC.bunProfiles[0]||null;
 MC.editingBunId=null;
 renderBunAccount();
 await refreshBunContacts();
}
function renderBunAccount(){
 const root=document.getElementById('mc-bun-account');if(!root)return;
 const ent=MC.bunStatus||{},bun=MC.ownBun,active=!!ent.active;
 const expiry=ent.expires_at?new Date(ent.expires_at).toLocaleString():'Not active';
 const membership=active?('<span class="mc-bun-chip good">'+esc(String(ent.tier||'').toUpperCase())+' · active until '+esc(expiry)+'</span>'):('<span class="mc-bun-chip warn">B-UN access inactive</span>');
 const plan=active?(ent.tier==='trial'?'2-day trial':'MetConnect+'):'No active plan';
 const buy=active?'<button class="mc-btn primary" type="button" id="mc-bun-buy-plus">Renew / upgrade · π30 per month</button>':
  (!ent.trial_used?'<button class="mc-btn primary" type="button" id="mc-bun-buy-trial">Start 2-day B-UN trial · π2</button>':'<button class="mc-btn primary" type="button" id="mc-bun-buy-plus">Subscribe to MetConnect+ · π30 per month</button>');
 const listTitle=document.getElementById('mc-list-title');if(listTitle&&MC.currentTab==='bun')listTitle.textContent='Choose a recipient from Saved Usernames';
 const profiles=MC.bunProfiles.map(b=>'<div class="mc-person"><span><b>@'+esc(b.username)+'</b><small>'+esc(b.business_name)+'</small></span><span><button type="button" class="mc-btn" data-bun-use="'+esc(b.id)+'">'+(bun?.id===b.id?'Using':'Use')+'</button> <button type="button" class="mc-btn" data-bun-edit="'+esc(b.id)+'">Rename</button></span></div>').join('');
 root.innerHTML='<div class="mc-bun-card"><div class="mc-bun-label">METCONNECT BUSINESS USERNAMES</div><div class="mc-bun-actions" style="margin:8px 0"><button class="mc-btn primary" type="button" id="mc-bun-message">Message</button><button class="mc-btn primary" type="button" id="mc-bun-call">Call</button></div><small class="mc-note">Choose Message or Call, then select a registered MetConnect username from the list below. B-UN supports voice calls and messages only.</small><h3 style="margin:5px 0 8px">B-UN</h3><p class="mc-note">Create multiple public business handles for your business. Choose a saved MetConnect username as the recipient. Your selected B-UN identity is shown to the recipient on incoming calls and messages. Video calls and screen sharing are disabled in B-UN mode. Blocks apply to your Metxon business account, even if you create or rename another handle.</p>'+membership+'<div class="mc-bun-grid" style="margin-top:10px"><div><b>'+esc(plan)+'</b><div class="mc-bun-label">'+(active?'Membership expiry: '+esc(expiry):'Trial: π2 for 2 days · MetConnect+: π30/month')+'</div></div><div><input class="mc-input" type="password" id="mc-bun-metpay" placeholder="MetPay transaction password" autocomplete="current-password" maxlength="128"></div></div><div class="mc-bun-actions" style="margin-top:9px">'+buy+'</div><small class="mc-note">The π30 monthly plan is renewed by confirming the payment. No silent recurring charge is made.</small></div>'+
  '<div class="mc-bun-card"><h3>Your B-UN numbers</h3>'+(profiles||'<p class="mc-note">No business usernames yet.</p>')+'<div class="mc-bun-actions" style="margin-top:9px"><button class="mc-btn" id="mc-bun-new" type="button">Create another B-UN</button></div></div>'+
  '<div class="mc-bun-card"><h3>'+(MC.editingBunId?'Rename B-UN':'Create a B-UN')+'</h3><p class="mc-note">Verify your Metxon account password again before creating or renaming a public business identity. Your password is never stored in the B-UN profile.</p><div class="mc-bun-grid"><div><label class="mc-bun-label" for="mc-bun-account-password">Metxon account password</label><input class="mc-input" id="mc-bun-account-password" type="password" maxlength="128" autocomplete="current-password" placeholder="Verify account password"></div><div><label class="mc-bun-label" for="mc-bun-handle">B-UN username</label><input class="mc-input" id="mc-bun-handle" maxlength="32" placeholder="business_handle" value="'+esc(MC.editingBunId?MC.bunProfiles.find(x=>x.id===MC.editingBunId)?.username||'':'')+'"></div><div><label class="mc-bun-label" for="mc-bun-business-name">Business / display name</label><input class="mc-input" id="mc-bun-business-name" maxlength="60" placeholder="Your business name" value="'+esc(MC.editingBunId?MC.bunProfiles.find(x=>x.id===MC.editingBunId)?.business_name||'':'')+'"></div></div><div class="mc-bun-actions" style="margin-top:10px"><button class="mc-btn primary" id="mc-bun-save" type="button">'+(MC.editingBunId?'Verify and rename B-UN':'Verify and create B-UN')+'</button></div><small class="mc-note" id="mc-bun-account-status" role="status"></small></div>';
 const trial=document.getElementById('mc-bun-buy-trial'),plus=document.getElementById('mc-bun-buy-plus'),save=document.getElementById('mc-bun-save'),add=document.getElementById('mc-bun-new'),msg=document.getElementById('mc-bun-message'),call=document.getElementById('mc-bun-call');if(msg)msg.disabled=!active;if(call)call.disabled=!active;if(msg)msg.onclick=()=>{MC.bunAction='message';MC.selected=null;loadMessages(null);status('B-UN message: select a registered MetConnect username below.');};if(call)call.onclick=()=>{MC.bunAction='call';MC.selected=null;status('B-UN call: select a registered MetConnect username below.');};
 if(trial)trial.onclick=()=>purchaseBun('trial');
 if(plus)plus.onclick=()=>purchaseBun('plus');
 if(save)save.onclick=saveBunIdentity;
 if(add)add.onclick=()=>{MC.editingBunId=null;renderBunAccount();};
 root.querySelectorAll('[data-bun-use]').forEach(b=>b.onclick=()=>{
  MC.ownBun=MC.bunProfiles.find(x=>x.id===b.dataset.bunUse)||null;
  MC.bunStatus.bun=MC.ownBun;MC.selected=null;MC.selectedBunId=null;MC.activeBunClient=null;loadMessages(null);renderBunAccount();refreshBunContacts();
  status(MC.ownBun?'Using @'+MC.ownBun.username+'.':'Choose a B-UN.');
 });
 root.querySelectorAll('[data-bun-edit]').forEach(b=>b.onclick=()=>{
  MC.editingBunId=b.dataset.bunEdit;renderBunAccount();
  document.getElementById('mc-bun-handle')?.focus();
 });
}
async function purchaseBun(type){
 const password=document.getElementById('mc-bun-metpay')?.value||'';
 if(!password){status('Enter your MetPay transaction password to continue.',true);return;}
 status(type==='trial'?'Purchasing the 2-day B-UN trial…':'Purchasing MetConnect+…');
 const r=await sb.rpc(type==='trial'?'metconnect_bun_purchase_trial':'metconnect_bun_purchase_plus',{p_metpay_password:password});
 if(r.error){status(r.error.message,true);return;}
 const input=document.getElementById('mc-bun-metpay');if(input)input.value='';
 await loadBunStatus();status(type==='trial'?'B-UN 2-day trial activated for π2.':'MetConnect+ activated for π30/month.');
}
async function saveBunIdentity(){
 const username=profile.username||'';
 const password=document.getElementById('mc-bun-account-password')?.value||'';
 const metpayPassword=document.getElementById('mc-bun-metpay')?.value||'';
 const handle=document.getElementById('mc-bun-handle')?.value.trim()||'';
 const business=document.getElementById('mc-bun-business-name')?.value.trim()||'';
 const out=document.getElementById('mc-bun-account-status');
 try{
  if(!MC.bunStatus?.active)throw new Error('Start the B-UN trial or subscribe to MetConnect+ first.');
  if(typeof window.verifyMetAccountCredentials!=='function')throw new Error('Secure Metxon account verification is unavailable. Reload this MetConnect window and try again.');
  if(!password)throw new Error('Enter your Metxon account password to verify this change.');
  await window.verifyMetAccountCredentials(username,password,profile.id);
  const r=await sb.rpc('metconnect_bun_save_identity',{
   p_username:handle,p_business_name:business,p_metxon_username:username,
   p_metxon_password:password,p_bun_id:MC.editingBunId
  });
  if(r.error)throw r.error;
  const input=document.getElementById('mc-bun-account-password');if(input)input.value='';
  await loadBunStatus();
  MC.ownBun=MC.bunProfiles.find(x=>x.id===r.data.id)||MC.ownBun;
  MC.bunStatus.bun=MC.ownBun;
  MC.editingBunId=null;renderBunAccount();await refreshBunContacts();
  status('B-UN @'+r.data.username+' saved. Account-level blocks remain in place across all your B-UN handles.');
 }catch(e){if(out)out.textContent=e.message||'Could not save B-UN identity.';status(e.message||'Could not save B-UN identity.',true);}
}
async function addBunContact(e){
 e.preventDefault();const input=document.getElementById('mc-username'),username=input.value.trim();if(!username)return;
 try{
  const r=await sb.rpc('metconnect_bun_add_contact',{p_username:username});
  if(r.error)throw r.error;
  input.value='';await refreshBunContacts();await selectContact(r.data.owner_id,'bun');
  status('@'+r.data.username+' added to B-UN contacts'+(r.data.foul_un&&r.data.foul_un!=='No Foul UN rating'?' · '+r.data.foul_un:'')+'.');
 }catch(e){status(e.message||'Could not add this B-UN username.',true);}
}

function bind(){
const callControls=document.getElementById('mc-call-controls'),mainGrid=document.querySelector('#mc-root .mc-grid');if(callControls&&mainGrid&&callControls.parentElement!==mainGrid.parentElement)mainGrid.insertAdjacentElement('afterend',callControls);
document.getElementById('mc-add').onsubmit=addContact;document.getElementById('mc-send').onsubmit=sendMessage;document.getElementById('mc-remove').onclick=removeContact;document.getElementById('mc-block').onclick=blockContact;document.getElementById('mc-report').onclick=reportContact;document.getElementById('mc-refresh').onclick=()=>{refreshContacts();if(MC.currentTab==='bun'){loadBunStatus();refreshBunContacts();}};document.getElementById('mc-permissions').onclick=permissions;document.getElementById('mc-speaker').onclick=chooseSpeaker;document.getElementById('mc-notify').onclick=requestNotifications;document.getElementById('mc-notify-setup').onclick=requestNotifications;document.getElementById('mc-continue').onclick=async()=>{try{const ctx=audioContext();if(ctx&&ctx.state==='suspended')await ctx.resume();}catch(e){}await finishSetup();};updateNotificationUi();
const setTab=tab=>{
 if(tab!=='bun')MC.bunAction=null;
 MC.currentTab=tab;
 
 const root=document.getElementById('mc-root');const grid=root.querySelector('.mc-grid');root.classList.toggle('mc-subpage',tab!=='contacts');if(grid){grid.classList.toggle('mc-chat-focus',tab==='talk');grid.classList.toggle('mc-saved-only',tab==='contacts');grid.classList.toggle('mc-list-only',['screen','voice','video','bun'].includes(tab));grid.classList.remove('mc-bun-message');}const sectionTitle=document.getElementById('mc-section-title');if(sectionTitle)sectionTitle.textContent=({talk:'Talk',screen:'Share Screen Call',voice:'Voice Call',video:'Video Call',bun:'B-UN'}[tab]||'MetConnect');
 root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 root.querySelectorAll('[data-call]').forEach(b=>b.classList.toggle('mc-hidden',!['screen','voice','video'].includes(tab)||b.dataset.call!==tab));
 const help=document.getElementById('mc-tab-help');
 const messages=document.getElementById('mc-messages');
 const composer=document.getElementById('mc-send');
 const titles={
  contacts:'Saved usernames: choose a contact to view your conversations.',
  talk:'Talk: select a saved username. New messages are end-to-end encrypted and automatically deleted after 30 days.',
  screen:'Share Screen Call: select a contact, then tap Start Share Screen Call below.',
  voice:'Voice Call: select a contact, then tap Start Voice Call below.',
  video:'Video Call: select a contact, then tap Start Video Call below.',
  bun:'B-UN: select one of your paid business handles, then choose a saved MetConnect username below. Your business identity will appear to the recipient. B-UN supports messages and voice calls only.'
 };
 if(help){help.textContent=titles[tab]||titles.contacts;help.classList.toggle('mc-hidden',tab==='talk'||tab==='bun'||['screen','voice','video'].includes(tab));}
  const bunAccount=document.getElementById('mc-bun-account');if(bunAccount){bunAccount.classList.toggle('mc-hidden',tab!=='bun');if(tab==='bun')loadBunStatus();}
  const listTitle=document.getElementById('mc-list-title');if(listTitle)listTitle.textContent=tab==='bun'?'Choose a MetConnect username':'Saved Usernames';
  const addInput=document.getElementById('mc-username');if(addInput)addInput.placeholder='Metxon username';
  const addForm=document.getElementById('mc-add');if(addForm)addForm.classList.toggle('mc-hidden',tab!=='contacts');const addButton=document.querySelector('#mc-add button');if(addButton)addButton.textContent='Add';
  const callControls=document.getElementById('mc-call-controls');if(callControls)callControls.classList.toggle('mc-hidden',!['screen','voice','video','bun'].includes(tab));
  root.querySelectorAll('[data-call]').forEach(b=>b.classList.toggle('mc-hidden',tab==='bun'?b.dataset.call!=='voice':!['screen','voice','video'].includes(tab)||b.dataset.call!==tab));
 const bunListTitle=document.getElementById('mc-list-title');if(bunListTitle&&tab==='bun')bunListTitle.textContent='Choose a MetConnect username';
 const title=document.getElementById('mc-title');
 const subtitle=document.getElementById('mc-subtitle');
 const selected=person(MC.selected);
 if(title)title.textContent=selected?'@'+selected.username:(tab==='contacts'?'Saved Usernames':'Choose a username');
 if(subtitle)subtitle.textContent=selected?(selected.display_name||'Metxon user')+' · MetConnect':(tab==='talk'?'Choose a username to start a private chat.':'Select a saved username first.');
 if(composer)composer.classList.toggle('mc-hidden',!((tab==='talk'&&!!MC.selected)||(tab==='bun'&&MC.bunAction==='message'&&!!MC.selected)));
 if(messages)messages.classList.toggle('mc-hidden',!(tab==='talk'||(tab==='bun'&&MC.bunAction==='message'&&!!MC.selected)));
 const back=document.getElementById('mc-chat-back');if(back){const inChat=!!MC.selected&&(tab==='talk'||(tab==='bun'&&MC.bunAction==='message'));back.classList.toggle('mc-hidden',!inChat);back.textContent=tab==='bun'?'Recipients':'Chats';back.onclick=()=>{MC.selected=null;MC.selectedBunId=null;MC.activeBunContact=null;MC.activeBunClient=null;MC.selectedKind='regular';if(tab==='bun'){document.querySelector('#mc-root .mc-grid')?.classList.remove('mc-bun-message');document.getElementById('mc-root')?.classList.remove('mc-bun-chat-mode');document.getElementById('mc-bun-account')?.classList.remove('mc-hidden');document.getElementById('mc-call-controls')?.classList.remove('mc-hidden');MC.bunAction=null;loadMessages(null);refreshContacts();status('Choose Message or Call, then select a MetConnect username.');}else setTab('talk');};}
 if(tab==='talk'&&!MC.selected){const text=document.getElementById('mc-text'),send=document.getElementById('mc-send-btn');if(text)text.disabled=true;if(send)send.disabled=true;renderTalkChooser();}
 if(tab==='talk'&&MC.selected){const text=document.getElementById('mc-text'),send=document.getElementById('mc-send-btn');if(text)text.disabled=false;if(send)send.disabled=false;}
 if(tab==='bun'){refreshContacts().then(()=>refreshBunContacts());status('B-UN mode: choose a saved MetConnect username. Your selected paid business identity will be shown to the recipient.');}else {refreshContacts();status(tab==='contacts'?'Saved usernames and conversations.':tab==='talk'?'Private messaging selected.':titles[tab]||'Choose a tab.');}
};
document.getElementById('mc-root').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));document.getElementById('mc-home-back').onclick=()=>setTab('contacts');document.getElementById('mc-section-home').onclick=()=>setTab('contacts');
setTab(MC.currentTab||'contacts');
document.getElementById('mc-root').querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>startCall(b.dataset.call));
}
async function openApp(){
if(!profile?.id)return toast('Sign in to your Metxon account to open MetConnect.','error');
if(!installed?.has('metconnect')){
 const app=APPS.find(x=>x.id==='metconnect');
 const body='<div class="mc-setup"><div class="eyebrow">METCONNECT · PURCHASE</div><h2>Unlock MetConnect</h2><p>Install MetConnect with your MetPay transaction password. One-time installation price: <strong>π50 (50 JP)</strong>. This app installation is shared across your Metxon account.</p><div class="field"><label for="mc-install-password">MetPay transaction password</label><input id="mc-install-password" class="mc-input" type="password" autocomplete="current-password" maxlength="128"></div><div class="mc-actions"><button class="mc-btn primary" id="mc-install-pay">Pay π50 and open MetConnect</button></div><div class="mc-note" id="mc-install-status" role="status"></div></div>';
 renderLocalApp(app,body);
 const button=document.getElementById('mc-install-pay');
 button.onclick=async()=>{
  const password=document.getElementById('mc-install-password').value;
  if(!password){document.getElementById('mc-install-status').textContent='Enter your MetPay password to continue.';return;}
  button.disabled=true;document.getElementById('mc-install-status').textContent='Verifying MetPay and installing…';
  try{
   const result=await sb.rpc('mettin_install_nebula_app',{p_app_id:'metconnect',p_metpay_password:password});
   if(result.error)throw result.error;
   if(!result.data?.installed)throw new Error('MetConnect installation was not confirmed.');
   document.getElementById('mc-install-password').value='';
   await getProfile();await refreshOverview();await loadStore();await loadMetPay();
   if(!installed?.has('metconnect'))throw new Error('The installation was paid but the app entitlement has not refreshed. Reload Mettin before retrying.');
   await openApp();
  }catch(e){document.getElementById('mc-install-status').textContent=e.message||'Could not install MetConnect.';button.disabled=false;}
 };
 return;
}
renderLocalApp(APPS.find(x=>x.id==='metconnect'),'<div class="mc-empty">Opening MetConnect…</div>');const host=document.getElementById('launchContent');if(!host)return;host.innerHTML=appMarkup();bind();
try{updateNotificationUi();if(await loadSetup()){document.getElementById('mc-main').classList.remove('mc-hidden');await refreshContacts();await loadBunStatus();await initMetConnectBackground();}else document.getElementById('mc-setup').classList.remove('mc-hidden');}
catch(e){document.getElementById('mc-setup').classList.remove('mc-hidden');document.getElementById('mc-setup-status').textContent=e.message||'Could not load setup.';}
if(!MC.messageChannel)await initMetConnectBackground();
}
async function shutdown(){stopRing();stopOutgoing();if(MC.active)await endCall();if(profile?.id){try{await sb.from('metconnect_push_subscriptions').delete().eq('user_id',profile.id);}catch(e){console.warn('MetConnect push sign-out cleanup:',e);}}MC.pushReady=false;if(MC.incomingChannel){sb.removeChannel(MC.incomingChannel);MC.incomingChannel=null;}if(MC.messageChannel){sb.removeChannel(MC.messageChannel);MC.messageChannel=null;}}
function initBackground(){if(typeof profile!=='undefined'&&profile&&typeof installed!=='undefined'&&installed.has('metconnect'))initMetConnectBackground().catch(e=>console.warn('MetConnect listener:',e));if(new URLSearchParams(location.search).get('openApp')==='metconnect'){let attempts=0,launching=false;const timer=setInterval(async()=>{attempts++;if(!launching&&typeof profile!=='undefined'&&profile?.id&&typeof installed!=='undefined'&&typeof openApp==='function'){launching=true;clearInterval(timer);try{if(typeof loadStore==='function')await loadStore();await openApp();}catch(e){console.error('MetConnect popup launch failed:',e);}}else if(attempts>90)clearInterval(timer);},500);}}
window.initMetConnectBackground=initMetConnectBackground;
window.launchMetConnectApp=openApp;window.metconnectShutdown=shutdown;window.openMetConnect=function(){const url=new URL('./metconnect.html',location.href).href;const win=window.open(url,'MetConnect','popup,width=1120,height=820,resizable=yes,scrollbars=yes');if(!win)status('Your browser blocked the MetConnect window. Allow pop-ups for this website and tap MetConnect again.',true);return win;};
window.addEventListener('beforeunload',()=>{if(MC.peer)MC.peer.close();});
window.dispatchEvent(new Event('metconnect-ready'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initBackground,{once:true});else initBackground();
})();
