(function(){
  const banner=document.getElementById('offline-banner');
  const toast=document.getElementById('online-toast');
  const modal=document.getElementById('offline-modal');
  const modalDesc=document.getElementById('offm-desc-text');
  let toastTimer=null;

  function updateHeaderStatus(isOnline){
    const ind = document.getElementById('cloud-ind');
    if(!ind) return;
    if(isOnline){
      ind.innerHTML = '<span class="cloud-dot ok"></span>Online';
    } else {
      ind.innerHTML = '<span class="cloud-dot err"></span>Offline';
    }
  }

  function showOffline(){
    if(!banner)return;
    banner.classList.remove('hide');
    banner.classList.add('show');
    document.body.classList.add('is-offline');
    if(toast)toast.classList.remove('show');
    updateHeaderStatus(false);
  }
  function showOnline(){
    if(!banner)return;
    banner.classList.add('hide');
    setTimeout(()=>{banner.classList.remove('show','hide');document.body.classList.remove('is-offline');},250);
    if(toast){
      toast.classList.remove('hide');
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer=setTimeout(()=>{toast.classList.add('hide');setTimeout(()=>toast.classList.remove('show','hide'),250);},3000);
    }
    updateHeaderStatus(true);
  }
  function showOfflineModal(pesan){
    if(modalDesc)modalDesc.textContent=pesan;
    if(modal)modal.classList.add('show');
  }

  if(!navigator.onLine)showOffline();
  window.addEventListener('offline',showOffline);
  window.addEventListener('online',showOnline);

  document.addEventListener('click',function(e){
    if(!navigator.onLine){
      const loginBtn=e.target.closest('#btn-login,#btn-masuk,button[type=submit]');
      if(loginBtn){
        e.preventDefault();e.stopPropagation();
        showOfflineModal('Tidak dapat masuk saat ini. Periksa koneksi internet Anda dan coba lagi.');
        return;
      }
      const saveBtn=e.target.closest('button.btn-p,#btn-simpan,#btn-topup,#btn-transfer,#btn-bayar,#btn-kirim');
      if(saveBtn){
        e.preventDefault();e.stopPropagation();
        showOfflineModal('Data tidak dapat disimpan tanpa koneksi internet. Pastikan Anda terhubung ke jaringan terlebih dahulu.');
      }
    }
  },true);
})();

// ===== PENGAWAS: read-only guard — blokir semua tombol aksi (simpan/hapus/tambah/edit/transfer/dll), hanya lihat =====
(function(){
  const AKSI_AMAN = new Set([
    // navigasi & login
    'switchRole','loginOrtu','loginPengurus','loginSuper','doLogout','showTab',
    // filter & tampilan (tidak mengubah data)
    'toggleFPanel','resetFPanel','dhToggle','switchDetailTab','toggleAsramaBlock',
    // modal umum
    'closeMo','openDetailModal','lihatSantriKobong','openRekeningModal','openProfilPengurus',
    // hanya lihat/unduh (read-only)
    'exportLengkap','downloadTemplateExcel','backupSemuaData','cekKoneksi','renderMonitor','mintaIzinNotif',
    // isi form lokal (belum tersimpan, tombol simpannya sendiri tetap diblokir)
    'isiSemuaNominal','terapNominalSama','bulkBatalPilih','prsShowSub',
    // navigasi/seleksi di wizard Naik Kelas (belum menerapkan perubahan)
    'nkSetMode','nkKelasPilihSemua','nkKelasBatalSemua','nkKelasPilihGroup',
    'nkPilihSemua','nkBatalSemua','nkPilihSatuKobong',
    'nkWaliPilihSemua','nkWaliBatalSemua','nkWaliPilihGroup',
  ]);
  document.addEventListener('click', function(e){
    if(!SESSION || SESSION.role!=='pengawas') return;
    const el = e.target.closest('[onclick]');
    if(!el) return;
    const m = (el.getAttribute('onclick')||'').match(/^\s*([a-zA-Z_$][\w$]*)\s*\(/);
    const fn = m ? m[1] : null;
    if(fn && !AKSI_AMAN.has(fn)){
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
