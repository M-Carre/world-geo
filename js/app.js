'use strict';
/* World – Géo v3 : PWA d'apprentissage des 194 pays (193 États de l'ONU + Vatican).
   Répétition espacée : FSRS-6 (js/fsrs.js). */
(() => {
const CONT = {
  EU:{n:'Europe',c:'#25b4e8'}, NA:{n:'Amérique du Nord',c:'#33409b'}, SA:{n:'Amérique du Sud',c:'#2e9e47'},
  AF:{n:'Afrique',c:'#f6bf1c'}, AS:{n:'Asie',c:'#e5383f'}, OC:{n:'Océanie',c:'#9a4dc4'}
};
const CONT_ORDER = ['EU','NA','SA','AF','AS','OC'];
const SKILLS = {
  cap:{n:'Capitale',cls:'cap',col:'#22a24a'}, flag:{n:'Drapeau',cls:'flag',col:'#2aa8e0'},
  loc:{n:'Localisation',cls:'loc',col:'#e8344e'}
};
const SK = Object.keys(SKILLS);
const ICON = {
  cap:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
  loc:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  flag:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M5 2h2v20H5zM8 3c3-1.5 5 1 8 0s4-1 4-1v10s-1 0-4 1-5-1.5-8 0z"/></svg>',
  mix:'<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M4 7h11l-3-3 1.4-1.4L19.8 9l-6.4 6.4L12 14l3-3H4zm16 10H9l3 3-1.4 1.4L4.2 15l6.4-6.4L12 10l-3 3h11z"/></svg>'
};
const DAY = 86400000;
const LS_KEY = 'worldgeo.v1';            // même clé qu'avant ; le contenu porte un numéro de version
const MASTER_S = 10;                     // compétence « maîtrisée » : stabilité ≥ 10 jours
const RATING_N = {1:'À revoir', 2:'Difficile', 3:'Bien', 4:'Facile'};
const STATE_N = {1:'En apprentissage', 2:'En révision', 3:'En réapprentissage'};

let C = [], BY = {}, GEO = null, GEOBY = {}, WIKI = null;
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const nf = new Intl.NumberFormat('fr-FR');
const pct = x => Math.round(x*100)+' %';
const dec1 = x => x.toLocaleString('fr-FR',{maximumFractionDigits:1});
const flagSrc = c => `flags/${c.iso2}.svg`;

/* ---------- Stockage et migration ---------- */
const emptyState = () => ({ver:3, cards:{}, conf:{}, log:[], archive:{}, settings:{newPer:3}, stats:{answered:0,correct:0,days:[]}});
// Ancien modèle (v1/v2) : boîtes de Leitner {b, due, ok, ko, last}. On convertit chaque boîte en carte FSRS
// « en révision » de stabilité égale à l'intervalle de la boîte ; le défi continent (supprimé) est archivé, pas effacé.
const OLD_INTERVALS = [0, 1, 3, 7, 16, 35];
function migrate(old){
  const s = emptyState();
  s.settings = Object.assign(s.settings, old.settings || {});
  s.stats = Object.assign(s.stats, old.stats || {});
  for (const k in (old.items || {})){
    const it = old.items[k]; const sk = k.split(':')[1];
    if (sk === 'cont' || !SKILLS[sk]) { s.archive[k] = it; continue; }
    const ok = it.ok||0, ko = it.ko||0, b = Math.max(1, Math.min(5, it.b||1));
    const st = Math.max(0.5, OLD_INTERVALS[b]);
    const due = Number.isFinite(it.due) ? it.due : Date.now();
    s.cards[k] = {state:2, step:null, s:st, d:Math.min(10, Math.max(1, 3 + 6*ko/Math.max(1, ok+ko))),
      due, last: Number.isFinite(it.last) ? it.last : due - st*DAY, reps: ok+ko, lapses: ko, fails: ko, ok, ko, migrated:true};
  }
  return s;
}
function load(){
  try {
    const raw = localStorage.getItem(LS_KEY); const s = JSON.parse(raw);
    if (s && s.ver === 3) return Object.assign(emptyState(), s);
    if (s && s.items){ try { localStorage.setItem(LS_KEY+'.backup-v2', raw); } catch(e){} return migrate(s); }
  } catch(e){}
  return emptyState();
}
let S = load();
function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch(e){} }

/* ---------- Préférences d'affichage (clé séparée, lue aussi par index.html avant l'affichage) ---------- */
const PREF_KEY = 'worldgeo.prefs';
const PREF_DEF = {theme:'dark', fs:'m', motion:'auto', labels:'num', qn:10, sound:false, retention:0.9, speed:'normal', revMax:25};
let P = loadPrefs();
function loadPrefs(){ try { return Object.assign({}, PREF_DEF, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch(e){ return Object.assign({}, PREF_DEF); } }
function savePrefs(){ try { localStorage.setItem(PREF_KEY, JSON.stringify(P)); } catch(e){} applyPrefs(); }
const mq = q => (window.matchMedia ? window.matchMedia(q) : {matches:false, addEventListener(){}});
function applyPrefs(){
  const d = document.documentElement;
  const t = P.theme==='auto' ? (mq('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : P.theme;
  d.setAttribute('data-theme', t);
  if (P.fs==='m') d.removeAttribute('data-fs'); else d.setAttribute('data-fs', P.fs);
  d.classList.toggle('reduce', P.motion==='reduce' || (P.motion==='auto' && mq('(prefers-reduced-motion: reduce)').matches));
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t==='light' ? '#f3f0e8' : '#000000');
}
['(prefers-color-scheme: light)','(prefers-reduced-motion: reduce)'].forEach(q => { const m = mq(q); const f = () => applyPrefs(); if (m.addEventListener) m.addEventListener('change', f); else if (m.addListener) m.addListener(f); });
const reduceMotion = () => document.documentElement.classList.contains('reduce');
/* Petits signaux sonores (Web Audio, aucun fichier) */
let AC = null, beeps = 0;
function beep(ok){
  if (!P.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime; beeps++;
    (ok ? [660, 990] : [330, 220]).forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain(), t = t0 + i*0.11;
      o.type = ok ? 'sine' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t+0.17);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+0.2);
    });
  } catch(e){}
}

/* ---------- Mémoire de la vue de la carte ---------- */
const MAP_KEY = 'worldgeo.mapview';
function readMapState(){ try { const m = JSON.parse(localStorage.getItem(MAP_KEY) || sessionStorage.getItem(MAP_KEY)); if (m && Array.isArray(m.view) && m.view.length===4 && m.view.every(Number.isFinite)) return m; } catch(e){} return null; }
function writeMapState(m){ const t = JSON.stringify(m); try { sessionStorage.setItem(MAP_KEY, t); } catch(e){} try { localStorage.setItem(MAP_KEY, t); } catch(e){} }

/* ---------- Répétition espacée (FSRS-6) ---------- */
let SCH = null, SCH_R = null;
const sched = () => { if (!SCH || SCH_R !== P.retention){ SCH = FSRS.Scheduler({retention:P.retention}); SCH_R = P.retention; } return SCH; };
const key = (iso,sk) => iso+':'+sk;
const card = (iso,sk) => S.cards[key(iso,sk)];
const recall = (cd, now=Date.now()) => cd && cd.s != null ? sched().retrievability(cd, now) : 0;
const isLeech = cd => !!cd && ((cd.fails||0) >= 4 || ((cd.lapses||0) >= 2 && cd.d >= 8));
const isHard = cd => !!cd && (cd.d >= 7 || (cd.fails||0) >= 3);
// Seuils de temps (secondes) pour déduire la note d'une bonne réponse, selon le type de question.
const SPEED = {fast:0.7, normal:1, slow:1.6};
const BASE_T = {cap:[3,9], caprev:[3.5,10], flag:[3,9], flagpick:[4,11], loc:[3.5,10], tap:[5,14]};
function thresholds(kind){ const m = SPEED[P.speed] || 1; const b = BASE_T[kind] || [3,9]; return [b[0]*m, b[1]*m]; }
function gradeOf(ok, ms, kind, retry){
  if (!ok) return 1;
  const [e, g] = thresholds(kind); const s = ms/1000;
  let r = s < e ? 4 : s <= g ? 3 : 2;
  if (retry && r === 4) r = 3;  // juste après une erreur, pas de « Facile »
  return r;
}
function record(iso, sk, g, ms, chosen){
  const k = key(iso,sk); const now = Date.now();
  const old = S.cards[k] || sched().newCard(now);
  const nc = sched().review(old, g, now);
  nc.ok = (old.ok||0) + (g>1?1:0); nc.ko = (old.ko||0) + (g===1?1:0);
  S.cards[k] = nc;
  if (g === 1 && chosen && chosen !== iso && BY[chosen]){ const cf = S.conf[k] || (S.conf[k] = {}); cf[chosen] = (cf[chosen]||0) + 1; }
  S.log.push([now, iso, sk, g, Math.round(ms||0)]); if (S.log.length > 4000) S.log = S.log.slice(-4000);
  S.stats.answered++; if (g>1) S.stats.correct++;
  const today = dayKey(now);
  if (!S.stats.days.includes(today)) { S.stats.days.push(today); S.stats.days = S.stats.days.slice(-400); }
  save();
  return nc;
}
function dayKey(t){ const d = new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function startOfDay(t, add=0){ const d = new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate()+add); return d.getTime(); }
const seen = iso => SK.some(sk => card(iso,sk));
const skillMastered = (iso,sk) => { const cd = card(iso,sk); return !!cd && cd.state===2 && cd.s >= MASTER_S; };
const mastered = iso => SK.every(sk => skillMastered(iso,sk));
// Priorité : les cartes en (ré)apprentissage d'abord, puis la probabilité de rappel la plus basse,
// avec un malus pour les cartes souvent ratées ou difficiles (elles remontent sur le dessus de la pile).
function priority(cd, now=Date.now()){
  if (cd.state !== 2) return -1 + (cd.due - now)/DAY/1000;
  return recall(cd, now) - 0.04*Math.min(cd.fails||0, 6) - 0.02*Math.max(0, cd.d-6);
}
// Comme Anki : une carte en révision est due toute la journée de son échéance ; une carte en (ré)apprentissage, à l'heure dite.
const isDue = (cd, now=Date.now()) => cd.state===2 ? cd.due < startOfDay(now,1) : cd.due <= now;
function dueCards(zone, now=Date.now()){
  const out = [];
  for (const k in S.cards){ const [iso,sk] = k.split(':'); const c = BY[iso]; if (!c || !SKILLS[sk]) continue;
    if (zone && zone!=='WORLD' && c.continent!==zone) continue;
    const cd = S.cards[k]; if (isDue(cd, now)) out.push({iso, sk, cd, p:priority(cd, now)}); }
  return out.sort((a,b)=>a.p-b.p);
}
function streak(){
  const d = new Set(S.stats.days); const day = k => dayKey(Date.now()-k*DAY);
  let k = d.has(day(0)) ? 0 : 1, n = 0;
  while (d.has(day(k))) { n++; k++; }
  return n;
}
function relTime(t, now=Date.now()){
  const d = t - now;
  if (d <= 0) return 'maintenant';
  if (d < 3600000) return 'dans '+Math.max(1, Math.round(d/60000))+' min';
  if (t < startOfDay(now,1)) return 'dans '+Math.round(d/3600000)+' h';
  const days = Math.round((startOfDay(t)-startOfDay(now))/DAY);
  if (days === 1) return 'demain';
  if (days < 45) return 'dans '+days+' j';
  if (days < 540) return 'dans '+Math.round(days/30.4)+' mois';
  return 'dans '+dec1(days/365)+' ans';
}
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
function memLine(cd){
  if (!cd) return 'Pas encore étudiée';
  if (cd.state !== 2) return `${STATE_N[cd.state]} · revient ${relTime(cd.due)}`;
  return `Rappel ${pct(recall(cd))} · revient ${relTime(cd.due)}${cd.due>Date.now()+DAY?' ('+fmtDate(cd.due)+')':''}`;
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
    else if (mode==='world') { fill = CONT[c.continent].c; if (it.id===hl) cls += ' fc'; }
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
    if (labels){ p += `<g class="labels" data-k="${labels==='name'?'name':'num'}">`;
      for (const it of GEO.items){ const c = BY[it.id]; if (!c || !inter(it.bb,vv)) continue;
        p += `<text class="lab" data-n="${c.n}" x="${it.c[0]}" y="${it.c[1]}">${labels==='name' ? esc(c.name) : c.n}</text>`; }
      p += '</g>'; }
  }
  return p + '</svg>';
}
function countryView(iso, aspect=2, pad=3.4, minW=200){ const it = GEOBY[iso]; return fitView(it.bb, aspect, pad, minW); }

/* Carte interactive (glisser, pincer, toucher) */
function interactiveMap(host, view0, {onTap, onChange=null, initial=null, full=false, labels=false, hl=null, mode='world', small=true}={}){
  host.innerHTML = mapSVG(initial ? initial : full ? [0,0,MAPW(),MAPH()] : view0, {mode, labels, hl}) + `<div class="mapctl"><button data-z="in" aria-label="Zoomer">+</button><button data-z="out" aria-label="Dézoomer">−</button><button data-z="reset" aria-label="Recentrer">⟲</button></div>`;
  const svg = $('svg', host); let v = (initial || view0).slice();
  const ptrs = new Map(); let start=null, moved=false, pinch0=null;
  const apply = () => {
    svg.setAttribute('viewBox', v.join(' '));
    const scale = host.clientWidth / v[2] || 1; // px par unité
    svg.querySelectorAll('circle.dot').forEach(c => c.setAttribute('r', (small?5.5:4)/scale));
    const lab = svg.querySelector('g.labels');
    if (lab){ const nm = lab.dataset.k==='name'; lab.style.display = scale > (nm ? 1.5 : 0.9) ? '' : 'none'; lab.querySelectorAll('text').forEach(t => t.setAttribute('font-size', (nm ? 9 : 10)/scale)); }
    if (onChange) onChange(v.slice());
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
  if (initial){ clampV(); apply(); }
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
/* ---------- Navigation (pile de vues + historique du navigateur) ---------- */
// Chaque entrée de l'historique porte l'identifiant d'un instantané de la pile : le bouton retour de l'app,
// le geste ou le bouton retour du navigateur restaurent la vue précédente dans son état (args mutables + défilement).
const stack = [];
const SNAPS = new Map(); const NAV_ID = Math.random().toString(36).slice(2,8); let navN = 0;
function saveScroll(){ const top = stack[stack.length-1]; if (top) top.scroll = $('#view').scrollTop; }
function pushHist(replace){
  const id = NAV_ID+'-'+(++navN); SNAPS.set(id, stack.slice());
  try { history[replace?'replaceState':'pushState']({wg:id}, ''); } catch(e){}
}
function go(fn, args={}, {replace=false}={}){
  saveScroll();
  if (replace) stack.pop();
  stack.push({fn, args, tab: stack[0] ? stack[0].tab : 'home'});
  pushHist(replace); render(false);
}
function back(){ if (stack.length > 1) history.back(); }
function home(tab='home'){ saveScroll(); stack.length = 0; stack.push({fn:TABS[tab], args:{}, tab}); pushHist(false); render(false); }
window.addEventListener('popstate', e => {
  const id = e.state && e.state.wg; const snap = id && SNAPS.get(id);
  if (!snap || !C.length){ if (C.length){ stack.length = 0; stack.push({fn:vHome,args:{},tab:'home'}); render(false); } return; }
  saveScroll(); stack.length = 0; stack.push(...snap); render(true);
});
function setTab(t){ document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab===t)); }
const inSession = () => stack.some(e => e.fn===vSession && e.args.i < e.args.steps.length);
function render(restore){
  const top = stack[stack.length-1]; const view = $('#view');
  const app = document.getElementById('app');
  app.classList.toggle('quizmode', inSession());
  $('#back').hidden = stack.length<=1; $('#topright').textContent='';
  view.scrollTop = 0; top.fn(view, top.args);
  if (restore && top.scroll) view.scrollTop = top.scroll;
  setTab(stack[0].tab || 'home');
}
function setTitle(t){ $('#title').textContent = t; }
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }
const openCard = (iso, list) => go(vCard, {iso, list});
// tout élément [data-open="ISO3"] ouvre la fiche ; [data-zone-open] ouvre la liste du continent
function bindOpen(el){
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openCard(b.dataset.open); });
  el.querySelectorAll('[data-zone-open]').forEach(b => b.onclick = e => { e.stopPropagation(); go(vZone, {z:b.dataset.zoneOpen}); });
}

/* ---------- Écran d'accueil ---------- */
function vHome(el){
  setTitle('');
  const due = dueCards().length, m = C.filter(c=>mastered(c.iso3)).length, sn = C.filter(c=>seen(c.iso3)).length;
  const zones = CONT_ORDER.map(z => { const cs = C.filter(c=>c.continent===z); const mm = cs.filter(c=>mastered(c.iso3)).length; const ss = cs.filter(c=>seen(c.iso3)).length;
    return `<button class="zone" data-zone="${z}"><i class="sw" style="background:${CONT[z].c}"></i><div class="zn"><b>${CONT[z].n}</b><span>${cs.length} pays · ${ss} vus · ${mm} maîtrisés</span><div class="bar"><i style="width:${(mm/cs.length*100).toFixed(1)}%;background:${CONT[z].c}"></i></div></div><span class="chev">›</span></button>`; }).join('');
  el.innerHTML = `
  <div class="logo"><div class="frame"><div class="w">WORLD</div></div><div class="g">GÉO</div><div class="dots"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="tagline">194 PAYS À MAÎTRISER</div></div>
  <div class="stats-row" id="statsrow" role="button" tabindex="0" aria-label="Voir les statistiques"><div class="stat"><b>${m}</b><span>maîtrisés / 194</span></div><div class="stat"><b>${sn}</b><span>découverts</span></div><div class="stat"><b>${streak()}</b><span>jours de suite</span></div></div>
  <div class="h2">Aujourd'hui</div>
  <button class="big-btn" id="rev"><div>Réviser<small>${due ? due+' carte'+(due>1?'s':'')+' à revoir, les plus fragiles d’abord' : 'Rien à revoir pour l’instant'}</small></div><span class="pill">${due}</span></button>
  <button class="big-btn ghost" id="learnw"><div>Apprendre le monde<small>Nouveaux pays dans l’ordre des numéros</small></div><span>›</span></button>
  <div class="h2">Apprendre par continent</div>${zones}
  <div class="h2">Plus</div>
  <button class="big-btn ghost" id="stats"><div>Statistiques<small>Prévisions, cartes difficiles, maîtrise par compétence</small></div><span>›</span></button>
  <button class="big-btn ghost" id="about"><div>Paramètres<small>Thème, rétention cible, sons, sauvegarde</small></div><span>›</span></button>`;
  $('#rev',el).onclick = () => due ? startSession('WORLD',{reviewOnly:true}) : toast('Tout est à jour !');
  $('#learnw',el).onclick = () => startSession('WORLD');
  $('#about',el).onclick = () => home('settings');
  $('#stats',el).onclick = $('#statsrow',el).onclick = () => go(vStats);
  el.querySelectorAll('.zone').forEach(b => b.onclick = () => go(vZone,{z:b.dataset.zone}));
}

function vZone(el,{z}){
  setTitle(CONT[z].n);
  const cs = C.filter(c=>c.continent===z); const due = dueCards(z).length; const fresh = cs.filter(c=>!seen(c.iso3)).length;
  const quick = [['cap','cap','Capitale'],['flag','flag','Drapeau'],['loc','loc','Localisation'],['tap','loc','Toucher la carte']];
  el.innerHTML = `
    <button class="big-btn" id="go" style="background:${CONT[z].c};color:${z==='AF'?'#000':'#fff'}"><div>Séance d’apprentissage<small style="color:inherit;opacity:.8">${due} à revoir · ${fresh} nouveaux pays restants</small></div><span>›</span></button>
    <div class="seg">
      ${quick.map(([k,ic,t])=>`<button class="opt" data-q="${k}"><b><span class="ico ${ic}">${ICON[ic]}</span><span class="tt">${t}</span></b><span>Défi rapide · ${P.qn} questions</span></button>`).join('')}
    </div>
    <div class="h2">Les ${cs.length} cartes</div><div class="grid">${cs.map(miniCard).join('')}</div>`;
  $('#go',el).onclick = () => startSession(z);
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => startQuiz({zone:z, type:b.dataset.q, n:P.qn}));
  bindMini(el);
}

/* ---------- Cartes (fiches) ---------- */
function lvlDots(iso){ return SK.map(sk => { const cd = card(iso,sk); return `<i class="${skillMastered(iso,sk)?'on':cd?(isLeech(cd)?'bad':'mid'):''}" title="${SKILLS[sk].n}"></i>`; }).join(''); }
function miniCard(c){
  return `<button class="mcard" data-iso="${c.iso3}"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.capital)}</div>${numBadge(c)}<img loading="lazy" src="${flagSrc(c)}" alt=""><div class="lvl" style="margin-top:7px">${lvlDots(c.iso3)}</div></button>`;
}
function bindMini(el, list){ el.querySelectorAll('.mcard').forEach(b => b.onclick = () => go(vCard,{iso:b.dataset.iso, list: list || [...el.querySelectorAll('.mcard')].map(x=>x.dataset.iso)})); }

function gameCard(c, links=false){
  const cap = links ? `<button class="cap linkish" data-zone-open="${c.continent}" aria-label="${esc(c.capital)} — voir les pays de ${CONT[c.continent].n}">${esc(c.capital)}</button>` : `<div class="cap">${esc(c.capital)}</div>`;
  return `<article class="gcard">
    <div class="head"><div class="nm"><h1>${esc(c.name)}</h1>${cap}</div>${numBadge(c)}</div>
    <div class="flagbox"><img src="${flagSrc(c)}" alt="Drapeau : ${esc(c.name)}"></div>
    <table class="facts">
      <tr><td>Superficie</td><td>${fmtArea(c.area)}</td></tr>
      <tr><td>Population</td><td>${fmtPop(c.pop)}</td></tr>
      <tr><td>Point culminant</td><td>${nf.format(c.hpElev)} m<span class="sub">${esc(c.hp)}</span></td></tr>
      <tr><td>Pays voisins</td><td>${c.neighbors}</td></tr>
    </table></article>`;
}
function wikiPanel(c){
  const w = WIKI && WIKI[c.iso3]; if (!w) return '';
  const sub = (t, arr) => arr && arr.length ? `<details class="sub"><summary>${t}</summary><p>${arr.map(esc).join(' · ')}</p></details>` : '';
  return `<details class="more" id="more"><summary><span>En savoir plus</span><small>${w.words} mots · Wikipédia</small></summary>
    <div class="wtext">${w.p.map(x=>x[0]==='§' ? `<h4>${esc(x.slice(1))}</h4>` : `<p>${esc(x)}</p>`).join('')}</div>
    ${sub('Langues officielles', w.lang)}${sub('Monnaie', w.cur)}${sub('Régime politique', w.gov)}
    <p class="small src">Source : <a href="${esc(w.u)}" target="_blank" rel="noopener">Wikipédia, article « ${esc(w.t)} »</a> — texte sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>, extrait de l’introduction, raccourci et nettoyé.</p>
  </details>`;
}
function memPanel(c){
  const rows = SK.map(sk => { const cd = card(c.iso3,sk); const S0 = SKILLS[sk];
    const det = cd && cd.s!=null ? `<small>Stabilité ${dec1(cd.s)} j · difficulté ${dec1(cd.d)}/10 · ${cd.reps||0} révision${(cd.reps||0)>1?'s':''} · ${cd.fails||0} erreur${(cd.fails||0)>1?'s':''}${isLeech(cd)?' · <b class="leech">carte difficile</b>':''}</small>` : '';
    return `<div class="memrow"><span class="ico ${S0.cls}">${ICON[sk]}</span><div><b>${S0.n}${skillMastered(c.iso3,sk)?' <span class="okb">maîtrisée</span>':''}</b><span>${memLine(cd)}</span>${det}</div></div>`; }).join('');
  return `<div class="idbox mem"><div class="lbl">MÉMORISATION</div>${rows}<button class="chip" id="drill" style="margin-top:10px">Réviser ce pays (3 questions)</button></div>`;
}
function cardExtras(c, links=true){
  const notes = [c.capNote && 'Capitale : '+c.capNote, c.areaNote && 'Superficie : '+c.areaNote, c.hpNote && 'Point culminant : '+c.hpNote, c.popNote && 'Population : '+c.popNote].filter(Boolean);
  const nbs = c.neighborList.map(i => BY[i]).filter(Boolean);
  const nbHtml = nbs.length ? `<div class="nbs">${nbs.map(x => links ? `<button class="nb" data-open="${x.iso3}"><img src="${flagSrc(x)}" alt=""><span>${esc(x.name)}</span></button>` : `<span class="nb"><img src="${flagSrc(x)}" alt=""><span>${esc(x.name)}</span></span>`).join('')}</div>` : '<div class="small nb0">Aucune frontière terrestre avec un autre pays du jeu.</div>';
  return `<div class="idbox"><div class="lbl">IDENTITÉ</div>${esc(c.trait)}</div>
    ${wikiPanel(c)}
    <div class="minimap">${mapSVG(countryView(c.iso3), {hl:c.iso3})}${links?`<button class="mapgo" id="mapgo">Voir sur la carte ›</button>`:''}</div>
    <div class="idbox"><div class="lbl">${links?`<button class="linkish" data-zone-open="${c.continent}"><i class="cdot" style="background:${CONT[c.continent].c}"></i>${CONT[c.continent].n.toUpperCase()} ›</button>`:CONT[c.continent].n.toUpperCase()} · N° ${c.n}</div>
      <div class="lbl" style="margin-top:6px">VOISINS TERRESTRES (${nbs.length})</div>${nbHtml}
      ${notes.length ? `<div class="small" style="margin-top:8px">${notes.map(esc).join('<br>')}</div>` : ''}
      <div class="small" style="margin-top:8px">Population : Banque mondiale ${c.popYear||''}.</div>
    </div>
    ${links ? memPanel(c) : ''}`;
}
function vCard(el, args){
  const {iso, list} = args;
  const c = BY[iso]; setTitle(c.name);
  const L = list && list.length ? list : C.map(x=>x.iso3); const i = L.indexOf(iso);
  el.innerHTML = gameCard(c, true) + cardExtras(c, true) + `<div class="cardnav"><button id="prev">‹ Précédent</button><button id="nxt">Suivant ›</button></div>`;
  const nav = d => { const j = (i+d+L.length)%L.length; go(vCard,{iso:L[j],list:L},{replace:true}); };
  $('#prev',el).onclick = () => nav(-1); $('#nxt',el).onclick = () => nav(1);
  bindOpen(el);
  $('#mapgo',el).onclick = () => go(vMap, {focus:iso});
  $('#drill',el).onclick = () => startDrill(iso);
  const more = $('#more',el); if (more){ if (args.open) more.open = true; more.addEventListener('toggle', () => { args.open = more.open; }); }
  let sx=null; const cardEl=$('.gcard',el);
  cardEl.addEventListener('touchstart', e=>{ sx=e.touches[0].clientX; }, {passive:true});
  cardEl.addEventListener('touchend', e=>{ if (sx===null) return; const dx=e.changedTouches[0].clientX-sx; if (Math.abs(dx)>60) nav(dx<0?1:-1); sx=null; });
}

function vDeck(el, args){
  setTitle('Cartes');
  const f0 = args.f || 'ALL';
  el.innerHTML = `<input class="search" type="search" placeholder="Pays, capitale ou numéro…" value="${esc(args.q||'')}">
    <div class="chips">${['ALL',...CONT_ORDER].map(z=>`<button class="chip ${z===f0?'on':''}" data-f="${z}">${z==='ALL'?'Tous':`<i style="background:${CONT[z].c}"></i>${CONT[z].n}`}</button>`).join('')}</div>
    <div class="grid" id="g"></div>`;
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let f = f0;
  const draw = () => { const qq = norm($('.search',el).value.trim());
    const list = C.filter(c => (f==='ALL'||c.continent===f) && (!qq || norm(c.name).includes(qq) || norm(c.capital).includes(qq) || String(c.n)===qq));
    $('#g',el).innerHTML = list.map(miniCard).join('') || '<p class="small">Aucun résultat.</p>'; bindMini($('#g',el), list.map(c=>c.iso3)); };
  $('.search',el).addEventListener('input', () => { args.q = $('.search',el).value; draw(); });
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { f=b.dataset.f; args.f=f; el.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); draw(); });
  draw();
}

function vMap(el, args){
  setTitle('Carte du monde');
  const entry = stack[stack.length-1];
  // ouverture depuis une fiche : centrer sur le pays (une seule fois ; ensuite la vue mémorisée prend le relais)
  const focus = args.focus && BY[args.focus] ? args.focus : null;
  const saved = args.view ? args : (focus ? null : readMapState());
  let z = (saved && CONT[saved.z] ? saved.z : null) || (focus ? BY[focus].continent : null) || (args.z && CONT[args.z] ? args.z : 'WORLD');
  const SHORT = {NA:'Am. du Nord', SA:'Am. du Sud'};
  el.innerHTML = `<div class="mapview"><div class="chips">${['WORLD',...CONT_ORDER].map(k=>`<button class="chip ${k===z?'on':''}" data-z="${k}" aria-label="${k==='WORLD'?'Monde':CONT[k].n}">${k==='WORLD'?'Monde':`<i style="background:${CONT[k].c}"></i>${SHORT[k]||CONT[k].n}`}</button>`).join('')}</div>
    <div class="fullmap" id="fm"></div><p class="hint">${focus?`<button class="linkish" data-open="${focus}">${esc(BY[focus].name)} est entouré · ouvrir sa fiche ›</button><br>`:''}Glisse et pince pour zoomer · touche un pays pour ouvrir sa carte.${P.labels==='num' ? ' Les numéros apparaissent en zoomant.' : P.labels==='name' ? ' Les noms apparaissent en zoomant.' : ''} La carte garde ta vue ; ⟲ recentre.</p></div>`;
  const host = $('#fm',el);
  const aspect = () => host.clientWidth/host.clientHeight || 1;
  const viewFor = k => fitRegion(GEO.views[k], aspect());
  const keep = v => { const a = aspect(); let w = Math.max(v[2], v[3]*a), h = w/a; return [v[0]+v[2]/2-w/2, v[1]+v[3]/2-h/2, w, h]; };
  let timer = null;
  const remember = (v, now) => { const st = {z, view: v.map(x => Math.round(x*100)/100)}; if (focus) st.focus = focus; entry.args = st; clearTimeout(timer); const ls = {z, view:st.view}; if (now) writeMapState(ls); else timer = setTimeout(() => writeMapState(ls), 150); };
  const initial = saved && saved.view ? keep(saved.view) : focus ? countryView(focus, aspect(), 5, 260) : null;
  const im = interactiveMap(host, viewFor(z), {full:true, hl:focus, labels: P.labels==='none' ? false : P.labels, initial,
    onChange: v => remember(v), onTap: id => { if (!id) return; remember(im.view, true); go(vCard,{iso:id}); }});
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { z=b.dataset.z; el.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); im.setView(viewFor(z)); remember(im.view, true); });
  bindOpen(el);
}

/* ---------- Statistiques ---------- */
function vStats(el){
  setTitle('Statistiques');
  const now = Date.now(); const all = Object.entries(S.cards).filter(([k]) => SKILLS[k.split(':')[1]] && BY[k.split(':')[0]]);
  const dueNow = dueCards().length;
  const dueToday = all.filter(([,cd]) => cd.due < startOfDay(now,1)).length;
  const m = C.filter(c=>mastered(c.iso3)).length;
  const days = [...Array(7)].map((_,k) => { const a = k===0 ? -Infinity : startOfDay(now,k), b = startOfDay(now,k+1); return {k, n: all.filter(([,cd]) => cd.due >= a && cd.due < b).length, t: startOfDay(now,k)}; });
  const mx = Math.max(1, ...days.map(d=>d.n));
  const lg = S.log.filter(r => r[0] > now - 30*DAY); const lgRev = lg.filter(r => r[3] !== undefined);
  const succ = lgRev.length ? lgRev.filter(r=>r[3]>1).length/lgRev.length : null;
  const ratings = [1,2,3,4].map(g => lgRev.filter(r=>r[3]===g).length);
  const skillRows = SK.map(sk => { const n = C.filter(c=>skillMastered(c.iso3,sk)).length, st = C.filter(c=>card(c.iso3,sk)).length;
    return `<div class="skrow"><span class="ico ${sk}">${ICON[sk]}</span><div><b>${SKILLS[sk].n}</b><div class="bar"><i style="width:${(n/194*100).toFixed(1)}%;background:${SKILLS[sk].col}"></i></div><span>${n} maîtrisées · ${st} étudiées / 194</span></div></div>`; }).join('');
  const hard = all.filter(([,cd]) => isLeech(cd) || isHard(cd)).sort((a,b) => (b[1].fails||0)-(a[1].fails||0) || b[1].d-a[1].d).slice(0,15);
  const weak = all.filter(([,cd]) => cd.state===2 && cd.s!=null).map(([k,cd]) => [k,cd,recall(cd,now)]).sort((a,b)=>a[2]-b[2]).slice(0,8);
  const row = (k, cd, extra) => { const [iso,sk] = k.split(':'); const c = BY[iso];
    return `<button class="lrow" data-open="${iso}"><img src="${flagSrc(c)}" alt=""><div><b>${esc(c.name)}</b><span>${SKILLS[sk].n} · ${extra}</span></div><span class="chev">›</span></button>`; };
  el.innerHTML = `
  <div class="stats-row"><div class="stat"><b>${dueNow}</b><span>à réviser maintenant</span></div><div class="stat"><b>${dueToday}</b><span>d’ici ce soir</span></div><div class="stat"><b>${m}</b><span>pays maîtrisés</span></div></div>
  ${dueNow ? `<button class="next" id="revnow">Réviser maintenant (${dueNow})</button>` : ''}
  <div class="h2">Prochains jours</div>
  <div class="panel"><div class="fc">${days.map(d=>`<div class="fcol"><span class="fn">${d.n}</span><i style="height:${Math.round(d.n/mx*100)}%"></i><span class="fd">${d.k===0?'auj.':d.k===1?'dem.':new Date(d.t).toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')}</span></div>`).join('')}</div>
  <p class="small" style="margin:8px 0 0">Cartes qui arrivent à échéance chaque jour (aujourd’hui inclut les retards).</p></div>
  <div class="h2">Maîtrise par compétence</div><div class="panel">${skillRows}<p class="small" style="margin:8px 0 0">Une compétence est maîtrisée quand sa stabilité atteint ${MASTER_S} jours (le temps au bout duquel la probabilité de rappel tombe à 90 %).</p></div>
  <div class="h2">30 derniers jours</div>
  <div class="panel"><div class="kv"><span>Réponses</span><b>${lgRev.length}</b></div><div class="kv"><span>Taux de réussite</span><b>${succ==null?'—':pct(succ)}</b></div><div class="kv"><span>Rétention cible</span><b>${pct(P.retention)}</b></div>
  <div class="kv"><span>Notes</span><b class="notes">${[1,2,3,4].map(g=>`<em class="g${g}">${RATING_N[g]} ${ratings[g-1]}</em>`).join(' ')}</b></div></div>
  <div class="h2">Cartes difficiles (${hard.length})</div>
  <div class="panel list">${hard.length ? hard.map(([k,cd]) => row(k, cd, `${cd.fails||0} erreur${(cd.fails||0)>1?'s':''} · difficulté ${dec1(cd.d)}/10${isLeech(cd)?' · sangsue':''}`)).join('') : '<p class="small">Aucune pour l’instant. Les cartes souvent ratées apparaîtront ici et passeront en priorité dans les révisions.</p>'}</div>
  <div class="h2">Rappel le plus fragile</div>
  <div class="panel list">${weak.length ? weak.map(([k,cd,r]) => row(k, cd, `rappel ${pct(r)} · revient ${relTime(cd.due)}`)).join('') : '<p class="small">Rien encore : termine quelques séances.</p>'}</div>`;
  bindOpen(el);
  const rv = $('#revnow',el); if (rv) rv.onclick = () => startSession('WORLD',{reviewOnly:true});
}

/* ---------- Questions ---------- */
function sameCont(c){ return C.filter(x => x.continent===c.continent && x.iso3!==c.iso3); }
function nearest(c, n){ const a = GEOBY[c.iso3].c; return sameCont(c).map(x=>({x,d:Math.hypot(GEOBY[x.iso3].c[0]-a[0],GEOBY[x.iso3].c[1]-a[1])})).sort((p,q)=>p.d-q.d).slice(0,n).map(o=>o.x); }
// Distracteurs : d'abord (au plus 2) les pays déjà confondus avec celui-ci, puis le reste du groupe proposé.
function distractors(c, n, field, pool, confKey){
  const out=[], used=new Set([field(c)]);
  const cf = confKey && S.conf[confKey] ? Object.entries(S.conf[confKey]).sort((a,b)=>b[1]-a[1]).map(([i])=>BY[i]).filter(Boolean) : [];
  for (const x of cf.slice(0,2)){ const v = field(x); if (!used.has(v)){ used.add(v); out.push(x); } }
  for (const x of shuffle(pool)){ if (out.length>=n) break; const v = field(x); if (!used.has(v)){ used.add(v); out.push(x); } }
  if (out.length<n) for (const x of shuffle(C)){ if (out.length>=n) break; const v=field(x); if (x.iso3!==c.iso3 && !used.has(v)){ used.add(v); out.push(x); } }
  return out;
}
function buildQ(iso, sk, variant){
  const c = BY[iso]; const cd = card(iso,sk); const strong = !!cd && cd.s != null && cd.s >= 3;
  const ck = key(iso,sk);
  if (sk==='flag'){
    const rev = variant==='rev' || (variant!=='fwd' && strong && Math.random()<0.4);
    const ds = distractors(c,3,x=>x.iso3, sameCont(c), ck);
    const opts = shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.name,img:flagSrc(x)}));
    if (rev) return {iso,sk,kind:'flagpick', ask:'Quel est le drapeau de ce pays ?', sub:c.name, opts, answer:iso};
    return {iso,sk,kind:'flag', ask:'À quel pays appartient ce drapeau ?', flag:true, opts:opts.map(o=>({id:o.id,label:o.label})), answer:iso};
  }
  if (sk==='cap'){
    const rev = variant==='rev' || (variant!=='fwd' && strong && Math.random()<0.4);
    const ds = distractors(c,3,x=>x.capital, sameCont(c), ck);
    if (rev) return {iso,sk,kind:'caprev', ask:`De quel pays ${c.capital} est-elle la capitale ?`, opts:shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.name})), answer:iso};
    return {iso,sk,kind:'cap', ask:`Quelle est la capitale de ce pays ?`, sub:c.name, flag:true, opts:shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.capital})), answer:iso};
  }
  if (sk==='loc'){
    const tap = variant==='tap' || (variant!=='qcm' && strong && Math.random()<0.5);
    if (tap) return {iso,sk,kind:'tap', ask:`Touche ${c.name} sur la carte`, answer:iso};
    const ds = distractors(c,3,x=>x.iso3, nearest(c,7), ck);
    return {iso,sk,kind:'loc', ask:'Quel pays est mis en évidence ?', map:true, opts:shuffle([c,...ds]).map(x=>({id:x.iso3,label:x.name})), answer:iso};
  }
  throw new Error('Compétence inconnue : '+sk);
}

/* ---------- Séances ---------- */
function interleave(a, b){ // insère les éléments de b à intervalles réguliers dans a
  if (!a.length) return b.slice(); if (!b.length) return a.slice();
  const out = []; const step = (a.length+1)/(b.length+1); let j = 0;
  for (let i=0;i<a.length;i++){ out.push(a[i]); while (j < b.length && (j+1)*step <= i+1) out.push(b[j++]); }
  while (j < b.length) out.push(b[j++]);
  return out;
}
function startSession(zone, {reviewOnly=false}={}, replace=false){
  const due = dueCards(zone).slice(0, P.revMax);
  let newC = [];
  if (!reviewOnly && due.length < P.revMax)
    newC = C.filter(c => (zone==='WORLD'||c.continent===zone) && !seen(c.iso3)).sort((a,b)=>a.n-b.n).slice(0, S.settings.newPer||3);
  const steps = newC.map(c => ({type:'intro', iso:c.iso3}));
  const fresh = []; ['flag','cap','loc'].forEach(sk => newC.forEach(c => fresh.push({type:'q', iso:c.iso3, sk, variant: sk==='loc'?'qcm':'fwd'})));
  steps.push(...interleave(due.map(d => ({type:'q', iso:d.iso, sk:d.sk})), fresh));
  if (!steps.length){ toast(zone==='WORLD'?'Tout est appris et à jour !':'Ce continent est à jour !'); return; }
  go(vSession, {steps, i:0, ok:0, n:0, title: zone==='WORLD' ? (reviewOnly?'Révision':'Apprendre le monde') : CONT[zone].n, srs:true, again:{kind:'session', zone, reviewOnly}}, {replace});
}
function startQuiz({zone='WORLD', type='mix', n=10}, replace=false){
  const pool = C.filter(c => zone==='WORLD' || c.continent===zone);
  const now = Date.now();
  const skFor = () => type==='mix' ? SK[Math.floor(Math.random()*SK.length)] : type==='tap' ? 'loc' : type;
  // tirage pondéré : les cartes fragiles ou jamais vues passent plus souvent
  const scored = pool.map(c => { const sk = skFor(); const cd = card(c.iso3, sk);
    const base = cd ? priority(cd, now) : 0.55; return {c, sk, k: base + Math.random()*0.6}; }).sort((a,b)=>a.k-b.k);
  const steps = scored.slice(0, Math.min(n, pool.length)).map(({c,sk}) => ({type:'q', iso:c.iso3, sk, variant: type==='tap' ? 'tap' : type==='loc' ? 'qcm' : null}));
  const t = type==='tap' ? 'Toucher sur la carte' : type==='mix' ? 'Défi mélangé' : 'Défi '+SKILLS[type].n.toLowerCase();
  go(vSession, {steps:shuffle(steps), i:0, ok:0, n:0, title:t, srs:true, again:{kind:'quiz', zone, type, n}}, {replace});
}
function startDrill(iso, replace=false){
  const steps = shuffle(SK.map(sk => ({type:'q', iso, sk, variant: sk==='loc' ? (Math.random()<0.5?'tap':'qcm') : null})));
  go(vSession, {steps, i:0, ok:0, n:0, title:'Réviser : '+BY[iso].name, srs:true, again:{kind:'drill', iso}}, {replace});
}

// chronomètre de réponse : le temps passé hors de l'app (onglet masqué) ne compte pas
let CLOCK = null;
document.addEventListener('visibilitychange', () => { if (!CLOCK) return; if (document.hidden) CLOCK.hid = performance.now(); else if (CLOCK.hid){ CLOCK.t0 += performance.now()-CLOCK.hid; CLOCK.hid = null; } });

function vSession(el, st){
  const total = st.steps.length;
  if (st.i >= total) return vSummary(el, st);
  document.getElementById('app').classList.add('quizmode');
  setTitle(st.title);
  $('#topright').innerHTML = `<button class="icon-btn" style="font-size:1.1rem" id="quit" aria-label="Quitter">✕</button>`;
  $('#quit').onclick = () => { if (st.n===0 || confirm('Quitter la séance ? Tes réponses déjà données sont enregistrées.')) back(); };
  const step = st.steps[st.i];
  const progress = `<div class="qtop"><div class="prog"><i style="width:${(st.i/total*100).toFixed(1)}%"></i></div><div class="count" id="qcount">${st.i+1}/${total}</div><div class="qscore" id="qscore" aria-label="Bonnes réponses">✓ ${st.ok}</div></div>`;
  const nextStep = () => { st.i++; CLOCK = null; vSession(el, st); el.scrollTop=0; };
  if (step.type==='intro'){
    const c = BY[step.iso];
    el.innerHTML = `<div class="qwrap">${progress}<div class="h2" style="margin-top:4px">Nouvelle carte</div>${gameCard(c)}${cardExtras(c, false)}<button class="next" id="nx">J’ai retenu, continuer ›</button></div>`;
    $('#nx',el).onclick = nextStep; return;
  }
  const q = step.q || (step.q = buildQ(step.iso, step.sk, step.variant));
  const c = BY[q.iso]; const S0 = SKILLS[q.sk]; const cd0 = card(q.iso, q.sk);
  const badge = `<span class="badge" style="background:${S0.col}">${ICON[q.sk]} ${S0.n}</span>${isLeech(cd0)?'<span class="badge leechb">Carte difficile</span>':''}`;
  let body = '';
  if (q.flag) body += `<img class="qflag" src="${flagSrc(c)}" alt="Drapeau à identifier">`;
  if (q.kind==='loc') body += `<div class="qmap">${mapSVG(countryView(c.iso3, 4/3, 4.5, 330), {hl:c.iso3, hlColor:'#e5383f'})}</div>`;
  const ansCls = q.kind==='flagpick' ? 'answers cols2 flags' : 'answers';
  const answers = q.kind==='tap' ? '' : `<div class="${ansCls}">${q.opts.map(o => `<button class="ans" data-id="${o.id}">${o.img?`<img src="${o.img}" alt="Drapeau ${esc(o.label)}">`:esc(o.label)}</button>`).join('')}</div>`;
  const nameSub = q.sub ? `<div class="qsub name">${esc(q.sub)}</div>` : '';
  el.innerHTML = `<div class="qwrap">${progress}<div class="qcard">${badge}<div class="q">${esc(q.ask)}</div>${nameSub}${body}</div>
    ${q.kind==='tap' ? `<div class="fullmap tapmap" id="tm"></div><p class="hint" id="th">Glisse ou pince pour zoomer, puis touche le pays.</p>` : ''}
    ${answers}<div class="feedback" id="fb"></div></div>`;
  let im = null;
  const showAnswered = fresh => {
    const a = step.ans;
    el.querySelectorAll('.ans').forEach(b => { const id=b.dataset.id; b.classList.remove('ok','ko','fade'); if (id===q.answer) b.classList.add('ok'); else if (id===a.chosen) b.classList.add('ko'); else b.classList.add('fade'); b.disabled=true; });
    if (im){
      im.svg.querySelectorAll(`[data-id="${q.iso}"]`).forEach(p => { p.style.fill = '#2e9e47'; p.classList.add('hl'); });
      if (!a.ok && a.chosen) im.svg.querySelectorAll(`[data-id="${a.chosen}"]`).forEach(p => { p.style.fill = '#e5383f'; p.classList.add('hl'); });
      if (!im.svg.querySelector('circle.ans-ring')){ const it = GEOBY[q.iso]; const ns='http://www.w3.org/2000/svg'; const ring=document.createElementNS(ns,'circle'); ring.setAttribute('class','mk ans-ring'); ring.setAttribute('cx',it.c[0]); ring.setAttribute('cy',it.c[1]); ring.setAttribute('r', Math.max(it.bb[2]-it.bb[0], it.bb[3]-it.bb[1], 14)*0.75); ring.style.stroke='#000'; im.svg.appendChild(ring); }
    }
    const chosenC = a.chosen && a.chosen!==q.answer && BY[a.chosen] ? BY[a.chosen] : null;
    const mini = (x, label, cls) => `<button class="mini-fiche ${cls}" data-open="${x.iso3}"><img src="${flagSrc(x)}" alt=""><div><em>${label}</em><b>${esc(x.name)}</b><span>${esc(x.capital)} · ${CONT[x.continent].n} · n° ${x.n}</span>${cls==='good' && !a.ok?`<p>${esc(x.trait)}</p>`:''}</div><span class="chev">›</span></button>`;
    const rate = a.g ? `<div class="rate g${a.g}">Note : <b>${RATING_N[a.g]}</b> · ${dec1(a.ms/1000)} s${a.requeued ? ' · revient dans quelques questions' : a.due ? ` · revient ${relTime(a.due)}` : ''}</div>` : '';
    $('#fb',el).innerHTML = `<div class="msg ${a.ok?'ok':'ko'}">${a.ok?'Bravo !':'Pas tout à fait…'}${!a.ok && q.kind==='tap' && chosenC ? ' Tu as touché : '+esc(chosenC.name)+'.' : ''}</div>${rate}
      ${mini(c, a.ok ? 'Bonne réponse · voir la fiche' : 'La bonne réponse · voir la fiche', 'good')}
      ${chosenC ? mini(chosenC, (q.kind==='cap' ? `Ta réponse, ${esc(chosenC.capital)}, est la capitale de` : 'Ta réponse · voir la fiche'), 'bad') : ''}
      <button class="next" id="nx">Continuer ›</button>`;
    $('#qscore',el).textContent = '✓ '+st.ok;
    bindOpen($('#fb',el));
    $('#nx',el).onclick = nextStep;
    if (fresh) $('#fb',el).scrollIntoView({behavior: reduceMotion() ? 'auto' : 'smooth', block:'end'});
  };
  const finish = (ok, chosen) => {
    if (step.ans) return;
    const ms = CLOCK ? performance.now() - CLOCK.t0 : 0; CLOCK = null;
    st.n++; if (ok) st.ok++; beep(ok);
    const g = gradeOf(ok, ms, q.kind, step.retry);
    step.ans = {ok, chosen, ms, g};
    if (st.srs){ const nc = record(q.iso, q.sk, g, ms, chosen); step.ans.due = nc.due; }
    const tries = step.tries || 0;
    if (!ok && tries < 2){ const at = Math.min(st.steps.length, st.i+4); st.steps.splice(at, 0, {type:'q', iso:q.iso, sk:q.sk, variant:step.variant, retry:true, tries:tries+1}); step.ans.requeued = true; $('#qcount',el).textContent = `${st.i+1}/${st.steps.length}`; }
    showAnswered(true);
  };
  if (q.kind==='tap'){
    const host = $('#tm',el); const v = GEO.views[c.continent];
    const view = fitRegion(v, host.clientWidth/host.clientHeight);
    im = interactiveMap(host, view, {mode:'world', initial: step.mapView || null, onChange: v => { step.mapView = v; }, onTap: id => {
      if (step.ans) return;
      if (!id){ $('#th',el).textContent = 'Touche un pays (pas la mer) ou zoome davantage.'; return; }
      finish(id===q.iso, id);
    }});
  }
  if (step.ans) showAnswered(false);
  else {
    el.querySelectorAll('.ans').forEach(b => b.onclick = () => finish(b.dataset.id===q.answer, b.dataset.id));
    CLOCK = {t0: performance.now(), hid: null};
  }
}
function vSummary(el, st){
  document.getElementById('app').classList.remove('quizmode'); setTitle('Bilan');
  const p = st.n ? Math.round(st.ok/st.n*100) : 100;
  const qs = st.steps.filter(s=>s.type==='q' && s.ans);
  const errs = [...new Set(qs.filter(s=>!s.ans.ok).map(s=>s.iso))];
  const isos = [...new Set(st.steps.map(s=>s.iso))];
  const errRows = qs.filter(s=>!s.ans.ok).map(s => { const c = BY[s.iso]; const ch = s.ans.chosen && BY[s.ans.chosen] && s.ans.chosen!==s.iso ? BY[s.ans.chosen] : null;
    return `<button class="lrow" data-open="${c.iso3}"><img src="${flagSrc(c)}" alt=""><div><b>${esc(c.name)}</b><span>${SKILLS[s.sk].n}${ch?` · confondu avec ${esc(ch.name)}`:''}</span></div><span class="chev">›</span></button>`; }).join('');
  el.innerHTML = `<div class="summary"><div class="small">Séance terminée</div><div class="score">${p}%</div><div>${st.ok} bonne${st.ok>1?'s':''} réponse${st.ok>1?'s':''} sur ${st.n}</div></div>
   <button class="next" id="again">Continuer à apprendre</button><button class="big-btn ghost" id="home" style="margin-top:10px">Retour à l’accueil<span>›</span></button>
   ${errs.length ? `<div class="h2">Erreurs à revoir (${qs.filter(s=>!s.ans.ok).length})</div><div class="panel list">${errRows}</div>` : ''}
   <div class="h2">Pays de la séance</div><div class="grid">${isos.map(i=>miniCard(BY[i])).join('')}</div>`;
  $('#home',el).onclick = () => home('home');
  $('#back').hidden = true; $('#topright').textContent='';
  const a = st.again || {kind:'session', zone:'WORLD'};
  $('#again',el).textContent = a.kind==='quiz' ? 'Rejouer ce défi' : a.kind==='drill' ? 'Réviser encore ce pays' : 'Continuer à apprendre';
  $('#again',el).onclick = () => {
    if (a.kind==='quiz') return startQuiz(a, true);
    if (a.kind==='drill') return startDrill(a.iso, true);
    startSession(a.zone, a, true);
  };
  bindOpen(el); bindMini(el.querySelector('.grid'), isos);
}

/* ---------- Défis ---------- */
function vQuiz(el, args){
  setTitle('Défis');
  let type = SK.includes(args.type)||args.type==='tap'||args.type==='mix' ? args.type : 'mix', zone = args.zone||'WORLD', n = args.n||P.qn;
  const types = [['cap','Capitale','Trouve la capitale (et l’inverse)'],['flag','Drapeau','Reconnais le pays à son drapeau'],['loc','Localisation','Quel pays est surligné ?'],['tap','Toucher la carte','Touche le pays demandé'],['mix','Mélange','Les trois compétences']];
  const draw = () => {
    Object.assign(args, {type, zone, n});
    el.innerHTML = `<div class="h2" style="margin-top:4px">Type de défi</div>
    <div class="seg">${types.map(([k,t,d])=>`<button class="opt ${k===type?'on':''}" data-t="${k}"><b><span class="ico ${k==='tap'?'loc':k}">${ICON[k==='tap'?'loc':k]}</span><span class="tt">${t}</span></b><span>${d}</span></button>`).join('')}</div>
    <div class="h2">Zone</div><div class="chips">${['WORLD',...CONT_ORDER].map(k=>`<button class="chip ${k===zone?'on':''}" data-z="${k}">${k==='WORLD'?'Monde entier':`<i style="background:${CONT[k].c}"></i>${CONT[k].n}`}</button>`).join('')}</div>
    <div class="h2">Nombre de questions</div><div class="chips">${[10,20,30].map(k=>`<button class="chip ${k===n?'on':''}" data-n="${k}">${k}</button>`).join('')}</div>
    <p class="small">Les pays les plus fragiles (rappel faible, erreurs fréquentes) sortent plus souvent. Chaque réponse met à jour leur planning de révision.</p>
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
  setTitle('À propos');
  el.innerHTML = `<div class="panel"><b>Comment fonctionnent les révisions</b>
    <p class="small">Chaque pays donne trois cartes de mémoire : capitale, drapeau et localisation. Chacune a sa propre <b>stabilité</b> (le nombre de jours au bout duquel la probabilité de t’en souvenir tombe à 90 %), sa <b>difficulté</b> (1 à 10), sa date d’échéance et son nombre d’erreurs.</p>
    <p class="small">Le planning est calculé par <b>FSRS-6</b> (Free Spaced Repetition Scheduler), l’algorithme utilisé par Anki, avec ses poids par défaut publiés. Pas besoin d’entraîner un modèle : la note de chaque réponse est déduite automatiquement — erreur = <i>À revoir</i>, bonne réponse lente = <i>Difficile</i>, normale = <i>Bien</i>, très rapide = <i>Facile</i> (seuils réglables dans Paramètres).</p>
    <p class="small">Une carte ratée revient quelques questions plus loin dans la même séance, puis 10 minutes plus tard. Les révisions présentent d’abord les cartes dont le rappel est le plus fragile ; les cartes souvent ratées remontent en tête, et les propositions des QCM reprennent les pays que tu as déjà confondus.</p></div>
    <div class="panel"><b>Sauvegarde</b><p class="small">La progression est enregistrée uniquement sur cet appareil (stockage local du navigateur). Elle n’est pas synchronisée : utilise Exporter / Importer dans Paramètres pour la transférer.</p></div>
    <div class="panel"><b>Sources des données</b><p class="small">
    • Liste et numérotation des 194 pays : liste des emplacements (version française) de The World Game.<br>
    • Textes « En savoir plus » : introductions des articles de Wikipédia en français (CC BY-SA 4.0), raccourcies et nettoyées ; lien vers l’article sur chaque fiche. Langues, monnaies et régimes : Wikidata (CC0).<br>
    • Répétition espacée : FSRS-6, d’après py-fsrs 6.3.3 (open-spaced-repetition, licence MIT).<br>
    • Drapeaux : flag-icons (licence MIT).<br>
    • Fond de carte : Natural Earth via world-atlas (domaine public / ISC). Le Somaliland est rattaché à la Somalie et Chypre du Nord à Chypre, conformément aux frontières reconnues par l’ONU ; Kosovo, Taïwan, Sahara occidental, Palestine, Groenland, etc. sont en gris.<br>
    • Capitales et points culminants : Wikidata (CC0), vérifiés et corrigés à la main.<br>
    • Population : Banque mondiale, 2024 (CC BY 4.0).<br>
    • Superficies, frontières : jeu de données mledoze/countries (ODbL).<br>
    • Pays voisins : frontières terrestres avec les autres pays de la liste des 194 (territoires non membres exclus).<br>
    • Traits d’identité : rédigés pour l’app à partir de faits géographiques établis.<br>
    • Police : Montserrat (SIL Open Font License).</p>
    <p class="small">Application non officielle, inspirée d’un jeu de cartes de géographie ; sans lien avec ses éditeurs.</p></div>`;
}

/* ---------- Paramètres ---------- */
function vSettings(el){
  setTitle('Paramètres');
  const seg = (k, opts, label) => `<div class="segc" role="radiogroup" aria-label="${label}">${opts.map(([v,t]) => { const on = String(P[k])===String(v); return `<button role="radio" aria-checked="${on}" class="${on?'on':''}" data-pk="${k}" data-pv="${v}">${t}</button>`; }).join('')}</div>`;
  const row = (title, sub, ctl) => `<div class="setrow"><div class="lab"><div><b>${title}</b>${sub?`<small>${sub}</small>`:''}</div></div>${ctl}</div>`;
  const np = S.settings.newPer || 3;
  const th = thresholds('cap');
  el.innerHTML = `
  <div class="h2" style="margin-top:4px">Affichage</div>
  <div class="setgroup">
    ${row('Thème', 'Automatique suit le mode clair/sombre de l’iPhone.', seg('theme', [['light','☀ Jour'],['dark','☾ Nuit'],['auto','Auto']], 'Thème'))}
    ${row('Taille du texte', 'S’ajoute au zoom de l’iPhone si besoin.', seg('fs', [['m','Normale'],['l','Grande'],['xl','Très grande']], 'Taille du texte'))}
    ${row('Animations', 'Auto suit l’option « Réduire les animations » de l’iPhone.', seg('motion', [['auto','Auto'],['on','Activées'],['reduce','Réduites']], 'Animations'))}
    ${row('Étiquettes sur la carte', 'Apparaissent en zoomant sur la carte du monde.', seg('labels', [['num','Numéros'],['name','Noms'],['none','Aucune']], 'Étiquettes sur la carte'))}
  </div>
  <div class="h2">Révisions (FSRS)</div>
  <div class="setgroup">
    ${row('Rétention cible', 'Probabilité visée de se souvenir au moment de la révision. Plus haut = révisions plus fréquentes. S’applique aux prochaines réponses.', seg('retention', [[0.85,'85 %'],[0.9,'90 %'],[0.95,'95 %']], 'Rétention cible'))}
    ${row('Vitesse de réponse', `Seuils des notes pour une bonne réponse : Facile sous ${dec1(th[0])} s, Bien jusqu’à ${dec1(th[1])} s, Difficile au-delà (plus long pour les cartes à toucher).`, seg('speed', [['fast','Rapide'],['normal','Normale'],['slow','Lente']], 'Vitesse de réponse'))}
    ${row('Nouveaux pays par séance', 'Chaque nouveau pays apporte 3 cartes : capitale, drapeau, localisation.', `<div class="segc" role="radiogroup" aria-label="Nouveaux pays par séance">${[2,3,5,8].map(k=>`<button role="radio" aria-checked="${k===np}" class="${k===np?'on':''}" data-np="${k}">${k}</button>`).join('')}</div>`)}
    ${row('Révisions max par séance', 'Les cartes en retard au-delà restent pour la séance suivante.', seg('revMax', [[15,'15'],[25,'25'],[40,'40']], 'Révisions max par séance'))}
    ${row('Questions par défi', 'Nombre proposé par défaut dans Défis et pour les défis rapides.', seg('qn', [[10,'10'],[20,'20'],[30,'30']], 'Questions par défi'))}
    <div class="setrow"><div class="lab"><div><b>Sons</b><small>Petit signal après chaque réponse. Muet si l’iPhone est en mode silencieux.</small></div><button class="switch" role="switch" aria-checked="${!!P.sound}" aria-label="Sons" data-sw="sound"></button></div></div>
  </div>
  <div class="h2">Progression</div>
  <div class="setgroup">
    <button class="setlink" id="stats"><span class="sl">Statistiques</span><span class="chev">›</span></button>
    <button class="setlink" id="exp"><span class="sl">Exporter la progression</span><span class="chev">›</span></button>
    <button class="setlink" id="imp"><span class="sl">Importer une sauvegarde</span><span class="chev">›</span></button>
    <button class="setlink danger" id="reset"><span class="sl">Réinitialiser la progression</span><span class="chev">›</span></button>
  </div>
  <div class="h2">À propos</div>
  <div class="setgroup">
    <button class="setlink" id="about"><span class="sl">Fonctionnement, sources et licences</span><span class="chev">›</span></button>
    <button class="setlink" id="resetp"><span class="sl">Rétablir les réglages par défaut</span><span class="chev">›</span></button>
  </div>
  <p class="small" style="text-align:center;margin-top:18px">World – Géo · version 3 · ${FSRS.VERSION} · ${C.filter(c=>seen(c.iso3)).length} pays découverts</p>`;
  const redraw = () => { const y = el.scrollTop; vSettings(el); el.scrollTop = y; };
  const NUM = new Set(['qn','retention','revMax']);
  el.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const k = b.dataset.pk; P[k] = NUM.has(k) ? +b.dataset.pv : b.dataset.pv; savePrefs(); redraw(); });
  el.querySelectorAll('[data-np]').forEach(b => b.onclick = () => { S.settings.newPer = +b.dataset.np; save(); redraw(); });
  el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const k = b.dataset.sw; P[k] = !P[k]; savePrefs(); if (k==='sound' && P[k]) beep(true); redraw(); });
  $('#about',el).onclick = () => go(vAbout);
  $('#stats',el).onclick = () => go(vStats);
  $('#resetp',el).onclick = () => { if (confirm('Rétablir les réglages par défaut (thème nuit, rétention 90 %…) ? Ta progression est conservée.')) { P = Object.assign({}, PREF_DEF); savePrefs(); S.settings.newPer = 3; save(); redraw(); toast('Réglages rétablis'); } };
  $('#reset',el).onclick = () => {
    const n = C.filter(c=>seen(c.iso3)).length;
    if (!confirm(`Effacer toute la progression (${n} pays découverts, ${Object.keys(S.cards).length} cartes de mémoire, série de jours) ? Cette action est définitive. Pense à exporter avant si besoin.`)) return;
    const np2 = S.settings.newPer || 3; S = emptyState(); S.settings.newPer = np2; save(); redraw(); toast('Progression effacée');
  };
  $('#exp',el).onclick = () => { const t = JSON.stringify({app:'world-geo', ver:3, exported:new Date().toISOString(), state:S, prefs:P}); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(()=>toast('Copié dans le presse-papiers'), ()=>prompt('Copie ce texte', t)); else prompt('Copie ce texte', t); };
  $('#imp',el).onclick = () => { const t = prompt('Colle ici une sauvegarde exportée'); if (!t) return; const r = importData(t); toast(r ? 'Progression importée' : 'Sauvegarde invalide'); if (r) redraw(); };
}
// accepte une sauvegarde v3 (enveloppe ou état brut) ou une ancienne sauvegarde v1/v2 (migrée)
function importData(t){
  try {
    const o = JSON.parse(t); let s = null;
    if (o && o.state && o.state.ver===3) s = o.state; else if (o && o.ver===3 && o.cards) s = o; else if (o && o.items) s = migrate(o);
    if (!s) return false;
    S = Object.assign(emptyState(), s); save();
    if (o.prefs){ P = Object.assign({}, PREF_DEF, o.prefs); savePrefs(); }
    return true;
  } catch(e){ return false; }
}

const TABS = {home:vHome, quiz:vQuiz, deck:vDeck, map:vMap, settings:vSettings};

/* ---------- Démarrage ---------- */
async function init(){
  applyPrefs();
  $('#back').onclick = back;
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => home(b.dataset.tab));
  const [cs, geo] = await Promise.all([fetch('data/countries.json').then(r=>r.json()), fetch('data/geo.json').then(r=>r.json())]);
  C = cs.sort((a,b)=>a.n-b.n); C.forEach(c=>BY[c.iso3]=c); GEO = geo; GEO.items.forEach(i=>GEOBY[i.id]=i);
  try { WIKI = await fetch('data/wiki.json').then(r=>r.json()); } catch(e){ WIKI = null; }
  stack.length = 0; stack.push({fn:vHome, args:{}, tab:'home'}); pushHist(true); render(false);
  if ('serviceWorker' in navigator && location.protocol !== 'file:'){
    // quand une nouvelle version s'installe, on recharge une fois pour l'afficher tout de suite
    const had = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded){ reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then(r => r.update && r.update()).catch(()=>{});
  }
}
window.WorldGeo = { get state(){ return S; }, get prefs(){ return P; }, get beeps(){ return beeps; }, get stackDepth(){ return stack.length; }, buildQ, BY:()=>BY,
  dueCards, gradeOf, importData, migrate, sched,
  /* aides aux tests automatisés */ _session(steps, srs=false){ go(vSession, {steps, i:0, ok:0, n:0, title:'Test', srs}); },
  _args(){ const t = stack[stack.length-1]; return t ? t.args : null; }, _top(){ const t = stack[stack.length-1]; return t ? t.fn.name : null; } };
init().catch(e => { $('#view').innerHTML = `<p class="loading">Erreur de chargement : ${esc(e.message)}</p>`; console.error(e); });
})();
