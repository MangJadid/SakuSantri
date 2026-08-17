// Deteksi versi baru otomatis: index.html sering ke-cache browser HP dan
// tidak ikut ke-refresh walau file JS/CSS lain sudah di-bump ?v=. Script ini
// cek index.html langsung dari server (bypass cache) tiap 60 detik + tiap
// tab dibuka lagi, lalu tawarkan reload kalau versinya beda.
(function(){
  const CURRENT_BUILD = document.querySelector('meta[name="app-build"]')?.content || '';
  let bannerShown = false;

  async function checkForAppUpdate(){
    if(bannerShown || !CURRENT_BUILD) return;
    try{
      const res = await fetch('./index.html', { cache: 'no-store' });
      if(!res.ok) return;
      const html = await res.text();
      const m = html.match(/<meta name="app-build" content="([^"]+)">/);
      const latest = m ? m[1] : '';
      if(latest && latest !== CURRENT_BUILD) showUpdateBanner();
    } catch(e){ /* offline / gagal fetch, abaikan */ }
  }

  function showUpdateBanner(){
    bannerShown = true;
    const bar = document.createElement('div');
    bar.id = 'app-update-banner';
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:14px;z-index:99999;'
      + 'background:#0f5c52;color:#fff;border-radius:14px;padding:12px 14px 12px 16px;'
      + 'display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);'
      + 'font-size:13.5px;font-family:"Plus Jakarta Sans",sans-serif;max-width:420px;margin:0 auto';
    bar.innerHTML = '<span style="flex:1">🔄 Ada pembaruan aplikasi.</span>'
      + '<button id="app-update-reload-btn" style="background:#fff;color:#0f5c52;border:none;'
      + 'border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer">Muat Ulang</button>';
    document.body.appendChild(bar);
    document.getElementById('app-update-reload-btn').addEventListener('click', function(){
      window.location.href = window.location.pathname + '?_r=' + Date.now();
    });
  }

  setInterval(checkForAppUpdate, 60 * 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) checkForAppUpdate(); });
  window.addEventListener('focus', checkForAppUpdate);
})();
