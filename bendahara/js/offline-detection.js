// === OFFLINE DETECTION ===
(function(){
  const banner = document.getElementById('offline-banner');
  const toast  = document.getElementById('online-toast');
  const modal  = document.getElementById('offline-modal');
  const modalDesc = document.getElementById('offm-desc-text');
  let toastTimer = null;
  let bannerTimer = null;

  function showOffline(){
    if(!banner) return;
    banner.classList.remove('hide');
    banner.classList.add('show');
    document.body.classList.add('is-offline');
    if(toast) toast.classList.remove('show');
  }

  function showOnline(){
    if(!banner) return;
    banner.classList.add('hide');
    bannerTimer = setTimeout(()=>{
      banner.classList.remove('show','hide');
      document.body.classList.remove('is-offline');
    }, 250);

    if(toast){
      toast.classList.remove('hide');
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(()=>{
        toast.classList.add('hide');
        setTimeout(()=>toast.classList.remove('show','hide'), 250);
      }, 3000);
    }
  }

  function showOfflineModal(pesan){
    if(modalDesc) modalDesc.textContent = pesan;
    if(modal) modal.classList.add('show');
  }

  if(!navigator.onLine) showOffline();
  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showOnline);

  document.addEventListener('click', function(e){
    if(!navigator.onLine){
      const loginBtn = e.target.closest('#btn-login, #btn-masuk, button[type=submit]');
      if(loginBtn){
        e.preventDefault(); e.stopPropagation();
        showOfflineModal('Tidak dapat masuk saat ini. Periksa koneksi internet Anda dan coba lagi.');
        return;
      }
      const saveBtn = e.target.closest('button.btn-p, #btn-simpan, #btn-topup, #btn-transfer, #btn-bayar');
      if(saveBtn){
        e.preventDefault(); e.stopPropagation();
        showOfflineModal('Data tidak dapat disimpan tanpa koneksi internet. Pastikan Anda terhubung ke jaringan sebelum melakukan perubahan.');
      }
    }
  }, true);
})();
