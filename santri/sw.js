const CACHE_NAME = 'saku-santri-v2';
const ASSETS = [
  '/santri/',
  '/santri/index.html',
  '/santri/manifest.json',
  '/santri/icon-192.png',
  '/santri/icon-512.png'
];

// Install: cache semua aset utama
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  clients.claim();
});

// Fetch: cache-first, fallback ke network
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      }).catch(function() {
        return caches.match('/santri/');
      });
    })
  );
});
