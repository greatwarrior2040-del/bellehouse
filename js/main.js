
(function(){
"use strict";
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
var smoothstep=function(p,e0,e1){var t=clamp((p-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}


if(document.getElementById('hero')){
/* ---------- Portes du héros statique : IDENTIQUES au CSS, au caractère près ---------- */
var GATES=[
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)'
];
var MQLS=GATES.map(function(q){return matchMedia(q)});

var hero=document.getElementById('hero'),
    stage=document.getElementById('stage'),
    railFill=document.getElementById('railFill'),
    cue=stage.querySelector('.cue'),
    acts=Array.prototype.slice.call(stage.querySelectorAll('.act')),
    bands=Array.prototype.slice.call(stage.querySelectorAll('.band')).map(function(el){
      return {el:el,a:parseFloat(el.dataset.a),b:parseFloat(el.dataset.b),op:-1,k:-1};
    });
var CENTERS=[0,0.34,0.67,1];
var scrubOn=false, heroOnScreen=true, loadK=0;

/* ---------- Découpage du texte (une fois, générateur seedé) ---------- */
function splitWords(el,seed){
  var r=rng(seed),words=el.textContent.trim().split(/(\s+)/),frag=document.createDocumentFragment(),wi=0,total=0;
  words.forEach(function(w){if(w.trim())total++});
  words.forEach(function(w){
    if(!w.trim()){frag.appendChild(document.createTextNode(' '));return}
    var s=document.createElement('span');s.className='w';s.setAttribute('aria-hidden','true');s.textContent=w;
    s.style.setProperty('--th',(wi/total*0.7+r()*0.08).toFixed(3));wi++;
    frag.appendChild(s);
  });
  var vh=document.createElement('span');vh.className='vh';vh.textContent=el.textContent.trim();
  el.textContent='';el.appendChild(frag);el.appendChild(vh);
}
function splitChars(el,seed){
  var r=rng(seed),words=el.textContent.trim().split(/(\s+)/),frag=document.createDocumentFragment();
  words.forEach(function(w){
    if(!w.trim()){frag.appendChild(document.createTextNode(' '));return}
    var ws=document.createElement('span');ws.className='w';ws.setAttribute('aria-hidden','true');
    Array.prototype.forEach.call(w,function(ch){
      var c=document.createElement('span');c.className='c';c.textContent=ch;
      c.style.setProperty('--th',(r()*0.55).toFixed(3));
      c.style.setProperty('--jx',((r()*90-45).toFixed(1))+'px');
      c.style.setProperty('--jy',((r()*70-35).toFixed(1))+'px');
      c.style.setProperty('--jr',((r()*40-20).toFixed(1))+'deg');
      ws.appendChild(c);
    });
    frag.appendChild(ws);
  });
  var vh=document.createElement('span');vh.className='vh';vh.textContent=el.textContent.trim();
  el.textContent='';el.appendChild(frag);el.appendChild(vh);
}
function splitBlur(el){
  var t=el.textContent.trim();
  el.textContent='';
  var soft=document.createElement('span');soft.className='soft';soft.setAttribute('aria-hidden','true');soft.textContent=t;
  var sharp=document.createElement('span');sharp.className='sharp';sharp.setAttribute('aria-hidden','true');sharp.textContent=t;
  var vh=document.createElement('span');vh.className='vh';vh.textContent=t;
  el.appendChild(soft);el.appendChild(sharp);el.appendChild(vh);
}
document.querySelectorAll('[data-split]').forEach(function(el,i){
  var kind=el.dataset.split;
  if(kind==='words')splitWords(el,1000+i*77);
  else if(kind==='chars')splitChars(el,2000+i*131);
  else if(kind==='blur')splitBlur(el);
});

/* ---------- Écritures DOM avec delta ---------- */
function setAct(act,o,s){
  o=Math.round(o*100)/100;s=Math.round(s*1000)/1000;
  if(act._o!==o){act._o=o;act.style.opacity=o.toFixed(2)}
  if(act._s!==s){act._s=s;act.style.transform='scale('+s.toFixed(3)+')'}
}
function setBand(bd,o,k){
  o=Math.round(o*100)/100;k=Math.round(k*125)/125;
  if(bd.op!==o){bd.op=o;bd.el.style.opacity=o.toFixed(2)}
  if(bd.k!==k){bd.k=k;bd.el.style.setProperty('--k',k.toFixed(3))}
}

/* ---------- Progression du héros ---------- */
function heroProgress(){
  var total=hero.offsetHeight-window.innerHeight;
  if(total<=0)return 1;
  return clamp(-hero.getBoundingClientRect().top/total,0,1);
}
var lastCue=-1;
function updateHero(p){
  var i,bd,a,b,f,o,k,ramp,local,s,c;
  for(i=0;i<acts.length;i++){
    c=CENTERS[i];
    if(i===0)o=1-smoothstep(p,c+0.02,c+0.22);
    else if(i===3)o=smoothstep(p,c-0.22,c-0.02);
    else o=smoothstep(p,c-0.22,c-0.02)*(1-smoothstep(p,c+0.02,c+0.22));
    local=clamp((p-(c-0.25))/0.5,0,1);
    s=1.05+0.11*local;
    setAct(acts[i],o,s);
  }
  for(i=0;i<bands.length;i++){
    bd=bands[i];a=bd.a;b=bd.b;
    f=Math.min(0.03,(b-a)/3);
    if(a===0)o=1-smoothstep(p,b-f,b);
    else if(b===1)o=smoothstep(p,a,a+f);
    else o=smoothstep(p,a,a+f)*(1-smoothstep(p,b-f,b));
    ramp=Math.min(0.03,(b-a)*0.4);
    k=clamp((p-a)/ramp,0,1);
    if(bd.el.classList.contains('b1'))k=Math.max(k,loadK);
    setBand(bd,o,k);
  }
  var rh=Math.round(p*200)/2;
  if(railFill._h!==rh){railFill._h=rh;railFill.style.height=rh+'%'}
  var cq=p<0.04?1:0;
  if(lastCue!==cq){lastCue=cq;cue.style.opacity=cq?'':'0'}
}

/* ---------- Boucle rAF qui se repose ---------- */
var target=0,shown=-1,rafId=null,lastTick=0;
function tick(now){
  var dt=Math.min(100,now-(lastTick||now));lastTick=now;
  var k=0.16;
  shown+=(target-shown)*(1-Math.pow(1-k,dt/16.667));
  if(Math.abs(target-shown)<0.0006){shown=target;rafId=null;lastTick=0}
  else rafId=requestAnimationFrame(tick);
  updateHero(shown);
}
function onScroll(){
  target=heroProgress();
  if(rafId===null&&heroOnScreen&&scrubOn)rafId=requestAnimationFrame(tick);
}
if('IntersectionObserver' in window){
  new IntersectionObserver(function(es){heroOnScreen=es[0].isIntersecting;if(heroOnScreen)onScroll()},{threshold:0}).observe(stage);
}

/* ---------- Armement / désarmement ---------- */
function clearHeroInline(){
  acts.forEach(function(a){a.style.opacity='';a.style.transform='';a._o=undefined;a._s=undefined});
  bands.forEach(function(bd){bd.el.style.opacity='';bd.el.style.setProperty('--k','');bd.op=-1;bd.k=-1});
  if(railFill){railFill.style.height='';railFill._h=undefined}
  if(cue)cue.style.opacity='';
  lastCue=-1;
}
function enableScrub(){
  if(scrubOn)return;scrubOn=true;
  hero.classList.add('scrub-on');
  window.addEventListener('scroll',onScroll,{passive:true});
  bands.forEach(function(bd){bd.op=-1;bd.k=-1});
  shown=-1;target=heroProgress();updateHero(target);onScroll();
}
function disableScrub(){
  if(!scrubOn)return;scrubOn=false;
  hero.classList.remove('scrub-on');
  window.removeEventListener('scroll',onScroll);
  if(rafId!==null){cancelAnimationFrame(rafId);rafId=null}
  clearHeroInline();
}
function applyHeroMode(){
  if(MQLS.some(function(m){return m.matches}))disableScrub();
  else enableScrub();
}
MQLS.forEach(function(m){m.addEventListener('change',applyHeroMode)});
applyHeroMode();

/* Rampe d'ouverture du premier bandeau (une fois, puis le scroll prend le relais) */
var t0=performance.now();
(function loadRamp(){
  loadK=Math.min(1,(performance.now()-t0)/1500);
  if(loadK<1){requestAnimationFrame(loadRamp)}
  else if(scrubOn){onScroll()}
})();


}
/* ---------- Nav ---------- */
var nav=document.getElementById('nav');
function onNav(){nav.classList.toggle('scrolled',window.scrollY>window.innerHeight*0.72)}
window.addEventListener('scroll',onNav,{passive:true});onNav();
var burger=document.getElementById('burger'),menu=document.getElementById('mobileMenu');
function setMenu(open){
  document.body.classList.toggle('menu-open',open);
  burger.setAttribute('aria-expanded',open);burger.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');
  menu.setAttribute('aria-hidden',!open);
}
burger.addEventListener('click',function(){setMenu(!document.body.classList.contains('menu-open'))});
menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setMenu(false)})});

/* ---------- Révélations ---------- */
var revealEls=document.querySelectorAll('[data-reveal]');
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
  },{threshold:0.12,rootMargin:'0px 0px -6% 0px'});
  revealEls.forEach(function(el){io.observe(el)});
  var steps=document.getElementById('steps');
  new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){steps.classList.add('in')}})},{threshold:0.2}).observe(steps);
}else{
  revealEls.forEach(function(el){el.classList.add('in')});
  document.getElementById('steps').classList.add('in');
}


if(document.getElementById('holdBtn')){
/* ---------- Moment interactif : poser la première pierre ---------- */
var pierre=document.getElementById('pierre'),
    holdBtn=document.getElementById('holdBtn'),
    fillBar=document.getElementById('fillBar'),
    holdLabel=document.getElementById('holdLabel'),
    houseStage=document.getElementById('houseStage'),
    reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,
    hp=0,holding=false,holdRaf=null,holdDone=false,lastT=0;
function completeHold(){
  if(holdDone)return;holdDone=true;holding=false;
  houseStage.classList.add('done');pierre.classList.add('done');
  holdLabel.textContent='Construit';
  fillBar.style.transform='scaleX(1)';
}
function holdLoop(t){
  var dt=Math.min(80,t-(lastT||t));lastT=t;
  if(holding)hp=Math.min(1,hp+dt/1600);
  else hp=Math.max(0,hp-dt/700);
  fillBar.style.transform='scaleX('+hp.toFixed(3)+')';
  if(hp>=1){completeHold();holdRaf=null;lastT=0;return}
  if(hp>0||holding)holdRaf=requestAnimationFrame(holdLoop);
  else{holdRaf=null;lastT=0}
}
function holdStart(e){if(holdDone)return;if(e.cancelable)e.preventDefault();holding=true;if(holdRaf===null)holdRaf=requestAnimationFrame(holdLoop)}
function holdEnd(){holding=false}
if(reduceMotion){
  holdBtn.addEventListener('click',completeHold);
}else{
  holdBtn.addEventListener('pointerdown',holdStart);
  holdBtn.addEventListener('pointerup',holdEnd);
  holdBtn.addEventListener('pointercancel',holdEnd);
  holdBtn.addEventListener('pointerleave',holdEnd);
  holdBtn.addEventListener('contextmenu',function(e){e.preventDefault()});
}


}
if(document.getElementById('devisForm')){
/* ---------- Formulaire ---------- */
var form=document.getElementById('devisForm');
form.addEventListener('submit',function(e){
  e.preventDefault();
  var nom=document.getElementById('f-nom'),tel=document.getElementById('f-tel'),ok=true;
  [nom,tel].forEach(function(inp){
    var bad=!inp.value.trim()||(inp.type==='tel'&&inp.value.replace(/\D/g,'').length<8);
    inp.style.borderColor=bad?'#C0392B':'';
    if(bad)ok=false;
  });
  if(!ok){(document.getElementById('f-nom').value.trim()?document.getElementById('f-tel'):document.getElementById('f-nom')).focus();return}
  form.classList.add('sent');
  form.querySelector('.form-ok').scrollIntoView({block:'nearest',behavior:reduceMotion?'auto':'smooth'});
});

}
})();
