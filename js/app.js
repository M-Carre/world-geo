'use strict';
/* World – Géo : PWA d'apprentissage des 194 pays (193 États de l'ONU + Vatican). */
(() => {
const CONT = {
  EU:{n:'Europe',c:'#25b4e8'}, NA:{n:'Amérique du Nord',c:'#33409b'}, SA:{n:'Amérique du Sud',c:'#2e9e47'},
  AF:{n:'Afrique',c:'#f6bf1c'}, AS:{n:'Asie',c:'#e5383f'}, OC:{n:'Océanie',c:'#9a4dc4'}
};
const CONT_ORDER = ['EU','NA','SA','AF','AS','OC'];
const SKILLS = {
  cap:{n:'Capitale',cls:'cap',col:'#22a24a'}, flag:{n:'Drapeau',cls:'flag',col:'#2aa8e0'},
  loc:{n:'Localisation',cls:'loc',col:'#e8344e'}, cont:{n:'Continent',cls:'cont',col:'#f6b51c'}
};
const ICON = {
  cap:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
  loc:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  flag:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M5 2h2v20H5zM8 3c3-1.5 5 1 8 0s4-1 4-1v10s-1 0-4 1-5-1.5-8 0z"/></svg>',
  cont:'<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2"/><path fill="#fff" d="M8 6c2 0 3 1 2.5 2.5S8 10 9 12s-1 3-2 2.5S5 10 6 8s0-2 2-2zm7 5c1.5-.5 3 1 2.5 3s-2 3.5-3 3-1-2-.5-3.5 0-2 1-2.5z"/></svg>',
  mix:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M4 7h11l-3-3 1.4-1.4L19.8 9l-6.4 6.4L12 14l3-3H4zm16 10H9l3 3-1.4 1.4L4.2 15l6.4-6.4L12 10l-3 3h11z"/></svg>'
};
const DAY = 86400000;
const INTERVALS = [0, 1, 3, 7, 16, 35]; // jours par boîte de Leitner
const LS_KEY = 'worldgeo.v1';

let C = [], BY = {}, GEO = null, GEOBY = {};
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const pick = (a,n) => shuffle(a).slice(0,n);
const nf = new Intl.NumberFormat('fr-FR');
const flagSrc = c => `flags/${c.iso2}.svg`;

/* ---------- Stockage ---------- */
let S = load();
function load(){
  try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && s.items) return Object.assign({settings:{newPer:3}, stats:{answered:0,correct:0,days:[]}}, s); } catch(e){}
  return {items:{}, settings:{newPer:3}, stats:{answered:0,correct:0,days:[]}};
}
function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch(e){} }
const key = (iso,sk) => iso+':'+sk;
const item = (iso,sk) => S.items[key(iso,sk)];
function record(iso, sk, ok){
  const k = key(iso,sk); const it = S.items[k] || {b:0,due:0,ok:0,ko:0};
  if (ok){ it.b = Math.min(5, it.b+1); it.ok++; } else { it.b = 1; it.ko++; }
  it.due = Date.now() + INTERVALS[it.b]*DAY - (ok?0:DAY*0.75); // une erreur revient vite
  it.last = Date.now(); S.items[k] = it;
  S.stats.answered++; if (ok) S.stats.correct++;
  const today = new Date().toISOString().slice(0,10);
  if (!S.stats.days.includes(today)) { S.stats.days.push(today); S.stats.days = S.stats.days.slice(-400); }
  save();
}
const seen = iso => Object.keys(SKILLS).some(sk => item(iso,sk));
const mastered = iso => Object.keys(SKILLS).every(sk => (item(iso,sk)||{}).b >= 3);
const skillLvl = (iso,sk) => (item(iso,sk)||{}).b || 0;
function dueItems(zone){
  const now = Date.now(), out = [];
  for (const k in S.items){ const [iso,sk] = k.split(':'); const c = BY[iso]; if (!c) continue;
    if (zone && zone!=='WORLD' && c.continent!==zone) continue;
    if (S.items[k].due <= now) out.push({iso,sk,due:S.items[k].due}); }
  return out.sort((a,b)=>a.due-b.due);
}
function streak(){
  const d = new Set(S.stats.days); const day = k => new Date(Date.now()-k*DAY).toISOString().slice(0,10);
  let k = d.has(day(0)) ? 0 : 1, n = 0;
  while (d.has(day(k))) { n++; k++; }
  return n;
}

/* ---------- Formatage ---------- */
function fmtArea(a){ return a < 10 ? a.toLocaleString('fr-FR',{maximumFractionDigits:2})+' km²' : nf.format(Math.round(a))+' km²'; }
function fmtPop(p){
  if (p >= 1e6) return (p/1e6).toLocaleString('fr-FR',{maximumFractionDigits: p>=1e8?0:1})+' M';
  if (p >= 1e4) return (p/1e3).toLocaleString('fr-FR',{maximumFractionDigits:1})+' k';
  return nf.format(p);
}
const contColor = c => CONT[c.continent].c;
const numBadge = (c, cls='num') => `<div class="${cls}" style="background:${contColor(c)}">${c.n}</div>`;

/* ---------- Cartes SVG ---------- */
const MAPW = () => GEO.w, MAPH = () => GEO.h;
function fitView(bb, aspect, pad, minW){
  const cx=(bb[0]+bb[2])/2, cy=(bb[1]+bb[3])/2;
  let w = Math.max((bb[2]-bb[0])*pad, (bb[3]-bb[1])*pad*aspect, minW);
  w = Math.min(w, MAPW()); let h = w/aspect;
  if (h > MAPH()) { h = MAPH(); w = h*aspect; }
  let x = cx-w/2, y = cy-h/2;
  x = Math.max(0, Math.min(MAPW()-w, x)); y = Math.max(0, Math.min(MAPH()-h, y));
  return [x,y,w,h];
}
function fitRegion(v, aspect){ let w = Math.max(v[2], v[3]*aspect), h = w/aspect; return [v[0]+v[2]/2-w/2, v[1]+v[3]/2-h/2, w, h]; }
const inter = (bb,v) => !(bb[2] < v[0] || bb[0] > v[0]+v[2] || bb[3] < v[1] || bb[1] > v[1]+v[3]);
/* mode: 'focus' (un pays mis en valeur), 'world' (couleurs des continents) */
function mapSVG(view, opt={}){
  const {hl=null, mode='focus', hlColor=null, labels=false, extraCls=''} = opt;
  const v = view; const m = Math.max(v[2],v[3])*0.02;
  const vv = [v[0]-m, v[1]-m, v[2]+2*m, v[3]+2*m];
  let p = `<svg class="${extraCls}" viewBox="${v.join(' ')}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><path class="sea" d="${GEO.sphere}"/>`;
  let top = '';
  for (const it of GEO.items){
    if (it.bb && !inter(it.bb, vv)) continue;
    const c = BY[it.id];
    let cls = 'c', fill = '';
    if (!c) cls += ' oth';
    else if (mode==='world') fill = CONT[c.continent].c;
    else if (it.id===hl) { cls += ' hl'; fill = hlColor || CONT[c.continent].c; }
    else cls += ' dim';
    const s = `<path class="${cls}" data-id="${it.id}" ${fill?`style="fill:${fill}"`:''} d="${it.d}"/>`;
    if (it.id===hl) top += s; else p += s;
  }
  p += top;
  if (hl){ const it = GEOBY[hl]; if (it && it.small){ const r = Math.max(v[2],v[3])*0.035; p += `<circle class="mk" cx="${it.c[0]}" cy="${it.c[1]}" r="${r}"/>`; } }
  if (mode==='world'){
    p += '<g class="dots">';
    for (const it of GEO.items){ const c = BY[it.id]; if (!c || !it.small || !inter(it.bb,vv)) continue;
      p += `<circle class="dot" data-id="${it.id}" cx="${it.c[0]}" cy="${it.c[1]}" r="3" style="fill:${CONT[c.continent].c}"/>`; }
    p += '</g>';
    if (labels){ p += '<g class="labels">';
      for (const it of GEO.items){ const c = BY[it.id]; if (!c || !inter(it.bb,vv)) continue;
        p += `<text class="lab" data-n="${c.n}" x="${it.c[0]}" y="${it.c[1]}">${c.n}</text>`; }
      p += '</g>'; }
  }
  return p + '</svg>';
}
function countryView(iso, aspect=2, pad=3.4, minW=200){ const it = GEOBY[iso]; return fitView(it.bb, aspect, pad, minW); }

/* Carte interactive (glisser, pincer, toucher) */
function interactiveMap(host, view0, {onTap, labels=false, hl=null, mode='world', small=true}={}){
  host.innerHTML = mapSVG(view0, {mode, labels, hl}) + `<div class="mapctl"><button data-z="in" aria-label="Zoomer">+</button><button data-z="out" aria-label="Dézoomer">−</button><button data-z="reset" aria-label="Recentrer">⟲</button></div>`;
  const svg = $('svg', host); let v = view0.slice();
  const ptrs = new Map(); let start=null, moved=false, pinch0=null;
  const apply = () => {
    svg.setAttribute('viewBox', v.join(' '));
    const scale = host.clientWidth / v[2] || 1; // px par unité
    svg.querySelectorAll('circle.dot').forEach(c => c.setAttribute('r', (small?5.5:4)/scale));
    const lab = svg.querySelector('g.labels');
    if (lab){ lab.style.display = scale > 0.9 ? '' : 'none'; lab.querySelectorAll('text').forEach(t => t.setAttribute('font-size', 10/scale)); }
  };
  const clampV = () => { const W=MAPW(),H=MAPH(); v[2]=Math.min(Math.max(W,view0[2]),Math.max(40,v[2])); v[3]=v[2]*view0[3]/view0[2]; v[0]=Math.max(-v[2]*0.3,Math.min(W-v[2]*0.7,v[0])); v[1]=Math.max(-v[3]*0.3,Math.min(H-v[3]*0.7,v[1])); };
  const toSvg = (cx,cy) => { const r = svg.getBoundingClientRect(); const s = Math.min(r.width/v[2], r.height/v[3]); const ox = r.left + (r.width - v[2]*s)/2, oy = r.top + (r.height - v[3]*s)/2; return [v[0]+(cx-ox)/s, v[1]+(cy-oy)/s, s]; };
  const zoomAt = (f, cx, cy) => { const [x,y] = toSvg(cx,cy); v[0] = x-(x-v[0])*f; v[1] = y-(y-v[1])*f; v[2]*=f; v[3]*=f; clampV(); apply(); };
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,[e.clientX,e.clientY]); if (ptrs.size===1){ start=[e.clientX,e.clientY,v[0],v[1]]; moved=false; } else if (ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch0={d:Math.hypot(a[0]-b[0],a[1]-b[1]), v:v.slice(), cx:(a[0]+b[0])/2, cy:(a[1]+b[1])/2}; moved=true; } });
  svg.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,[e.clientX,e.clientY]);
    if (ptrs.size===1 && start){ const dx=e.clientX-start[0], dy=e.clientY-start[1]; if (Math.hypot(dx,dy)>8) moved=true; if (moved){ const s = toSvg(0,0)[2]; v[0]=start[2]-dx/s; v[1]=start[3]-dy/s; clampV(); apply(); } }
    else if (ptrs.size===2 && pinch0){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); const f = pinch0.d/d; const ov=pinch0.v; const [x,y] = (()=>{ v=ov.slice(); return toSvg(pinch0.cx,pinch0.cy); })(); v=[x-(x-ov[0])*f, y-(y-ov[1])*f, ov[2]*f, ov[3]*f]; clampV(); apply(); } });
  const end = e => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size===0) { pinch0=null;
      if (was && !moved && e.type==='pointerup' && onTap){ const [x,y,s] = toSvg(e.clientX,e.clientY); onTap(hitTest(svg, e.clientX, e.clientY, x, y, s), x, y); } start=null; }
    else if (ptrs.size===1){ const [p]=[...ptrs.values()]; start=[p[0],p[1],v[0],v[1]]; } };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY>0?1.2:1/1.2, e.clientX, e.clientY); }, {passive:false});
  host.querySelector('.mapctl').addEventListener('click', e => { const z = e.target.closest('button')?.dataset.z; if (!z) return; const r = svg.getBoundingClientRect();
    if (z==='reset'){ v = view0.slice(); apply(); } else zoomAt(z==='in'?0.6:1/0.6, r.left+r.width/2, r.top+r.height/2); });
  requestAnimationFrame(apply);
  return {svg, get view(){return v;}, refresh:apply, setView(nv){ v=nv.slice(); clampV(); apply(); }};
}
function hitTest(svg, cx, cy, x, y, s){
  // 1) pastille d'un petit pays très proche (14 px) ; 2) pays sous le doigt ; 3) pastille à moins de 30 px
  let best=null, bd=Infinity;
  for (const it of GEO.items){ if (!it.small || !BY[it.id]) continue; const d = Math.hypot(it.c[0]-x, it.c[1]-y)*s; if (d < bd){ bd=d; best=it.id; } }
  if (best && bd <= 14) return best;
  const el = document.elementFromPoint(cx, cy);
  const t = el && el.closest ? el.closest('[data-id]') : null;
  if (t && BY[t.dataset.id]) return t.dataset.id;
  return best && bd <= 30 ? best : null;
}
/* ---------- Navigation ---------- */
const stack = [];
function go(fn, args={}, {replace=false, tab=null}={}){
  if (replace) stack.pop();
  stack.push({fn,args}); render();
  if (tab) setTab(tab);
}
function back(){ if (stack.length>1){ stack.pop(); render(); } }
function home(tab='home'){ stack.length=0; go(TABS[tab]); setTab(tab); }
function setTab(t){ document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab===t)); }
function render(){
  const top = stack[stack.length-1]; const view = $('#view');
  document.getElementById('app').classList.remove('quizmode');
  $('#back').hidden = stack.length<=1; $('#topright').textContent='';
  view.scrollTop = 0; top.fn(view, top.args);
}
function setTitle(t){ $('#title').textContent = t; }
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }

/* ---------- Écran d'accueil ---------- */
function vHome(el){
  setTitle('');
  const due = dueItems().length, m = C.filter(c=>mastered(c.iso3)).length, sn = C.filter(c=>seen(c.iso3)).length;
  const zones = CONT_ORDER.map(z => { const cs = C.filter(c=>c.continent===z); const mm = cs.filter(c=>mastered(c.iso3)).length; const ss = cs.filter(c=>seen(c.iso3)).length;
    return `<button class="zone" data-zone="${z}"><i class="sw" style="background:${CONT[z].c}"></i><div class="zn"><b>${CONT[z].n}</b><span>${cs.length} pays · ${ss} vus · ${mm} maîtrisés</span><div class="bar"><i style="width:${(mm/cs.length*100).toFixed(1)}%;background:${CONT[z].c}"></i></div></div><span class="chev">›</span></button>`; }).join('');
  el.innerHTML = `
  <div class="logo"><div class="frame"><div class="w">WORLD</div></div><div class="g">GÉO</div><div class="dots"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="tagline">194 PAYS À MAÎTRISER</div></div>
  <div class="stats-row"><div class="stat"><b>${m}</b><span>maîtrisés / 194</span></div><div class="stat"><b>${sn}</b><span>découverts</span></div><div class="stat"><b>${streak()}</b><span>jours de suite</span></div></div>
  <div class="h2">Aujourd'hui</div>
  <button class="big-btn" id="rev"><div>Réviser<small>${due ? due+' question'+(due>1?'s':'')+' à revoir' : 'Rien à revoir pour l’instant'}</small></div><span class="pill">${due}</span></button>
  <button class="big-btn ghost" id="learnw"><div>Apprendre le monde<small>Nouveaux pays dans l’ordre des numéros</small></div><span>›</span></button>
  <div class="h2">Apprendre par continent</div>${zones}
  <div class="h2">Plus</div>
  <button class="big-btn ghost" id="about"><div>Réglages & sources<small>Nouveaux pays par séance, données, licences</small></div><span>›</span></button>`;
  $('#rev',el).onclick = () => due ? startSession('WORLD',{reviewOnly:true}) : toast('Tout est à jour !');
  $('#learnw',el).onclick = () => startSession('WORLD');
  $('#about',el).onclick = () => go(vAbout);
  el.querySelectorAll('.zone').forEach(b => b.onclick = () => go(vZone,{z:b.dataset.zone}));
}

function vZone(el,{z}){
  setTitle(CONT[z].n);
  const cs = C.filter(c=>c.continent===z); const due = dueItems(z).length; const fresh = cs.filter(c=>!seen(c.iso3)).length;
  el.innerHTML = `
    <button class="big-btn" id="go" style="background:${CONT[z].c};color:${z==='AF'?'#000':'#fff'}"><div>Séance d’apprentissage<small style="color:inherit;opacity:.8">${due} à revoir · ${fresh} nouveaux pays restants</small></div><span>›</span></button>
    <div class="seg">
      ${['cap','flag','loc','cont'].map(k=>`<button class="opt" data-q="${k}"><b><span class="ico ${k}">${ICON[k]}</span>${SKILLS[k].n}</b><span>Défi rapide · 10 questions</span></button>`).join('')}
    </div>
    <div class="h2">Les ${cs.length} cartes</div><div class="grid">${cs.map(miniCard).join('')}</div>`;
  $('#go',el).onclick = () => startSession(z);
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => startQuiz({zone:z, type:b.dataset.q, n:10}));
  bindMini(el);
}

/* ---------- Cartes (fiches) ---------- */
function miniCard(c){
  const lv = Object.keys(SKILLS).map(sk => `<i class="${skillLvl(c.iso3,sk)>=3?'on':''}"></i>`).join('');
  return `<button class="mcard" data-iso="${c.iso3}"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.capital)}</div>${numBadge(c)}<img loading="lazy" src="${flagSrc(c)}" alt=""><div class="lvl" style="margin-top:7px">${lv}</div></button>`;
}
function bindMini(el, list){ el.querySelectorAll('.mcard').forEach(b => b.onclick = () => go(vCard,{iso:b.dataset.iso, list: list || [...el.querySelectorAll('.mcard')].map(x=>x.dataset.iso)})); }

function gameCard(c){
  const hpSub = c.hpNote ? '' : '';
  return `<article class="gcard">
    <div class="head"><div class="nm"><h1>${esc(c.name)}</h1><div class="cap">${esc(c.capital)}</div></div>${numBadge(c)}</div>
    <div class="flagbox"><img src="${flagSrc(c)}" alt="Drapeau : ${esc(c.name)}"></div>
    <table class="facts">
      <tr><td>Superficie</td><td>${fmtArea(c.area)}</td></tr>
      <tr><td>Population</td><td>${fmtPop(c.pop)}</td></tr>
      <tr><td>Point culminant</td><td>${nf.format(c.hpElev)} m<span class="sub">${esc(c.hp)}</span></td></tr>
      <tr><td>Pays voisins</td><td>${c.neighbors}</td></tr>
    </table></article>`;
}
function cardExtras(c){
  const notes = [c.capNote && 'Capitale : '+c.capNote, c.areaNote && 'Superficie : '+c.areaNote, c.hpNote && 'Point culminant : '+c.hpNote, c.popNote && 'Population : '+c.popNote].filter(Boolean);
  const nb = c.neighborList.map(i => BY[i]).filter(Boolean).map(x=>x.name).join(', ');
  return `<div class="idbox"><div class="lbl">IDENTITÉ</div>${esc(c.trait)}</div>
    <div class="minimap">${mapSVG(countryView(c.iso3), {hl:c.iso3})}</div>
    <div class="idbox"><div class="lbl">${CONT[c.continent].n.toUpperCase()} · N° ${c.n}</div>
      <div class="small" style="color:#ccc">${nb ? 'Voisins terrestres : '+esc(nb)+'.' : 'Aucune frontière terrestre avec un autre pays du jeu.'}</div>
      ${notes.length ? `<div class="small" style="margin-top:8px">${notes.map(esc).join('<br>')}</div>` : ''}
      <div class="small" style="margin-top:8px">Population : Banque mondiale ${c.popYear||''}. Maîtrise : ${Object.keys(SKILLS).map(sk=>SKILLS[sk].n+' '+skillLvl(c.iso3,sk)+'/5').join(' · ')}</div>
    </div>`;
}
function vCard(el,{iso,list}){
  const c = BY[iso]; setTitle(c.name);
  const L = list && list.length ? list : C.map(x=>x.iso3); const i = L.indexOf(iso);
  el.innerHTML = gameCard(c) + cardExtras(c) + `<div class="cardnav"><button id="prev">‹ Précédent</button><button id="nxt">Suivant ›</button></div>`;
  const nav = d => { const j = (i+d+L.length)%L.length; go(vCard,{iso:L[j],list:L},{replace:true}); };
  $('#prev',el).onclick = () => nav(-1); $('#nxt',el).onclick = () => nav(1);
  let sx=null; const card=$('.gcard',el);
  card.addEventListener('touchstart', e=>{ sx=e.touches[0].clientX; }, {passive:true});
  card.addEventListener('touchend', e=>{ if (sx===null) return; const dx=e.changedTouches[0].clientX-sx; if (Math.abs(dx)>60) nav(dx<0?1:-1); sx=null; });
}

function vDeck(el,{f='ALL',q=''}={}){
  setTitle('Cartes');
  el.innerHTML = `<input class="search" type="search" placeholder="Pays, capitale ou numéro…" value="${esc(q)}">
    <div class="chips">${['ALL',...CONT_ORDER].map(z=>`<button class="chip ${z===f?'on':''}" data-f="${z}">${z==='ALL'?'Tous':`<i style="background:${CONT[z].c}"></i>${CONT[z].n}`}</button>`).join('')}</div>
    <div class="grid" id="g"></div>`;
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const draw = () => { const qq = norm($('.search',el).value.trim());
    const list = C.filter(c => (f==='ALL'||c.continent===f) && (!qq || norm(c.name).includes(qq) || norm(c.capital).includes(qq) || String(c.n)===qq));
    $('#g',el).innerHTML = list.map(miniCard).join('') || '<p class="small">Aucun résultat.</p>'; bindMini($('#g',el), list.map(c=>c.iso3)); };
  $('.search',el).addEventListener('input', () => { stack[stack.length-1].args = {f, q:$('.search',el).value}; draw(); });
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { f=b.dataset.f; stack[stack.length-1].args={f,q:$('.search',el).value}; el.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); draw(); });
  draw();
}

function vMap(el,{z='WORLD'}={}){
  setTitle('Carte du monde');
  el.innerHTML = `<div class="chips">${['WORLD',...CONT_ORDER].map(k=>`<button class="chip ${k===z?'on':''}" data-z="${k}">${k==='WORLD'?'Monde':`<i style="background:${CONT[k].c}"></i>${CONT[k].n}`}</button>`).join('')}</div>
    <div class="fullmap" id="fm" style="height:62vh"></div><p class="hint">Glisse et pince pour zoomer · touche un pays pour ouvrir sa carte. Les numéros apparaissent en zoomant.</p>`;
  const host = $('#fm',el);
  const aspect = () => host.clientWidth/host.clientHeight;
  const viewFor = k => fitRegion(GEO.views[k], aspect());
  const im = interactiveMap(host, viewFor(z), {labels:true, onTap: id => { if (id) go(vCard,{iso:id}); }});
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { z=b.dataset.z; stack[stack.length-1].args={z}; el.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); im.setView(viewFor(z)); });
}

/* ---------- Questions ---------- */
function sameCont(c){ return C.filter(x => x.continent===c.continent && x.iso3!==c.iso3); }
function nearest(c, n){ const a = GEOBY[c.iso3].c; return sameCont(c).map(x=>({x,d:Math.hypot(GEOBY[x.iso3].c[0]-a[0],GEOBY[x.iso3].c[1]-a[1])})).sort((p,q)=>p.d-q.d).slice(0,n).map(o=>o.x); }
function distractors(c, n, field, pool){
  const out=[], used=new Set([field(c)]);
  for (const x of shuffle(pool)){ const v = field(x); if (!used.has(v)){ used.add(v); out.push(x); } if (out.length>=n) break; }
  if (out.length<n) for (const x of shuffle(C)){ const v=field(x); if (x.iso3!==c.iso3 && !used.has(v)){ used.add(v); out.push(x); } if (out.length>=n) break; }
  return out;
}
function buildQ(iso, sk, variant){
  const c = BY[iso]; const lvl = skillLvl(iso,sk);
  if (sk==='cont') return {iso,sk,kind:'cont', ask:`Sur quel continent se trouve ce pays ?`, sub:c.name, flag:true, opts:CONT_ORDER.map(z=>({id:z,label:CONT[z].n,sw:CONT[z].c})), answer:c.continent};
  if (sk==='flag'){
    const rev = variant==='rev' || (variant!=='fwd' && lvl>=2 && Math.random()<0.4);
    const ds = distractors(c,3,x=>x.iso3, sameCont(c));
    const opts = shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.name,img:flagSrc(x)}));
    if (rev) return {iso,sk,kind:'flagpick', ask:'Quel est le drapeau de ce pays ?', sub:c.name, opts, answer:iso};
    return {iso,sk,kind:'flag', ask:'À quel pays appartient ce drapeau ?', flag:true, opts:opts.map(o=>({id:o.id,label:o.label})), answer:iso};
  }
  if (sk==='cap'){
    const rev = variant==='rev' || (variant!=='fwd' && lvl>=2 && Math.random()<0.4);
    const ds = distractors(c,3,x=>x.capital, sameCont(c));
    if (rev) return {iso,sk,kind:'caprev', ask:`De quel pays ${c.capital} est-elle la capitale ?`, opts:shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.name})), answer:iso};
    return {iso,sk,kind:'cap', ask:`Quelle est la capitale de ce pays ?`, sub:c.name, flag:true, opts:shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.capital})), answer:iso};
  }
  if (sk==='loc'){
    const tap = variant==='tap' || (variant!=='qcm' && lvl>=2 && Math.random()<0.5);
    if (tap) return {iso,sk,kind:'tap', ask:`Touche ${c.name} sur la carte`, answer:iso};
    const ds = distractors(c,3,x=>x.iso3, nearest(c,7));
    return {iso,sk,kind:'loc', ask:'Quel pays est mis en évidence ?', map:true, opts:shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.name})), answer:iso};
  }
}

/* ---------- Séances ---------- */
function startSession(zone, {reviewOnly=false}={}){
  const due = dueItems(zone).slice(0, reviewOnly?25:14);
  const steps = []; const qs = due.map(d=>({iso:d.iso, sk:d.sk}));
  let newC = [];
  if (!reviewOnly && due.length < 14){
    newC = C.filter(c => (zone==='WORLD'||c.continent===zone) && !seen(c.iso3)).sort((a,b)=>a.n-b.n).slice(0, S.settings.newPer||3);
  }
  newC.forEach(c => steps.push({type:'intro', iso:c.iso3}));
  const fresh = []; newC.forEach(c => ['cont','flag','cap','loc'].forEach(sk => fresh.push({iso:c.iso3, sk, variant: sk==='loc'?'qcm':(sk==='cap'||sk==='flag')?'fwd':null})));
  // mélange tout en gardant les nouvelles questions après les découvertes
  shuffle([...qs, ...fresh]).forEach(q => steps.push({type:'q', ...q}));
  if (!steps.length){ toast(zone==='WORLD'?'Tout est appris et à jour !':'Ce continent est à jour !'); return; }
  go(vSession, {steps, i:0, ok:0, n:0, title: zone==='WORLD' ? (reviewOnly?'Révision':'Apprendre le monde') : CONT[zone].n, srs:true, again:{kind:'session', zone, reviewOnly}});
}
function startQuiz({zone='WORLD', type='mix', n=10}){
  const pool = C.filter(c => zone==='WORLD' || c.continent===zone);
  const sks = ['cap','flag','loc','cont'];
  const steps = pick(pool, Math.min(n, pool.length)).map(c => { let sk = type, variant=null;
    if (type==='mix') sk = sks[Math.floor(Math.random()*4)];
    if (type==='tap'){ sk='loc'; variant='tap'; } else if (type==='loc') variant='qcm';
    return {type:'q', iso:c.iso3, sk, variant}; });
  const t = type==='tap' ? 'Toucher sur la carte' : type==='mix' ? 'Défi mélangé' : 'Défi '+SKILLS[type].n.toLowerCase();
  go(vSession, {steps, i:0, ok:0, n:0, title:t, srs:true, again:{kind:'quiz', zone, type, n}});
}

function vSession(el, st){
  document.getElementById('app').classList.add('quizmode');
  setTitle(st.title);
  const total = st.steps.length;
  if (st.i >= total) return vSummary(el, st);
  $('#topright').innerHTML = `<button class="icon-btn" style="font-size:18px" id="quit" aria-label="Quitter">✕</button>`;
  $('#quit').onclick = () => { if (st.n===0 || confirm('Quitter la séance ? Tes réponses déjà données sont enregistrées.')) back(); };
  const step = st.steps[st.i];
  const progress = `<div class="qtop"><div class="prog"><i style="width:${(st.i/total*100).toFixed(1)}%"></i></div><div class="count">${st.i+1}/${total}</div></div>`;
  const nextStep = () => { st.i++; vSession(el, st); el.scrollTop=0; };
  if (step.type==='intro'){
    const c = BY[step.iso];
    el.innerHTML = `<div class="qwrap">${progress}<div class="h2" style="margin-top:4px">Nouvelle carte</div>${gameCard(c)}${cardExtras(c)}<button class="next" id="nx">J’ai retenu, continuer ›</button></div>`;
    $('#nx',el).onclick = nextStep; return;
  }
  const q = step.q || (step.q = buildQ(step.iso, step.sk, step.variant));
  const c = BY[q.iso]; const S0 = SKILLS[q.sk];
  const badge = `<span class="badge" style="background:${S0.col}">${ICON[q.sk]} ${S0.n}</span>`;
  let body = '';
  if (q.flag) body += `<img class="qflag" src="${flagSrc(c)}" alt="Drapeau à identifier">`;
  if (q.kind==='loc') body += `<div class="qmap">${mapSVG(countryView(c.iso3, 4/3, 4.5, 330), {hl:c.iso3, hlColor:'#e5383f'})}</div>`;
  const ansCls = q.kind==='flagpick' ? 'answers cols2 flags' : q.kind==='cont' ? 'answers cols2' : 'answers';
  const answers = q.kind==='tap' ? '' : `<div class="${ansCls}">${q.opts.map(o => `<button class="ans" data-id="${o.id}">${o.sw?`<i class="sw" style="background:${o.sw}"></i>`:''}${o.img?`<img src="${o.img}" alt="Drapeau ${esc(o.label)}">`:esc(o.label)}</button>`).join('')}</div>`;
  const nameSub = q.sub ? `<div class="qsub" style="font-weight:800;font-size:19px;color:#111;margin-top:6px;text-transform:uppercase">${esc(q.sub)}</div>` : '';
  el.innerHTML = `<div class="qwrap">${progress}<div class="qcard">${badge}<div class="q">${esc(q.ask)}</div>${nameSub}${body}</div>
    ${q.kind==='tap' ? `<div class="fullmap tapmap" id="tm"></div><p class="hint" id="th">Glisse ou pince pour zoomer, puis touche le pays.</p>` : ''}
    ${answers}<div class="feedback" id="fb"></div></div>`;
  let done = false;
  const finish = (ok, chosen) => {
    if (done) return; done = true; st.n++; if (ok) st.ok++;
    if (st.srs) record(q.iso, q.sk, ok);
    if (!ok && !step.retry){ const at = Math.min(st.steps.length, st.i+4); st.steps.splice(at, 0, {type:'q', iso:q.iso, sk:q.sk, variant:step.variant, retry:true}); }
    el.querySelectorAll('.ans').forEach(b => { const id=b.dataset.id; if (id===q.answer) b.classList.add('ok'); else if (id===chosen) b.classList.add('ko'); else b.classList.add('fade'); b.disabled=true; });
    const fb = $('#fb',el);
    const chosenName = chosen && BY[chosen] ? BY[chosen].name : null;
    fb.innerHTML = `<div class="msg ${ok?'ok':'ko'}">${ok?'Bravo !':'Pas tout à fait…'}${!ok && q.kind==='tap' && chosenName ? ' Tu as touché : '+esc(chosenName)+'.' : ''}</div>
      <div class="mini-fiche"><img src="${flagSrc(c)}" alt=""><div><b>${esc(c.name)}</b><span>${esc(c.capital)} · ${CONT[c.continent].n} · n° ${c.n}</span>${!ok?`<p>${esc(c.trait)}</p>`:''}</div></div>
      <button class="next" id="nx">Continuer ›</button>`;
    $('#nx',el).onclick = nextStep;
    fb.scrollIntoView({behavior:'smooth', block:'end'});
  };
  el.querySelectorAll('.ans').forEach(b => b.onclick = () => finish(b.dataset.id===q.answer, b.dataset.id));
  if (q.kind==='tap'){
    const host = $('#tm',el); const v = GEO.views[c.continent];
    const view = fitRegion(v, host.clientWidth/host.clientHeight);
    const im = interactiveMap(host, view, {mode:'world', onTap: id => {
      if (done) return;
      if (!id){ $('#th',el).textContent = 'Touche un pays (pas la mer) ou zoome davantage.'; return; }
      const ok = id===q.iso;
      im.svg.querySelectorAll(`[data-id="${q.iso}"]`).forEach(p => { p.style.fill = '#2e9e47'; p.classList.add('hl'); });
      if (!ok) im.svg.querySelectorAll(`[data-id="${id}"]`).forEach(p => { p.style.fill = '#e5383f'; p.classList.add('hl'); });
      const it = GEOBY[q.iso];
      const ns = 'http://www.w3.org/2000/svg'; const ring = document.createElementNS(ns,'circle'); ring.setAttribute('class','mk'); ring.setAttribute('cx',it.c[0]); ring.setAttribute('cy',it.c[1]); ring.setAttribute('r', Math.max(it.bb[2]-it.bb[0], it.bb[3]-it.bb[1], 14)*0.75); ring.style.stroke='#000'; im.svg.appendChild(ring);
      finish(ok, id);
    }});
    // repère : les petits pays sont dessinés en pastilles
  }
}
function vSummary(el, st){
  document.getElementById('app').classList.remove('quizmode'); setTitle('Bilan');
  const pct = st.n ? Math.round(st.ok/st.n*100) : 100;
  const isos = [...new Set(st.steps.filter(s=>s.type!=='intro').map(s=>s.iso))];
  el.innerHTML = `<div class="summary"><div class="small">Séance terminée</div><div class="score">${pct}%</div><div>${st.ok} bonne${st.ok>1?'s':''} réponse${st.ok>1?'s':''} sur ${st.n}</div></div>
   <button class="next" id="again">Continuer à apprendre</button><button class="big-btn ghost" id="home" style="margin-top:10px">Retour à l’accueil<span>›</span></button>
   <div class="h2">Pays de la séance</div><div class="grid">${isos.map(i=>miniCard(BY[i])).join('')}</div>`;
  $('#home',el).onclick = () => home('home');
  $('#back').hidden = true;
  $('#again',el).textContent = st.again && st.again.kind==='quiz' ? 'Rejouer ce défi' : 'Continuer à apprendre';
  $('#again',el).onclick = () => { const a = st.again || {kind:'session', zone:'WORLD'}; stack.pop(); const n0 = stack.length; if (a.kind==='quiz') startQuiz(a); else startSession(a.zone, a); if (stack.length===n0) render(); };
  bindMini(el);
  $('#topright').textContent='';
}

/* ---------- Défis ---------- */
function vQuiz(el){
  setTitle('Défis');
  let type='mix', zone='WORLD', n=10;
  const types = [['cap','Capitale','Trouve la capitale (et l’inverse)'],['flag','Drapeau','Reconnais le pays à son drapeau'],['loc','Localisation','Quel pays est surligné ?'],['tap','Toucher la carte','Touche le pays demandé'],['cont','Continent','Range le pays'],['mix','Mélange','Les quatre défis']];
  const draw = () => {
    el.innerHTML = `<div class="h2" style="margin-top:4px">Type de défi</div>
    <div class="seg">${types.map(([k,t,d])=>`<button class="opt ${k===type?'on':''}" data-t="${k}"><b><span class="ico ${k==='tap'?'loc':k}">${ICON[k==='tap'?'loc':k]}</span>${t}</b><span>${d}</span></button>`).join('')}</div>
    <div class="h2">Zone</div><div class="chips" style="flex-wrap:wrap">${['WORLD',...CONT_ORDER].map(k=>`<button class="chip ${k===zone?'on':''}" data-z="${k}">${k==='WORLD'?'Monde entier':`<i style="background:${CONT[k].c}"></i>${CONT[k].n}`}</button>`).join('')}</div>
    <div class="h2">Nombre de questions</div><div class="chips">${[10,20,30].map(k=>`<button class="chip ${k===n?'on':''}" data-n="${k}">${k}</button>`).join('')}</div>
    <button class="next" id="start">Lancer le défi</button>`;
    el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{type=b.dataset.t;draw();});
    el.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{zone=b.dataset.z;draw();});
    el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{n=+b.dataset.n;draw();});
    $('#start',el).onclick = () => startQuiz({zone,type,n});
  };
  draw();
}

/* ---------- À propos ---------- */
function vAbout(el){
  setTitle('Réglages & sources');
  el.innerHTML = `<div class="panel"><b>Nouveaux pays par séance</b><div class="chips" style="margin-top:10px">${[2,3,5,8].map(k=>`<button class="chip ${k===(S.settings.newPer||3)?'on':''}" data-np="${k}">${k}</button>`).join('')}</div>
    <p class="small">Chaque nouveau pays apporte 4 questions (continent, drapeau, capitale, localisation). Les révisions suivent des intervalles croissants : 1, 3, 7, 16 puis 35 jours ; une erreur remet la question au début. Un pays est « maîtrisé » quand ses 4 défis ont réussi au moins 3 fois de suite.</p></div>
    <div class="panel"><b>Sauvegarde</b><p class="small">La progression est enregistrée uniquement sur cet appareil (stockage local du navigateur). Elle n’est pas synchronisée.</p>
    <button class="chip" id="exp">Exporter</button> <button class="chip" id="imp">Importer</button> <button class="chip" id="reset" style="background:#5a1515">Tout effacer</button></div>
    <div class="panel"><b>Sources des données</b><p class="small">
    • Liste et numérotation des 194 pays : liste des emplacements (version française) de The World Game.<br>
    • Drapeaux : flag-icons (licence MIT).<br>
    • Fond de carte : Natural Earth via world-atlas (domaine public / ISC). Le Somaliland est rattaché à la Somalie et Chypre du Nord à Chypre, conformément aux frontières reconnues par l’ONU ; Kosovo, Taïwan, Sahara occidental, Palestine, Groenland, etc. sont en gris.<br>
    • Capitales et points culminants : Wikidata (CC0), vérifiés et corrigés à la main.<br>
    • Population : Banque mondiale, 2024 (CC BY 4.0).<br>
    • Superficies, frontières : jeu de données mledoze/countries (ODbL).<br>
    • Pays voisins : frontières terrestres avec les autres pays de la liste des 194 (territoires non membres exclus).<br>
    • Traits d’identité : rédigés pour l’app à partir de faits géographiques établis.<br>
    • Police : Montserrat (SIL Open Font License).</p>
    <p class="small">Application non officielle, inspirée d’un jeu de cartes de géographie ; sans lien avec ses éditeurs.</p></div>`;
  el.querySelectorAll('[data-np]').forEach(b=>b.onclick=()=>{S.settings.newPer=+b.dataset.np;save();vAbout(el);});
  $('#reset',el).onclick=()=>{ if(confirm('Effacer toute la progression ?')){ S={items:{},settings:{newPer:3},stats:{answered:0,correct:0,days:[]}}; save(); toast('Progression effacée'); } };
  $('#exp',el).onclick=()=>{ const t=JSON.stringify(S); if (navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('Copié dans le presse-papiers')); else prompt('Copie ce texte',t); };
  $('#imp',el).onclick=()=>{ const t=prompt('Colle ici une sauvegarde exportée'); if(!t) return; try{ const s=JSON.parse(t); if(!s.items) throw 0; S=Object.assign(load(),s); save(); toast('Progression importée'); }catch(e){ toast('Sauvegarde invalide'); } };
}

const TABS = {home:vHome, quiz:vQuiz, deck:vDeck, map:vMap};

/* ---------- Démarrage ---------- */
async function init(){
  $('#back').onclick = back;
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => home(b.dataset.tab));
  const [cs, geo] = await Promise.all([fetch('data/countries.json').then(r=>r.json()), fetch('data/geo.json').then(r=>r.json())]);
  C = cs.sort((a,b)=>a.n-b.n); C.forEach(c=>BY[c.iso3]=c); GEO = geo; GEO.items.forEach(i=>GEOBY[i.id]=i);
  home('home');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
}
window.WorldGeo = { get state(){ return S; }, buildQ, BY:()=>BY };
init().catch(e => { $('#view').innerHTML = `<p class="loading">Erreur de chargement : ${esc(e.message)}</p>`; console.error(e); });
})();
