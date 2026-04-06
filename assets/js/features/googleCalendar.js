const GOOGLE_CAL_LOCAL_PREFIX='quokki_google_calendar_';
const GOOGLE_CAL_CONTEXT_DEFAULT={connected:false,lastSync:null,today:{pilates:false,futbol:false,travel:false,travelLabel:''}};
var gcalEnabled=false;
var gcalAccessToken='';
var gcalLastSyncISO='';

window.GCAL_CONTEXT=Object.assign({},GOOGLE_CAL_CONTEXT_DEFAULT);

function gcalUserKey(){
  if(!sbUser||!sbUser.id)return GOOGLE_CAL_LOCAL_PREFIX+'guest';
  return GOOGLE_CAL_LOCAL_PREFIX+sbUser.id;
}

function gcalReadLocal(){
  try{
    var raw=localStorage.getItem(gcalUserKey());
    if(!raw)return {enabled:false};
    var parsed=JSON.parse(raw);
    return {enabled:!!(parsed&&parsed.enabled)};
  }catch(e){
    return {enabled:false};
  }
}

function gcalWriteLocal(data){
  try{
    localStorage.setItem(gcalUserKey(),JSON.stringify({enabled:!!data.enabled}));
  }catch(e){}
}

function ymdLocal(date){
  var d=date instanceof Date?date:new Date(date);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function persistGoogleCalendarPreference(){
  var local=gcalReadLocal();
  local.enabled=gcalEnabled;
  gcalWriteLocal(local);
  if(typeof saveCloudSettings==='function'){
    saveCloudSettings({googleCalendar:{enabled:gcalEnabled}});
  }
}

function applyCloudGoogleCalendarPreference(pref){
  if(!pref||typeof pref!=='object')return;
  var local=gcalReadLocal();
  if(typeof pref.enabled==='boolean')local.enabled=pref.enabled;
  gcalWriteLocal(local);
  gcalEnabled=!!local.enabled;
}

function gcalSetStatus(text,isError){
  var el=document.getElementById('gcal-status');
  if(!el)return;
  el.textContent=text||'';
  el.style.color=isError?'#C0504D':'var(--mist)';
}

function isGoogleSession(session){
  if(!session||!session.user)return false;
  var providers=(session.user.app_metadata&&Array.isArray(session.user.app_metadata.providers))?session.user.app_metadata.providers:[];
  if(providers.includes('google'))return true;
  return session.user.app_metadata&&session.user.app_metadata.provider==='google';
}

function renderGoogleCalendarState(){
  var btn=document.getElementById('gcal-btn');
  if(!btn)return;
  if(!sbUser||demoMode){
    btn.textContent='📆 Calendar no disponible';
    btn.style.opacity='0.6';
    btn.style.pointerEvents='none';
    gcalSetStatus('Iniciá sesión para sincronizar calendario.',true);
    return;
  }
  btn.style.opacity='1';
  btn.style.pointerEvents='auto';
  var connected=window.GCAL_CONTEXT&&window.GCAL_CONTEXT.connected;
  if(!gcalEnabled){
    btn.textContent='📆 Vincular Google Calendar';
    gcalSetStatus('Sincronizá tus eventos para adaptar rutinas por deportes y viajes.',false);
    return;
  }
  if(connected){
    btn.textContent='📆 Desvincular Google Calendar';
    gcalSetStatus('Google Calendar activo'+(gcalLastSyncISO?' · Última sync '+new Date(gcalLastSyncISO).toLocaleTimeString():'')+'.',false);
    return;
  }
  btn.textContent='📆 Reintentar sincronización';
  gcalSetStatus('Iniciá sesión con Google para acceder a Calendar.',true);
}

function resetGoogleCalendarContext(){
  window.GCAL_CONTEXT=Object.assign({},GOOGLE_CAL_CONTEXT_DEFAULT);
  gcalAccessToken='';
  gcalLastSyncISO='';
  renderGoogleCalendarState();
}

function parseGoogleCalendarEvents(events){
  var today=ymdLocal(new Date());
  var sportWords={futbol:['futbol','fútbol','partido','cancha'],pilates:['pilates','yoga','movilidad']};
  var travelWords=['viaje','vuelo','flight','aeropuerto','hotel','check-in','boarding','avion','avión','mba'];
  var todayState={pilates:false,futbol:false,travel:false,travelLabel:''};
  (events||[]).forEach(function(ev){
    if(!ev||!ev.start)return;
    var day=ev.start.date||ymdLocal(ev.start.dateTime||new Date());
    if(day!==today)return;
    var text=((ev.summary||'')+' '+(ev.description||'')+' '+(ev.location||'')).toLowerCase();
    if(sportWords.futbol.some(function(w){return text.includes(w);})){todayState.futbol=true;}
    if(sportWords.pilates.some(function(w){return text.includes(w);})){todayState.pilates=true;}
    if(travelWords.some(function(w){return text.includes(w);})){
      todayState.travel=true;
      if(!todayState.travelLabel)todayState.travelLabel=ev.summary||'Viaje';
    }
  });
  window.GCAL_CONTEXT={connected:true,lastSync:new Date().toISOString(),today:todayState};
}

async function fetchGoogleEvents(){
  var start=new Date();start.setHours(0,0,0,0);
  var end=new Date();end.setDate(end.getDate()+14);end.setHours(23,59,59,999);
  var params=[
    'singleEvents=true',
    'orderBy=startTime',
    'maxResults=250',
    'timeMin='+encodeURIComponent(start.toISOString()),
    'timeMax='+encodeURIComponent(end.toISOString())
  ].join('&');
  var url='https://www.googleapis.com/calendar/v3/calendars/primary/events?'+params;
  var resp=await fetch(url,{headers:{Authorization:'Bearer '+gcalAccessToken}});
  if(!resp.ok)throw new Error('Calendar API '+resp.status);
  var body=await resp.json();
  return body.items||[];
}

async function syncGoogleCalendarIfEnabled(){
  if(demoMode||!sbUser||!sbUser.id){
    resetGoogleCalendarContext();
    return false;
  }
  var local=gcalReadLocal();
  gcalEnabled=!!local.enabled;
  if(!gcalEnabled){
    resetGoogleCalendarContext();
    return false;
  }
  try{
    var {data:{session}}=await sb.auth.getSession();
    if(!session||!isGoogleSession(session)||!session.provider_token){
      throw new Error('Falta sesión Google con provider token');
    }
    gcalAccessToken=session.provider_token;
    var events=await fetchGoogleEvents();
    parseGoogleCalendarEvents(events);
    gcalLastSyncISO=window.GCAL_CONTEXT.lastSync||'';
    renderGoogleCalendarState();
    return true;
  }catch(e){
    window.GCAL_CONTEXT=Object.assign({},GOOGLE_CAL_CONTEXT_DEFAULT);
    gcalSetStatus('No se pudo leer Google Calendar. Entrá con Google para habilitarlo.',true);
    renderGoogleCalendarState();
    return false;
  }
}

async function connectGoogleCalendar(){
  gcalEnabled=true;
  persistGoogleCalendarPreference();
  var ok=await syncGoogleCalendarIfEnabled();
  if(ok&&typeof initApp==='function')initApp();
}

function disconnectGoogleCalendar(){
  gcalEnabled=false;
  persistGoogleCalendarPreference();
  resetGoogleCalendarContext();
  if(typeof initApp==='function')initApp();
}

function toggleGoogleCalendarConnection(){
  if(gcalEnabled)disconnectGoogleCalendar();
  else connectGoogleCalendar();
}

gcalEnabled=!!gcalReadLocal().enabled;
renderGoogleCalendarState();
