const CACHE = 'casa-v2';
const FILES = ['./', './index.html', './firebase-config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // Solo gestionamos nuestros archivos y el SDK de Firebase; la base de datos va directa.
  if (u.origin !== location.origin && u.hostname !== 'www.gstatic.com') return;
  if (u.search.includes('casa=')) { e.respondWith(caches.match('./index.html').then(h => h || fetch(req))); return; }
  // Stale-while-revalidate: rápido y offline, y se actualiza en segundo plano
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});1. 
