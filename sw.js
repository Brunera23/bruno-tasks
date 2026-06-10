const CACHE_NAME = 'bruno-tasks-v110';
const ASSETS = ['./index.html', './manifest.json', './apple-touch-icon.png', './manifest-icon.png'];

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

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  let data = {title: 'Bruno Tasks', body: 'Nova atualização'};
  if(e.data) {
    try {
      const payload = e.data.json();
      if(payload.notification) {
        data = payload.notification;
      } else {
        data = payload;
      }
    } catch(err) {
      data.body = e.data.text();
    }
  }
  const options = {
    body: data.body || '',
    icon: data.icon || './manifest-icon.png',
    badge: data.badge || './manifest-icon.png',
    vibrate: [100, 50, 100],
    data: {url: data.click_action || './index.html'},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true
  };
  e.waitUntil(self.registration.showNotification(data.title || 'Bruno Tasks', options));
});

// Open app when notification is clicked
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './index.html';
  e.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(clients => {
      // Focus existing tab if open
      for(const c of clients) {
        if(c.url.includes('index.html') && 'focus' in c) return c.focus();
      }
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  // POST/streaming (Firestore, auth) vao direto para a rede
  if(e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never cache the SW itself
  if(url.pathname.includes('sw.js')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // So intercepta o proprio site e os SDKs do Firebase na CDN;
  // APIs (firestore/auth/fcm) falam direto com a rede, sem cache
  const cacheable = url.origin === self.location.origin || url.hostname === 'www.gstatic.com';
  if(!cacheable) return;

  // Network-first, atualiza cache no sucesso (opaque = scripts no-cors da CDN)
  e.respondWith(
    fetch(e.request).then(response => {
      if(response.ok || response.type === 'opaque') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
