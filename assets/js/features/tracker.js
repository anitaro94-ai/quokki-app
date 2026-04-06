// ── DATOS: save/load con Supabase + localStorage fallback ────
const HA=['vitc','nmn','futbol','pilates','vianda','singluten','reposo','magnesio','q10','colageno'];
const VA=['ropa_dep','comida_prep','desayuno','almuerzo','merienda','agua_bot'];
const MW=10;
let wd=0,cp='semana',bonusDone=false,skinDone=false;
let lastSavePromise=Promise.resolve();
const TOTAL_POSSIBLE=HA.length+1+0.5+0.5; // habitos + agua + bonus + skin(0.5)

const GREETING_LINES=['Buenos días','Hoy suma','Vamos paso a paso','Con calma también vale','Acordate de vos','Hoy movemos','Pequeños pasos, gran progreso'];
const QT={morning:[{t:'El agua es el primer acto de amor propio del día.',s:'\u2014 método Quokki'},{t:'Hara hachi bu: comé al 80%. El resto lo pone la sabiduría.',s:'\u2014 proverbio japonés'},{t:'Wabi-sabi: la imperfección de hoy también cuenta.',s:'\u2014 filosofía japonesa'},{t:'No tenés que ser perfecta. Solo persistente.',s:'\u2014 Proyecto Quokki'}],afternoon:[{t:'La vianda de hoy es la energía de mañana.',s:'\u2014 sabiduría de oficina'},{t:'Persistir es más poderoso que la perfección.',s:'\u2014 Proyecto Quokki'},{t:'El cuerpo recuerda cada vaso de agua que le diste.',s:'\u2014 método Quokki'}],night:[{t:'El reposo es donde el cuerpo se construye. Cerrá bien el día.',s:'\u2014 bienestar japonés'},{t:'El magnesio te abraza por dentro. Buenas noches, Quokki acompaña.',s:'\u2014 ciencia wabi-sabi'},{t:'Doce horas de silencio digestivo: el reset más elegante.',s:'\u2014 método Quokki'}]};
const QS={start:{k:'base',a:'',m:'El día recién empieza. Tomá agua primero!',mo:'Modo siesta tranquila'},low:{k:'falla',a:'shake',m:'Vamos que podemos más. Quokki cree en vos.',mo:'Un poquito decaído'},mid:{k:'base',a:'',m:'Bien encaminada. Cada hábito cuenta.',mo:'Tranquilo y esperanzado'},good:{k:'base',a:'bounce',m:'Más de la mitad! Quokki está orgulloso.',mo:'Contento contento'},great:{k:'exito',a:'bounce',m:'Casi todo! Quokki baila de alegría.',mo:'Muy feliz!'},perfect:{k:'exito',a:'bounce',m:'Día completo! Quokki festeja con vos.',mo:'Modo celebración'},night_ok:{k:'sueno',a:'',m:'Cerrá bien el día. Descansá bien.',mo:'Modo noche'},night_bad:{k:'enojado',a:'shake',m:'Quedan hábitos! Con amor, Quokki reclama.',mo:'Decepcionado pero tierno'}};
const BKM=[{i:'\uD83C\uDF4A',id:'vitc',l:'Vitamina C'},{i:'\u2697\uFE0F',id:'nmn',l:'NMN'},{i:'\uD83D\uDCA7',id:'agua',l:'Agua (3L)'},{i:'\u26BD',id:'futbol',l:'Fútbol'},{i:'\uD83E\uDD57',id:'vianda',l:'Vianda'},{i:'\uD83C\uDF3E',id:'singluten',l:'Sin gluten'},{i:'\uD83C\uDF19',id:'reposo',l:'Reposo'},{i:'\uD83E\uDEA7',id:'magnesio',l:'Magnesio'},{i:'\u26A1',id:'q10',l:'Q10'},{i:'\uD83D\uDCA7',id:'colageno',l:'Colágeno'},{i:'\u2728',id:'skincare',l:'Skincare'}];
const PRESETS=[{name:'Clasico',focus:25,rest:5,rounds:4},{name:'Intenso',focus:50,rest:10,rounds:3},{name:'Suave',focus:15,rest:3,rounds:6}];
const HABIT_LIBRARY={
  rutina_manana:{icon:'🌅',title:'Rutina de mañana',subtitle:'Arrancar con calma y enfoque'},
  desayuno_proteico:{icon:'🍳',title:'Desayuno con proteina',subtitle:'Huevos, yogur o opcion saciante'},
  foco_mental:{icon:'🧠',title:'Enfoque mental',subtitle:'Una tarea importante sin distracciones'},
  movimiento_suave:{icon:'🚶',title:'Mover el cuerpo',subtitle:'Caminar, estirar o activar 20 minutos'},
  entrenamiento:{icon:'🏋️',title:'Entrenamiento',subtitle:'Fuerza, pilates, gym o deporte'},
  comida_real:{icon:'🥗',title:'Comida real',subtitle:'Proteina, fibra y menos ultraprocesados'},
  vianda_saludable:{icon:'🍱',title:'Vianda saludable',subtitle:'Dejar algo rico y práctico preparado'},
  sin_ultraprocesados:{icon:'🌿',title:'Menos ultraprocesados',subtitle:'Elegir opciones simples y reales'},
  skincare:{icon:'✨',title:'Skincare',subtitle:'Limpiar, hidratar y proteger la piel'},
  colageno:{icon:'💧',title:'Colágeno o hidratación extra',subtitle:'Un plus para piel y bienestar'},
  respiracion:{icon:'🫁',title:'Respiración consciente',subtitle:'Pausa corta para bajar cambios'},
  journaling:{icon:'📝',title:'Registro del día',subtitle:'Anotar cómo te sentís o qué aprendiste'},
  rutina_noche:{icon:'🌙',title:'Rutina de noche',subtitle:'Bajar un cambio antes de dormir'},
  dormir_mejor:{icon:'😴',title:'Dormir mejor',subtitle:'Apagar pantallas y priorizar descanso'},
  lectura:{icon:'📚',title:'Lectura o estudio',subtitle:'Un rato para aprender algo nuevo'},
  proteina_post:{icon:'🥤',title:'Proteina post entreno',subtitle:'Recuperar energia despues de moverte'},
  sol_manana:{icon:'🌞',title:'Luz natural',subtitle:'Un rato de sol o aire libre temprano'},
  movilidad:{icon:'🧘',title:'Movilidad',subtitle:'Aflojar el cuerpo y soltar tension'}
};
const SPORT_VARIANTS={
  futbol:{icon:'⚽',title:'Fútbol · Puntineras',subtitle:'Mar y Jue + Sab',tag:'HOY',imageSrc:'img/futbol.png'},
  pilates:{icon:'🧘',title:'Pilates',subtitle:'Fluye Pilates o movilidad suave',imageSrc:'img/pilates.png'},
  gym:{icon:'🏋️',title:'Gym o fuerza',subtitle:'Rutina de entrenamiento personal'},
  caminar:{icon:'🚶',title:'Caminar',subtitle:'Salida suave o paseo activo'},
  running:{icon:'🏃',title:'Running',subtitle:'Trote suave o pasada de energia'},
  tenis:{icon:'🎾',title:'Tenis',subtitle:'Cancha, saque y movimiento agil'},
  natacion:{icon:'🏊',title:'Natación',subtitle:'Agua, técnica y cardio amable'}
};
const CLASSIC_HABIT_PLAN={
  featured:HABIT_LIBRARY.skincare,
  slots:[
    {icon:'🍊',title:'Vitamina C',subtitle:'Al despertar'},
    {icon:'⚗️',title:'NMN',subtitle:'Al despertar'},
    {icon:'⚽',title:'Fútbol · Puntineras',subtitle:'Mar y Jue + Sab',tag:'HOY',imageSrc:'img/futbol.png'},
    {icon:'🧘',title:'Pilates',subtitle:'Fluye Pilates o movilidad suave',imageSrc:'img/pilates.png'},
    {icon:'🥗',title:'Vianda preparada',subtitle:'Desayuno + almuerzo + merienda'},
    {icon:'🌾',title:'Sin gluten ni azúcar',subtitle:'Alimentos reales · método Quokki'},
    {icon:'🌙',title:'Reposo digestivo',subtitle:'12 hs entre cena y desayuno'},
    {icon:'🫧',title:'Bisglicinato magnesio',subtitle:'Antes de dormir'},
    {icon:'⚡',title:'Coenzima Q10',subtitle:'Noche'},
    {icon:'💧',title:'Colágeno hidrolizado',subtitle:'Con agua tibia · antes de dormir'}
  ]
};
const OBJECTIVE_HABITS={
  energia:['rutina_manana','sol_manana','desayuno_proteico','movimiento_suave','dormir_mejor'],
  peso:['comida_real','vianda_saludable','sin_ultraprocesados','movimiento_suave','rutina_noche'],
  deporte:['entrenamiento','proteina_post','movilidad','comida_real','dormir_mejor'],
  sueno:['rutina_noche','dormir_mejor','respiracion','movimiento_suave','sin_ultraprocesados'],
  piel:['skincare','colageno','comida_real','rutina_noche','dormir_mejor'],
  estres:['respiracion','journaling','movimiento_suave','foco_mental','rutina_noche'],
  longevidad:['comida_real','movilidad','entrenamiento','dormir_mejor','foco_mental']
};
const HABIT_FALLBACKS=['rutina_manana','desayuno_proteico','movimiento_suave','foco_mental','comida_real','vianda_saludable','sin_ultraprocesados','rutina_noche','dormir_mejor','lectura'];
const HABIT_SLOT_IDS=['vitc','nmn','futbol','pilates','vianda','singluten','reposo','magnesio','q10','colageno'];
var currentHabitPlan={featured:HABIT_LIBRARY.skincare,slots:[]};
let pom={preset:0,phase:'idle',timeLeft:25*60,totalTime:25*60,running:false,round:0,totalRounds:4,timer:null};

function gp(h){return h>=6&&h<13?'morning':h>=13&&h<20?'afternoon':'night';}
function dayKeyFromDate(d){return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
function dk(){return dayKeyFromDate(new Date());}

function saveD(){
  var s={water:wd,habits:{},vianda:{},bonus:bonusDone,skin:skinDone};
  HA.forEach(function(h){var el=document.getElementById('h-'+h);s.habits[h]=el?el.classList.contains('done'):false;});
  VA.forEach(function(v){var el=document.getElementById('v-'+v);s.vianda[v]=el?el.classList.contains('done'):false;});
  // Guardar local siempre (offline fallback)
  try{localStorage.setItem(currentStorageKey(),JSON.stringify(s));}catch(e){}
  // Guardar en Supabase si hay usuario
  if(sbUser&&!demoMode){
    lastSavePromise=sb.from('habitos_diarios').upsert({user_id:sbUser.id,fecha:dk(),data:s},{onConflict:'user_id,fecha'}).then(function(){},function(){});
  }else{
    lastSavePromise=Promise.resolve();
  }
  if(document.getElementById('screen-stats')&&document.getElementById('screen-stats').classList.contains('active'))buildStats().catch(function(){});
}
async function loadD(){
  var s=null;
  // Intentar Supabase primero
  if(sbUser&&!demoMode){
    var {data}=await sb.from('habitos_diarios').select('data').eq('user_id',sbUser.id).eq('fecha',dk()).single();
    if(data)s=data.data;
  }
  // Fallback a localStorage
  if(!s){
    try{
      var r=localStorage.getItem(currentStorageKey())||localStorage.getItem(LEGACY_STORAGE_KEY_PREFIX+dk());
      if(r)s=JSON.parse(r);
    }catch(e){}
  }
  if(!s)return;
  wd=s.water||0;buildW();
  HA.forEach(function(h){if(s.habits&&s.habits[h]){var el=document.getElementById('h-'+h);if(el)el.classList.add('done');}});
  VA.forEach(function(v){if(s.vianda&&s.vianda[v]){var el=document.getElementById('v-'+v);if(el)el.classList.add('done');}});
  if(s.bonus){bonusDone=true;var b=document.getElementById('bonus-study');if(b)b.classList.add('bonus-done');}
  if(s.skin){skinDone=true;var sk=document.getElementById('sk-card');if(sk)sk.classList.add('done');}
}
async function hist(n){
  var days=[];
  if(sbUser&&!demoMode){
    var fechas=[];
    for(var i=n-1;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);fechas.push(dayKeyFromDate(d));}
    var {data}=await sb.from('habitos_diarios').select('fecha,data').eq('user_id',sbUser.id).in('fecha',fechas);
    var map={};if(data)data.forEach(function(r){map[r.fecha]=r.data;});
    for(var i=n-1;i>=0;i--){
      var d=new Date();d.setDate(d.getDate()-i);
      var f=dayKeyFromDate(d);
      var localData=null;
      try{
        var key=storageKeyFromDate(d);
        var legacyKey=legacyStorageKeyFromDate(d);
        var r=localStorage.getItem(key)||localStorage.getItem(legacyKey);
        if(r)localData=JSON.parse(r);
      }catch(e){}
      days.push({date:d,data:map[f]||localData||null});
    }
    return days;
  }
  // Fallback localStorage
  for(var i=n-1;i>=0;i--){
    var d=new Date();
    d.setDate(d.getDate()-i);
    var key=storageKeyFromDate(d);
    var legacyKey=legacyStorageKeyFromDate(d);
    try{
      var r=localStorage.getItem(key)||localStorage.getItem(legacyKey);
      days.push({date:d,data:r?JSON.parse(r):null});
    }catch(e){
      days.push({date:d,data:null});
    }
  }
  return days;
}
function dpct(data){if(!data)return null;var d=0;HA.forEach(function(h){if(data.habits&&data.habits[h])d++;});if((data.water||0)>=MW)d++;if(data.bonus)d+=0.5;if(data.skin)d+=0.5;return Math.round((d/TOTAL_POSSIBLE)*100);}

function updateQ(pct,period){
  var state;
  if(period==='night')state=pct>=50?QS.night_ok:QS.night_bad;
  else if(pct===0)state=QS.start;else if(pct<20)state=QS.low;else if(pct<50)state=QS.mid;
  else if(pct<75)state=QS.good;else if(pct<100)state=QS.great;else state=QS.perfect;
  // En pantalla HOY el video esta fijo, solo cambia la imagen static en estados que no son base
  var qimg=document.getElementById('qimg');
  var qvid=document.getElementById('qvid');
  if(state.k==='base'||state.k==='exito'){
    // Usar video + animacion
    if(qvid)qvid.style.display='block';
    if(qimg)qimg.style.display='none';
  } else {
    // Usar imagen estatica para estados especiales
    if(qvid)qvid.style.display='none';
    if(qimg){qimg.style.display='block';if(window.QIMGS)qimg.src=window.QIMGS[state.k]||window.QIMGS.base;qimg.className='qimg'+(state.a?' '+state.a:'');}
  }
  var qm=document.getElementById('qmsg');if(qm)qm.textContent=state.m;
  var qmo=document.getElementById('qmood');if(qmo)qmo.textContent=state.mo;
}

function initApp(){
  var now=new Date(),h=now.getHours(),period=gp(h);
  var nickname=generatePlayfulNickname(profileName);
  var app=document.getElementById('app');
  var body=document.body;
  var html=document.documentElement;
  var themeMeta=document.getElementById('theme-color-meta');
  if(app)app.classList.remove('night');
  if(body)body.classList.remove('night-mode');
  if(html)html.classList.remove('night-mode');
  var ttxt=document.getElementById('ttxt');if(ttxt)ttxt.textContent=h+':'+(now.getMinutes()<10?'0':'')+now.getMinutes();
  var dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sab'],meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var gdate=document.getElementById('gdate');if(gdate)gdate.textContent=dias[now.getDay()]+', '+now.getDate()+' de '+meses[now.getMonth()];
  var gname=document.getElementById('gname');if(gname)gname.textContent=nickname;
  var gsub=document.getElementById('gsub');if(gsub)gsub.textContent=GREETING_LINES[Math.floor(Math.random()*GREETING_LINES.length)];
  var pool=QT[period],q=pool[Math.floor(Math.random()*pool.length)];
  var qtxt=document.getElementById('qtxt');if(qtxt)qtxt.textContent=q.t;
  var qsrc=document.getElementById('qsrc');if(qsrc)qsrc.textContent=q.s;
  var pb=document.getElementById('pbadge'),qc=document.getElementById('qcard-quote');
  if(period==='morning'){
    if(pb){pb.className='pbadge pb-m';pb.textContent=appMode==='classic'?'\uD83C\uDF4A Vitamina C':'\uD83C\uDF05 Rutina de mañana';}
    if(qc)qc.className='qcard-quote qc-m';
  }
  else if(period==='afternoon'){
    if(pb){pb.className='pbadge pb-a';pb.textContent='\u2600\uFE0F Buenas tardes, '+nickname;}
    if(qc)qc.className='qcard-quote qc-a';
  }
  else{
    if(pb){pb.className='pbadge pb-n';pb.textContent=appMode==='classic'?'\uD83C\uDF19 Magnesio y cierre':'\uD83C\uDF19 Rutina de noche';}
    if(qc)qc.className='qcard-quote qc-n';
    if(app)app.classList.add('night');
    if(body)body.classList.add('night-mode');
    if(html)html.classList.add('night-mode');
  }
  if(themeMeta)themeMeta.setAttribute('content',period==='night'?'#2A1F18':'#FFF8F2');

  var ci=calInfo();
  var fs=document.getElementById('fsub'),ft=document.getElementById('ftag'),ps=document.getElementById('psub');
  if(appMode==='classic'){
    if(ci.futbol){if(fs)fs.textContent='Puntineras listas. Hoy hay futbol.';if(ft)ft.textContent='HOY';}
    else if(ci.torneoSab){if(fs)fs.textContent='Sabado de torneo o movimiento con ganas.';if(ft)ft.textContent='ACTIVO';}
    else{if(fs)fs.textContent='Tu espacio para fútbol, gym o el deporte que elijas.';if(ft)ft.textContent='TU RITMO';}
    if(ci.pilates){if(ps)ps.textContent='Hoy toca pilates, movilidad o una pausa linda para el cuerpo';}
    else{if(ps)ps.textContent='Pilates suave, movilidad o un rato para volver al eje';}
  } else {
    if(ci.futbol){if(fs)fs.textContent='Hoy puede ser un gran momento para activarte';if(ft)ft.textContent='HOY';}
    else if(ci.torneoSab){if(fs)fs.textContent='Si te dan ganas, metele un rato al movimiento';if(ft)ft.textContent='ACTIVO';}
    else{if(fs)fs.textContent='Vale caminar, entrenar o simplemente moverte';if(ft)ft.textContent='FLEX';}
    if(ci.pilates){if(ps)ps.textContent='Un rato de foco o movilidad te va a hacer bien';}
    else{if(ps)ps.textContent='Podes usar este espacio para mente, pausa o movimiento';}
  }
  if(ci.mba){var al=document.getElementById('mba-alert');if(al){al.style.display='flex';al.querySelector('.mba-txt').textContent='\u2708\uFE0F '+ci.mbaName+' \u2014 ajusta hábitos al viaje';}}

  renderDynamicHabits();
  if(window.QIMGS){
    var vqi=document.getElementById('v-qimg');if(vqi)vqi.src=window.QIMGS.base;
  }
  // Autoplay videos
  var v1=document.getElementById('qvid');if(v1)v1.play().catch(function(){});
  var v2=document.getElementById('pom-vid');if(v2)v2.play().catch(function(){});

  buildW();loadD();updP();
  if(typeof applySavedPomodoroState==='function')applySavedPomodoroState();
  else pomInit();
  buildRecetas('Todos');
}

function buildW(){
  var t=document.getElementById('wtrack');if(!t)return;t.innerHTML='';
  for(var i=0;i<MW;i++){var d=document.createElement('div');d.className='wdot'+(i<wd?' filled':'');(function(idx){d.onclick=function(){setW(idx<wd?idx:idx+1);};})(i);t.appendChild(d);}
  var wb=document.getElementById('wbar');if(wb)wb.style.width=((wd/MW)*100)+'%';
  var wa=document.getElementById('wamt');if(wa)wa.textContent=(wd*0.3).toFixed(1);
  var wh=document.getElementById('whint');if(wh)wh.textContent=wd>=MW?'\uD83C\uDF89 Meta cumplida!':'Faltan '+((MW-wd)*0.3).toFixed(1)+'L \u00B7 toca cada gotita';
}
function setW(n){wd=n;buildW();updP();saveD();}
function tog(id){var el=document.getElementById('h-'+id);if(!el)return;el.classList.toggle('done');updP();saveD();}
function togSkin(){skinDone=!skinDone;var sk=document.getElementById('sk-card');if(sk){if(skinDone)sk.classList.add('done');else sk.classList.remove('done');}saveD();updP();}
function togV(id){var el=document.getElementById('v-'+id);if(!el)return;el.classList.toggle('done');saveD();}
function toggleBonus(){bonusDone=!bonusDone;var b=document.getElementById('bonus-study');if(b){if(bonusDone)b.classList.add('bonus-done');else b.classList.remove('bonus-done');}saveD();updP();}
function updP(){
  var done=0;
  HA.forEach(function(h){var el=document.getElementById('h-'+h);if(el&&el.classList.contains('done'))done++;});
  if(wd>=MW)done++;if(bonusDone)done+=0.5;if(skinDone)done+=0.5;
  var p=Math.min(100,Math.round((done/TOTAL_POSSIBLE)*100));
  var pct=document.getElementById('pct');if(pct)pct.textContent=p+'%';
  var pf=document.getElementById('pf');if(pf)pf.style.width=p+'%';
  updateQ(p,gp(new Date().getHours()));
}
