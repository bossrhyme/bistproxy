// DeepFin Service Worker v1
const CACHE_NAME = 'deepfin-v1';
const STATIC_CACHE = 'deepfin-static-v1';
const API_CACHE = 'deepfin-api-v1';

// Cache First: statik dosyalar
const STATIC_ASSETS = [
  '/',
  '/screener',
  '/analiz/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: kritik statik dosyaları önbellekle
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      // Ana sayfa ve manifest'i önbellekle (hata toleranslı)
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          fetch(url).then(res => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {}) // Hata olsa da devam et
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: eski cache'leri temizle
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: strateji
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // API istekleri → Network First (veri güncel olsun)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(res) {
          // Başarılı API cevabını cache'le (5 dakika geçerli)
          if (res.ok) {
            const cloned = res.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(event.request, cloned);
            });
          }
          return res;
        })
        .catch(function() {
          // Network yoksa cache'den sun
          return caches.match(event.request);
        })
    );
    return;
  }

  // Harici kaynaklar (fonts, CDN) → Cache First
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(res) {
          if (res.ok) {
            const cloned = res.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, cloned));
          }
          return res;
        }).catch(() => cached || new Response('', {status: 503}));
      })
    );
    return;
  }

  // HTML sayfaları → Network First, fallback cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(res) {
          if (res.ok) {
            const cloned = res.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, cloned));
          }
          return res;
        })
        .catch(function() {
          return caches.match(event.request)
            || caches.match('/')
            || new Response('<h1>Çevrimdışı</h1><p>İnternet bağlantınızı kontrol edin.</p>', {
              headers: {'Content-Type': 'text/html; charset=utf-8'}
            });
        })
    );
    return;
  }

  // Diğer statik dosyalar → Cache First
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(res) {
        if (res.ok && event.request.method === 'GET') {
          const cloned = res.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, cloned));
        }
        return res;
      });
    })
  );
});
