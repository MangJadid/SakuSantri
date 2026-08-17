// ===== DETEKSI DEVICE (nama model, bukan cuma "HP"/"PC") =====
// Diporting 1:1 dari santri/js/push-device.js -- fungsi-fungsi ini generik,
// gak spesifik ke satu app, cuma key localStorage-nya dibedain (bendahara_device_sid,
// bukan siujang_device_sid) biar sesi Bendahara & Saku Santri gak numpuk jadi satu
// kalau kebetulan dibuka di browser yang sama.
const DEVICE_SID_KEY_BD = 'bendahara_device_sid';

function getDeviceSessionIdBD(){
  let sid = null;
  try{ sid = localStorage.getItem(DEVICE_SID_KEY_BD); }catch(e){}
  if(!sid){
    sid = (window.crypto?.randomUUID) ? crypto.randomUUID() : ('sid-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    try{ localStorage.setItem(DEVICE_SID_KEY_BD, sid); }catch(e){}
  }
  return sid;
}

function parseDeviceNameBD(ua){
  ua = ua || navigator.userAgent || '';
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

function parseBrowserNameBD(ua){
  ua = ua || navigator.userAgent || '';
  if(/Edg\//.test(ua)) return 'Edge';
  if(/OPR\//.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if(/Chrome\//.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if(/Firefox\//.test(ua)) return 'Firefox';
  if(/Safari\//.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return '';
}

function getDeviceLabelBD(){
  const ua = navigator.userAgent || '';
  const dev = parseDeviceNameBD(ua);
  const br = parseBrowserNameBD(ua);
  return br ? `${dev} · ${br}` : dev;
}

// Chrome/Edge (Android) sejak versi 110 nyembunyiin model HP asli dari navigator.userAgent
// demi privasi -- model asli cuma bisa didapat lewat User-Agent Client Hints API (async,
// cuma ada di Chromium). Tabel terjemahan kode model -> nama familiar, gak lengkap tapi aman:
// kode yang gak ada di tabel tetep tampil apa adanya, gak pernah salah label.
let _cachedDeviceLabelBD = null;
const DEVICE_MODEL_MAP_BD = [
  [/^22111317P[GI]$/i, 'POCO X5 5G'],
  [/^22111317[IG]$/i, 'Redmi Note 12 5G'],
  [/^CPH2727$/i, 'Oppo A5'],
  [/^RMX3630$/i, 'Realme 10'],
];

function translateModelCodeBD(code){
  if(!code) return null;
  for(const [re, nama] of DEVICE_MODEL_MAP_BD){
    if(re.test(code.trim())) return nama;
  }
  return null;
}

async function getDeviceLabelAsyncBD(){
  if(_cachedDeviceLabelBD) return _cachedDeviceLabelBD;
  const br = parseBrowserNameBD(navigator.userAgent||'');
  try{
    if(navigator.userAgentData?.getHighEntropyValues){
      const uaCh = await navigator.userAgentData.getHighEntropyValues(['model']);
      if(uaCh?.model){
        const nama = translateModelCodeBD(uaCh.model);
        const label = nama ? `${nama} (${uaCh.model})` : uaCh.model;
        _cachedDeviceLabelBD = br ? `📱 ${label} · ${br}` : `📱 ${label}`;
        return _cachedDeviceLabelBD;
      }
    }
  }catch(e){}
  _cachedDeviceLabelBD = getDeviceLabelBD();
  return _cachedDeviceLabelBD;
}

// ===== ACTIVITY TRACKING (per-device, bukan per-akun) =====
// Diporting dari santri/js/session-tracking.js, disesuaikan ke bentuk SESSION
// yang flat (SESSION.id/username/nama/role, bukan SESSION.user.id) dan ke tabel
// bendahara_login_sessions (baru, terpisah dari login_sessions milik Saku Santri).
let activityIntervalBD = null;
let isPageVisibleBD = true;

async function updateActivityBD(isOnline, isFreshLogin){
  if(!SESSION) return;
  try{
    const sid = getDeviceSessionIdBD();
    const payload = {
      session_id: sid,
      bendahara_id: SESSION.id ?? null,
      bendahara_username: SESSION.username||'',
      bendahara_nama: SESSION.nama||'',
      bendahara_role: SESSION.role||'',
      device_name: await getDeviceLabelAsyncBD(),
      user_agent: navigator.userAgent||'',
      last_seen: new Date().toISOString(),
      is_online: isOnline
    };
    if(isFreshLogin){
      payload.revoked = false;
      payload.created_at = new Date().toISOString();
    }
    await SB.from('bendahara_login_sessions').upsert(payload, {onConflict:'session_id'});
  } catch(e){}
}

// Cek force_logout/blokir dari admin (seluruh akun) & cek logout khusus device ini
async function checkForceLogoutBD(){
  if(!SESSION) return;
  try{
    if(SESSION.id){
      const {data} = await SB.from('bendahara_users').select('force_logout,is_blocked').eq('id',SESSION.id).single();
      if(data?.force_logout || data?.is_blocked){
        toast('⚠️ Anda telah di-logout paksa oleh Admin', false);
        setTimeout(()=>doLogout(), 2000);
        return;
      }
    }
    const sid = getDeviceSessionIdBD();
    const {data:ses} = await SB.from('bendahara_login_sessions').select('revoked').eq('session_id', sid).maybeSingle();
    if(ses?.revoked){
      toast('⚠️ Sesi di perangkat ini telah di-logout oleh Admin', false);
      SB.from('bendahara_login_sessions').delete().eq('session_id', sid).then(()=>{}).catch(()=>{});
      setTimeout(()=>doLogout(), 2000);
    }
  }catch(e){}
}

function startActivityTrackingBD(isFreshLogin){
  if(!SESSION) return;
  updateActivityBD(true, isFreshLogin).then(()=>{ checkForceLogoutBD(); });
  if(activityIntervalBD) clearInterval(activityIntervalBD);
  activityIntervalBD = setInterval(()=>{
    updateActivityBD(isPageVisibleBD);
    checkForceLogoutBD();
  }, 60000); // ping tiap 1 menit

  document.addEventListener('visibilitychange',()=>{
    isPageVisibleBD = !document.hidden;
    updateActivityBD(isPageVisibleBD);
    if(isPageVisibleBD) checkForceLogoutBD();
  });
}

function stopActivityTrackingBD(){
  if(activityIntervalBD){ clearInterval(activityIntervalBD); activityIntervalBD=null; }
  updateActivityBD(false);
}
