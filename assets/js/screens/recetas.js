function buildRecetas(cat){
  var list=document.getElementById('recetas-list');if(!list)return;list.innerHTML='';
  var filtered=RECIPES.filter(function(r){return cat==='Todos'||r.cat.includes(cat);});
  filtered.forEach(function(r){
    var card=document.createElement('div');card.className='rcard clay';card.id='rcard-'+r.id;
    var ing=r.ing.map(function(i){return '<div class="ring-item"><div class="ring-dot"></div><div class="ring-txt">'+i+'</div></div>';}).join('');
    var pasos=r.pasos.map(function(p,i){return '<div class="rstep"><div class="rstep-num">'+(i+1)+'</div><div class="rstep-txt">'+p+'</div></div>';}).join('');
    card.innerHTML='<div class="rcard-top" onclick="toggleReceta(\''+r.id+'\')"><div class="rcard-emoji">'+r.emoji+'</div><div class="rcard-info"><div class="rcard-name">'+r.name+'</div><div class="rcard-meta"><span class="rcard-tag">'+r.tiempo+'</span><span class="rcard-tag">'+r.dif+'</span></div><div class="rcard-macro">'+r.macro+'</div></div><div class="rcard-arrow">\u203A</div></div><div class="rcard-body"><div class="rcard-divider"></div><div class="rcard-content"><div class="rsection"><div class="rsection-title">Ingredientes</div>'+ing+'</div><div class="rsection"><div class="rsection-title">Preparacion</div>'+pasos+'</div><div class="rtip"><div class="rtip-txt">\uD83D\uDCA1 '+r.tip+'</div></div></div></div>';
    list.appendChild(card);
  });
  document.querySelectorAll('.rcat-btn').forEach(function(b){b.classList.toggle('active',b.dataset.cat===cat);});
}

function toggleReceta(id){
  var card=document.getElementById('rcard-'+id);if(!card)return;
  var wasOpen=card.classList.contains('open');
  document.querySelectorAll('.rcard').forEach(function(c){c.classList.remove('open');});
  if(!wasOpen)card.classList.add('open');
}
