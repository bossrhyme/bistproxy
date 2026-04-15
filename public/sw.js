// DeepFin Service Worker v10 - Network First for CSS/JS
const CACHE = 'deepfin-v10';

// Install: hızlı geç
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// Activate: tüm eski cache'leri temizle
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Sadece GET, sadece same-origin
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // /api/ istekleri: Network First
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // CSS ve JS: Network First (her zaman taze versiyon)
  if (url.pathname.match(/\.(css|js)(\?.*)?$/)) {
    e.respondWith(
      fetch(e.request)
        .then(function(res) {
          if (res.ok) {
            var clone = res.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
          }
          return res;
        })
        .catch(function() {
          return caches.match(e.request);
        })
    );
    return;
  }

  // HTML navigasyonları: Network First
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(function(res) {
          if (res.ok) {
            var clone = res.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
          }
          return res;
        })
        .catch(function() {
          return caches.match(e.request) || caches.match('/');
        })
    );
    return;
  }

  // Diğer statik dosyalar (görseller vb.): Cache First
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return res;
      });
    })
  );
});
