const SCREEN_PARTIALS=[
  'assets/views/screens/auth/index.html',
  'assets/views/screens/onboarding/index.html',
  'assets/views/screens/hoy/index.html',
  'assets/views/screens/recetas/index.html',
  'assets/views/screens/stats/index.html',
  'assets/views/screens/pomodoro/index.html',
  'assets/views/screens/vianda/index.html'
];

const SCRIPT_ORDER=[
  'assets/js/data/images.js',
  'assets/js/data/recipes.js',
  'assets/js/data/calendar.js',
  'assets/js/features/auth.js',
  'assets/js/features/googleCalendar.js',
  'assets/js/features/tracker.js',
  'assets/js/screens/recetas.js',
  'assets/js/screens/stats.js',
  'assets/js/screens/pomodoro.js',
  'assets/js/features/notifications.js'
];

async function fetchText(path){
  const res=await fetch(path,{cache:'no-cache'});
  if(!res.ok)throw new Error('No se pudo cargar '+path+' ('+res.status+')');
  return res.text();
}

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error('No se pudo cargar '+src));
    document.body.appendChild(s);
  });
}

async function mountLayout(){
  const app=document.getElementById('app');
  const nav=document.getElementById('main-nav');
  if(!app||!nav)throw new Error('Faltan contenedores base en index.html');

  const screens=await Promise.all(SCREEN_PARTIALS.map(fetchText));
  app.innerHTML=screens.join('\n\n');
  nav.innerHTML=await fetchText('assets/views/layout/nav.html');
}

async function boot(){
  try{
    await mountLayout();
    for(const src of SCRIPT_ORDER){
      await loadScript(src);
    }
    if(typeof checkAuth==='function'){
      await checkAuth();
    }
  }catch(err){
    console.error(err);
    document.body.innerHTML='<div style="padding:24px;font-family:sans-serif;line-height:1.5">No se pudo iniciar Quokki. Revisa la consola para más detalle.</div>';
  }
}

boot();
