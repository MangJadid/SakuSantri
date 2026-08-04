  let deferredPrompt = null;
  const banner = document.getElementById('pwa-banner');
  const btn = document.getElementById('pwa-btn');
  const desc = document.getElementById('pwa-desc');
  const closeBtn = document.getElementById('pwa-close');

  const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  // Banner hanya muncul kalau PWA belum terinstall
  if (!isInstalled) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      desc.textContent = 'Instal untuk pengalaman lebih baik';
      btn.textContent = '⬇ Install App';
      btn.className = 'pwa-btn install';
      setTimeout(() => banner.classList.add('show'), 1500);
    });

    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') banner.classList.remove('show');
        deferredPrompt = null;
      }
    });
  }

  closeBtn.addEventListener('click', () => banner.classList.remove('show'));
  window.addEventListener('appinstalled', () => banner.classList.remove('show'));
