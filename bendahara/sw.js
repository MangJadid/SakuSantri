// CACHE_NAME angka di belakang akan otomatis diupdate oleh deploy.yml setiap push
const CACHE_NAME = 'bendahara-1782525859';
const ASSETS = [
  '/bendahara/',
  '/bendahara/index.html',
  '/bendahara/manifest.json',
  '/bendahara/icon-192.png',
  '/bendahara/icon-512.png'
];

// Install: cache semua aset utama
self.addEventListener('install', function(event) {
  self.skipWaiting();
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

// Fetch
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase API → selalu dari network, jangan cache
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isHTML = event.request.headers.get('accept')?.includes('text/html')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first untuk HTML
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
    // Cache-first untuk aset (CSS, JS, gambar, font, dll)
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
