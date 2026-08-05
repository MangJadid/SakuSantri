// ===== PERSISTENT LOGIN =====
const PERSIST_KEY = 'siujang_session';

function savePersistentSession(){
  if(!SESSION) return;
  if(SESSION.role==='ortu') return; // ortu tidak disimpan
  const data = {
    role: SESSION.role,
    user: SESSION.user||null,
    savedAt: Date.now()
  };
  localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
}

function loadPersistentSession(){
  try{
    const raw = localStorage.getItem(PERSIST_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    // Expired setelah 30 hari
    if(Date.now() - data.savedAt > 30*24*60*60*1000){
      localStorage.removeItem(PERSIST_KEY);
      return null;
    }
    return data;
  } catch(e){ return null; }
}

function clearPersistentSession(){
  localStorage.removeItem(PERSIST_KEY);
}

// ===== ACTIVITY TRACKING =====
let activityInterval = null;
let isPageVisible = true;

async function updateActivity(isOnline, isFreshLogin){
  if(!SESSION || SESSION.role==='ortu' || !SESSION.user?.id) return;
  try{
    const sid = getDeviceSessionId();
    const payload = {
      session_id: sid,
      pengurus_id: String(SESSION.user.id),
      pengurus_username: SESSION.user.username||'',
      pengurus_nama: SESSION.user.nama||'',
      pengurus_role: SESSION.role,
      device_name: await getDeviceLabelAsync(),
      user_agent: navigator.userAgent||'',
      last_seen: new Date().toISOString(),
      is_online: isOnline
    };
    if(isFreshLogin){
      // Login manual baru saja berhasil (username+password diverifikasi) — aktifkan
      // ulang baris device ini (reset revoked & waktu login), bukan bikin baris baru.
      payload.revoked = false;
      payload.created_at = new Date().toISOString();
    }
    await SB.from('login_sessions').upsert(payload, {onConflict:'session_id'});
  } catch(e){}
}

// Cek force_logout/blokir dari admin (semua device) & cek logout khusus device ini
async function checkForceLogout(){
  if(!SESSION?.user?.id) return;
  try{
    if(SESSION.role!=='super'){
      const {data} = await SB.from('pengurus').select('force_logout,is_blocked').eq('id',SESSION.user.id).single();
      if(data?.force_logout || data?.is_blocked){
        toast('⚠️ Anda telah di-logout paksa oleh Admin', false);
        setTimeout(()=>doLogout(), 2000);
        return;
      }
    }
    const sid = getDeviceSessionId();
    const {data:ses} = await SB.from('login_sessions').select('revoked').eq('session_id', sid).maybeSingle();
    if(ses?.revoked){
      toast('⚠️ Sesi di perangkat ini telah di-logout oleh Admin', false);
      SB.from('login_sessions').delete().eq('session_id', sid).then(()=>{}).catch(()=>{}); // bersihkan barisnya sendiri
      setTimeout(()=>doLogout(), 2000);
    }
  }catch(e){}
}

function startActivityTracking(){
  if(!SESSION || SESSION.role==='ortu') return;
  const wasFreshLogin = _freshLoginPending;
  _freshLoginPending = false;
  updateActivity(true, wasFreshLogin).then(()=>{ checkForceLogout(); }); // tunggu reaktivasi selesai dulu baru cek
  activityInterval = setInterval(()=>{
    updateActivity(isPageVisible);
    checkForceLogout(); // lalu cek ulang tiap menit
  }, 60000); // ping tiap 1 menit

  document.addEventListener('visibilitychange',()=>{
    isPageVisible = !document.hidden;
    updateActivity(isPageVisible);
    if(isPageVisible) checkForceLogout(); // cek juga tiap kali tab/app kembali aktif
  });
}

function stopActivityTracking(){
  if(activityInterval){ clearInterval(activityInterval); activityInterval=null; }
  updateActivity(false);
}

