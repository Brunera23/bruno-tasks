const CACHE_NAME = 'bruno-tasks-v64';
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

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  let data = {title: 'Bruno Tasks', body: 'Nova notificação'};
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
