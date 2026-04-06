async function buildStats(){
  var d7=await hist(7),d30=await hist(30),wd7=d7.filter(function(d){return d.data;});
  var streak=0,best=0,cur=0;
  for(var i=d7.length-1;i>=0;i--){var p=dpct(d7[i].data);if(p!==null&&p>=50)streak++;else break;}
  d30.forEach(function(d){var p=dpct(d.data);if(p!==null&&p>=50){cur++;if(cur>best)best=cur;}else cur=0;});
  var rnum=document.getElementById('rnum');if(rnum)rnum.textContent=streak;
  var rbest=document.getElementById('rbest');if(rbest)rbest.textContent='Mejor: '+best+' dias';
  var avg=wd7.length?Math.round(wd7.reduce(function(a,d){return a+dpct(d.data);},0)/wd7.length):0;
  var ravg=document.getElementById('ravg');if(ravg)ravg.textContent=avg+'%';
  var ag=wd7.length?(wd7.reduce(function(a,d){return a+((d.data.water||0)*0.3);},0)/wd7.length).toFixed(1):'0';
  var magua=document.getElementById('magua');if(magua)magua.textContent=ag;
  var mvit=document.getElementById('mvit');if(mvit)mvit.textContent=wd7.filter(function(d){return d.data&&d.data.habits&&d.data.habits.vitc&&d.data.habits.nmn;}).length;
  var mdep=document.getElementById('mdep');if(mdep)mdep.textContent=wd7.filter(function(d){return d.data&&d.data.habits&&(d.data.habits.futbol||d.data.habits.pilates);}).length;
  var msk=document.getElementById('msk');if(msk)msk.textContent=wd7.filter(function(d){return d.data&&d.data.skin;}).length;
  buildChart(cp);buildBK(d30);
}

function setP(p){cp=p;['semana','mes','year'].forEach(function(x){var el=document.getElementById('tog-'+x);if(el)el.classList.toggle('active',x===p);});buildChart(p);}

async function buildChart(period){
  var nd=period==='semana'?7:period==='mes'?30:365;var days=await hist(nd),barRow=document.getElementById('barrow');if(!barRow)return;barRow.innerHTML='';
  var dn=['D','L','M','X','J','V','S'],mn=['E','F','M','A','My','Jn','Jl','Ag','S','O','N','D'];var groups=[],today=new Date().toDateString();
  if(period==='semana'){groups=days.map(function(d){return{label:dn[d.date.getDay()],pct:dpct(d.data),isToday:d.date.toDateString()===today};});}
  else if(period==='mes'){var wks={};days.forEach(function(d){var wk=Math.floor((d.date.getDate()-1)/7);if(!wks[wk])wks[wk]={label:'S'+(wk+1),pcts:[],isToday:false};var p=dpct(d.data);if(p!==null)wks[wk].pcts.push(p);if(d.date.toDateString()===today)wks[wk].isToday=true;});groups=Object.values(wks).map(function(w){return{label:w.label,pct:w.pcts.length?Math.round(w.pcts.reduce(function(a,b){return a+b;},0)/w.pcts.length):null,isToday:w.isToday};});}
  else{var mos={};days.forEach(function(d){var mk=d.date.getMonth();if(!mos[mk])mos[mk]={label:mn[mk],pcts:[],isToday:false};var p=dpct(d.data);if(p!==null)mos[mk].pcts.push(p);if(d.date.toDateString()===today)mos[mk].isToday=true;});groups=Object.values(mos).map(function(m){return{label:m.label,pct:m.pcts.length?Math.round(m.pcts.reduce(function(a,b){return a+b;},0)/m.pcts.length):null,isToday:m.isToday};});}
  groups.forEach(function(g){var col=document.createElement('div');col.className='bc'+(g.isToday?' today':'');var pct=g.pct||0,hh=Math.max(Math.round(pct*0.58),2);var cls=g.isToday?'hi':pct>=70?'med':pct>0?'lo':'lo';col.innerHTML='<div class="bw"><div class="b '+cls+'" style="height:'+hh+'px"></div></div><div class="bd">'+g.label+'</div><div class="bp">'+(g.pct!==null?g.pct+'%':'')+'</div>';barRow.appendChild(col);});
}

function buildBK(days){
  var list=document.getElementById('bklist');if(!list)return;list.innerHTML='';var n=days.filter(function(d){return d.data;}).length||1;
  BKM.forEach(function(bk){
    var cnt=0;
    days.forEach(function(d){if(!d.data)return;if(bk.id==='agua'){if((d.data.water||0)>=MW)cnt++;}else if(bk.id==='skincare'){if(d.data.skin)cnt++;}else if(d.data.habits&&d.data.habits[bk.id])cnt++;});
    var p=Math.round((cnt/n)*100);
    var label=bk.l;
    if(bk.id==='skincare'){
      var featuredName=document.querySelector('#sk-card .sk-name');
      if(featuredName)label=featuredName.textContent;
    } else if(bk.id!=='agua') {
      var habitTitle=document.querySelector('#h-'+bk.id+' .hn, #h-'+bk.id+' .fhn');
      if(habitTitle)label=habitTitle.textContent.trim();
    }
    var row=document.createElement('div');
    row.className='brow';
    row.innerHTML='<div class="bri">'+bk.i+'</div><div class="brl">'+label+'</div><div class="brbg"><div class="brf" style="width:'+p+'%"></div></div><div class="brp">'+p+'%</div>';
    list.appendChild(row);
  });
}
