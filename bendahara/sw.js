const CACHE_NAME = 'bendahara-v2';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Sengaja tanpa fetch handler -- lihat catatan di santri/sw.js.
