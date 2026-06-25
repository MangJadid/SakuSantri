const CACHE_NAME = 'bendahara-' + '{{BUILD_TIME}}';
const ASSETS = [
  '/bendahara/',
  '/bendahara/index.html',
  '/bendahara/manifest.json',
  '/bendahara/icon-192.png',
  '/bendahara/icon-512.png'
];

// Install: cache semua aset utama
self.addEventListener('install', function(event) {
  self.skipWaiting(); // langsung aktif tanpa tunggu tab lama ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate: hapus cache lama + ambil alih semua tab
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first untuk HTML, cache-first untuk aset lain
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTML = event.request.headers.get('accept')?.includes('text/html')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first untuk HTML: selalu ambil versi terbaru
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request) || caches.match('/bendahara/');
        })
    );
  } else {
    // Cache-first untuk aset (CSS, JS, gambar, dll)
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        }).catch(function() {
          return caches.match('/bendahara/');
        });
      })
    );
  }
});
