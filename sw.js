const CACHE_NAME = 'bruno-tasks-v11';
const ASSETS = ['./index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => {
      self.clients.matchAll({type:'window'}).then(clients => {
        clients.forEach(c => c.postMessage({type:'SW_UPDATED'}));
      });
    })
  );
});

// Listen for SKIP_WAITING from the page
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Never cache the SW itself
  if(url.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(e.request));
    return;
  }
  
  // Network-first for HTML, update cache on success
  if(e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Everything else: network-first too
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
