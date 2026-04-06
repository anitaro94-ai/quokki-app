// ── SUPABASE ─────────────────────────────────────────────────
const SB_URL='https://jsubttrqvgulhbmkxfmj.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdWJ0dHJxdmd1bGhibWt4Zm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTc5MDQsImV4cCI6MjA5MDk5MzkwNH0.w_ZrPWixUGbLjI1qwdNhpD6e-vt8VV-LtsQCeux4QgU';
const sb=supabase.createClient(SB_URL,SB_KEY);
const STORAGE_KEY_PREFIX='quokki_day_';
const LEGACY_STORAGE_KEY_PREFIX='sirena_day_';
const USER_STATE_TABLE='app_user_state';
const ACTIVE_SESSION_TABLE='app_active_sessions';
const USER_STATE_LOCAL_PREFIX='quokki_user_state_';
var sbUser=null;
var profileName='';
var profileObjectives=[];
var appMode='classic';
var editingConfig=false;
var favoriteSports=['futbol','pilates'];
var demoMode=false;
var cloudState={settings:{},runtime:{}};
var cloudStateLoaded=false;
var cloudStateRemoteAvailable=true;
var activeSessionId=null;
var activeSessionHeartbeat=null;
var activeSessionRemoteAvailable=true;

function isObject(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function mergeObjects(base,patch){
  var out=Object.assign({},base||{});
  Object.keys(patch||{}).forEach(function(key){
    var next=patch[key];
    if(isObject(next)&&isObject(out[key]))out[key]=mergeObjects(out[key],next);
    else out[key]=next;
  });
  return out;
}

function userStateLocalKey(){
  if(!sbUser||!sbUser.id)return USER_STATE_LOCAL_PREFIX+'guest';
  return USER_STATE_LOCAL_PREFIX+sbUser.id;
}

function readLocalUserState(){
  try{
    var raw=localStorage.getItem(userStateLocalKey());
    if(!raw)return {settings:{},runtime:{}};
    var parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object')return {settings:{},runtime:{}};
    return {settings:parsed.settings||{},runtime:parsed.runtime||{}};
  }catch(e){return {settings:{},runtime:{}};}
}

function writeLocalUserState(state){
  try{localStorage.setItem(userStateLocalKey(),JSON.stringify(state||{settings:{},runtime:{}}));}catch(e){}
}

async function loadCloudState(){
  var localState=readLocalUserState();
  cloudState={settings:localState.settings||{},runtime:localState.runtime||{}};
  cloudStateLoaded=true;
  if(!sbUser||demoMode||!cloudStateRemoteAvailable)return cloudState;
  try{
    var {data,error}=await sb.from(USER_STATE_TABLE).select('data').eq('user_id',sbUser.id).single();
    if(error&&error.code!=='PGRST116')throw error;
    if(data&&data.data&&typeof data.data==='object'){
      cloudState=mergeObjects(cloudState,{settings:data.data.settings||{},runtime:data.data.runtime||{}});
      writeLocalUserState(cloudState);
    }
  }catch(e){
    cloudStateRemoteAvailable=false;
  }
  return cloudState;
}

async function persistCloudState(){
  if(!sbUser||demoMode||!cloudStateRemoteAvailable)return;
  try{
    var {error}=await sb.from(USER_STATE_TABLE).upsert({user_id:sbUser.id,data:cloudState},{onConflict:'user_id'});
    if(error)throw error;
  }catch(e){
    cloudStateRemoteAvailable=false;
  }
}

function saveCloudSettings(partialSettings){
  cloudState=mergeObjects(cloudState,{settings:partialSettings||{}});
  writeLocalUserState(cloudState);
  return persistCloudState();
}

function saveCloudRuntime(partialRuntime){
  cloudState=mergeObjects(cloudState,{runtime:partialRuntime||{}});
  writeLocalUserState(cloudState);
  return persistCloudState();
}

function getCloudRuntime(key){
  if(!cloudState||!cloudState.runtime)return undefined;
  return key?cloudState.runtime[key]:cloudState.runtime;
}

async function startActiveSession(){
  if(!sbUser||demoMode||!activeSessionRemoteAvailable||activeSessionId)return;
  try{
    var payload={user_id:sbUser.id,user_agent:navigator.userAgent||''};
    var {data,error}=await sb.from(ACTIVE_SESSION_TABLE).insert(payload).select('id').single();
    if(error)throw error;
    activeSessionId=data&&data.id?data.id:null;
    if(activeSessionHeartbeat)clearInterval(activeSessionHeartbeat);
    if(activeSessionId){
      activeSessionHeartbeat=setInterval(function(){
        if(!activeSessionId||!activeSessionRemoteAvailable)return;
        sb.from(ACTIVE_SESSION_TABLE).update({last_seen:new Date().toISOString()}).eq('id',activeSessionId).then(function(result){
          if(result&&result.error)activeSessionRemoteAvailable=false;
        }).catch(function(){activeSessionRemoteAvailable=false;});
      },60000);
    }
  }catch(e){
    activeSessionRemoteAvailable=false;
  }
}

function endActiveSession(){
  if(activeSessionHeartbeat){clearInterval(activeSessionHeartbeat);activeSessionHeartbeat=null;}
  if(!activeSessionId||!activeSessionRemoteAvailable)return Promise.resolve();
  var currentId=activeSessionId;
  activeSessionId=null;
  return sb.from(ACTIVE_SESSION_TABLE).update({ended_at:new Date().toISOString(),last_seen:new Date().toISOString()}).eq('id',currentId).then(function(result){
    if(result&&result.error)activeSessionRemoteAvailable=false;
  }).catch(function(){activeSessionRemoteAvailable=false;});
}

// Mostrar pantalla correcta según auth
async function checkAuth(){
  var {data:{session}}=await sb.auth.getSession();
  if(!session){
    endActiveSession();
    if(typeof resetGoogleCalendarContext==='function')resetGoogleCalendarContext();
    try{
      var demoRaw=localStorage.getItem(demoProfileKey());
      if(demoRaw){
        var demoProfile=JSON.parse(demoRaw);
        demoMode=true;
        sbUser={id:'demo-user'};
        profileName=demoProfile.nombre||'Demo';
        profileObjectives=Array.isArray(demoProfile.objetivos)?demoProfile.objetivos:[];
        appMode=demoProfile.mode||'classic';
        favoriteSports=Array.isArray(demoProfile.favoriteSports)&&demoProfile.favoriteSports.length?demoProfile.favoriteSports:['futbol','pilates'];
        cloudState=readLocalUserState();
        cloudStateLoaded=true;
        showScreen('hoy');
        initApp();
        return;
      }
    }catch(e){}
    showScreen('auth');return;
  }
  demoMode=false;
  sbUser=session.user;
  // Ver si tiene perfil
  var {data:prof}=await sb.from('profiles').select('nombre,objetivos').eq('id',sbUser.id).single();
  if(!prof||!prof.nombre){showScreen('onboarding');}
  else{
    // Usar nombre real en la app
    var gname=document.getElementById('gname');
    profileName=prof.nombre;
    profileObjectives=Array.isArray(prof.objetivos)?prof.objetivos:[];
    await loadCloudState();
    loadUserConfig();
    if(cloudState.settings&&cloudState.settings.mode)appMode=cloudState.settings.mode;
    if(cloudState.settings&&Array.isArray(cloudState.settings.objectives)&&cloudState.settings.objectives.length)profileObjectives=cloudState.settings.objectives.slice();
    if(cloudState.settings&&Array.isArray(cloudState.settings.favoriteSports)&&cloudState.settings.favoriteSports.length)favoriteSports=cloudState.settings.favoriteSports.slice();
    if(typeof applyCloudNotificationPreference==='function'&&cloudState.settings&&typeof cloudState.settings.notificationsEnabled==='boolean'){
      applyCloudNotificationPreference(cloudState.settings.notificationsEnabled);
    }
    if(typeof applyCloudGoogleCalendarPreference==='function'&&cloudState.settings&&cloudState.settings.googleCalendar){
      applyCloudGoogleCalendarPreference(cloudState.settings.googleCalendar);
    }
    if(typeof syncGoogleCalendarIfEnabled==='function'){
      await syncGoogleCalendarIfEnabled(false);
    }
    startActiveSession();
    if(gname)gname.textContent=profileName;
    showScreen('hoy');
    initApp();
  }
}

// Auth: login con email+pass
async function authLogin(){
  var email=document.getElementById('auth-email').value.trim();
  var pass=document.getElementById('auth-pass').value;
  var msg=document.getElementById('auth-msg');
  if(!email||!pass){msg.textContent='Completá email y contraseña';msg.className='auth-msg auth-err';return;}
  msg.textContent='Ingresando...';msg.className='auth-msg';
  var {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){msg.textContent=error.message;msg.className='auth-msg auth-err';return;}
  sbUser=data.user;checkAuth();
}

// Auth: crear cuenta
async function authRegister(){
  var email=document.getElementById('auth-email').value.trim();
  var pass=document.getElementById('auth-pass').value;
  var msg=document.getElementById('auth-msg');
  if(!email||!pass||pass.length<6){msg.textContent='Email válido y contraseña de al menos 6 caracteres';msg.className='auth-msg auth-err';return;}
  msg.textContent='Creando cuenta...';msg.className='auth-msg';
  var {data,error}=await sb.auth.signUp({email,password:pass});
  if(error){msg.textContent=error.message;msg.className='auth-msg auth-err';return;}
  // Si hay sesión activa va directo, si no pide confirmar email
  if(data.session){
    sbUser=data.session.user;
    showScreen('onboarding');
  } else {
    msg.textContent='✅ Te mandamos un email de confirmación. Revisá tu casilla y volvé a entrar!';
  }
}

// Auth: magic link (sin contraseña)
async function authMagicLink(){
  var email=document.getElementById('auth-email').value.trim();
  var msg=document.getElementById('auth-msg');
  if(!email){msg.textContent='Primero ingresá tu email';msg.className='auth-msg auth-err';return;}
  msg.textContent='Enviando link...';msg.className='auth-msg';
  var {error}=await sb.auth.signInWithOtp({email});
  if(error){msg.textContent=error.message;msg.className='auth-msg auth-err';return;}
  msg.textContent='✅ Revisá tu email — te enviamos un link para entrar!';
}

// Onboarding: selección de chips
function toggleChip(el){el.classList.toggle('sel');}
function toggleSportChip(el){el.classList.toggle('sel');}

function enterDemoMode(){
  demoMode=true;
  sbUser={id:'demo-user'};
  profileName='';
  profileObjectives=[];
  appMode='classic';
  favoriteSports=['futbol','pilates'];
  editingConfig=false;
  hydrateOnboardingForm();
  showScreen('onboarding');
}

function selectAppMode(el){
  document.querySelectorAll('#ob-mode .ob-chip').forEach(function(chip){
    chip.classList.toggle('sel',chip===el);
  });
  appMode=el.dataset.mode||'classic';
  var onboardingSub=document.getElementById('onboarding-sub');
  var objectivesStep=document.getElementById('objectives-step');
  var objectivesWrap=document.getElementById('ob-chips');
  var sportsConfig=document.getElementById('sports-config');
  if(onboardingSub)onboardingSub.textContent=appMode==='classic'?'Armemos tu versión Quokki clásica, con tus deportes y tu estilo':'Contame tus objetivos para personalizar una versión más general';
  if(objectivesStep)objectivesStep.style.display=appMode==='adaptive'?'block':'none';
  if(objectivesWrap)objectivesWrap.style.display=appMode==='adaptive'?'flex':'none';
  if(sportsConfig)sportsConfig.style.display=appMode==='classic'?'block':'none';
}

function hydrateOnboardingForm(){
  var input=document.getElementById('ob-nombre');
  if(input)input.value=profileName||'';
  document.querySelectorAll('#ob-chips .ob-chip').forEach(function(chip){
    chip.classList.toggle('sel',profileObjectives.includes(chip.dataset.obj));
  });
  document.querySelectorAll('#ob-sports .ob-chip').forEach(function(chip){
    chip.classList.toggle('sel',favoriteSports.includes(chip.dataset.sport));
  });
  var selectedMode=document.querySelector('#ob-mode .ob-chip[data-mode="'+appMode+'"]')||document.querySelector('#ob-mode .ob-chip[data-mode="classic"]');
  if(selectedMode)selectAppMode(selectedMode);
  var backBtn=document.getElementById('ob-back-btn');
  if(backBtn)backBtn.style.display=editingConfig?'inline-flex':'none';
  if(input){
    setTimeout(function(){
      try{
        input.focus();
        var end=input.value.length;
        input.setSelectionRange(end,end);
      }catch(e){}
    },80);
  }
}

function openConfigEditor(){
  editingConfig=true;
  hydrateOnboardingForm();
  var msg=document.getElementById('ob-msg');
  if(msg)msg.textContent='';
  showScreen('onboarding');
}

function cancelConfigEdit(){
  editingConfig=false;
  showScreen('hoy');
  initApp();
}

// Onboarding: guardar perfil
async function obGuardar(){
  var nombre=document.getElementById('ob-nombre').value.trim();
  var msg=document.getElementById('ob-msg');
  if(!nombre){msg.textContent='Ponele tu nombre 😊';msg.className='auth-msg auth-err';return;}
  var chips=document.querySelectorAll('#ob-chips .ob-chip.sel');
  var objetivos=Array.from(chips).map(function(c){return c.dataset.obj;});
  var sports=document.querySelectorAll('#ob-sports .ob-chip.sel');
  favoriteSports=Array.from(sports).map(function(c){return c.dataset.sport;});
  if(!favoriteSports.length)favoriteSports=['futbol','pilates'];
  if(appMode!=='adaptive')objetivos=[];
  msg.textContent='Guardando...';msg.className='auth-msg';
  if(!demoMode){
    var {error}=await sb.from('profiles').upsert({id:sbUser.id,nombre,objetivos});
    if(error){msg.textContent=error.message;msg.className='auth-msg auth-err';return;}
  } else {
    try{
      localStorage.setItem(demoProfileKey(),JSON.stringify({nombre:nombre,objetivos:objetivos,mode:appMode,favoriteSports:favoriteSports}));
    }catch(e){}
  }
  profileName=nombre;
  profileObjectives=objetivos;
  saveUserConfig();
  editingConfig=false;
  var gname=document.getElementById('gname');if(gname)gname.textContent=profileName;
  showScreen('hoy');initApp();
}

// Mostrar/ocultar screens
function showScreen(name){
  var isAuth=(name==='auth'||name==='onboarding');
  // Bloquear nav y screens de fondo cuando hay auth
  var nav=document.querySelector('nav');
  if(nav){
    nav.style.pointerEvents=isAuth?'none':'';
    nav.style.display=isAuth?'none':'flex';
  }
  document.querySelectorAll('.screen').forEach(function(el){
    var sid=el.id.replace('screen-','');
    if(sid===name){
      el.style.display=isAuth?'flex':'block';
      el.classList.add('active');
    }
    else{el.style.display='none';el.classList.remove('active');el.style.pointerEvents=isAuth?'none':'';}
  });
  if(name==='onboarding')hydrateOnboardingForm();
}

function navigateToScreen(name){
  showScreen(name);
  saveCloudRuntime({lastScreen:name});
  if(name==='stats'){
    Promise.resolve(lastSavePromise).finally(function(){buildStats().catch(function(){});});
  }
  if(name==='pomodoro'){pomRender();}
  if(name==='vianda'){var vqi=document.getElementById('v-qimg');if(vqi&&window.QIMGS)vqi.src=window.QIMGS.base;}
}

function storageKeyFromDate(dateObj){
  return STORAGE_KEY_PREFIX+dateObj.getFullYear()+'-'+dateObj.getMonth()+'-'+dateObj.getDate();
}

function legacyStorageKeyFromDate(dateObj){
  return LEGACY_STORAGE_KEY_PREFIX+dateObj.getFullYear()+'-'+dateObj.getMonth()+'-'+dateObj.getDate();
}

function currentStorageKey(){
  return STORAGE_KEY_PREFIX+dk();
}

function userConfigKey(){
  if(!sbUser||!sbUser.id)return 'quokki_config_guest';
  return 'quokki_config_'+sbUser.id;
}

function demoProfileKey(){
  return 'quokki_demo_profile';
}

function loadUserConfig(){
  try{
    var raw=localStorage.getItem(userConfigKey());
    if(!raw)return;
    var data=JSON.parse(raw);
    if(data&&data.mode&&!(cloudState.settings&&cloudState.settings.mode))appMode=data.mode;
    if(data&&Array.isArray(data.objectives)&&!profileObjectives.length)profileObjectives=data.objectives;
    if(data&&Array.isArray(data.favoriteSports)&&data.favoriteSports.length)favoriteSports=data.favoriteSports;
  }catch(e){}
}

function saveUserConfig(){
  try{
    localStorage.setItem(userConfigKey(),JSON.stringify({mode:appMode,objectives:profileObjectives,favoriteSports:favoriteSports}));
  }catch(e){}
  saveCloudSettings({mode:appMode,objectives:profileObjectives,favoriteSports:favoriteSports});
}

function capitalizeName(text){
  if(!text)return '';
  return text.charAt(0).toUpperCase()+text.slice(1).toLowerCase();
}

function generatePlayfulNickname(name){
  var clean=(name||'').trim().split(/\s+/)[0];
  if(!clean)return 'amiga';
  var base=capitalizeName(clean);
  var lower=base.toLowerCase();
  var options=[
    base,
    base+'chi',
    base+'ki',
    base+'tis',
    base+'linda',
    base+'power',
    base+'mood'
  ];
  if(lower.endsWith('a')){
    var stem=base.slice(0,-1);
    options.push(stem+'ana');
    options.push(stem+'ita');
    options.push(stem+'ikis');
    options.push(stem+'ucha');
  } else if(lower.endsWith('o')){
    var stemO=base.slice(0,-1);
    options.push(stemO+'ito');
    options.push(stemO+'ovsky');
    options.push(stemO+'inis');
  } else {
    options.push(base+'ito');
    options.push(base+'ovsky');
    options.push(base+'ster');
  }
  var unique=options.filter(function(value,index,array){return value&&array.indexOf(value)===index;});
  return unique[Math.floor(Math.random()*unique.length)];
}

function pushUniqueHabit(list,id){
  if(id&&id!=='agua'&&HABIT_LIBRARY[id]&&!list.includes(id))list.push(id);
}

function buildHabitPlan(objectives){
  if(appMode==='classic'){
    var classicSlots=CLASSIC_HABIT_PLAN.slots.slice();
    var sportsPlan=(favoriteSports||[]).slice(0,2);
    if(sportsPlan[0]&&SPORT_VARIANTS[sportsPlan[0]])classicSlots[2]=SPORT_VARIANTS[sportsPlan[0]];
    if(sportsPlan[1]&&SPORT_VARIANTS[sportsPlan[1]])classicSlots[3]=SPORT_VARIANTS[sportsPlan[1]];
    return {featured:CLASSIC_HABIT_PLAN.featured,slots:classicSlots};
  }
  var planIds=[];
  ['rutina_manana','movimiento_suave','comida_real','rutina_noche'].forEach(function(id){pushUniqueHabit(planIds,id);});
  (objectives||[]).forEach(function(objective){
    (OBJECTIVE_HABITS[objective]||[]).forEach(function(id){pushUniqueHabit(planIds,id);});
  });
  HABIT_FALLBACKS.forEach(function(id){if(planIds.length<HABIT_SLOT_IDS.length)pushUniqueHabit(planIds,id);});
  while(planIds.length<HABIT_SLOT_IDS.length)planIds.push('lectura');
  var featuredId=(objectives||[]).includes('piel')?'skincare':(objectives||[]).includes('estres')?'respiracion':(objectives||[]).includes('deporte')?'entrenamiento':'rutina_manana';
  return {
    featured:HABIT_LIBRARY[featuredId]||HABIT_LIBRARY.rutina_manana,
    slots:planIds.slice(0,HABIT_SLOT_IDS.length).map(function(id){return HABIT_LIBRARY[id];})
  };
}

function setCardHabit(slotId,habit){
  var card=document.getElementById('h-'+slotId);
  if(!card||!habit)return;
  var iconBox=card.querySelector('.hiw, .fhi');
  var titleEl=card.querySelector('.hn, .fhn');
  var subtitleEl=card.querySelector('.hs, .fhs');
  var tag=card.querySelector('.ptag');
  if(iconBox){
    if(habit.imageSrc){
      iconBox.innerHTML='<img src="'+habit.imageSrc+'" style="width:38px;height:38px;object-fit:contain;display:block;mix-blend-mode:normal;filter:none;" alt="">';
      iconBox.style.background='transparent';
      iconBox.style.boxShadow='none';
      iconBox.style.overflow='hidden';
      iconBox.style.padding='0';
    } else {
      iconBox.textContent=habit.icon;
      iconBox.style.background='';
      iconBox.style.boxShadow='';
      iconBox.style.overflow='';
      iconBox.style.padding='';
    }
  }
  if(titleEl){
    if(tag){
      titleEl.innerHTML=habit.title+(habit.tag?'<span class="ptag">'+habit.tag+'</span>':'');
    } else {
      titleEl.textContent=habit.title;
    }
  }
  if(subtitleEl)subtitleEl.textContent=habit.subtitle;
  if(tag&&!habit.tag)tag.style.display='none';
}

function renderDynamicHabits(){
  currentHabitPlan=buildHabitPlan(profileObjectives);
  var featured=currentHabitPlan.featured;
  var featuredLabel=document.getElementById('featured-label');
  var morningLabel=document.getElementById('morning-label');
  var dayLabel=document.getElementById('day-label');
  var wellbeingLabel=document.getElementById('wellbeing-label');
  var nightLabel=document.getElementById('night-label');
  var featuredIcon=document.querySelector('#sk-card .sk-icon-big');
  var featuredName=document.querySelector('#sk-card .sk-name');
  var featuredSub=document.querySelector('#sk-card .sk-sub');
  if(appMode==='classic'){
    if(featuredLabel)featuredLabel.textContent='Skincare · mañana';
    if(morningLabel)morningLabel.textContent='Vitaminas · mañana';
    if(dayLabel)dayLabel.textContent='Movimiento · tu versión';
    if(wellbeingLabel)wellbeingLabel.textContent='Alimentación Quokki';
    if(nightLabel)nightLabel.textContent='Vitaminas · noche';
  } else {
    if(featuredLabel)featuredLabel.textContent='Objetivo estrella';
    if(morningLabel)morningLabel.textContent='Rutina del día';
    if(dayLabel)dayLabel.textContent=(profileObjectives||[]).includes('estres')?'Mente y energia':'Movimiento y enfoque';
    if(wellbeingLabel)wellbeingLabel.textContent='Bienestar diario';
    if(nightLabel)nightLabel.textContent='Cierre del día';
  }
  if(featuredIcon)featuredIcon.textContent=featured.icon;
  if(featuredName)featuredName.textContent=featured.title;
  if(featuredSub)featuredSub.textContent=featured.subtitle;
  HABIT_SLOT_IDS.forEach(function(slotId,index){
    setCardHabit(slotId,currentHabitPlan.slots[index]);
  });
  var bonusName=document.querySelector('#bonus-study .fhn');
  var bonusSub=document.querySelector('#bonus-study .fhs');
  if(appMode==='classic'){
    if(bonusName)bonusName.textContent='Lectura o estudio';
    if(bonusSub)bonusSub.textContent='Aprendí o leí algo hoy · suma 0.5 pts';
  } else if((profileObjectives||[]).includes('estres')){
    if(bonusName)bonusName.textContent='Pausa anti estrés';
    if(bonusSub)bonusSub.textContent='Respirar, bajar cambios o hacer journaling · suma 0.5 pts';
  } else if((profileObjectives||[]).includes('deporte')){
    if(bonusName)bonusName.textContent='Movilidad extra';
    if(bonusSub)bonusSub.textContent='Un ratito más para recuperar el cuerpo · suma 0.5 pts';
  } else {
    if(bonusName)bonusName.textContent='Lectura o estudio';
    if(bonusSub)bonusSub.textContent='Aprendí o leí algo hoy · suma 0.5 pts';
  }
}

// Sesion Supabase
sb.auth.onAuthStateChange(function(event,session){
  if(event==='SIGNED_OUT'){
    endActiveSession();
    if(typeof resetGoogleCalendarContext==='function')resetGoogleCalendarContext();
    sbUser=null;
    cloudState={settings:{},runtime:{}};
    cloudStateLoaded=false;
    showScreen('auth');
    return;
  }
  if(event==='SIGNED_IN'&&session){
    sbUser=session.user;
    checkAuth();
  }
});
