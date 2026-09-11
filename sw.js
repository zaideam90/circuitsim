const CACHE='circuitsim-v2';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./css/style.css','./js/core.js','./js/i18n.js','./js/catalog.js','./js/state.js','./js/engine.js','./js/render.js','./js/editor.js','./js/ui.js','./js/examples.js'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if (url.origin===location.origin) e.respondWith(fetch(e.request).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return r; }).catch(()=>caches.match(e.request)));
  else e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return r; }).catch(()=>m)));
});
