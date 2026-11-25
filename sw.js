/* Service worker World – Géo v5.2 : le code et les données sont précachés ; les photos et les sons d'espèces sont mis en cache
   au fil de l'eau (caches séparés « worldphotos-v1 » et « worldsounds-v1 », conservés d'une version à l'autre).
   Les sons sont servis avec les requêtes partielles (Range → 206) qu'exige Safari pour l'audio. */
const PHOTOS = 'worldphotos-v1';
const SOUNDS = 'worldsounds-v1';
const CACHE = 'worldgeo-v5.2-d7362db1e4';
const ASSETS = ["./", "css/app.css", "data/countries.json", "data/geo.json", "data/nature.json", "data/wiki.json", "flags/ad.svg", "flags/ae.svg", "flags/af.svg", "flags/ag.svg", "flags/al.svg", "flags/am.svg", "flags/ao.svg", "flags/ar.svg", "flags/at.svg", "flags/au.svg", "flags/az.svg", "flags/ba.svg", "flags/bb.svg", "flags/bd.svg", "flags/be.svg", "flags/bf.svg", "flags/bg.svg", "flags/bh.svg", "flags/bi.svg", "flags/bj.svg", "flags/bn.svg", "flags/bo.svg", "flags/br.svg", "flags/bs.svg", "flags/bt.svg", "flags/bw.svg", "flags/by.svg", "flags/bz.svg", "flags/ca.svg", "flags/cd.svg", "flags/cf.svg", "flags/cg.svg", "flags/ch.svg", "flags/ci.svg", "flags/cl.svg", "flags/cm.svg", "flags/cn.svg", "flags/co.svg", "flags/cr.svg", "flags/cu.svg", "flags/cv.svg", "flags/cy.svg", "flags/cz.svg", "flags/de.svg", "flags/dj.svg", "flags/dk.svg", "flags/dm.svg", "flags/do.svg", "flags/dz.svg", "flags/ec.svg", "flags/ee.svg", "flags/eg.svg", "flags/er.svg", "flags/es.svg", "flags/et.svg", "flags/fi.svg", "flags/fj.svg", "flags/fm.svg", "flags/fr.svg", "flags/ga.svg", "flags/gb.svg", "flags/gd.svg", "flags/ge.svg", "flags/gh.svg", "flags/gm.svg", "flags/gn.svg", "flags/gq.svg", "flags/gr.svg", "flags/gt.svg", "flags/gw.svg", "flags/gy.svg", "flags/hn.svg", "flags/hr.svg", "flags/ht.svg", "flags/hu.svg", "flags/id.svg", "flags/ie.svg", "flags/il.svg", "flags/in.svg", "flags/iq.svg", "flags/ir.svg", "flags/is.svg", "flags/it.svg", "flags/jm.svg", "flags/jo.svg", "flags/jp.svg", "flags/ke.svg", "flags/kg.svg", "flags/kh.svg", "flags/ki.svg", "flags/km.svg", "flags/kn.svg", "flags/kp.svg", "flags/kr.svg", "flags/kw.svg", "flags/kz.svg", "flags/la.svg", "flags/lb.svg", "flags/lc.svg", "flags/li.svg", "flags/lk.svg", "flags/lr.svg", "flags/ls.svg", "flags/lt.svg", "flags/lu.svg", "flags/lv.svg", "flags/ly.svg", "flags/ma.svg", "flags/mc.svg", "flags/md.svg", "flags/me.svg", "flags/mg.svg", "flags/mh.svg", "flags/mk.svg", "flags/ml.svg", "flags/mm.svg", "flags/mn.svg", "flags/mr.svg", "flags/mt.svg", "flags/mu.svg", "flags/mv.svg", "flags/mw.svg", "flags/mx.svg", "flags/my.svg", "flags/mz.svg", "flags/na.svg", "flags/ne.svg", "flags/ng.svg", "flags/ni.svg", "flags/nl.svg", "flags/no.svg", "flags/np.svg", "flags/nr.svg", "flags/nz.svg", "flags/om.svg", "flags/pa.svg", "flags/pe.svg", "flags/pg.svg", "flags/ph.svg", "flags/pk.svg", "flags/pl.svg", "flags/pt.svg", "flags/pw.svg", "flags/py.svg", "flags/qa.svg", "flags/ro.svg", "flags/rs.svg", "flags/ru.svg", "flags/rw.svg", "flags/sa.svg", "flags/sb.svg", "flags/sc.svg", "flags/sd.svg", "flags/se.svg", "flags/sg.svg", "flags/si.svg", "flags/sk.svg", "flags/sl.svg", "flags/sm.svg", "flags/sn.svg", "flags/so.svg", "flags/sr.svg", "flags/ss.svg", "flags/st.svg", "flags/sv.svg", "flags/sy.svg", "flags/sz.svg", "flags/td.svg", "flags/tg.svg", "flags/th.svg", "flags/tj.svg", "flags/tl.svg", "flags/tm.svg", "flags/tn.svg", "flags/to.svg", "flags/tr.svg", "flags/tt.svg", "flags/tv.svg", "flags/tz.svg", "flags/ua.svg", "flags/ug.svg", "flags/us.svg", "flags/uy.svg", "flags/uz.svg", "flags/va.svg", "flags/vc.svg", "flags/ve.svg", "flags/vn.svg", "flags/vu.svg", "flags/ws.svg", "flags/ye.svg", "flags/za.svg", "flags/zm.svg", "flags/zw.svg", "fonts/montserrat-latin-400-normal.woff2", "fonts/montserrat-latin-600-normal.woff2", "fonts/montserrat-latin-800-normal.woff2", "fonts/montserrat-latin-900-normal.woff2", "fonts/montserrat-latin-ext-400-normal.woff2", "fonts/montserrat-latin-ext-600-normal.woff2", "fonts/montserrat-latin-ext-800-normal.woff2", "fonts/montserrat-latin-ext-900-normal.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "js/app.js", "js/fsrs.js", "manifest.webmanifest"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('worldgeo-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin && u.pathname.includes('/sounds/')) {
    e.respondWith((async () => {
      const c = await caches.open(SOUNDS); const key = u.origin + u.pathname;
      let r = await c.match(key);
      if (!r) {
        try { const res = await fetch(key); if (!res.ok) return res; await c.put(key, res.clone()); r = res; }
        catch (_) { return new Response('', {status: 504, statusText: 'son hors ligne'}); }
      }
      const range = e.request.headers.get('range');
      if (!range) return r;
      const buf = await r.arrayBuffer(); const size = buf.byteLength; const m = /bytes=(\d*)-(\d*)/.exec(range);
      let s = 0, en = size - 1;
      if (m && m[1]) { s = +m[1]; if (m[2]) en = Math.min(+m[2], size - 1); } else if (m && m[2]) { s = Math.max(0, size - +m[2]); }
      if (s >= size) return new Response('', {status: 416, headers: {'Content-Range': `bytes */${size}`}});
      return new Response(buf.slice(s, en + 1), {status: 206, headers: {'Content-Type': 'audio/mp4', 'Content-Range': `bytes ${s}-${en}/${size}`, 'Content-Length': String(en - s + 1), 'Accept-Ranges': 'bytes'}});
    })());
    return;
  }
  if (u.origin === location.origin && u.pathname.includes('/photos/')) {
    e.respondWith(caches.open(PHOTOS).then(c => c.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => new Response('', {status: 504, statusText: 'photo hors ligne'})))));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
