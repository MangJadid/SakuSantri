// ===== PULL TO REFRESH (HP saja) =====
// Pointer Events (bukan touch-only) -- konsisten di Safari iOS & Chrome Android,
// dua-duanya wajib jalan mulus karena ini PWA yang dipasang di kedua platform.
// Ngikutin jari 1:1 selama ditarik (bukan animasi terjadwal), rubber-band biar
// berasa nahan bukan macet/infinite, snap-back pendek & selalu dari posisi
// sekarang (bukan lompat) biar bisa ditarik ulang kapan aja tanpa nunggu.
(function () {
  const THRESHOLD = 72;   // px tarikan (setelah rubber-band) buat mulai refresh
  const RB_DIM = 110;     // "dimensi" buat formula rubber-band -- makin gede makin lentur

  const ind = document.createElement('div');
  ind.id = 'ptr-indicator';
  ind.innerHTML = '<div class="ptr-spinner"></div>';
  document.body.appendChild(ind);

  let startY = 0, curDy = 0, dragging = false, refreshing = false, pointerId = null;

  function isMobile() { return window.innerWidth <= 640; }
  function ditahanUI() {
    return document.querySelector('.modal.open') ||
      document.querySelector('.acc-overlay.show') ||
      (typeof _isLoading !== 'undefined' && _isLoading);
  }
  function atTop() {
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  }
  function rubberband(dy) {
    const c = 0.55;
    return (dy * RB_DIM * c) / (RB_DIM + c * dy);
  }
  function setIndicator(dy) {
    const progress = Math.min(dy / THRESHOLD, 1);
    const ty = -30 + progress * 30;
    const scale = 0.7 + progress * 0.3;
    ind.style.transform = `translateX(-50%) translateY(${ty}px) scale(${scale})`;
    ind.style.opacity = progress;
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return; // gesture ini khusus sentuh, bukan mouse/pen
    if (!isMobile() || refreshing || ditahanUI() || !atTop()) return;
    startY = e.clientY; curDy = 0; dragging = true; pointerId = e.pointerId;
    ind.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dy = e.clientY - startY;
    if (dy <= 0 || !atTop()) { dragging = false; curDy = 0; setIndicator(0); return; }
    curDy = rubberband(dy);
    e.preventDefault(); // cuma diblok pas beneran narik dari paling atas
    setIndicator(curDy);
  }, { passive: false });

  async function endDrag() {
    if (!dragging) return;
    dragging = false;
    ind.style.transition = 'transform .35s cubic-bezier(0.23,1,0.32,1), opacity .35s cubic-bezier(0.23,1,0.32,1)';
    if (curDy >= THRESHOLD && typeof refreshFromRealtime === 'function') {
      refreshing = true;
      ind.classList.add('is-spinning');
      setIndicator(THRESHOLD);
      const mulai = Date.now();
      try { await refreshFromRealtime(); } catch (e) { }
      const sisaWaktu = Math.max(0, 450 - (Date.now() - mulai)); // biar spinner gak "kedip" sekejap
      setTimeout(() => {
        setIndicator(0);
        ind.classList.remove('is-spinning');
        refreshing = false;
      }, sisaWaktu);
    } else {
      setIndicator(0);
    }
    curDy = 0;
  }

  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
})();
