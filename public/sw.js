// DeepFin Service Worker v8 - Arctic light theme
const CACHE = 'deepfin-v8';

// Install: hızlı geç
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// Activate: eski cache'leri temizle
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: sadece same-origin GET isteklerini cache'le
// Harici URL'leri (fonts, CDN) direkt network'e bırak - CSP ile çakışmayı önle
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Sadece GET, sadece same-origin
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return; // pass-through, SW müdahil olmuyor
  }

  // /api/ istekleri: Network First (veri güncel kalsın)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
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

  // Diğer same-origin statik dosyalar: Cache First
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
