const CACHE_NAME = 'bruno-tasks-v6';
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
      // Notify all open tabs to reload
      self.clients.matchAll({type:'window'}).then(clients => {
        clients.forEach(c => c.postMessage({type:'SW_UPDATED'}));
      });
    })
  );
});

self.addEventListener('fetch', e => {
  // Network-first: always try fresh, cache as fallback
  e.respondWith(
    fetch(e.request).then(response => {
      // Update cache with fresh response
      if(response.ok && e.request.url.includes('index.html')) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
