function showS(name){navigateToScreen(name);}
function persistPomodoroState(){
  if(typeof saveCloudRuntime!=='function')return;
  saveCloudRuntime({pomodoro:{
    preset:pom.preset,phase:pom.phase,timeLeft:pom.timeLeft,totalTime:pom.totalTime,running:pom.running,round:pom.round,totalRounds:pom.totalRounds
  }});
}

function applySavedPomodoroState(){
  var saved=typeof getCloudRuntime==='function'?getCloudRuntime('pomodoro'):null;
  if(!saved||typeof saved!=='object'){pomInit();return;}
  pom.preset=typeof saved.preset==='number'?saved.preset:0;
  pom.phase=saved.phase||'idle';
  pom.timeLeft=typeof saved.timeLeft==='number'?saved.timeLeft:25*60;
  pom.totalTime=typeof saved.totalTime==='number'?saved.totalTime:25*60;
  pom.running=false;
  pom.round=typeof saved.round==='number'?saved.round:0;
  pom.totalRounds=typeof saved.totalRounds==='number'?saved.totalRounds:(PRESETS[pom.preset]?PRESETS[pom.preset].rounds:4);
  if(pom.timer){clearInterval(pom.timer);pom.timer=null;}
  pomRender();
}

function pomInit(){var p=PRESETS[pom.preset];pom.phase='idle';pom.timeLeft=p.focus*60;pom.totalTime=p.focus*60;pom.round=0;pom.totalRounds=p.rounds;pom.running=false;pomRender();persistPomodoroState();}
function pomApplyPreset(idx){pom.preset=idx;if(pom.timer){clearInterval(pom.timer);pom.timer=null;}pomInit();persistPomodoroState();}
function pomStart(){if(pom.running)return;pom.running=true;if(pom.phase==='idle')pom.phase='focus';pom.timer=setInterval(pomTick,1000);pomRender();persistPomodoroState();}
function pomPause(){pom.running=false;if(pom.timer){clearInterval(pom.timer);pom.timer=null;}pomRender();persistPomodoroState();}
function pomReset(){pom.running=false;if(pom.timer){clearInterval(pom.timer);pom.timer=null;}pomApplyPreset(pom.preset);persistPomodoroState();}
function pomTick(){pom.timeLeft--;if(pom.timeLeft<=0){var p=PRESETS[pom.preset];if(pom.phase==='focus'){pom.round++;if(pom.round>=pom.totalRounds){pom.phase='done';pom.running=false;clearInterval(pom.timer);pom.timer=null;}else{pom.phase='rest';pom.timeLeft=p.rest*60;pom.totalTime=p.rest*60;}}else if(pom.phase==='rest'){pom.phase='focus';pom.timeLeft=PRESETS[pom.preset].focus*60;pom.totalTime=PRESETS[pom.preset].focus*60;}persistPomodoroState();}pomRender();}
function pomRender(){
  var mins=Math.floor(pom.timeLeft/60),secs=pom.timeLeft%60;
  var td=document.getElementById('pom-time');if(td)td.textContent=(mins<10?'0':'')+mins+':'+(secs<10?'0':'')+secs;
  var prog=pom.totalTime>0?(pom.timeLeft/pom.totalTime):1;
  var ring=document.getElementById('pom-ring');if(ring){ring.style.strokeDashoffset=534*(1-prog);ring.className='pom-ring-p'+(pom.phase==='rest'?' rest':'');}
  var pl=document.getElementById('pom-phase');if(pl){if(pom.phase==='idle')pl.textContent='Listo para empezar';else if(pom.phase==='focus')pl.textContent='Enfoque — sin distracciones';else if(pom.phase==='rest')pl.textContent='Descanso — respira';else pl.textContent='¡Sesion completa!';}

  var pvid=document.getElementById('pom-vid'),pqi=document.getElementById('pom-qi');
  var qm=document.getElementById('pom-qmsg'),ql=document.getElementById('pom-qlbl');
  if(pom.phase==='rest'){
    if(pvid)pvid.style.display='none';
    if(pqi&&window.QIMGS){pqi.style.display='block';pqi.src=window.QIMGS.pausa;pqi.className='pom-qi';}
    if(qm)qm.textContent='Respira. Hidratate. Quokki descansa.';if(ql)ql.textContent='Descanso';
  } else if(pom.phase==='done'){
    if(pvid)pvid.style.display='none';
    if(pqi&&window.QIMGS){pqi.style.display='block';pqi.src=window.QIMGS.exito;pqi.className='pom-qi bounce';}
    if(qm)qm.textContent='¡Sesion completa! Quokki celebra.';if(ql)ql.textContent='¡Logro!';
  } else {
    if(pqi)pqi.style.display='none';
    if(pom.running){
      if(pvid){pvid.style.display='block';pvid.play().catch(function(){});}if(qm)qm.textContent='Modo zen. Quokki concentrado con vos.';if(ql)ql.textContent='Enfoque';
    } else {
      if(pvid){pvid.style.display='none';pvid.pause();}if(qm)qm.textContent='Cuando quieras arrancar, Quokki se concentra.';if(ql)ql.textContent='Listo';
    }
  }

  var rds=document.getElementById('pom-rounds');if(rds)rds.textContent='Ronda '+(pom.round+1)+' de '+pom.totalRounds;
  var dots=document.getElementById('pom-dots');if(dots){dots.innerHTML='';for(var i=0;i<pom.totalRounds;i++){var d=document.createElement('div');d.className='pom-dot'+(i<pom.round?' done':i===pom.round?' current':'');dots.appendChild(d);}}
  var sb=document.getElementById('pom-sb'),pb2=document.getElementById('pom-pb');if(sb)sb.style.display=pom.running?'none':'flex';if(pb2)pb2.style.display=pom.running?'flex':'none';
  for(var i=0;i<PRESETS.length;i++){var el=document.getElementById('preset-'+i);if(el)el.className='pom-preset'+(pom.preset===i?' active':'');}
}
