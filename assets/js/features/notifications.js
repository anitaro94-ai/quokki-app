var NOTIF_TIMES=[
  {id:'manana', hora:8,  min:0,  msg:'☀️ Buenos días! Mirá tus hábitos y empezá con agua.'},
  {id:'mediodia',hora:13,min:0,  msg:'🥗 Hora del almuerzo. ¿Ya registraste tus hábitos?'},
  {id:'tarde',  hora:17, min:30, msg:'💧 ¿Llegaste a los 3 litros de agua hoy?'},
  {id:'noche',  hora:21, min:0,  msg:'🌙 Cerrá bien el día. Tildá lo que hiciste en Quokki!'}
];
var NOTIF_PREF_KEY='quokki_notifications_enabled';
var notifTimeouts=[];
var notifIntervals=[];
function setNotifStatus(text,isError){
  var status=document.getElementById('notif-status');
  if(!status)return;
  status.textContent=text||'';
  status.style.color=isError?'#C0504D':'var(--mist)';
}

function notificationsEnabled(){
  try{return localStorage.getItem(NOTIF_PREF_KEY)==='true';}catch(e){return false;}
}

function setNotificationsEnabled(value,syncCloud){
  try{localStorage.setItem(NOTIF_PREF_KEY,value?'true':'false');}catch(e){}
  if(syncCloud!==false&&typeof saveCloudSettings==='function'){
    saveCloudSettings({notificationsEnabled:!!value});
  }
}

function applyCloudNotificationPreference(value){
  if(typeof value!=='boolean')return;
  setNotificationsEnabled(value,false);
  if(value&&Notification.permission==='granted'){
    registrarSW();
    mostrarBotonNotif(true);
  }else{
    clearNotificationSchedules();
    mostrarBotonNotif(value);
  }
}

function clearNotificationSchedules(){
  notifTimeouts.forEach(function(id){clearTimeout(id);});
  notifIntervals.forEach(function(id){clearInterval(id);});
  notifTimeouts=[];
  notifIntervals=[];
}

function pedirPermiso(){
  if(!('Notification' in window))return Promise.resolve('unsupported');
  return Notification.requestPermission();
}

function toggleNotifications(){
  if(notificationsEnabled()){
    clearNotificationSchedules();
    setNotificationsEnabled(false,true);
    mostrarBotonNotif(false);
    setNotifStatus('Recordatorios desactivados.');
    return;
  }
  if(!('Notification' in window)){
    setNotificationsEnabled(true,true);
    mostrarBotonNotif(true);
    setNotifStatus('En este navegador no se pueden pedir permisos de notificación.',true);
    return;
  }
  if(Notification.permission==='granted'){
    setNotificationsEnabled(true,true);
    registrarSW();
    mostrarBotonNotif(true);
    setNotifStatus('Recordatorios activados.');
    return;
  }
  pedirPermiso().then(function(permission){
    if(permission==='granted'){
      setNotificationsEnabled(true,true);
      registrarSW();
      mostrarBotonNotif(true);
      setNotifStatus('Recordatorios activados.');
    } else if(permission==='unsupported'){
      setNotificationsEnabled(true,true);
      mostrarBotonNotif(true);
      setNotifStatus('Este dispositivo no soporta notificaciones web completas.',true);
    } else {
      mostrarBotonNotif(false);
      setNotifStatus('No se dieron permisos para notificaciones.',true);
    }
  });
}

function registrarSW(){
  if(!('serviceWorker' in navigator)){
    setNotifStatus('Este dispositivo no permite recordatorios en segundo plano.',true);
    return;
  }
  navigator.serviceWorker.register('sw.js').then(function(reg){
    window._swReg=reg;
    programarNotificaciones(reg);
  }).catch(function(e){
    console.log('SW error',e);
    setNotifStatus('No se pudo registrar el sistema de recordatorios.',true);
  });
}

function programarNotificaciones(reg){
  clearNotificationSchedules();
  if(!notificationsEnabled())return;
  var ahora=new Date();
  NOTIF_TIMES.forEach(function(n){
    var t=new Date();
    t.setHours(n.hora,n.min,0,0);
    if(t<=ahora)t.setDate(t.getDate()+1);
    var delay=t-ahora;
    var timeoutId=setTimeout(function(){
      if(!notificationsEnabled())return;
      if(Notification.permission==='granted'){
        reg.showNotification('Quokki 🐾',{
          body:n.msg,
          icon:'img/base.png',
          badge:'img/base.png',
          tag:n.id,
          renotify:true
        });
      }
      // reprogramar para mañana
      var intervalId=setInterval(function(){
        if(notificationsEnabled()&&Notification.permission==='granted'){
          reg.showNotification('Quokki 🐾',{body:n.msg,icon:'img/base.png',tag:n.id,renotify:true});
        }
      },86400000);
      notifIntervals.push(intervalId);
    },delay);
    notifTimeouts.push(timeoutId);
  });
}

function mostrarBotonNotif(activo){
  var btn=document.getElementById('notif-btn');
  if(!btn)return;
  btn.textContent=activo?'🔔 Desactivar recordatorios':'🔕 Activar recordatorios';
  btn.style.background=activo?'rgba(138,122,170,.15)':'';
  btn.style.color=activo?'var(--check)':'var(--stone)';
}

// Al cargar: verificar estado
if('Notification' in window){
  if(Notification.permission==='granted'&&notificationsEnabled()){registrarSW();mostrarBotonNotif(true);}
  else{mostrarBotonNotif(false);}
} else {
  mostrarBotonNotif(notificationsEnabled());
}
