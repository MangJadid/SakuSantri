const CACHE_NAME = 'bendahara-v2';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Sengaja tanpa fetch handler -- lihat catatan di santri/sw.js.

// Handle push notification
self.addEventListener('push', function(event) {
  let data = { title: 'Bendahara An-Nur', body: 'Ada notifikasi baru!' };
  try {
    data = event.data.json();
  } catch(e) {
    data.body = event.data ? event.data.text() : 'Ada notifikasi baru!';
  }

  const options = {
    body: data.body || data.message || '',
    icon: '/bendahara/icon-192.png',
    badge: '/bendahara/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/bendahara/' },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Bendahara An-Nur', options)
  );
});

// Handle notifikasi diklik
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/bendahara/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('/bendahara/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
