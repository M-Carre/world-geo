'use strict';
/* World – Géo v5.1 : PWA d'apprentissage des 194 pays (193 États de l'ONU + Vatican) et des végétaux et animaux de Munich.
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
const emptyState = () => ({ver:3, cards:{}, conf:{}, log:[], archive:{}, settings:{newPer:3}, stats:{answered:0,correct:0,days:[]}, nat:{ph:{}}});
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
const PREF_DEF = {theme:'dark', fs:'m', motion:'auto', labels:'num', qn:10, sound:false, retention:0.9, speed:'normal', revMax:25, learn:false, dom:'geo', natNew:5, natRevDay:60, season:false};
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

/* ---------- Catégories de cartes (cliquables partout : accueil, statistiques, fiches, badges) ---------- */
// Une « carte » = un pays × une compétence. Chaque catégorie a un nom, une explication et un filtre.
function allCards(){ const out = []; for (const k in S.cards){ const [iso,sk] = k.split(':'); if (BY[iso] && SKILLS[sk]) out.push({k, iso, sk, cd:S.cards[k]}); } return out; }
const isEasy = cd => cd.state===2 && cd.d <= 4 && (cd.fails||0)===0;
const isMasteredCd = cd => cd.state===2 && cd.s >= MASTER_S;
const CATS = {
  due:     {n:'À réviser maintenant', d:'Cartes arrivées à échéance (retards compris). La révision commence par les plus fragiles.', f:x => isDue(x.cd)},
  today:   {n:'À réviser d’ici ce soir', d:'Cartes à échéance aujourd’hui, y compris celles qui reviennent dans quelques minutes.', f:x => x.cd.due < startOfDay(Date.now(),1)},
  hard:    {n:'Difficiles', d:'Difficulté FSRS d’au moins 7/10 ou au moins 3 erreurs. Elles passent en priorité dans les révisions.', f:x => isHard(x.cd) || isLeech(x.cd)},
  leech:   {n:'Très difficiles', d:'Cartes ratées encore et encore (au moins 4 erreurs, ou 2 oublis avec une difficulté de 8/10).', f:x => isLeech(x.cd)},
  learning:{n:'En apprentissage', d:'Cartes récentes ou ratées récemment : elles reviennent à quelques minutes d’intervalle.', f:x => x.cd.state!==2},
  review:  {n:'En consolidation', d:`Cartes en révision, pas encore maîtrisées (stabilité sous ${MASTER_S} jours).`, f:x => x.cd.state===2 && x.cd.s < MASTER_S},
  easy:    {n:'Faciles', d:'Cartes en révision jamais ratées, de difficulté 4/10 au plus.', f:x => isEasy(x.cd)},
  mastered:{n:'Maîtrisées', d:`Stabilité d’au moins ${MASTER_S} jours : la probabilité de t’en souvenir reste au-dessus de 90 % pendant ${MASTER_S} jours ou plus.`, f:x => isMasteredCd(x.cd)},
  mcountry:{n:'Pays maîtrisés', d:'Pays dont les trois cartes (capitale, drapeau, localisation) sont maîtrisées.', f:x => mastered(x.iso)},
  studied: {n:'Toutes les cartes étudiées', d:'Toutes les cartes déjà rencontrées en défi ou en révision.', f:() => true},
  fresh:   {n:'Nouvelles', d:'Cartes jamais rencontrées. Elles entrent dans les révisions dès ta première réponse en défi.', virtual:true},
  day:     {n:'À échéance', d:'Cartes qui reviennent ce jour-là.', f:(x,a) => { const t0 = startOfDay(Date.now(), a.day), t1 = startOfDay(Date.now(), a.day+1); return x.cd.due >= (a.day===0 ? -Infinity : t0) && x.cd.due < t1; }},
  grade:   {n:'Note', d:'Cartes qui ont reçu cette note au moins une fois ces 30 derniers jours.', f:(x,a) => (a._g[x.k]||0) > 0},
};
const HOME_CATS = ['due','hard','learning','review','easy','mastered','fresh'];
const DAYN = k => k===0 ? 'aujourd’hui' : k===1 ? 'demain' : new Date(startOfDay(Date.now(),k)).toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long'});
function catTitle(a){
  const base = a.cat==='day' ? 'À échéance '+DAYN(a.day) : a.cat==='grade' ? `Notées « ${RATING_N[a.g]} »` : CATS[a.cat].n;
  return base + (a.sk && SKILLS[a.sk] ? ' · '+SKILLS[a.sk].n : '');
}
// renvoie les cartes de la catégorie, triées (les plus fragiles d'abord)
function catItems(a){
  const now = Date.now(); const C0 = CATS[a.cat]; if (!C0) return [];
  let items;
  if (C0.virtual){
    items = []; C.forEach(c => SK.forEach(sk => { if (!card(c.iso3,sk)) items.push({k:key(c.iso3,sk), iso:c.iso3, sk, cd:null, n:c.n}); }));
    items.sort((x,y) => x.n-y.n || SK.indexOf(x.sk)-SK.indexOf(y.sk));
  } else {
    if (a.cat==='grade'){ a._g = {}; S.log.forEach(r => { if (r[0] > now-30*DAY && r[3]===a.g){ const k = key(r[1],r[2]); a._g[k] = (a._g[k]||0)+1; } }); }
    items = allCards().filter(x => C0.f(x, a));
    if (a.cat==='day' || a.cat==='today') items.sort((x,y) => x.cd.due-y.cd.due);
    else items.sort((x,y) => priority(x.cd, now)-priority(y.cd, now));
  }
  if (a.sk && SKILLS[a.sk]) items = items.filter(x => x.sk===a.sk);
  return items;
}
const catCount = a => catItems(a).length;
// bouton de catégorie réutilisable : data-cat (+ data-sk / data-day / data-g)
const catAttrs = a => `data-cat="${a.cat}"${a.sk?` data-sk="${a.sk}"`:''}${a.day!=null?` data-day="${a.day}"`:''}${a.g?` data-g="${a.g}"`:''}`;
const catArgs = b => { const a = {cat:b.dataset.cat}; if (b.dataset.sk) a.sk = b.dataset.sk; if (b.dataset.day!=null) a.day = +b.dataset.day; if (b.dataset.g) a.g = +b.dataset.g; return a; };

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
// Safari limite pushState (environ 100 appels / 10 s) : si l'historique refuse l'entrée, la vue est marquée
// et « retour » dépile alors directement dans l'app au lieu de passer par history.back().
// Chaque vue retient l'entrée d'historique qui la porte (hid) et celle de la vue du dessous (prevHid) :
// « retour » n'utilise history.back() que si les deux correspondent, sinon il dépile dans l'app.
function pushHist(replace, replaced){
  const id = NAV_ID+'-'+(++navN); SNAPS.set(id, stack.slice());
  const top = stack[stack.length-1], below = stack[stack.length-2];
  if (!top) return;
  const prev = replace ? (replaced ? replaced.prevHid : null) : (below ? below.hid : null);
  try { history[replace?'replaceState':'pushState']({wg:id}, ''); top.hid = id; top.prevHid = prev; }
  catch(e){ if (!replace) { top.hid = null; top.prevHid = null; } }
}
function go(fn, args={}, {replace=false}={}){
  saveScroll();
  const replaced = replace ? stack.pop() : null;
  stack.push({fn, args, tab: stack[0] ? stack[0].tab : 'home'});
  pushHist(replace, replaced); render(false);
}
function back(){
  if (stack.length <= 1) return;
  const top = stack[stack.length-1];
  const below = stack[stack.length-2];
  if (top.hid && history.state && history.state.wg === top.hid && top.prevHid && top.prevHid === below.hid) { history.back(); return; }
  saveScroll(); stack.pop(); pushHist(true, below); render(true);
}
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
  setTab(stack[0].tab || 'home'); updateTabs();
}
function setTitle(t){ $('#title').textContent = t; }
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }
const openCard = (iso, list) => go(vCard, {iso, list});
// tout élément [data-open="ISO3"] ouvre la fiche ; [data-zone-open] ouvre la liste du continent
function bindOpen(el){
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openCard(b.dataset.open); });
  el.querySelectorAll('[data-zone-open]').forEach(b => b.onclick = e => { e.stopPropagation(); go(vZone, {z:b.dataset.zoneOpen}); });
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = e => { e.stopPropagation(); go(vList, catArgs(b)); });
  el.querySelectorAll('[data-ncat]').forEach(b => b.onclick = e => { e.stopPropagation(); go(vNatList, natCatArgs(b)); });
  el.querySelectorAll('[data-sp]').forEach(b => b.onclick = e => { e.stopPropagation(); go(vSpecies, {id:b.dataset.sp}); });
}

/* ---------- Écran d'accueil : Défis et Cartes à réviser en avant ---------- */
function catTile(a, label, n, cls=''){ return `<button class="cat ${cls}" ${catAttrs(a)} aria-label="${esc(label)} : ${n}, voir la liste"><b>${n}</b><span>${esc(label)}</span><i class="chev">›</i></button>`; }
function nextDueText(){ let t = Infinity; for (const k in S.cards) if (!k.startsWith('N:')) t = Math.min(t, S.cards[k].due); return t===Infinity ? '' : ' · prochaine '+relTime(t); }
function vHome(el){
  const nk = domK(); if (nk) return vNatHome(el, nk);
  setTitle('');
  const due = dueCards().length, m = C.filter(c=>mastered(c.iso3)).length;
  const cnt = {}; HOME_CATS.forEach(k => cnt[k] = catCount({cat:k}));
  const zones = CONT_ORDER.map(z => { const cs = C.filter(c=>c.continent===z); const mm = cs.filter(c=>mastered(c.iso3)).length; const ss = cs.filter(c=>seen(c.iso3)).length; const dz = dueCards(z).length;
    return `<button class="zone" data-zone="${z}"><i class="sw" style="background:${CONT[z].c}"></i><div class="zn"><b>${CONT[z].n}</b><span>${cs.length} pays · ${ss} vus · ${mm} maîtrisés${dz?` · ${dz} à réviser`:''}</span><div class="bar"><i style="width:${(mm/cs.length*100).toFixed(1)}%;background:${CONT[z].c}"></i></div></div><span class="chev">›</span></button>`; }).join('');
  const quick = [['mix','mix','Mélange'],['cap','cap','Capitale'],['flag','flag','Drapeau'],['loc','loc','Localisation'],['tap','loc','Toucher la carte']];
  const lab = {due:'à réviser', hard:'difficiles', learning:'en apprentissage', review:'en consolidation', easy:'faciles', mastered:'maîtrisées', fresh:'nouvelles'};
  el.innerHTML = `${NAT ? domSwitch() : ''}
  <div class="logo small"><div class="frame"><div class="w">WORLD</div></div><div class="g">GÉO</div><div class="dots"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="tagline">194 PAYS À MAÎTRISER</div></div>
  <div class="h2">Cartes à réviser</div>
  <button class="big-btn" id="rev"><div>Réviser maintenant<small>${due ? due+' carte'+(due>1?'s':'')+' à revoir, les plus fragiles d’abord' : 'Rien à revoir pour l’instant'+nextDueText()}</small></div><span class="pill">${due}</span></button>
  ${cnt.hard ? `<button class="big-btn ghost" id="revhard"><div>Réviser les cartes difficiles<small>${cnt.hard} carte${cnt.hard>1?'s':''} souvent ratée${cnt.hard>1?'s':''}, même si elles ne sont pas encore dues</small></div><span class="pill red">${cnt.hard}</span></button>` : ''}
  <div class="cats">${HOME_CATS.map(k => catTile({cat:k}, lab[k], cnt[k], 'c-'+k)).join('')}</div>
  <p class="small hintline">Touche une catégorie pour voir ses cartes et la réviser.</p>
  <div class="h2">Défis</div>
  <div class="seg quick">${quick.map(([k,ic,t])=>`<button class="opt" data-q="${k}"><b><span class="ico ${ic}">${ICON[ic]}</span><span class="tt">${t}</span></b><span>Monde · ${P.qn} questions</span></button>`).join('')}
  <button class="opt more" id="quizcfg"><b><span class="tt">Personnaliser ›</span></b><span>Zone, type, nombre</span></button></div>
  <div class="h2">Défis par continent</div>${zones}
  ${P.learn ? `<div class="h2">Apprendre</div><button class="big-btn ghost" id="learnw"><div>Apprendre le monde<small>${S.settings.newPer||3} nouveaux pays par séance, dans l’ordre des numéros</small></div><span>›</span></button>` : ''}
  <div class="h2">Plus</div>
  <div class="stats-row">${catTile({cat:'mcountry'}, 'pays maîtrisés / 194', m)}${catTile({cat:'studied'}, 'cartes étudiées', allCards().length)}<button class="cat" id="streak" aria-label="Statistiques"><b>${streak()}</b><span>jours de suite</span><i class="chev">›</i></button></div>
  <button class="big-btn ghost" id="stats"><div>Statistiques<small>Prévisions, catégories, maîtrise par compétence</small></div><span>›</span></button>
  <button class="big-btn ghost" id="about"><div>Paramètres<small>Thème, rétention cible, sons, sauvegarde</small></div><span>›</span></button>`;
  $('#rev',el).onclick = () => due ? startSession('WORLD',{reviewOnly:true}) : toast('Tout est à jour !');
  const rh = $('#revhard',el); if (rh) rh.onclick = () => startCat({cat:'hard'});
  const lw = $('#learnw',el); if (lw) lw.onclick = () => startSession('WORLD');
  $('#about',el).onclick = () => home('settings');
  $('#stats',el).onclick = $('#streak',el).onclick = () => go(vStats);
  $('#quizcfg',el).onclick = () => home('quiz');
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => startQuiz({zone:'WORLD', type:b.dataset.q, n:P.qn}));
  el.querySelectorAll('.zone').forEach(b => b.onclick = () => go(vZone,{z:b.dataset.zone}));
  bindOpen(el); bindDom(el); if (NAT) natWarmSoon();
}

/* ---------- Liste d'une catégorie ---------- */
function catRow(x, list){
  const c = BY[x.iso], cd = x.cd, now = Date.now();
  const info = !cd ? 'jamais rencontrée' : cd.state!==2 ? `${STATE_N[cd.state].toLowerCase()} · revient ${relTime(cd.due)}` : `rappel ${pct(recall(cd, now))} · revient ${relTime(cd.due)}${cd.due > now+DAY ? ' ('+fmtDate(cd.due)+')' : ''}`;
  const tags = cd ? [isLeech(cd) ? '<em class="t-bad">très difficile</em>' : isHard(cd) ? '<em class="t-bad">difficile</em>' : '', isMasteredCd(cd) ? '<em class="t-ok">maîtrisée</em>' : '', (cd.fails||0) ? `<em>${cd.fails} erreur${cd.fails>1?'s':''}</em>` : ''].join('') : '';
  return `<button class="lrow crow" data-iso="${x.iso}" data-k="${x.k}"><img loading="lazy" src="${flagSrc(c)}" alt=""><div><b>${esc(c.name)}</b><span><i class="ico sm ${x.sk}">${ICON[x.sk]}</i>${SKILLS[x.sk].n} · ${info}</span>${tags?`<span class="tags">${tags}</span>`:''}</div><span class="chev">›</span></button>`;
}
function vList(el, args){
  setTitle(catTitle(args));
  if (!CATS[args.cat]){ el.innerHTML = '<p class="small">Catégorie inconnue.</p>'; return; }
  const items = catItems(args);
  const counts = {}; SK.forEach(sk => counts[sk] = catCount(Object.assign({}, args, {sk})));
  const total = SK.reduce((t,sk) => t+counts[sk], 0);
  const LIM = 300; const shown = args.all ? items : items.slice(0, LIM);
  const nRev = Math.min(items.length, P.revMax);
  el.innerHTML = `<div class="panel catinfo"><b>${items.length} carte${items.length>1?'s':''}</b><p class="small">${esc(CATS[args.cat].d)}</p></div>
    <div class="chips">${[['', 'Toutes', total], ...SK.map(sk => [sk, SKILLS[sk].n, counts[sk]])].map(([k,t,n]) => `<button class="chip ${(args.sk||'')===k?'on':''}" data-fsk="${k}">${t} · ${n}</button>`).join('')}</div>
    ${items.length ? `<button class="next" id="catrev">${args.cat==='fresh' ? 'Découvrir' : 'Réviser'} ${nRev===items.length ? (nRev>1?'ces '+nRev+' cartes':'cette carte') : 'les '+nRev+' premières'}</button>` : ''}
    <div class="panel list" id="clist">${items.length ? shown.map(x => catRow(x)).join('') : '<p class="small">Aucune carte dans cette catégorie pour l’instant.</p>'}
    ${shown.length < items.length ? `<button class="chip" id="showall" style="margin:10px auto">Afficher les ${items.length} cartes</button>` : ''}</div>`;
  const isos = [...new Set(shown.map(x => x.iso))];
  el.querySelectorAll('.crow').forEach(b => b.onclick = () => go(vCard, {iso:b.dataset.iso, list:isos}));
  el.querySelectorAll('[data-fsk]').forEach(b => b.onclick = () => { if (b.dataset.fsk) args.sk = b.dataset.fsk; else delete args.sk; go(vList, args, {replace:true}); });
  const cr = $('#catrev',el); if (cr) cr.onclick = () => startCat(args);
  const sa = $('#showall',el); if (sa) sa.onclick = () => { args.all = true; const y = el.scrollTop; vList(el, args); el.scrollTop = y; };
}
// révision ciblée sur une catégorie (les cartes non dues sont révisées en avance ; FSRS en tient compte)
function startCat(a, replace=false){
  const items = catItems(a).slice(0, P.revMax);
  if (!items.length){ toast('Aucune carte dans cette catégorie'); return; }
  const steps = items.map(x => ({type:'q', iso:x.iso, sk:x.sk, variant: !x.cd && x.sk==='loc' ? 'qcm' : !x.cd ? 'fwd' : null}));
  const keep = {cat:a.cat}; ['sk','day','g'].forEach(k => { if (a[k]!=null) keep[k] = a[k]; });
  go(vSession, {steps, i:0, ok:0, n:0, title:catTitle(a), srs:true, again:{kind:'cat', cat:keep}}, {replace});
}

function vZone(el,{z}){
  setTitle(CONT[z].n);
  const cs = C.filter(c=>c.continent===z); const due = dueCards(z).length; const fresh = cs.filter(c=>!seen(c.iso3)).length;
  const quick = [['cap','cap','Capitale'],['flag','flag','Drapeau'],['loc','loc','Localisation'],['tap','loc','Toucher la carte']];
  el.innerHTML = `
    ${P.learn ? `<button class="big-btn" id="go" style="background:${CONT[z].c};color:${z==='AF'?'#000':'#fff'}"><div>Séance d’apprentissage<small style="color:inherit;opacity:.8">${due} à revoir · ${fresh} nouveaux pays restants</small></div><span>›</span></button>`
      : `<button class="big-btn" id="go" style="background:${CONT[z].c};color:${z==='AF'?'#000':'#fff'}"><div>Réviser ce continent<small style="color:inherit;opacity:.8">${due ? due+' carte'+(due>1?'s':'')+' à revoir' : 'Rien à revoir pour l’instant'}</small></div><span class="pill">${due}</span></button>`}
    <div class="seg">
      ${quick.map(([k,ic,t])=>`<button class="opt" data-q="${k}"><b><span class="ico ${ic}">${ICON[ic]}</span><span class="tt">${t}</span></b><span>Défi rapide · ${P.qn} questions</span></button>`).join('')}
    </div>
    <div class="h2">Les ${cs.length} cartes</div><div class="grid">${cs.map(miniCard).join('')}</div>`;
  $('#go',el).onclick = () => P.learn ? startSession(z) : due ? startSession(z, {reviewOnly:true}) : toast('Ce continent est à jour !');
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
    const det = cd && cd.s!=null ? `<small>Stabilité ${dec1(cd.s)} j · difficulté ${dec1(cd.d)}/10 · ${cd.reps||0} révision${(cd.reps||0)>1?'s':''} · ${cd.fails||0} erreur${(cd.fails||0)>1?'s':''}</small>` : '';
    const tags = cd ? [skillMastered(c.iso3,sk) ? `<button class="tag t-ok" ${catAttrs({cat:'mastered', sk})}>maîtrisée ›</button>` : '', isLeech(cd) ? `<button class="tag t-bad" ${catAttrs({cat:'leech'})}>très difficile ›</button>` : isHard(cd) ? `<button class="tag t-bad" ${catAttrs({cat:'hard'})}>difficile ›</button>` : '',
      cd.state!==2 ? `<button class="tag" ${catAttrs({cat:'learning'})}>en apprentissage ›</button>` : '', isEasy(cd) ? `<button class="tag" ${catAttrs({cat:'easy'})}>facile ›</button>` : ''].join('') : '';
    return `<div class="memrow"><span class="ico ${S0.cls}">${ICON[sk]}</span><div><b>${S0.n}</b><span>${memLine(cd)}</span>${det}${tags?`<div class="tags">${tags}</div>`:''}</div></div>`; }).join('');
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
  const nk = domK(); if (nk) return vNatDeck(el, args, nk);
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
  const nk = domK(); if (nk) return vNatField(el, args, nk);
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

/* ---------- Statistiques (chaque chiffre ouvre la liste de ses cartes) ---------- */
function vStats(el){
  setTitle('Statistiques');
  const now = Date.now(); const all = allCards();
  const dueNow = dueCards().length, dueToday = catCount({cat:'today'});
  const m = C.filter(c=>mastered(c.iso3)).length;
  const days = [...Array(7)].map((_,k) => ({k, n: catCount({cat:'day', day:k}), t: startOfDay(now,k)}));
  const mx = Math.max(1, ...days.map(d=>d.n));
  const lg = S.log.filter(r => r[0] > now - 30*DAY && BY[r[1]]); const lgRev = lg.filter(r => r[3] !== undefined);
  const succ = lgRev.length ? lgRev.filter(r=>r[3]>1).length/lgRev.length : null;
  const ratings = [1,2,3,4].map(g => lgRev.filter(r=>r[3]===g).length);
  const skillRows = SK.map(sk => { const n = catCount({cat:'mastered', sk}), st = catCount({cat:'studied', sk}), h = catCount({cat:'hard', sk});
    return `<div class="skrow"><span class="ico ${sk}">${ICON[sk]}</span><div><b>${SKILLS[sk].n}</b><div class="bar"><i style="width:${(n/194*100).toFixed(1)}%;background:${SKILLS[sk].col}"></i></div>
      <div class="skl"><button class="tag t-ok" ${catAttrs({cat:'mastered', sk})}>${n} maîtrisée${n>1?'s':''} ›</button><button class="tag" ${catAttrs({cat:'studied', sk})}>${st} étudiée${st>1?'s':''} / 194 ›</button>${h?`<button class="tag t-bad" ${catAttrs({cat:'hard', sk})}>${h} difficile${h>1?'s':''} ›</button>`:''}</div></div></div>`; }).join('');
  const hardAll = catItems({cat:'hard'}); const hard = hardAll.slice(0,10);
  const weak = all.filter(x => x.cd.state===2 && x.cd.s!=null).map(x => Object.assign({r:recall(x.cd,now)}, x)).sort((a,b)=>a.r-b.r).slice(0,8);
  const lab = {due:'à réviser', hard:'difficiles', learning:'en apprentissage', review:'en consolidation', easy:'faciles', mastered:'maîtrisées', fresh:'nouvelles'};
  el.innerHTML = `
  <div class="stats-row">${catTile({cat:'due'}, 'à réviser maintenant', dueNow)}${catTile({cat:'today'}, 'd’ici ce soir', dueToday)}${catTile({cat:'mcountry'}, 'pays maîtrisés', m)}</div>
  ${dueNow ? `<button class="next" id="revnow">Réviser maintenant (${dueNow})</button>` : ''}
  <div class="h2">Catégories de cartes</div>
  <div class="cats">${HOME_CATS.map(k => catTile({cat:k}, lab[k], catCount({cat:k}), 'c-'+k)).join('')}${catTile({cat:'leech'}, 'très difficiles', catCount({cat:'leech'}), 'c-hard')}</div>
  <div class="h2">Prochains jours</div>
  <div class="panel"><div class="fc">${days.map(d=>`<button class="fcol" ${catAttrs({cat:'day', day:d.k})} aria-label="${d.n} cartes à échéance ${DAYN(d.k)}"><span class="fn">${d.n}</span><i style="height:${Math.round(d.n/mx*100)}%"></i><span class="fd">${d.k===0?'auj.':d.k===1?'dem.':new Date(d.t).toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')}</span></button>`).join('')}</div>
  <p class="small" style="margin:8px 0 0">Cartes qui arrivent à échéance chaque jour (aujourd’hui inclut les retards). Touche un jour pour voir ses cartes.</p></div>
  <div class="h2">Maîtrise par compétence</div><div class="panel">${skillRows}<p class="small" style="margin:8px 0 0">Une compétence est maîtrisée quand sa stabilité atteint ${MASTER_S} jours (le temps au bout duquel la probabilité de rappel tombe à 90 %).</p></div>
  <div class="h2">30 derniers jours</div>
  <div class="panel"><div class="kv"><span>Réponses</span><b>${lgRev.length}</b></div><div class="kv"><span>Taux de réussite</span><b>${succ==null?'—':pct(succ)}</b></div><div class="kv"><span>Rétention cible</span><b>${pct(P.retention)}</b></div>
  <div class="kv"><span>Notes</span><b class="notes">${[1,2,3,4].map(g=>`<button class="tag g${g}" ${catAttrs({cat:'grade', g})} aria-label="Cartes notées ${RATING_N[g]}">${RATING_N[g]} ${ratings[g-1]} ›</button>`).join('')}</b></div></div>
  <div class="h2">Cartes difficiles (${hardAll.length})</div>
  <div class="panel list">${hard.length ? hard.map(x => catRow(x)).join('') + (hardAll.length > hard.length ? `<button class="chip" style="margin:10px auto" ${catAttrs({cat:'hard'})}>Voir les ${hardAll.length} cartes difficiles ›</button>` : '') : '<p class="small">Aucune pour l’instant. Les cartes souvent ratées apparaîtront ici et passeront en priorité dans les révisions.</p>'}</div>
  <div class="h2">Rappel le plus fragile</div>
  <div class="panel list">${weak.length ? weak.map(x => catRow(x)).join('') : '<p class="small">Rien encore : termine quelques défis.</p>'}</div>`;
  bindOpen(el);
  el.querySelectorAll('.crow').forEach(b => b.onclick = () => go(vCard, {iso:b.dataset.iso}));
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
  if (st.nat) return vNatSession(el, st);
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
  const badge = `<button class="badge" style="background:${S0.col}" ${catAttrs({cat:'studied', sk:q.sk})} aria-label="${S0.n} : voir mes cartes de cette compétence">${ICON[q.sk]} ${S0.n}</button>${isLeech(cd0)?`<button class="badge leechb" ${catAttrs({cat:'leech'})} aria-label="Carte très difficile : voir la liste">Carte difficile ›</button>`:''}`;
  let body = '';
  if (q.flag) body += `<img class="qflag" src="${flagSrc(c)}" alt="Drapeau à identifier">`;
  if (q.kind==='loc') body += `<div class="qmap">${mapSVG(countryView(c.iso3, 4/3, 4.5, 330), {hl:c.iso3, hlColor:'#e5383f'})}</div>`;
  const ansCls = q.kind==='flagpick' ? 'answers cols2 flags' : 'answers';
  const answers = q.kind==='tap' ? '' : `<div class="${ansCls}">${q.opts.map(o => `<button class="ans" data-id="${o.id}">${o.img?`<img src="${o.img}" alt="Drapeau ${esc(o.label)}">`:esc(o.label)}</button>`).join('')}</div>`;
  const nameSub = q.sub ? `<div class="qsub name">${esc(q.sub)}</div>` : '';
  el.innerHTML = `<div class="qwrap">${progress}<div class="qcard">${badge}<div class="q">${esc(q.ask)}</div>${nameSub}${body}</div>
    ${q.kind==='tap' ? `<div class="fullmap tapmap" id="tm"></div><p class="hint" id="th">Glisse ou pince pour zoomer, puis touche le pays.</p>` : ''}
    ${answers}<div class="feedback" id="fb"></div></div>`;
  bindOpen($('.qcard',el));
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
  $('#again',el).textContent = a.kind==='quiz' ? 'Rejouer ce défi' : a.kind==='drill' ? 'Réviser encore ce pays' : a.kind==='cat' ? 'Réviser encore cette catégorie' : a.reviewOnly ? 'Continuer à réviser' : 'Continuer à apprendre';
  $('#again',el).onclick = () => {
    if (a.kind==='quiz') return startQuiz(a, true);
    if (a.kind==='drill') return startDrill(a.iso, true);
    if (a.kind==='cat') return startCat(a.cat, true);
    startSession(a.zone, a, true);
  };
  bindOpen(el); bindMini(el.querySelector('.grid'), isos);
}

/* ---------- Défis ---------- */
function vQuiz(el, args){
  const nk = domK(); if (nk) return vNatQuiz(el, args, nk);
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
    <p class="small">Une carte ratée revient quelques questions plus loin dans la même séance, puis 10 minutes plus tard. Les révisions présentent d’abord les cartes dont le rappel est le plus fragile ; les cartes souvent ratées remontent en tête, et les propositions des QCM reprennent les pays que tu as déjà confondus.</p>
    <p class="small">Les défis alimentent directement ce système : chaque pays rencontré en défi devient une carte de mémoire. Les catégories (à réviser, difficiles, en apprentissage, en consolidation, faciles, maîtrisées, nouvelles) sont touchables partout : elles ouvrent la liste précise de leurs cartes, que tu peux réviser d’un geste.</p></div>
    <div class="panel"><b>Végétaux et animaux de Munich</b><p class="small">Chaque espèce est une carte de mémoire FSRS (une seule par espèce), présentée peu à peu dans la séance du jour. Liste établie d’après les observations « qualité recherche » d’iNaturalist pour la ville et le Landkreis de Munich, complétée pour les arbres plantés (alignements, parcs). Photos : iNaturalist, licences libres CC0, CC BY ou CC BY-SA uniquement ; auteur et licence sous chaque photo et dans LICENCES.md. Noms, critères et textes : rédigés pour l’app.</p><button class="chip" id="howto2">Comment apprendre ›</button></div>
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
  const h2 = $('#howto2',el); if (h2) h2.onclick = () => go(vHowTo);
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
    <div class="setrow"><div class="lab"><div><b>Afficher le mode Apprendre</b><small>Séances guidées qui présentent de nouveaux pays dans l’ordre des numéros. Désactivé : les défis suffisent, et chaque pays rencontré en défi entre dans les révisions.</small></div><button class="switch" role="switch" aria-checked="${!!P.learn}" aria-label="Afficher le mode Apprendre" data-sw="learn"></button></div></div>
    ${P.learn ? row('Nouveaux pays par séance', 'Mode Apprendre : chaque nouveau pays apporte 3 cartes (capitale, drapeau, localisation).', `<div class="segc" role="radiogroup" aria-label="Nouveaux pays par séance">${[2,3,5,8].map(k=>`<button role="radio" aria-checked="${k===np}" class="${k===np?'on':''}" data-np="${k}">${k}</button>`).join('')}</div>`) : ''}
    ${row('Révisions max par séance', 'Les cartes en retard au-delà restent pour la séance suivante.', seg('revMax', [[15,'15'],[25,'25'],[40,'40']], 'Révisions max par séance'))}
    ${row('Questions par défi', 'Nombre proposé par défaut dans Défis et pour les défis rapides.', seg('qn', [[10,'10'],[20,'20'],[30,'30']], 'Questions par défi'))}
    <div class="setrow"><div class="lab"><div><b>Sons</b><small>Petit signal après chaque réponse. Muet si l’iPhone est en mode silencieux.</small></div><button class="switch" role="switch" aria-checked="${!!P.sound}" aria-label="Sons" data-sw="sound"></button></div></div>
  </div>
  ${NAT ? `<div class="h2">Végétaux et animaux</div>
  <div class="setgroup">
    ${row('Nouvelles espèces par jour', 'Par domaine (végétaux, animaux). Elles arrivent dans la séance du jour, les plus courantes d’abord.', seg('natNew', [[3,'3'],[5,'5'],[8,'8'],[12,'12']], 'Nouvelles espèces par jour'))}
    ${row('Révisions par jour', 'Limite quotidienne par domaine ; le reste attend le lendemain.', seg('natRevDay', [[30,'30'],[60,'60'],[100,'100'],[999,'∞']], 'Révisions par jour'))}
    <div class="setrow"><div class="lab"><div><b>Filtre saisonnier</b><small>Donne la priorité aux espèces visibles ce mois-ci autour de Munich (nouvelles espèces et défis).</small></div><button class="switch" role="switch" aria-checked="${!!P.season}" aria-label="Filtre saisonnier" data-sw="season"></button></div></div>
    <button class="setlink" id="warmall"><span class="sl">Télécharger toutes les photos pour le hors-ligne (≈ 34 Mo)</span><span class="chev">›</span></button>
    <button class="setlink" id="howto"><span class="sl">Comment apprendre</span><span class="chev">›</span></button>
  </div>` : ''}
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
  <p class="small" style="text-align:center;margin-top:18px">World – Géo · version 5.1 · ${FSRS.VERSION} · ${C.filter(c=>seen(c.iso3)).length} pays découverts</p>`;
  const redraw = () => { const y = el.scrollTop; vSettings(el); el.scrollTop = y; };
  const NUM = new Set(['qn','retention','revMax','natNew','natRevDay']);
  el.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const k = b.dataset.pk; P[k] = NUM.has(k) ? +b.dataset.pv : b.dataset.pv; savePrefs(); redraw(); });
  el.querySelectorAll('[data-np]').forEach(b => b.onclick = () => { S.settings.newPer = +b.dataset.np; save(); redraw(); });
  el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const k = b.dataset.sw; P[k] = !P[k]; savePrefs(); if (k==='sound' && P[k]) beep(true); redraw(); });
  $('#about',el).onclick = () => go(vAbout);
  $('#stats',el).onclick = () => domK() ? go(vNatStats, {k:domK()}) : go(vStats);
  const wa = $('#warmall',el); if (wa) wa.onclick = () => { toast('Téléchargement des photos…'); natWarm(true).then(n => toast(n ? n+' photos enregistrées' : 'Photos déjà disponibles hors ligne')); };
  const ht = $('#howto',el); if (ht) ht.onclick = () => go(vHowTo);
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

/* ==========================================================================
   Nature : végétaux et animaux de Munich (v5)
   Une espèce = une carte FSRS « N:<id> » (le code géo l'ignore : BY['N'] n'existe pas).
   ========================================================================== */
let NAT = null; const NBY = {};
const DOMS = {geo:{n:'Géographie', s:'Géo', ic:'◍'}, plant:{n:'Végétaux de Munich', s:'Végétaux', ic:'❦'}, animal:{n:'Animaux de Munich', s:'Animaux', ic:'❋'}};
const NQT = {mix:'Mélange', photo:'Photo → nom', name:'Nom → photo', comp:'Espèces proches', crit:'Critère → espèce'};
const NQT_D = {mix:'Tous les types, selon ta maîtrise', photo:'Reconnais l’espèce sur une photo', name:'Choisis la bonne photo', comp:'Deux espèces faciles à confondre', crit:'Retrouve l’espèce à partir d’un critère'};
const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const nkey = id => 'N:'+id;
const ncard = id => S.cards[nkey(id)];
const natOf = k => NAT ? NAT.species.filter(x => x.k===k) : [];
const curMonth = () => new Date().getMonth()+1;
const inSeason = sp => sp.months.includes(curMonth());
const isNatDom = d => d==='plant' || d==='animal';
const domK = () => isNatDom(P.dom) && NAT ? P.dom : null;
const kOfId = id => NBY[id] ? NBY[id].k : null;
const natName = k => DOMS[k].n;
function natCards(k){ const out = []; for (const sp of natOf(k)){ const cd = ncard(sp.id); if (cd) out.push({sp, id:sp.id, cd, k:nkey(sp.id)}); } return out; }
function natDue(k, now=Date.now()){ return natCards(k).filter(x => isDue(x.cd, now)).sort((a,b) => priority(a.cd,now)-priority(b.cd,now)); }
function natNewToday(k){ const t0 = startOfDay(Date.now()); return natCards(k).filter(x => (x.cd.born||0) >= t0).length; }
// révisions faites aujourd'hui (les réponses aux espèces découvertes aujourd'hui ne comptent pas)
function natRevToday(k){ const t0 = startOfDay(Date.now()); return S.log.filter(r => r[0] >= t0 && r[1]==='N' && NBY[r[2]] && NBY[r[2]].k===k && ((ncard(r[2])||{}).born||0) < t0).length; }
const natNewLeft = k => Math.max(0, (P.natNew||5) - natNewToday(k));
const natRevLeft = k => Math.max(0, (P.natRevDay||60) - natRevToday(k));
function natFresh(k){ let L = natOf(k).filter(sp => !ncard(sp.id)); if (P.season) L = L.filter(inSeason).concat(L.filter(sp => !inSeason(sp))); return L; }
const natMastered = k => natCards(k).filter(x => isMasteredCd(x.cd)).length;
const ph = (sp, i) => sp.photos[i] || sp.photos[0];
const sp0 = id => NBY[id];
const introIdx = sp => { const a = sp.photos.map((_,i) => i); return a.filter(i => !sp.photos[i].far).concat(a.filter(i => sp.photos[i].far)).slice(0, 3); };
const nearPi = x => { const a = x.photos.map((_,i) => i).filter(i => !x.photos[i].far); return a.length ? a[rndI(a.length)] : rndI(x.photos.length); };
const galIdx = sp => { const a = sp.photos.map((_,i) => i); return a.filter(i => !sp.photos[i].far).concat(a.filter(i => sp.photos[i].far)); };
const imgTag = (sp, i, cls='nph', lazy=true) => { const p = ph(sp, i); return `<img class="${cls}" src="${p.f}" ${lazy?'loading="lazy"':''} width="${p.w}" height="${p.h}" alt="${esc(sp.fr)}" data-pi="${i}">`; };
const ZICON = '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const zoomBtn = (sp, i, cls='zoom') => `<button type="button" class="${cls}" data-zoom="${sp.id}:${i}" aria-label="Agrandir la photo (ne compte pas comme réponse)">${ZICON}</button>`;
const attrTxt = p => `© ${esc(p.a)} · ${esc(p.l)}`;
const attrLink = p => `<a href="${esc(p.u)}" target="_blank" rel="noopener">${attrTxt(p)} · iNaturalist ↗</a>`;

/* Rotation des photos : jamais la même deux fois de suite, la moins récemment vue d'abord */
function natPhoto(id, avoid=[]){
  const sp = NBY[id]; const n = sp.photos.length; S.nat = S.nat || {ph:{}}; S.nat.ph = S.nat.ph || {};
  const h = S.nat.ph[id] || (S.nat.ph[id] = []); const last = h[h.length-1];
  // photos « lointaines » (sujet minuscule ou caché, marquées far) : seulement quand toutes les autres sont repassées depuis
  const far = i => !!sp.photos[i].far, near = [...Array(n).keys()].filter(i => !far(i));
  const ok = i => !far(i) || near.every(j => h.lastIndexOf(j) > h.lastIndexOf(i));
  let cand = [...Array(n).keys()].filter(i => i!==last && !avoid.includes(i) && ok(i));
  if (!cand.length) cand = [...Array(n).keys()].filter(i => i!==last && !avoid.includes(i));
  if (!cand.length) cand = [...Array(n).keys()].filter(i => i!==last);
  if (!cand.length) cand = [0];
  cand.sort((a,b) => h.lastIndexOf(a)-h.lastIndexOf(b));
  const best = cand.filter(i => h.lastIndexOf(i)===h.lastIndexOf(cand[0]));
  const i = best[Math.floor(Math.random()*best.length)];
  h.push(i); if (h.length > 12) h.splice(0, h.length-12);
  return i;
}
function markSeen(id, idx){ S.nat = S.nat || {ph:{}}; const h = S.nat.ph[id] || (S.nat.ph[id] = []); idx.forEach(i => h.push(i)); if (h.length > 12) h.splice(0, h.length-12); }
const confIds = sp => sp.conf.filter(c => c.id && NBY[c.id]).map(c => c.id);
function howBetween(a, b){ const c = a.conf.find(x => x.id===b.id) || b.conf.find(x => x.id===a.id); return c ? c.how : null; }

/* Distracteurs : d'abord les espèces déjà confondues, puis le groupe de confusion, puis le même sous-groupe.
   Pour une espèce nouvelle, les choix sont plus éloignés (1 seule espèce proche) ; ils se resserrent ensuite. */
function natDistract(sp, n, close, known=false){
  // known : hors ligne, les questions « quelle photo ? » ne proposent que des espèces déjà découvertes (photos en cache)
  const out = [], used = new Set([sp.id]); const add = x => { if (x && !used.has(x.id) && out.length < n && (!known || ncard(x.id))){ used.add(x.id); out.push(x); } };
  const cf = S.conf[nkey(sp.id)] ? Object.entries(S.conf[nkey(sp.id)]).sort((a,b) => b[1]-a[1]).map(([i]) => NBY[i]).filter(Boolean) : [];
  cf.slice(0, 2).forEach(add);
  const conf = shuffle(confIds(sp).map(i => NBY[i]));
  const pool = natOf(sp.k).filter(x => x.id!==sp.id);
  if (close){ conf.forEach(add); shuffle(pool.filter(x => x.g===sp.g && ncard(x.id))).forEach(add); shuffle(pool.filter(x => x.g===sp.g)).forEach(add); }
  else { conf.slice(0, 1).forEach(add); shuffle(pool.filter(x => x.g!==sp.g && ncard(x.id))).forEach(add); shuffle(pool.filter(x => x.g!==sp.g)).forEach(add); }
  shuffle(pool).forEach(add);
  if (known && out.length < n) natDistract(sp, n, close).forEach(x => { if (!used.has(x.id) && out.length < n){ used.add(x.id); out.push(x); } });
  return out;
}
const rndI = n => Math.floor(Math.random()*n);
function buildNQ(id, qt, opt={}){
  const sp = NBY[id]; const cd = ncard(id); const s = cd && cd.s!=null ? cd.s : 0;
  const hasConf = confIds(sp).length > 0;
  if (!qt || qt==='mix'){
    const types = ['photo'];
    if (s >= 2) types.push('photo', 'name', 'crit');
    if (s >= 5 && hasConf) types.push('comp', 'comp');
    qt = types[rndI(types.length)];
  }
  if (qt==='comp' && !hasConf) qt = 'name';
  if (qt==='comp' && navigator.onLine===false && !confIds(sp).some(i => ncard(i))) qt = 'name';
  const close = s >= 2 || !!opt.close; const nOpt = s >= 8 ? 5 : 3;
  if (qt==='photo'){
    const pi = natPhoto(id, opt.avoid || []); const ds = natDistract(sp, nOpt, close);
    return {id, qt, kind:'nphoto', ask:'Quelle est cette espèce ?', pi, opts:shuffle([sp, ...ds]).map(x => ({id:x.id, label:x.fr})), answer:id};
  }
  if (qt==='name'){
    const pi = natPhoto(id); const ds = natDistract(sp, 3, true, navigator.onLine===false);
    return {id, qt, kind:'nname', ask:'Quelle photo montre cette espèce ?', sub:sp.fr, opts:shuffle([sp, ...ds]).map(x => ({id:x.id, label:x.fr, pi: x.id===id ? pi : nearPi(x)})), answer:id};
  }
  if (qt==='comp'){
    const cids = shuffle(confIds(sp)); const o = NBY[(navigator.onLine===false && cids.find(i => ncard(i))) || cids[0]]; const pi = natPhoto(id);
    return {id, qt, kind:'ncomp', ask:'Laquelle est…', sub:sp.fr, other:o.id, opts:shuffle([{id, label:sp.fr, pi}, {id:o.id, label:o.fr, pi:nearPi(o)}]), answer:id};
  }
  const ci = rndI(sp.crit.length); const ds = natDistract(sp, 3, false);
  return {id, qt:'crit', kind:'ncrit', ask:'Quelle espèce correspond à ce critère ?', crit:sp.crit[ci], ci, opts:shuffle([sp, ...ds]).map(x => ({id:x.id, label:x.fr})), answer:id};
}
function natRecord(id, g, ms, chosen){
  const k = nkey(id); const now = Date.now();
  const old = S.cards[k] || sched().newCard(now);
  const nc = sched().review(old, g, now);
  nc.ok = (old.ok||0) + (g>1?1:0); nc.ko = (old.ko||0) + (g===1?1:0); nc.born = old.born || now;
  S.cards[k] = nc;
  if (g===1 && chosen && chosen!==id && NBY[chosen]){ const cf = S.conf[k] || (S.conf[k] = {}); cf[chosen] = (cf[chosen]||0) + 1; }
  S.log.push([now, 'N', id, g, Math.round(ms||0)]); if (S.log.length > 4000) S.log = S.log.slice(-4000);
  S.stats.answered++; if (g>1) S.stats.correct++;
  const today = dayKey(now); if (!S.stats.days.includes(today)) { S.stats.days.push(today); S.stats.days = S.stats.days.slice(-400); }
  save(); return nc;
}

/* ---------- Catégories nature (mêmes notions que la géo, par domaine) ---------- */
const NCATS = {
  due:     {n:'À réviser maintenant', d:'Espèces arrivées à échéance. La révision commence par les plus fragiles.', f:x => isDue(x.cd)},
  today:   {n:'À réviser d’ici ce soir', d:'Espèces à échéance aujourd’hui.', f:x => x.cd.due < startOfDay(Date.now(),1)},
  hard:    {n:'Difficiles', d:'Difficulté FSRS d’au moins 7/10 ou au moins 3 erreurs.', f:x => isHard(x.cd) || isLeech(x.cd)},
  leech:   {n:'Très difficiles', d:'Espèces ratées encore et encore. Va les voir en vrai : c’est souvent ce qui débloque.', f:x => isLeech(x.cd)},
  learning:{n:'En apprentissage', d:'Espèces découvertes ou ratées récemment : elles reviennent vite.', f:x => x.cd.state!==2},
  review:  {n:'En consolidation', d:`En révision, pas encore maîtrisées (stabilité sous ${MASTER_S} jours).`, f:x => x.cd.state===2 && x.cd.s < MASTER_S},
  easy:    {n:'Faciles', d:'Jamais ratées, difficulté 4/10 au plus.', f:x => isEasy(x.cd)},
  mastered:{n:'Maîtrisées', d:`Stabilité d’au moins ${MASTER_S} jours.`, f:x => isMasteredCd(x.cd)},
  studied: {n:'Espèces découvertes', d:'Toutes les espèces déjà présentées.', f:() => true},
  fresh:   {n:'Pas encore découvertes', d:'Elles arrivent peu à peu, quelques-unes par jour (réglable), les plus courantes d’abord.', virtual:true},
  season:  {n:'Visibles en ce moment', d:'Espèces qu’on peut voir ou reconnaître ce mois-ci autour de Munich (les arbres se reconnaissent toute l’année : écorce, silhouette, bourgeons).', virtual:true},
  day:     {n:'À échéance', d:'Espèces qui reviennent ce jour-là.', f:(x,a) => { const t0 = startOfDay(Date.now(), a.day), t1 = startOfDay(Date.now(), a.day+1); return x.cd.due >= (a.day===0 ? -Infinity : t0) && x.cd.due < t1; }},
  grade:   {n:'Note', d:'Espèces qui ont reçu cette note au moins une fois ces 30 derniers jours.', f:(x,a) => (a._g[x.id]||0) > 0},
};
const NHOME_CATS = ['due','hard','learning','review','mastered','fresh'];
const NLAB = {due:'à réviser', hard:'difficiles', learning:'en apprentissage', review:'en consolidation', easy:'faciles', mastered:'maîtrisées', fresh:'à découvrir', studied:'découvertes', season:'visibles ce mois-ci', leech:'très difficiles'};
function natCatTitle(a){ const base = a.cat==='day' ? 'À échéance '+DAYN(a.day) : a.cat==='grade' ? `Notées « ${RATING_N[a.gr]} »` : NCATS[a.cat].n; return base + (a.g && NAT.groups[a.g] ? ' · '+NAT.groups[a.g] : ''); }
function natCatItems(a){
  const now = Date.now(); const C0 = NCATS[a.cat]; if (!C0 || !DOMS[a.k]) return [];
  let items;
  if (a.cat==='fresh') items = natFresh(a.k).map(sp => ({sp, id:sp.id, cd:null}));
  else if (a.cat==='season') items = natOf(a.k).filter(inSeason).map(sp => ({sp, id:sp.id, cd:ncard(sp.id)||null}));
  else {
    if (a.cat==='grade'){ a._g = {}; S.log.forEach(r => { if (r[1]==='N' && r[0] > now-30*DAY && r[3]===a.gr) a._g[r[2]] = (a._g[r[2]]||0)+1; }); }
    items = natCards(a.k).filter(x => C0.f(x, a));
    if (a.cat==='day' || a.cat==='today') items.sort((x,y) => x.cd.due-y.cd.due); else items.sort((x,y) => priority(x.cd, now)-priority(y.cd, now));
  }
  if (a.g) items = items.filter(x => x.sp.g===a.g);
  return items;
}
const natCatAttrs = a => `data-ncat="${a.cat}" data-nk="${a.k}"${a.g?` data-ng="${a.g}"`:''}${a.day!=null?` data-nday="${a.day}"`:''}${a.gr?` data-ngr="${a.gr}"`:''}`;
const natCatArgs = b => { const a = {cat:b.dataset.ncat, k:b.dataset.nk}; if (b.dataset.ng) a.g = b.dataset.ng; if (b.dataset.nday!=null) a.day = +b.dataset.nday; if (b.dataset.ngr) a.gr = +b.dataset.ngr; return a; };
function natTile(a, label, n, cls=''){ return `<button class="cat ${cls}" ${natCatAttrs(a)} aria-label="${esc(label)} : ${n}, voir la liste"><b>${n}</b><span>${esc(label)}</span><i class="chev">›</i></button>`; }
const groupsOf = k => [...new Set(natOf(k).map(s => s.g))];

/* ---------- Petits éléments communs ---------- */
function domSwitch(){
  return `<div class="domsw" role="tablist" aria-label="Domaine">${Object.entries(DOMS).map(([k,d]) => `<button role="tab" aria-selected="${P.dom===k}" class="${P.dom===k?'on':''}" data-dom="${k}"><span class="di">${d.ic}</span><span>${d.s}</span></button>`).join('')}</div>`;
}
function bindDom(el){ el.querySelectorAll('[data-dom]').forEach(b => b.onclick = () => { if (P.dom===b.dataset.dom){ $('#view').scrollTo({top:0, behavior: reduceMotion() ? 'auto' : 'smooth'}); toast(DOMS[P.dom].n); return; } P.dom = b.dataset.dom; savePrefs(); updateTabs(); home('home'); }); }
function updateTabs(){
  const nat = !!domK(); const t = (tab, ic, lab) => { const b = document.querySelector(`#tabs button[data-tab="${tab}"]`); if (b){ b.querySelector('.ti').textContent = ic; b.querySelector('span:last-child').textContent = lab; } };
  t('deck', nat ? '❧' : '▦', nat ? 'Espèces' : 'Cartes'); t('map', nat ? '⚑' : '◍', nat ? 'Sortie' : 'Carte');
}
function spState(cd){ return !cd ? 'à découvrir' : cd.state!==2 ? 'en apprentissage · revient '+relTime(cd.due) : `rappel ${pct(recall(cd))} · revient ${relTime(cd.due)}`; }
function spRow(x){
  const sp = x.sp, cd = x.cd;
  const tags = cd ? [isLeech(cd) ? '<em class="t-bad">très difficile</em>' : isHard(cd) ? '<em class="t-bad">difficile</em>' : '', isMasteredCd(cd) ? '<em class="t-ok">maîtrisée</em>' : '', (cd.fails||0) ? `<em>${cd.fails} erreur${cd.fails>1?'s':''}</em>` : ''].join('') : '';
  return `<button class="lrow srow" data-sp="${sp.id}"><img loading="lazy" src="${ph(sp,0).f}" alt=""><div><b>${esc(sp.fr)}</b><span>${esc(NAT.groups[sp.g])} · ${spState(cd)}</span>${tags?`<span class="tags">${tags}</span>`:''}</div><span class="chev">›</span></button>`;
}
function spMini(sp){
  const cd = ncard(sp.id); const st = !cd ? '' : isMasteredCd(cd) ? 'on' : isLeech(cd) ? 'bad' : 'mid';
  return `<button class="spcard" data-sp="${sp.id}"><span class="spimg"><img loading="lazy" src="${ph(sp,0).f}" alt=""></span><span class="t">${esc(sp.fr)}</span><span class="s"><i class="dot ${st}"></i>${cd ? (isMasteredCd(cd)?'maîtrisée':'découverte') : 'à découvrir'}</span></button>`;
}
function monthsBar(sp){ return `<div class="months" aria-label="Mois où l’espèce est visible">${MOIS.map((m,i) => `<i class="${sp.months.includes(i+1)?'on':''} ${i+1===curMonth()?'now':''}" title="${m}">${m[0].toUpperCase()}</i>`).join('')}</div>`; }
function confList(sp, links=true){
  if (!sp.conf.length) return '';
  return `<div class="idbox"><div class="lbl">NE PAS CONFONDRE AVEC</div>${sp.conf.map(c => { const o = c.id && NBY[c.id];
    return o && links ? `<button class="conf" data-sp="${o.id}"><img loading="lazy" src="${ph(o,0).f}" alt=""><div><b>${esc(o.fr)}</b><span>${esc(c.how)}</span></div><span class="chev">›</span></button>` : `<div class="conf"><div>${o?`<b>${esc(o.fr)}</b>`:''}<span>${esc(c.how)}</span></div></div>`; }).join('')}</div>`;
}
function spHead(sp){ return `<div class="head"><div class="nm"><h1>${esc(sp.fr)}</h1><div class="cap">${esc(sp.de)} · <i>${esc(sp.sci)}</i></div></div><div class="num sp ${sp.k}">${sp.rank+1}</div></div>`; }
function critList(sp){ return `<ul class="crit">${sp.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`; }
function gallery(sp, idx){ return `<div class="gal">${idx.map(i => `<figure><button type="button" class="phbtn" data-zoom="${sp.id}:${i}" aria-label="Agrandir la photo">${imgTag(sp, i, 'nph', false)}<span class="zico">${ZICON}</span></button><figcaption>${attrLink(ph(sp,i))}</figcaption></figure>`).join('')}</div>`; }

/* ---------- Accueil nature ---------- */
function vNatHome(el, k){
  setTitle('');
  const due = natDue(k).length, nl = natNewLeft(k), fr = natFresh(k).length, rl = natRevLeft(k);
  const todo = Math.min(due, rl, P.revMax) + Math.min(nl, fr);
  const cnt = {}; NHOME_CATS.forEach(c => cnt[c] = natCatItems({cat:c, k}).length);
  const tot = natOf(k).length, seen = natCards(k).length, mm = natMastered(k);
  const groups = groupsOf(k).map(g => { const L = natOf(k).filter(s => s.g===g); const sn = L.filter(s => ncard(s.id)).length; const m = L.filter(s => { const c = ncard(s.id); return c && isMasteredCd(c); }).length;
    return `<button class="zone" ${natCatAttrs({cat: sn ? 'studied' : 'fresh', k, g})}><i class="sw g-${g}"></i><div class="zn"><b>${esc(NAT.groups[g])}</b><span>${L.length} espèces · ${sn} découvertes · ${m} maîtrisées</span><div class="bar"><i class="g-${g}" style="width:${(sn/L.length*100).toFixed(1)}%"></i></div></div><span class="chev">›</span></button>`; }).join('');
  const quick = ['mix','photo','name','comp','crit'];
  const sub = [due ? `${Math.min(due, rl, P.revMax)} à revoir` : '', Math.min(nl, fr) ? `${Math.min(nl, fr)} nouvelle${Math.min(nl,fr)>1?'s':''} espèce${Math.min(nl,fr)>1?'s':''}` : ''].filter(Boolean).join(' · ');
  el.innerHTML = `${domSwitch()}
  <div class="logo small nat ${k}"><div class="frame"><div class="w">${k==='plant'?'VÉGÉTAUX':'ANIMAUX'}</div></div><div class="g">MUNICH</div><div class="tagline">${tot} ESPÈCES · ${seen} DÉCOUVERTES</div></div>
  <div class="h2">Séance du jour</div>
  <button class="big-btn" id="nsess"><div>${todo ? 'Commencer' : 'Tout est fait pour aujourd’hui'}<small>${todo ? sub : (fr ? `Nouvelles espèces : ${P.natNew||5} par jour, reviens demain` : 'Toutes les espèces sont découvertes') + nextNatText(k)}</small></div><span class="pill">${todo}</span></button>
  ${cnt.hard ? `<button class="big-btn ghost" id="nhard"><div>Réviser les espèces difficiles<small>${cnt.hard} espèce${cnt.hard>1?'s':''} souvent confondue${cnt.hard>1?'s':''}</small></div><span class="pill red">${cnt.hard}</span></button>` : ''}
  <div class="cats">${NHOME_CATS.map(c => natTile({cat:c, k}, NLAB[c], cnt[c], 'c-'+c)).join('')}</div>
  <p class="small hintline">Nouvelles espèces : ${P.natNew||5} par jour au plus (${natNewToday(k)} aujourd’hui). Révisions : ${P.natRevDay||60} par jour au plus.${P.season ? ' Filtre saisonnier actif.' : ''}</p>
  <div class="h2">Défis</div>
  <div class="seg quick">${quick.map(t => `<button class="opt" data-nq="${t}"><b><span class="tt">${NQT[t]}</span></b><span>${seen ? 'Espèces découvertes · '+P.qn+' questions' : 'Découvre d’abord quelques espèces'}</span></button>`).join('')}
  <button class="opt more" id="nquizcfg"><b><span class="tt">Personnaliser ›</span></b><span>Groupe, type, nombre</span></button></div>
  <div class="h2">Groupes</div>${groups}
  <div class="h2">Plus</div>
  <div class="stats-row">${natTile({cat:'mastered', k}, 'maîtrisées / '+tot, mm)}${natTile({cat:'season', k}, 'visibles ce mois-ci', natOf(k).filter(inSeason).length)}<button class="cat" id="nstreak" aria-label="Statistiques"><b>${streak()}</b><span>jours de suite</span><i class="chev">›</i></button></div>
  <button class="big-btn ghost" id="nfield"><div>Défi sortie<small>Une mission à faire dehors cette semaine, et les applis pour vérifier sur le terrain</small></div><span>›</span></button>
  <button class="big-btn ghost" id="nhow"><div>Comment apprendre<small>La méthode, en 1 minute</small></div><span>›</span></button>
  <button class="big-btn ghost" id="nstats"><div>Statistiques<small>Prévisions, catégories, maîtrise par groupe</small></div><span>›</span></button>`;
  $('#nsess',el).onclick = () => todo ? startNatSession(k) : toast('Tout est à jour !');
  const nh = $('#nhard',el); if (nh) nh.onclick = () => startNatCat({cat:'hard', k});
  el.querySelectorAll('[data-nq]').forEach(b => b.onclick = () => startNatQuiz({k, type:b.dataset.nq, n:P.qn}));
  $('#nquizcfg',el).onclick = () => home('quiz');
  $('#nfield',el).onclick = () => home('map');
  $('#nhow',el).onclick = () => go(vHowTo);
  $('#nstats',el).onclick = $('#nstreak',el).onclick = () => go(vNatStats, {k});
  bindDom(el); bindOpen(el); natWarmSoon();
}
function nextNatText(k){ let t = Infinity; natCards(k).forEach(x => t = Math.min(t, x.cd.due)); return t===Infinity ? '' : ' · prochaine révision '+relTime(t); }

/* ---------- Séance du jour (introduction progressive, comme Anki) ---------- */
function natSessionSteps(k, {reviewOnly=false, ids=null}={}){
  const due = natDue(k).slice(0, Math.min(P.revMax, natRevLeft(k)));
  const fresh = ids ? ids.map(i => NBY[i]).filter(sp => sp && !ncard(sp.id)) : reviewOnly ? [] : natFresh(k).slice(0, natNewLeft(k));
  let steps = due.map(d => ({type:'nq', id:d.id}));
  // chaque nouvelle espèce : présentation, puis une question 1 à 2 étapes plus loin, puis un rappel en fin de séance
  const blocks = fresh.map(sp => ({type:'nintro', id:sp.id}));
  steps = interleave(steps, blocks);
  fresh.forEach(sp => { const at = steps.findIndex(s => s.type==='nintro' && s.id===sp.id); steps.splice(Math.min(steps.length, at+2), 0, {type:'nq', id:sp.id, qt:'photo', first:true}); });
  fresh.forEach(sp => steps.push({type:'nq', id:sp.id, qt: Math.random()<0.5 ? 'photo' : 'name', close:true}));
  // jamais deux questions de suite sur la même espèce
  for (let i=1; i<steps.length; i++) if (steps[i].id===steps[i-1].id && steps[i].type==='nq' && steps[i-1].type==='nq'){ const j = steps.findIndex((s,m) => m>i && s.id!==steps[i].id && (m+1>=steps.length || steps[m+1].id!==steps[i].id)); if (j>0){ const [x] = steps.splice(j,1); steps.splice(i,0,x); } }
  return {steps, nNew: fresh.length, nDue: due.length};
}
function startNatSession(k, opt={}, replace=false){
  const {steps, nNew} = natSessionSteps(k, opt);
  if (!steps.length){ toast('Tout est à jour !'); return; }
  go(vSession, {nat:true, k, steps, i:0, ok:0, n:0, title: nNew ? 'Séance du jour' : 'Révision', srs:true, again:{kind:'nsess', k, reviewOnly:!!opt.reviewOnly}}, {replace});
}
function startNatCat(a, replace=false){
  const items = natCatItems(a).slice(0, P.revMax);
  if (!items.length){ toast('Aucune espèce dans cette catégorie'); return; }
  if (a.cat==='fresh' || a.cat==='season' && items.some(x => !x.cd)){
    const ids = items.filter(x => !x.cd).slice(0, P.natNew||5).map(x => x.id);
    if (a.cat==='fresh') return startNatSession(a.k, {ids}, replace);
  }
  const steps = items.filter(x => x.cd).map(x => ({type:'nq', id:x.id}));
  if (!steps.length){ toast('Découvre d’abord ces espèces dans la séance du jour'); return; }
  const keep = {cat:a.cat, k:a.k}; ['g','day','gr'].forEach(z => { if (a[z]!=null) keep[z] = a[z]; });
  go(vSession, {nat:true, k:a.k, steps:noRepeat(shuffle(steps)), i:0, ok:0, n:0, title:natCatTitle(a), srs:true, again:{kind:'ncat', cat:keep}}, {replace});
}
function noRepeat(steps){ for (let i=1;i<steps.length;i++) if (steps[i].id===steps[i-1].id){ const j = steps.findIndex((s,m) => m>i && s.id!==steps[i-1].id); if (j>0){ [steps[i], steps[j]] = [steps[j], steps[i]]; } } return steps; }
function startNatQuiz({k, type='mix', g=null, n=10}, replace=false){
  let pool = natCards(k).map(x => x.sp); if (g) pool = pool.filter(s => s.g===g); if (P.season){ const ps = pool.filter(inSeason); if (ps.length >= 4) pool = ps; }
  if (!pool.length){ toast(g ? 'Aucune espèce découverte dans ce groupe' : 'Découvre d’abord quelques espèces (séance du jour)'); return; }
  const now = Date.now();
  const scored = pool.map(sp => ({sp, w: priority(ncard(sp.id), now) + Math.random()*0.6})).sort((a,b) => a.w-b.w);
  const steps = []; for (let i=0; i<n; i++) steps.push({type:'nq', id:scored[i % scored.length].sp.id, qt:type});
  go(vSession, {nat:true, k, steps:noRepeat(shuffle(steps)), i:0, ok:0, n:0, title:'Défi · '+NQT[type], srs:true, again:{kind:'nquiz', k, type, g, n}}, {replace});
}
function startSpDrill(id, replace=false){
  const sp = NBY[id]; const tps = shuffle(['photo','name', sp.crit.length ? 'crit' : 'photo']);
  go(vSession, {nat:true, k:sp.k, steps:tps.map(t => ({type:'nq', id, qt:t})), i:0, ok:0, n:0, title:'Réviser : '+sp.fr, srs:true, again:{kind:'ndrill', id}}, {replace});
}
const NBASE = {nphoto:[4,10], nname:[5,12], ncomp:[4,10], ncrit:[6,15]};
function vNatSession(el, st){
  const total = st.steps.length;
  if (st.i >= total) return vNatSummary(el, st);
  document.getElementById('app').classList.add('quizmode');
  setTitle(st.title);
  $('#topright').innerHTML = `<button class="icon-btn" style="font-size:1.1rem" id="quit" aria-label="Quitter">✕</button>`;
  $('#quit').onclick = () => { if (st.n===0 || confirm('Quitter la séance ? Tes réponses déjà données sont enregistrées.')) back(); };
  const step = st.steps[st.i];
  const progress = `<div class="qtop"><div class="prog"><i style="width:${(st.i/total*100).toFixed(1)}%"></i></div><div class="count" id="qcount">${st.i+1}/${total}</div><div class="qscore" id="qscore" aria-label="Bonnes réponses">✓ ${st.ok}</div></div>`;
  const nextStep = () => { st.i++; CLOCK = null; vSession(el, st); el.scrollTop = 0; };
  if (step.type==='nintro'){
    const sp = NBY[step.id]; if (!step.seen){ step.seen = true; markSeen(sp.id, introIdx(sp)); save(); }
    el.innerHTML = `<div class="qwrap">${progress}<div class="h2" style="margin-top:4px">Nouvelle espèce · ${esc(NAT.groups[sp.g])}</div>
      <article class="gcard spc">${spHead(sp)}${gallery(sp, introIdx(sp))}</article>
      <div class="idbox"><div class="lbl">POUR LA RECONNAÎTRE</div>${critList(sp)}</div>
      ${confList(sp, true)}
      <div class="idbox"><div class="lbl">OÙ ET QUAND À MUNICH</div>${esc(sp.where)}${monthsBar(sp)}</div>
      <button class="next" id="nx">J’ai regardé, continuer ›</button></div>`;
    bindOpen(el); $('#nx',el).onclick = nextStep; return;
  }
  const q = step.q || (step.q = buildNQ(step.id, step.qt, {close:step.close, avoid: step.first ? introIdx(sp0(step.id)) : []}));
  const sp = NBY[q.id]; const cd0 = ncard(q.id);
  const badge = `<button class="badge" style="background:var(--${sp.k==='plant'?'plant':'animal'})" ${natCatAttrs({cat: cd0 ? 'studied' : 'fresh', k:sp.k, g:sp.g})} aria-label="${esc(NAT.groups[sp.g])} : voir la liste">${esc(NAT.groups[sp.g])}</button>${isLeech(cd0)?`<button class="badge leechb" ${natCatAttrs({cat:'leech', k:sp.k})} aria-label="Espèce très difficile : voir la liste">Espèce difficile ›</button>`:''}`;
  let body = '', answers = '';
  if (q.kind==='nphoto'){ body = `<div class="qphoto"><button type="button" class="phbtn" data-zoom="${sp.id}:${q.pi}" aria-label="Agrandir la photo">${imgTag(sp, q.pi, 'nph', false)}<span class="zico">${ZICON}</span></button></div>`; answers = `<div class="answers">${q.opts.map(o => `<button class="ans" data-id="${o.id}">${esc(o.label)}</button>`).join('')}</div>`; }
  if (q.kind==='ncrit'){ body = `<div class="qcrit">« ${esc(q.crit)} »</div>`; answers = `<div class="answers">${q.opts.map(o => `<button class="ans" data-id="${o.id}">${esc(o.label)}</button>`).join('')}</div>`; }
  if (q.kind==='nname' || q.kind==='ncomp'){ answers = `<div class="answers cols2 photos ${q.kind==='ncomp'?'two':''}">${q.opts.map((o,j) => `<div class="pcell"><button class="ans pans" data-id="${o.id}" aria-label="Photo ${j+1} : choisir cette réponse">${imgTag(NBY[o.id], o.pi, 'nph', false)}<small class="cap"></small></button>${zoomBtn(NBY[o.id], o.pi)}</div>`).join('')}</div>`; }
  el.innerHTML = `<div class="qwrap">${progress}<div class="qcard">${badge}<div class="q">${esc(q.ask)}</div>${q.sub ? `<div class="qsub name">${esc(q.sub)}</div>` : ''}${body}</div>${answers}<div class="feedback" id="fb"></div></div>`;
  bindOpen($('.qcard',el));
  const showAnswered = fresh => {
    const a = step.ans;
    el.querySelectorAll('.ans').forEach(b => { const id = b.dataset.id; b.classList.remove('ok','ko','fade'); if (id===q.answer) b.classList.add('ok'); else if (id===a.chosen) b.classList.add('ko'); else b.classList.add('fade'); b.disabled = true;
      const capEl = b.querySelector('.cap'); if (capEl){ const o = q.opts.find(x => x.id===id); capEl.innerHTML = `<b>${esc(o.label)}</b>${attrTxt(ph(NBY[id], o.pi))}`; } });
    const ch = a.chosen && a.chosen!==q.answer ? NBY[a.chosen] : null;
    const mainPi = q.pi != null ? q.pi : 0;
    const chPi = ch ? ((q.opts.find(o => o.id===ch.id) || {}).pi ?? 0) : 0;
    const how = ch ? howBetween(sp, ch) : null;
    const rate = a.g ? `<div class="rate g${a.g}">Note : <b>${RATING_N[a.g]}</b> · ${dec1(a.ms/1000)} s${a.requeued ? ' · revient dans quelques questions' : a.due ? ` · revient ${relTime(a.due)}` : ''}</div>` : '';
    const fiche = (x, pi, label, cls) => `<button class="mini-fiche ${cls}" data-sp="${x.id}">${imgTag(x, pi, 'mf', false)}<div><em>${label}</em><b>${esc(x.fr)}</b><span>${esc(x.de)} · <i>${esc(x.sci)}</i></span></div><span class="chev">›</span></button>`;
    const contrast = ch ? `<div class="contrast"><div class="lbl">COMMENT LES DISTINGUER</div>${how ? `<p>${esc(how)}</p>` : `<p><b>${esc(sp.fr)}</b> : ${esc(sp.crit[0])}</p><p><b>${esc(ch.fr)}</b> : ${esc(ch.crit[0])}</p>`}</div>` : `<div class="contrast ok"><div class="lbl">À RETENIR</div><p>${esc(q.kind==='ncrit' ? sp.crit[(q.ci+1) % sp.crit.length] : sp.crit[0])}</p></div>`;
    $('#fb',el).innerHTML = `<div class="msg ${a.ok?'ok':'ko'}">${a.ok ? 'Bravo !' : 'Pas tout à fait…'}</div>${rate}
      ${fiche(sp, mainPi, a.ok ? 'Bonne réponse · voir la fiche' : 'La bonne réponse · voir la fiche', 'good')}
      ${ch ? fiche(ch, chPi, 'Ta réponse · voir la fiche', 'bad') : ''}
      ${contrast}
      <p class="attr">Photo : ${attrLink(ph(sp, mainPi))}${ch && q.kind!=='nphoto' && q.kind!=='ncrit' ? ` · ${attrLink(ph(ch, chPi))}` : ''}</p>
      <button class="next" id="nx">Continuer ›</button>`;
    $('#qscore',el).textContent = '✓ '+st.ok;
    bindOpen($('#fb',el)); $('#nx',el).onclick = nextStep;
    if (fresh) $('#fb',el).scrollIntoView({behavior: reduceMotion() ? 'auto' : 'smooth', block:'end'});
  };
  const finish = (ok, chosen) => {
    if (step.ans) return;
    const ms = CLOCK ? performance.now() - CLOCK.t0 : 0; CLOCK = null;
    st.n++; if (ok) st.ok++; beep(ok);
    const m = SPEED[P.speed] || 1; const b = NBASE[q.kind] || [4,10]; const s = ms/1000;
    let g = !ok ? 1 : s < b[0]*m ? 4 : s <= b[1]*m ? 3 : 2; if (step.retry && g===4) g = 3; if (step.first && g===4) g = 3;
    step.ans = {ok, chosen, ms, g};
    if (st.srs){ const nc = natRecord(q.id, g, ms, chosen); step.ans.due = nc.due; }
    const tries = step.tries || 0;
    if (!ok && tries < 2){ const at = Math.min(st.steps.length, st.i+3); st.steps.splice(at, 0, {type:'nq', id:q.id, qt: q.qt==='comp' ? 'photo' : q.qt, retry:true, tries:tries+1, close:true}); step.ans.requeued = true; $('#qcount',el).textContent = `${st.i+1}/${st.steps.length}`; }
    showAnswered(true);
  };
  if (step.ans) showAnswered(false);
  else { el.querySelectorAll('.ans').forEach(b => b.onclick = () => finish(b.dataset.id===q.answer, b.dataset.id)); CLOCK = {t0: performance.now(), hid: null}; }
}
function vNatSummary(el, st){
  document.getElementById('app').classList.remove('quizmode'); setTitle('Bilan');
  const p = st.n ? Math.round(st.ok/st.n*100) : 100;
  const qs = st.steps.filter(s => s.type==='nq' && s.ans);
  const errs = qs.filter(s => !s.ans.ok);
  const ids = [...new Set(st.steps.map(s => s.id))];
  const nNew = st.steps.filter(s => s.type==='nintro').length;
  const errRows = errs.map(s => { const sp = NBY[s.id]; const ch = s.ans.chosen && NBY[s.ans.chosen] && s.ans.chosen!==s.id ? NBY[s.ans.chosen] : null;
    return `<button class="lrow srow" data-sp="${sp.id}"><img src="${ph(sp,0).f}" alt=""><div><b>${esc(sp.fr)}</b><span>${NQT[s.q.qt]}${ch?` · confondue avec ${esc(ch.fr)}`:''}</span></div><span class="chev">›</span></button>`; }).join('');
  el.innerHTML = `<div class="summary"><div class="small">Séance terminée</div><div class="score">${p}%</div><div>${st.ok} bonne${st.ok>1?'s':''} réponse${st.ok>1?'s':''} sur ${st.n}${nNew ? ` · ${nNew} nouvelle${nNew>1?'s':''} espèce${nNew>1?'s':''}` : ''}</div></div>
   <button class="next" id="again">Continuer</button><button class="big-btn ghost" id="home" style="margin-top:10px">Retour à l’accueil<span>›</span></button>
   ${errs.length ? `<div class="h2">Erreurs à revoir (${errs.length})</div><div class="panel list">${errRows}</div>` : ''}
   <div class="h2">Espèces de la séance</div><div class="spgrid">${ids.map(i => spMini(NBY[i])).join('')}</div>
   <p class="small">Défi sortie : essaie de voir une de ces espèces en vrai cette semaine.</p>`;
  $('#home',el).onclick = () => home('home');
  $('#back').hidden = true; $('#topright').textContent = '';
  const a = st.again || {kind:'nsess', k:st.k};
  $('#again',el).textContent = a.kind==='nquiz' ? 'Rejouer ce défi' : a.kind==='ndrill' ? 'Réviser encore cette espèce' : a.kind==='ncat' ? 'Réviser encore cette catégorie' : 'Continuer';
  $('#again',el).onclick = () => {
    if (a.kind==='nquiz') return startNatQuiz(a, true);
    if (a.kind==='ndrill') return startSpDrill(a.id, true);
    if (a.kind==='ncat') return startNatCat(a.cat, true);
    const pl = natSessionSteps(a.k, {reviewOnly:true}); if (!pl.steps.length){ toast('Rien d’autre à revoir aujourd’hui'); return home('home'); }
    startNatSession(a.k, {reviewOnly:true}, true);
  };
  bindOpen(el);
}

/* ---------- Fiche espèce ---------- */
function natMemPanel(sp){
  const cd = ncard(sp.id);
  const det = cd && cd.s!=null ? `<small>Stabilité ${dec1(cd.s)} j · difficulté ${dec1(cd.d)}/10 · ${cd.reps||0} révision${(cd.reps||0)>1?'s':''} · ${cd.fails||0} erreur${(cd.fails||0)>1?'s':''}</small>` : '';
  const tags = cd ? [isMasteredCd(cd) ? `<button class="tag t-ok" ${natCatAttrs({cat:'mastered', k:sp.k})}>maîtrisée ›</button>` : '', isLeech(cd) ? `<button class="tag t-bad" ${natCatAttrs({cat:'leech', k:sp.k})}>très difficile ›</button>` : isHard(cd) ? `<button class="tag t-bad" ${natCatAttrs({cat:'hard', k:sp.k})}>difficile ›</button>` : '',
    cd.state!==2 ? `<button class="tag" ${natCatAttrs({cat:'learning', k:sp.k})}>en apprentissage ›</button>` : '', isEasy(cd) ? `<button class="tag" ${natCatAttrs({cat:'easy', k:sp.k})}>facile ›</button>` : ''].join('') : `<button class="tag" ${natCatAttrs({cat:'fresh', k:sp.k})}>à découvrir ›</button>`;
  const cf = S.conf[nkey(sp.id)] ? Object.entries(S.conf[nkey(sp.id)]).sort((a,b)=>b[1]-a[1]).filter(([i]) => NBY[i]) : [];
  return `<div class="idbox mem"><div class="lbl">MÉMORISATION</div><div class="memrow"><div><b>${cd ? memLine(cd) : 'Pas encore découverte'}</b>${det}<div class="tags">${tags}</div>
    ${cf.length ? `<small>Déjà confondue avec : ${cf.map(([i,n]) => `<button class="linkish" data-sp="${i}">${esc(NBY[i].fr)} (${n})</button>`).join(', ')}</small>` : ''}</div></div>
    ${cd ? `<button class="chip" id="spdrill" style="margin-top:10px">Réviser cette espèce (3 questions)</button>` : ''}</div>`;
}
function vSpecies(el, args){
  const sp = NBY[args.id]; if (!sp){ el.innerHTML = '<p class="small">Espèce inconnue.</p>'; return; }
  setTitle(sp.fr);
  const L = args.list && args.list.length ? args.list : natOf(sp.k).map(x => x.id); const i = L.indexOf(sp.id);
  el.innerHTML = `<article class="gcard spc">${spHead(sp)}${gallery(sp, galIdx(sp))}</article>
    <div class="idbox"><div class="lbl">POUR LA RECONNAÎTRE</div>${critList(sp)}</div>
    ${confList(sp, true)}
    <div class="idbox"><div class="lbl">OÙ ET QUAND À MUNICH</div>${esc(sp.where)}${monthsBar(sp)}</div>
    <div class="idbox"><div class="lbl">LE SAVAIS-TU ?</div>${esc(sp.fact)}</div>
    ${natMemPanel(sp)}
    <div class="idbox"><div class="lbl"><button class="linkish" ${natCatAttrs({cat:'studied', k:sp.k, g:sp.g})}>${esc(NAT.groups[sp.g]).toUpperCase()} ›</button> · N° ${sp.rank+1} DANS L’ORDRE D’INTRODUCTION</div>
      <a class="extlink" href="https://www.inaturalist.org/taxa/${sp.inat}" target="_blank" rel="noopener">Voir sur iNaturalist ↗</a>
      <a class="extlink" href="https://www.inaturalist.org/observations?place_id=108211&taxon_id=${sp.inat}" target="_blank" rel="noopener">Observations à Munich ↗</a></div>
    ${i >= 0 ? `<div class="cardnav"><button id="prev">‹ Précédente</button><button id="nxt">Suivante ›</button></div>` : ''}`;
  const nav = d => { const j = (i+d+L.length) % L.length; go(vSpecies, {id:L[j], list:L}, {replace:true}); };
  const pv = $('#prev',el); if (pv){ pv.onclick = () => nav(-1); $('#nxt',el).onclick = () => nav(1); }
  const dr = $('#spdrill',el); if (dr) dr.onclick = () => startSpDrill(sp.id);
  bindOpen(el);
}

/* ---------- Liste d'une catégorie nature ---------- */
function vNatList(el, args){
  if (!NCATS[args.cat] || !DOMS[args.k]){ setTitle('Liste'); el.innerHTML = '<p class="small">Catégorie inconnue.</p>'; return; }
  setTitle(natCatTitle(args));
  const items = natCatItems(args);
  const gs = groupsOf(args.k); const cnt = {}; gs.forEach(g => cnt[g] = natCatItems(Object.assign({}, args, {g})).length);
  const total = gs.reduce((t,g) => t+cnt[g], 0);
  const nRev = Math.min(items.filter(x => x.cd).length, P.revMax);
  const fresh = args.cat==='fresh';
  el.innerHTML = `<div class="panel catinfo"><b>${items.length} espèce${items.length>1?'s':''}</b><p class="small">${esc(NCATS[args.cat].d)}</p></div>
    <div class="chips">${[['', 'Tous', total], ...gs.map(g => [g, NAT.groups[g], cnt[g]])].map(([g,t,n]) => `<button class="chip ${(args.g||'')===g?'on':''}" data-fg="${g}">${esc(t)} · ${n}</button>`).join('')}</div>
    ${fresh && items.length ? `<button class="next" id="catrev">Découvrir les ${Math.min(items.length, P.natNew||5)} premières</button>` : nRev ? `<button class="next" id="catrev">Réviser ${nRev===items.length ? (nRev>1 ? 'ces '+nRev+' espèces' : 'cette espèce') : nRev+' espèce'+(nRev>1?'s':'')}</button>` : ''}
    <div class="panel list" id="clist">${items.length ? items.map(spRow).join('') : '<p class="small">Aucune espèce dans cette catégorie pour l’instant.</p>'}</div>`;
  const ids = items.map(x => x.id);
  el.querySelectorAll('.srow').forEach(b => b.onclick = e => { e.stopPropagation(); go(vSpecies, {id:b.dataset.sp, list:ids}); });
  el.querySelectorAll('[data-fg]').forEach(b => b.onclick = () => { if (b.dataset.fg) args.g = b.dataset.fg; else delete args.g; go(vNatList, args, {replace:true}); });
  const cr = $('#catrev',el); if (cr) cr.onclick = () => startNatCat(args);
}

/* ---------- Statistiques nature ---------- */
function vNatStats(el, args){
  const k = args.k; setTitle('Statistiques · '+DOMS[k].s);
  const now = Date.now(); const all = natCards(k);
  const days = [...Array(7)].map((_,d) => ({d, n: natCatItems({cat:'day', k, day:d}).length, t: startOfDay(now,d)}));
  const mx = Math.max(1, ...days.map(d => d.n));
  const lg = S.log.filter(r => r[1]==='N' && NBY[r[2]] && NBY[r[2]].k===k && r[0] > now-30*DAY);
  const succ = lg.length ? lg.filter(r => r[3]>1).length/lg.length : null;
  const ratings = [1,2,3,4].map(g => lg.filter(r => r[3]===g).length);
  const groupRows = groupsOf(k).map(g => { const L = natOf(k).filter(s => s.g===g); const m = natCatItems({cat:'mastered', k, g}).length, st = natCatItems({cat:'studied', k, g}).length, h = natCatItems({cat:'hard', k, g}).length;
    return `<div class="skrow"><i class="sw g-${g}"></i><div><b>${esc(NAT.groups[g])}</b><div class="bar"><i class="g-${g}" style="width:${(m/L.length*100).toFixed(1)}%"></i></div>
      <div class="skl"><button class="tag t-ok" ${natCatAttrs({cat:'mastered', k, g})}>${m} maîtrisée${m>1?'s':''} ›</button><button class="tag" ${natCatAttrs({cat:'studied', k, g})}>${st} découverte${st>1?'s':''} / ${L.length} ›</button>${h?`<button class="tag t-bad" ${natCatAttrs({cat:'hard', k, g})}>${h} difficile${h>1?'s':''} ›</button>`:''}</div></div></div>`; }).join('');
  const hardAll = natCatItems({cat:'hard', k});
  const conf = []; all.forEach(x => { const c = S.conf[x.k]; if (c) Object.entries(c).forEach(([o,n]) => { if (NBY[o]) conf.push({a:x.sp, b:NBY[o], n}); }); }); conf.sort((p,q) => q.n-p.n);
  el.innerHTML = `
  <div class="stats-row">${natTile({cat:'due', k}, 'à réviser maintenant', natDue(k).length)}${natTile({cat:'studied', k}, 'découvertes / '+natOf(k).length, all.length)}${natTile({cat:'mastered', k}, 'maîtrisées', natMastered(k))}</div>
  <div class="h2">Catégories</div>
  <div class="cats">${[...NHOME_CATS, 'easy', 'leech', 'season'].map(c => natTile({cat:c, k}, NLAB[c], natCatItems({cat:c, k}).length, 'c-'+(c==='leech'?'hard':c))).join('')}</div>
  <div class="h2">Prochains jours</div>
  <div class="panel"><div class="fc">${days.map(d => `<button class="fcol" ${natCatAttrs({cat:'day', k, day:d.d})} aria-label="${d.n} espèces à échéance ${DAYN(d.d)}"><span class="fn">${d.n}</span><i style="height:${Math.round(d.n/mx*100)}%"></i><span class="fd">${d.d===0?'auj.':d.d===1?'dem.':new Date(d.t).toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')}</span></button>`).join('')}</div>
  <p class="small" style="margin:8px 0 0">Espèces qui reviennent chaque jour (hors nouvelles). Touche un jour pour voir la liste.</p></div>
  <div class="h2">Maîtrise par groupe</div><div class="panel">${groupRows}</div>
  <div class="h2">30 derniers jours</div>
  <div class="panel"><div class="kv"><span>Réponses</span><b>${lg.length}</b></div><div class="kv"><span>Taux de réussite</span><b>${succ==null?'—':pct(succ)}</b></div><div class="kv"><span>Aujourd’hui</span><b>${natNewToday(k)} nouvelle${natNewToday(k)>1?'s':''} · ${natRevToday(k)} révision${natRevToday(k)>1?'s':''}</b></div>
  <div class="kv"><span>Notes</span><b class="notes">${[1,2,3,4].map(g => `<button class="tag g${g}" ${natCatAttrs({cat:'grade', k, gr:g})} aria-label="Espèces notées ${RATING_N[g]}">${RATING_N[g]} ${ratings[g-1]} ›</button>`).join('')}</b></div></div>
  <div class="h2">Confusions les plus fréquentes</div>
  <div class="panel list">${conf.length ? conf.slice(0,8).map(c => `<div class="cfrow"><button class="linkish" data-sp="${c.a.id}">${esc(c.a.fr)}</button> <span>prise pour</span> <button class="linkish" data-sp="${c.b.id}">${esc(c.b.fr)}</button> <em>×${c.n}</em></div>`).join('') : '<p class="small">Aucune pour l’instant.</p>'}</div>
  <div class="h2">Espèces difficiles (${hardAll.length})</div>
  <div class="panel list">${hardAll.length ? hardAll.slice(0,10).map(spRow).join('') + (hardAll.length > 10 ? `<button class="chip" style="margin:10px auto" ${natCatAttrs({cat:'hard', k})}>Voir les ${hardAll.length} ›</button>` : '') : '<p class="small">Aucune pour l’instant.</p>'}</div>`;
  bindOpen(el);
}

/* ---------- Onglets nature : Défis, Espèces, Sortie ---------- */
function vNatQuiz(el, args, k){
  setTitle('Défis · '+DOMS[k].s);
  let type = NQT[args.type] ? args.type : 'mix', g = args.g || '', n = args.n || P.qn;
  const draw = () => {
    Object.assign(args, {type, g, n});
    const pool = natCards(k).filter(x => !g || x.sp.g===g).length;
    el.innerHTML = `<div class="h2" style="margin-top:4px">Type de défi</div>
    <div class="seg">${Object.keys(NQT).map(t => `<button class="opt ${t===type?'on':''}" data-t="${t}"><b><span class="tt">${NQT[t]}</span></b><span>${NQT_D[t]}</span></button>`).join('')}</div>
    <div class="h2">Groupe</div><div class="chips">${[['', 'Tous'], ...groupsOf(k).map(x => [x, NAT.groups[x]])].map(([x,t]) => `<button class="chip ${x===g?'on':''}" data-g="${x}">${esc(t)}</button>`).join('')}</div>
    <div class="h2">Nombre de questions</div><div class="chips">${[10,20,30].map(x => `<button class="chip ${x===n?'on':''}" data-n="${x}">${x}</button>`).join('')}</div>
    <p class="small">${pool} espèce${pool>1?'s':''} découverte${pool>1?'s':''} dans ce choix. Les défis portent sur les espèces déjà présentées ; les plus fragiles sortent plus souvent, et les mauvaises réponses proposées sont des espèces proches.${P.season ? ' Filtre saisonnier actif.' : ''}</p>
    <button class="next" id="start">Lancer le défi</button>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { type = b.dataset.t; draw(); });
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { g = b.dataset.g; draw(); });
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { n = +b.dataset.n; draw(); });
    $('#start',el).onclick = () => startNatQuiz({k, type, g: g || null, n});
  };
  draw();
}
function vNatDeck(el, args, k){
  setTitle('Espèces · '+DOMS[k].s);
  const f0 = args.f || 'ALL';
  el.innerHTML = `<input class="search" type="search" placeholder="Nom français, allemand ou latin…" value="${esc(args.q||'')}">
    <div class="chips">${[['ALL','Tous'], ...groupsOf(k).map(g => [g, NAT.groups[g]]), ['SEASON','Ce mois-ci']].map(([g,t]) => `<button class="chip ${g===f0?'on':''}" data-f="${g}">${esc(t)}</button>`).join('')}</div>
    <div class="spgrid" id="g"></div>`;
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let f = f0;
  const draw = () => { const qq = norm($('.search',el).value.trim());
    const list = natOf(k).filter(sp => (f==='ALL' || (f==='SEASON' ? inSeason(sp) : sp.g===f)) && (!qq || norm(sp.fr).includes(qq) || norm(sp.de).includes(qq) || norm(sp.sci).includes(qq)));
    $('#g',el).innerHTML = list.map(spMini).join('') || '<p class="small">Aucun résultat.</p>';
    const ids = list.map(s => s.id); $('#g',el).querySelectorAll('[data-sp]').forEach(b => b.onclick = () => go(vSpecies, {id:b.dataset.sp, list:ids})); };
  $('.search',el).addEventListener('input', () => { args.q = $('.search',el).value; draw(); });
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { f = b.dataset.f; args.f = f; el.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x===b)); draw(); });
  draw();
}
function weekNo(){ const d = new Date(); const t0 = new Date(d.getFullYear(),0,1); return Math.floor((d - t0)/(7*DAY)); }
function vNatField(el, args, k){
  setTitle('Défi sortie');
  const m = curMonth(); const L = NAT.sorties.filter(s => s.m.includes(m)); const main = L[weekNo() % L.length];
  const others = L.filter(s => s!==main);
  const vis = natOf(k).filter(inSeason).sort((a,b) => (ncard(b.id)?1:0)-(ncard(a.id)?1:0) || a.rank-b.rank).slice(0, 12);
  el.innerHTML = `<div class="panel field"><div class="lbl">CETTE SEMAINE</div><b>${esc(main.t)}</b><p>${esc(main.d)}</p></div>
    ${others.length ? `<details class="more"><summary><span>Autres idées de sortie</span><small>${others.length}</small></summary><div class="wtext">${others.map(s => `<p><b>${esc(s.t)}</b> — ${esc(s.d)}</p>`).join('')}</div></details>` : ''}
    <div class="h2">À chercher en ce moment (${MOIS[m-1]})</div>
    <div class="spgrid">${vis.map(spMini).join('')}</div>
    <button class="chip" style="margin:10px auto;display:block" ${natCatAttrs({cat:'season', k})}>Toutes les espèces visibles ce mois-ci ›</button>
    <div class="h2">Vérifier sur le terrain</div>
    <div class="panel apps">
      <a class="extlink" href="https://www.inaturalist.org/observations?place_id=108211&subview=map" target="_blank" rel="noopener"><b>iNaturalist</b><span>Photographie, l’appli propose une espèce, la communauté valide. Voir ce qui est observé à Munich.</span></a>
      ${k==='plant' ? `<a class="extlink" href="https://floraincognita.com/" target="_blank" rel="noopener"><b>Flora Incognita</b><span>Identification des plantes, développée en Allemagne (TU Ilmenau / Max-Planck), gratuite.</span></a>` : `<a class="extlink" href="https://merlin.allaboutbirds.org/" target="_blank" rel="noopener"><b>Merlin Bird ID</b><span>Reconnaît les oiseaux à la photo et au chant (pack Europe), gratuit.</span></a>`}
      <p class="small">Méthode : regarde d’abord toi-même les critères, donne un nom, puis vérifie avec l’appli. Retrouve ensuite l’espèce ici : ce va-et-vient ancre le souvenir.</p></div>
    <button class="big-btn ghost" id="nhow"><div>Comment apprendre<small>Pourquoi ces défis marchent</small></div><span>›</span></button>`;
  bindOpen(el);
  el.querySelectorAll('.spgrid [data-sp]').forEach(b => b.onclick = () => go(vSpecies, {id:b.dataset.sp, list:vis.map(s => s.id)}));
  $('#nhow',el).onclick = () => go(vHowTo);
}
function vHowTo(el){
  setTitle('Comment apprendre');
  el.innerHTML = `<div class="panel howto">
   <p><b>1. Peu à la fois, tous les jours.</b> ${P.natNew||5} nouvelles espèces par jour au plus (réglable), les plus courantes à Munich d’abord. Chaque espèce est présentée (2–3 photos et ses critères), puis demandée tout de suite après, puis en fin de séance.</p>
   <p><b>2. Se tester plutôt que relire.</b> Chercher le nom avant de le voir (récupération active) fixe bien mieux le souvenir que regarder la fiche. Les révisions sont espacées par FSRS, comme pour la géo.</p>
   <p><b>3. Des photos variées.</b> Six photos par espèce (feuille, écorce, fleur, fruit, silhouette ; mâle, femelle, en vol…), jamais deux fois la même de suite : on apprend l’espèce, pas l’image.</p>
   <p><b>4. Mélanger les espèces proches.</b> Les mauvaises réponses proposées sont des espèces qui se ressemblent (tilleuls, érables, mésanges, canards…), d’autant plus que tu maîtrises l’espèce. Alterner des catégories proches aide à repérer ce qui les distingue.</p>
   <p><b>5. Comparer après une erreur.</b> En cas d’erreur, les deux espèces sont montrées côte à côte avec le critère qui les sépare. Les espèces confondues reviennent ensuite comme mauvaises réponses.</p>
   <p><b>6. Des critères, pas seulement une impression.</b> Chaque fiche donne 2–4 critères observables et la manière de distinguer les sosies.</p>
   <p><b>7. De saison et dehors.</b> En hiver, entraîne-toi sur les écorces, bourgeons, silhouettes et oiseaux d’eau ; le filtre saisonnier (Paramètres) donne la priorité à ce qu’on voit ce mois-ci. Le Défi sortie fait le pont avec le terrain, et iNaturalist, Flora Incognita ou Merlin servent à vérifier.</p></div>
   <div class="panel"><b>Sources</b><p class="small">Kornell & Bjork 2008 (Psychological Science) ; Wahlheim, Dunlosky & Jacoby 2011 (Memory & Cognition, familles d’oiseaux) ; Kang & Pashler 2012 (Applied Cognitive Psychology, contraste) ; Carvalho & Goldstone 2014 (Memory & Cognition, catégories proches) ; Birnbaum, Kornell, Bjork & Bjork 2013 (Memory & Cognition) ; Jacoby, Wahlheim & Coane 2010 (JEP:LMC, test et concepts naturels) ; FSRS (open-spaced-repetition). Détails dans le README.</p></div>`;
}

/* ---------- Photos hors ligne : préchargement progressif ---------- */
const PHOTO_CACHE = 'worldphotos-v1'; let warming = false;
function natWarmList(){
  const urls = [];
  ['plant','animal'].forEach(k => { natCards(k).forEach(x => x.sp.photos.forEach(p => urls.push(p.f))); natCards(k).forEach(x => confIds(x.sp).forEach(i => NBY[i] && NBY[i].photos.forEach(p => urls.push(p.f)))); natFresh(k).slice(0, (P.natNew||5)+2).forEach(sp => sp.photos.forEach(p => urls.push(p.f))); });
  return urls;
}
/* Visionneuse plein écran : photo entière, pincement pour zoomer (géré ici pour ne pas zoomer toute l'app), double toucher, bouton Fermer.
   Ouverte par la loupe ou par un toucher sur une photo qui n'est pas une réponse ; elle ne compte jamais comme une réponse. */
let ZOOM = null;
function openZoom(id, i){
  const sp = NBY[id]; if (!sp) return; i = +i || 0; const p = ph(sp, i); closeZoom();
  const box = document.createElement('div'); box.className = 'lbox'; box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label', 'Photo agrandie : '+sp.fr);
  box.innerHTML = `<div class="lb-stage"><img src="${p.f}" width="${p.w}" height="${p.h}" alt="${esc(sp.fr)}" draggable="false"></div>
    <div class="lb-bar"><p class="lb-cap">${attrTxt(p)}<br><span>Pince pour zoomer · double toucher</span></p><button type="button" class="lb-close" aria-label="Fermer la photo">✕ Fermer</button></div>`;
  document.body.appendChild(box); document.documentElement.classList.add('lb-open');
  const img = box.querySelector('img'); const z = ZOOM = {box, img, s:1, x:0, y:0, prevFocus: document.activeElement};
  const apply = () => { const r = box.querySelector('.lb-stage').getBoundingClientRect(); const mx = Math.max(0, (img.offsetWidth*z.s - r.width)/2), my = Math.max(0, (img.offsetHeight*z.s - r.height)/2);
    z.x = Math.min(mx, Math.max(-mx, z.x)); z.y = Math.min(my, Math.max(-my, z.y)); img.style.transform = `translate(${z.x}px,${z.y}px) scale(${z.s})`; };
  const stage = box.querySelector('.lb-stage'); let t0 = null, lastTap = 0;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  stage.addEventListener('touchstart', e => { const t = e.touches; if (t.length===2) t0 = {d:dist(t), s:z.s}; else if (t.length===1){ t0 = {px:t[0].clientX, py:t[0].clientY, x:z.x, y:z.y};
      const now = Date.now(); if (now - lastTap < 300){ z.s = z.s > 1.05 ? 1 : 2.5; if (z.s===1){ z.x = 0; z.y = 0; } apply(); lastTap = 0; z.dblT = now; } else lastTap = now; } }, {passive:true});
  stage.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches; if (!t0) return;
      if (t.length===2 && t0.d){ z.s = Math.min(5, Math.max(1, t0.s * dist(t) / t0.d)); apply(); }
      else if (t.length===1 && t0.px!=null && z.s > 1){ z.x = t0.x + t[0].clientX - t0.px; z.y = t0.y + t[0].clientY - t0.py; apply(); } }, {passive:false});
  stage.addEventListener('touchend', e => { if (e.touches.length===0){ t0 = null; if (z.s < 1.05){ z.s = 1; z.x = 0; z.y = 0; apply(); } } else if (e.touches.length===1) t0 = {px:e.touches[0].clientX, py:e.touches[0].clientY, x:z.x, y:z.y}; });
  ['gesturestart','gesturechange'].forEach(n => box.addEventListener(n, e => e.preventDefault()));
  stage.addEventListener('dblclick', () => { if (Date.now() - (z.dblT||0) < 700) return; z.s = z.s > 1.05 ? 1 : 2.5; if (z.s===1){ z.x = 0; z.y = 0; } apply(); });
  stage.addEventListener('wheel', e => { e.preventDefault(); z.s = Math.min(5, Math.max(1, z.s * (e.deltaY < 0 ? 1.15 : 1/1.15))); apply(); }, {passive:false});
  box.querySelector('.lb-close').onclick = e => { e.stopPropagation(); closeZoom(); };
  box.querySelector('.lb-close').focus({preventScroll:true});
}
function closeZoom(){ if (!ZOOM) return; const f = ZOOM.prevFocus; ZOOM.box.remove(); ZOOM = null; document.documentElement.classList.remove('lb-open'); if (f && f.focus && document.contains(f)) f.focus({preventScroll:true}); }
document.addEventListener('click', e => { const z = e.target.closest && e.target.closest('[data-zoom]'); if (!z) return; e.preventDefault(); e.stopPropagation(); const [id, i] = z.dataset.zoom.split(':'); openZoom(id, i); }, true);
document.addEventListener('keydown', e => { if (e.key==='Escape' && ZOOM) closeZoom(); });
addEventListener('popstate', () => closeZoom());
let warmT = null; const natWarmSoon = () => { if (!warmT) warmT = setTimeout(() => { warmT = null; natWarm(); }, 2500); }; // laisse l'app s'afficher avant de télécharger
let warmStop = false; addEventListener('pagehide', () => { warmStop = true; });
async function natWarm(all=false){
  if (warming || !NAT || !('caches' in window) || navigator.onLine===false) return 0; warming = true; let n = 0;
  try {
    const c = await caches.open(PHOTO_CACHE);
    const urls = all ? NAT.species.flatMap(s => s.photos.map(p => p.f)) : natWarmList();
    for (const u of urls){ if (warmStop) break; if (await c.match(u)) continue; try { const r = await fetch(u); if (r.ok){ await c.put(u, r); n++; } } catch(e){ break; } if (!all && n >= 80) break; }
  } catch(e){}
  warming = false; return n;
}

/* ---------- Démarrage ---------- */
async function init(){
  applyPrefs();
  $('#back').onclick = back;
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => home(b.dataset.tab));
  const [cs, geo] = await Promise.all([fetch('data/countries.json').then(r=>r.json()), fetch('data/geo.json').then(r=>r.json())]);
  C = cs.sort((a,b)=>a.n-b.n); C.forEach(c=>BY[c.iso3]=c); GEO = geo; GEO.items.forEach(i=>GEOBY[i.id]=i);
  try { WIKI = await fetch('data/wiki.json').then(r=>r.json()); } catch(e){ WIKI = null; }
  try { NAT = await fetch('data/nature.json').then(r=>r.json()); NAT.species.forEach(x => NBY[x.id] = x); } catch(e){ NAT = null; }
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
  _zoom(){ return ZOOM ? {s:ZOOM.s, src:ZOOM.img.getAttribute('src')} : null; },
  _natSession(steps, srs=false){ go(vSession, {nat:true, k:NBY[steps[0].id].k, steps, i:0, ok:0, n:0, title:'Test', srs}); },
  _cat: a => catItems(a).map(x => x.k),
  _nat: { get data(){ return NAT; }, plan: (k,o) => natSessionSteps(k,o||{}), buildNQ, cat: a => natCatItems(a).map(x => x.id), newToday: natNewToday, revToday: natRevToday, warm: natWarm, distract: (id,n,c) => natDistract(NBY[id],n,c).map(x=>x.id), photo: natPhoto }, _args(){ const t = stack[stack.length-1]; return t ? t.args : null; }, _top(){ const t = stack[stack.length-1]; return t ? t.fn.name : null; } };
init().catch(e => { $('#view').innerHTML = `<p class="loading">Erreur de chargement : ${esc(e.message)}</p>`; console.error(e); });
})();
