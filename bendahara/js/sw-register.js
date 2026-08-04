if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/bendahara/sw.js').then(reg => {

    // Cek update setiap 60 detik saat app terbuka
    setInterval(() => reg.update(), 60 * 1000);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          // Auto reload saat versi baru aktif
          window.location.reload();
        }
      });
    });

  }).catch(err => console.warn('SW gagal register:', err));
}
