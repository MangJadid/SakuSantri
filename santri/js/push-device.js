// ===== PUSH NOTIFICATION =====
const VAPID_PUBLIC_KEY = 'BFY1KcdVaEFgXe_qujetvzOPuulb7Q7DNpQasCptcH7rWK4hqh3w-u4ab9xxgOAXOSAn4nh7tKPFbKZDP-nU42U';
const PUSH_FUNCTION_URL = 'https://menfnmfwtxgcgvkbbjxh.supabase.co/functions/v1/send-push';

function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}

async function registerPushNotification(){
  try{
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;

    // Cek apakah sudah ada subscription
    const existingSub = await reg.pushManager.getSubscription();

    // Cek permission
    if(Notification.permission === 'denied'){
      // Tampilkan banner info cara reset
      tampilkanBannerNotif('blocked');
      return;
    }

    if(Notification.permission === 'default'){
      // Belum pernah izinkan — tampilkan banner
      tampilkanBannerNotif('ask');
      return;
    }

    // Sudah granted
    if(!existingSub){
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      await simpanSubscription(sub);
    } else {
      // Pastikan tersimpan di DB
      await simpanSubscription(existingSub);
    }
    hapusBannerNotif();
  } catch(e){
    console.log('Push registration failed:', e.message);
  }
}

function tampilkanBannerNotif(tipe){
  if(document.getElementById('notif-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'notif-banner';
  banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:480px;background:#fff;border:2px solid var(--green-b);border-radius:14px;padding:14px 16px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.15);display:flex;gap:12px;align-items:center';

  if(tipe === 'ask'){
    banner.innerHTML = `
      <span style="font-size:24px">🔔</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:var(--green)">Aktifkan Notifikasi</div>
        <div style="font-size:12px;color:var(--text-m);margin-top:2px">Izinkan notifikasi agar kamu bisa menerima pengingat dari admin</div>
      </div>
      <button onclick="mintaIzinNotif()" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Izinkan</button>
      <button onclick="hapusBannerNotif()" style="background:none;border:none;cursor:pointer;color:var(--text-l);font-size:18px;padding:0 4px">✕</button>
    `;
  } else {
    banner.innerHTML = `
      <span style="font-size:24px">🔕</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:var(--red)">Notifikasi Diblokir</div>
        <div style="font-size:12px;color:var(--text-m);margin-top:2px">Buka pengaturan browser → izinkan notifikasi untuk site ini</div>
      </div>
      <button onclick="hapusBannerNotif()" style="background:none;border:none;cursor:pointer;color:var(--text-l);font-size:18px;padding:0 4px">✕</button>
    `;
  }
  document.body.appendChild(banner);
}

function hapusBannerNotif(){
  document.getElementById('notif-banner')?.remove();
}

async function mintaIzinNotif(){
  hapusBannerNotif();
  const permission = await Notification.requestPermission();
  if(permission === 'granted'){
    registerPushNotification();
    toast('✅ Notifikasi berhasil diaktifkan!');
  } else {
    tampilkanBannerNotif('blocked');
  }
}

async function simpanSubscription(sub){
  const username = SESSION?.user?.username || SESSION?.user?.nama || '';
  const pengurusId = SESSION?.user?.id || null;
  await SB.from('push_subscriptions').upsert({
    pengurus_id: pengurusId,
    username: username,
    subscription: sub.toJSON(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'username' });
}

function doLogout(){
  cancelSessionTimer();
  stopActivityTracking();
  teardownRealtimeSync();
  if(SESSION && SESSION.role!=='ortu' && SESSION.user?.id){
    SB.from('login_sessions').delete().eq('session_id', getDeviceSessionId()).then(()=>{}).catch(()=>{});
  }
  clearPersistentSession();
  if(SB && SB.auth) SB.auth.signOut().catch(()=>{});
  sessionStorage.removeItem('greeting_idx');
  SESSION=null; ALL_SANTRI=[]; ALL_KOBONG=[]; ALL_ASRAMA=[]; ALL_PENGURUS=[]; ALL_TX=[];

  // Reset semua filter
  resetFPanel('dash', DASH_FILTER_IDS, ()=>{});
  resetFPanel('santri', SANTRI_FILTER_IDS, ()=>{});
  resetFPanel('riw', RIW_FILTER_IDS, ()=>{});

  document.body.classList.remove('role-super','role-pengurus','role-ortu');
  document.getElementById('pg-app').style.display='none';
  document.getElementById('pg-login').style.display='flex';
  document.getElementById('ortu-nama').value='';
  document.getElementById('ortu-pin').value='';
  document.getElementById('pg-user').value='';
  document.getElementById('pg-pass').value='';
  document.getElementById('sa-pass').value='';
  document.getElementById('login-err').style.display='none';
  switchRole('ortu');
}

// ===== LAZY LOAD FOTO =====
const lazyObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const img = entry.target;
      if(img.dataset.src){
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.remove('lazy-img');
        lazyObserver.unobserve(img);
      }
    }
  });
}, {rootMargin:'100px'});

function activateLazyLoad(){
  document.querySelectorAll('img.lazy-img').forEach(img=>lazyObserver.observe(img));
}

// Panggil activateLazyLoad setelah setiap render tabel
const _origRenderTabelSantri = renderTabelSantri;
// Patch: panggil activateLazyLoad setelah render selesai
const _patchRender = ()=>{ setTimeout(activateLazyLoad, 50); };
document.addEventListener('render-done', _patchRender);

// ===== TAMBAH PENGURUS KOBONG REFRESH =====
document.getElementById('mo-pengurus').addEventListener('click',function(e){
  if(e.target===this) return;
  const sel=document.getElementById('pg-kobong');
  if(sel.options.length<=1){
    sel.innerHTML='';
    const byAsrama={};
    ALL_KOBONG.forEach(k=>{
      const aId=k.asrama_id||'__none__';
      const aNama=k.asrama?.nama||ALL_ASRAMA.find(a=>a.id===k.asrama_id)?.nama||'Tanpa Asrama';
      if(!byAsrama[aId]) byAsrama[aId]={nama:aNama,list:[]};
      byAsrama[aId].list.push(k);
    });
    Object.values(byAsrama).forEach(group=>{
      sel.innerHTML+=`<optgroup label="🏛️ ${group.nama}">`;
      group.list.forEach(k=>{ sel.innerHTML+=`<option value="${k.id}">${k.nama}</option>`; });
      sel.innerHTML+=`</optgroup>`;
    });
  }
});
// ===== DETEKSI DEVICE (nama model, bukan cuma "HP"/"PC") =====
const DEVICE_SID_KEY = 'siujang_device_sid';
let _freshLoginPending = false; // true sesaat setelah login manual berhasil (username+password baru diverifikasi)

function clearDeviceSessionId(){
  try{ localStorage.removeItem(DEVICE_SID_KEY); }catch(e){}
}

function getDeviceSessionId(){
  let sid = null;
  try{ sid = localStorage.getItem(DEVICE_SID_KEY); }catch(e){}
  if(!sid){
    sid = (window.crypto?.randomUUID) ? crypto.randomUUID() : ('sid-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    try{ localStorage.setItem(DEVICE_SID_KEY, sid); }catch(e){}
  }
  return sid;
}

function parseDeviceName(ua){
  ua = ua || navigator.userAgent || '';
  // Android: model biasanya ada di antara "Android X;" dan "Build/" atau ")"
  let m = ua.match(/Android[^;]*;\s*([^)]+?)\s*Build\//i) || ua.match(/Android[^;]*;\s*wv;\s*([^)]+)\)/i) || ua.match(/Android[^;]*;\s*([^)]+)\)/i);
  if(m && m[1]){
    let model = m[1].replace(/\bwv\b/gi,'').trim();
    if(model && model.length>1 && !/^K$/i.test(model)) return '📱 '+model;
  }
  if(/iPhone/i.test(ua)) return '📱 iPhone';
  if(/iPad/i.test(ua)) return '📱 iPad';
  if(/Macintosh/i.test(ua)) return '💻 Mac';
  if(/Windows/i.test(ua)) return '💻 Windows PC';
  if(/Android/i.test(ua)) return '📱 Android';
  if(/Linux/i.test(ua)) return '💻 Linux PC';
  return '🖥️ Perangkat Lain';
}

function parseBrowserName(ua){
  ua = ua || navigator.userAgent || '';
  if(/Edg\//.test(ua)) return 'Edge';
  if(/OPR\//.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if(/Chrome\//.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if(/Firefox\//.test(ua)) return 'Firefox';
  if(/Safari\//.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return '';
}

function getDeviceLabel(){
  const ua = navigator.userAgent || '';
  const dev = parseDeviceName(ua);
  const br = parseBrowserName(ua);
  return br ? `${dev} · ${br}` : dev;
}

// Chrome/Edge (Android) sejak versi 110 menyembunyikan model HP asli dari navigator.userAgent
// (selalu jadi "Android 10; K") demi privasi. Model asli cuma bisa didapat lewat
// User-Agent Client Hints API (getHighEntropyValues), yang sifatnya async & cuma ada di Chromium.
let _cachedDeviceLabel = null;
// Tabel terjemahan kode model teknis -> nama familiar (Xiaomi/Redmi/POCO, Samsung, dll
// sering kirim kode internal pabrik, bukan nama jual). TIDAK LENGKAP — cuma yang paling
// umum/terverifikasi. Kalau ketemu kode baru yang belum ada di sini, tetap tampil kode
// aslinya (aman, tidak pernah salah label), tinggal tambahkan ke tabel ini kalau mau.
// Cara nambah: cari "kode model" itu di Google (mis. "22111317PG xiaomi"), lalu tambah baris baru.
const DEVICE_MODEL_MAP = [
  // [regex kode model, nama familiar]
  [/^22111317P[GI]$/i, 'POCO X5 5G'],
  [/^22111317[IG]$/i, 'Redmi Note 12 5G'],
  [/^CPH2727$/i, 'Oppo A5'],
  [/^RMX3630$/i, 'Realme 10'],
];

function translateModelCode(code){
  if(!code) return null;
  for(const [re, nama] of DEVICE_MODEL_MAP){
    if(re.test(code.trim())) return nama;
  }
  return null;
}

async function getDeviceLabelAsync(){
  if(_cachedDeviceLabel) return _cachedDeviceLabel;
  const br = parseBrowserName(navigator.userAgent||'');
  try{
    if(navigator.userAgentData?.getHighEntropyValues){
      const uaCh = await navigator.userAgentData.getHighEntropyValues(['model']);
      if(uaCh?.model){
        const nama = translateModelCode(uaCh.model);
        // Kalau ketemu di tabel terjemahan: tampilkan nama familiar + kode asli di kurung
        // Kalau tidak: tampilkan kode aslinya apa adanya (tidak pernah salah label)
        const label = nama ? `${nama} (${uaCh.model})` : uaCh.model;
        _cachedDeviceLabel = br ? `📱 ${label} · ${br}` : `📱 ${label}`;
        return _cachedDeviceLabel;
      }
    }
  }catch(e){}
  // Fallback: browser lama / Safari / Firefox yang tidak dukung Client Hints
  _cachedDeviceLabel = getDeviceLabel();
  return _cachedDeviceLabel;
}

