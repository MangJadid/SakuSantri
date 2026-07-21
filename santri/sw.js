const CACHE_NAME = 'saku-santri-v1';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});

// Handle push notification
self.addEventListener('push', function(event) {
  let data = { title: 'Saku Santri', body: 'Ada notifikasi baru!' };
  try {
    data = event.data.json();
  } catch(e) {
    data.body = event.data ? event.data.text() : 'Ada notifikasi baru!';
  }

  const options = {
    body: data.body || data.message || '',
    icon: '/santri/icon-192.png',
    badge: '/santri/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/santri/' },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Saku Santri', options)
  );
});

// Handle notifikasi diklik
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/santri/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('/santri/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
