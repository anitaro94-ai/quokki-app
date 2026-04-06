const GOOGLE_CAL_SCOPE='https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_CAL_LOCAL_PREFIX='quokki_google_calendar_';
const GOOGLE_CAL_CONTEXT_DEFAULT={connected:false,lastSync:null,today:{pilates:false,futbol:false,travel:false,travelLabel:''}};
var gcalEnabled=false;
var gcalAccessToken='';
var gcalTokenClient=null;
var gcalTokenClientId='';
var gcalLastSyncISO='';

window.GCAL_CONTEXT=Object.assign({},GOOGLE_CAL_CONTEXT_DEFAULT);

function gcalUserKey(){
  if(!sbUser||!sbUser.id)return GOOGLE_CAL_LOCAL_PREFIX+'guest';
  return GOOGLE_CAL_LOCAL_PREFIX+sbUser.id;
}

function gcalReadLocal(){
  try{
    var raw=localStorage.getItem(gcalUserKey());
    if(!raw)return {enabled:false,clientId:''};
    var parsed=JSON.parse(raw);
    return {
      enabled:!!(parsed&&parsed.enabled),
      clientId:(parsed&&typeof parsed.clientId==='string')?parsed.clientId.trim():''
    };
  }catch(e){
    return {enabled:false,clientId:''};
  }
}

function gcalWriteLocal(data){
  try{
    localStorage.setItem(gcalUserKey(),JSON.stringify({enabled:!!data.enabled,clientId:data.clientId||''}));
  }catch(e){}
}

function ymdLocal(date){
  var d=date instanceof Date?date:new Date(date);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function gcalConfigClientId(){
  var local=gcalReadLocal();
  if(local.clientId)return local.clientId;
  if(typeof window.GOOGLE_CALENDAR_CLIENT_ID==='string'&&window.GOOGLE_CALENDAR_CLIENT_ID.trim())return window.GOOGLE_CALENDAR_CLIENT_ID.trim();
  return '';
}

function persistGoogleCalendarPreference(){
  var local=gcalReadLocal();
  local.enabled=gcalEnabled;
  gcalWriteLocal(local);
  if(typeof saveCloudSettings==='function'){
    saveCloudSettings({
      googleCalendar:{
        enabled:gcalEnabled,
        clientId:local.clientId||''
      }
    });
  }
}

function applyCloudGoogleCalendarPreference(pref){
  if(!pref||typeof pref!=='object')return;
  var local=gcalReadLocal();
  if(typeof pref.enabled==='boolean')local.enabled=pref.enabled;
  if(typeof pref.clientId==='string'&&pref.clientId.trim()&&!local.clientId)local.clientId=pref.clientId.trim();
  gcalWriteLocal(local);
  gcalEnabled=!!local.enabled;
}

function gcalSetStatus(text,isError){
  var el=document.getElementById('gcal-status');
  if(!el)return;
  el.textContent=text||'';
  el.style.color=isError?'#C0504D':'var(--mist)';
}

function renderGoogleCalendarState(){
  var btn=document.getElementById('gcal-btn');
  if(!btn)return;
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
  btn.textContent='📆 Reintentar vinculación';
  gcalSetStatus('Pendiente de permisos o sincronización.',true);
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

function requestGoogleToken(interactive){
  return new Promise(function(resolve,reject){
    if(!window.google||!google.accounts||!google.accounts.oauth2){
      reject(new Error('Google Identity no disponible'));
      return;
    }
    var clientId=gcalConfigClientId();
    if(!clientId){
      reject(new Error('Falta Google Client ID'));
      return;
    }
    if(!gcalTokenClient||gcalTokenClientId!==clientId){
      gcalTokenClientId=clientId;
      gcalTokenClient=google.accounts.oauth2.initTokenClient({
        client_id:clientId,
        scope:GOOGLE_CAL_SCOPE,
        callback:function(resp){
          if(!resp||resp.error){reject(new Error(resp&&resp.error?resp.error:'No se pudo autorizar'));return;}
          gcalAccessToken=resp.access_token||'';
          resolve(gcalAccessToken);
        }
      });
    } else {
      gcalTokenClient.callback=function(resp){
        if(!resp||resp.error){reject(new Error(resp&&resp.error?resp.error:'No se pudo autorizar'));return;}
        gcalAccessToken=resp.access_token||'';
        resolve(gcalAccessToken);
      };
    }
    gcalTokenClient.requestAccessToken({prompt:interactive?'consent':''});
  });
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

async function syncGoogleCalendarIfEnabled(interactive){
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
    await requestGoogleToken(!!interactive);
    var events=await fetchGoogleEvents();
    parseGoogleCalendarEvents(events);
    gcalLastSyncISO=window.GCAL_CONTEXT.lastSync||'';
    renderGoogleCalendarState();
    return true;
  }catch(e){
    window.GCAL_CONTEXT=Object.assign({},GOOGLE_CAL_CONTEXT_DEFAULT);
    gcalSetStatus('No se pudo leer Google Calendar. Revisá permisos y Client ID.',true);
    renderGoogleCalendarState();
    return false;
  }
}

async function connectGoogleCalendar(){
  var local=gcalReadLocal();
  var clientId=local.clientId||'';
  if(!clientId){
    var next=window.prompt('Pegá tu Google OAuth Client ID para Calendar:',clientId);
    if(!next||!next.trim()){
      gcalSetStatus('Falta configurar Google Client ID.',true);
      return;
    }
    clientId=next.trim();
    local.clientId=clientId;
    gcalWriteLocal(local);
  }
  gcalEnabled=true;
  persistGoogleCalendarPreference();
  var ok=await syncGoogleCalendarIfEnabled(true);
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
