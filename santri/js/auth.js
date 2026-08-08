// ===== LOGIN =====
async function loginOrtu(){
  const nama = document.getElementById('ortu-nama').value.trim();
  const pin = document.getElementById('ortu-pin').value.trim();
  if(!nama||!pin){ showLoginErr('Isi nama dan PIN!'); return; }

  showLoginOverlay('Mencari data santri...', 'Memverifikasi nama dan PIN');

  // Gunakan RPC function (aman, PIN diverifikasi server-side)
  const { data: rpcData, error: rpcErr } = await SB.rpc('login_ortu', {
    p_nama: nama, p_pin: pin
  });

  if(rpcErr || !rpcData){ hideLoginOverlay(); showLoginErr('Nama atau PIN salah!'); return; }
  if(rpcData.error){ hideLoginOverlay(); showLoginErr(rpcData.error); return; }

  const santri = rpcData.data;
  if(!santri){ hideLoginOverlay(); showLoginErr('Nama atau PIN salah!'); return; }

  // Bungkus kobong_nama ke struktur kobong
  if(santri.kobong_nama && !santri.kobong){
    santri.kobong = { nama: santri.kobong_nama };
  }

  showLoginOverlay('Selamat datang!', santri.nama);
  SESSION = {role:'ortu', santri: santri, pin: pin};
  enterApp();
}

// Tentukan role final pengurus (termasuk pengawas)
function resolvePengurusRole(pgData){
  return pgData.role==='pengawas' ? 'pengawas' : (pgData.role==='sekretaris'||pgData.role==='sekretariat') ? 'sekretariat' : 'pengurus';
}

async function loginPengurus(){
  const user = document.getElementById('pg-user').value.trim();
  const pass = document.getElementById('pg-pass').value.trim();
  if(!user||!pass){ showLoginErr('Isi username dan password!'); return; }

  showLoginOverlay('Memverifikasi akun...', 'Memeriksa username & password');

  // Coba login via Supabase Auth dulu (tidak perlu baca tabel pengurus sama sekali)
  const email = user + '@annur.internal';
  const { data: authData, error: authErr } = await SB.auth.signInWithPassword({ email, password: pass });

  if(!authErr && authData?.user){
    const {data: pgData} = await SB.from('pengurus').select('*').eq('username', user).single();
    if(!pgData){ hideLoginOverlay(); showLoginErr('Username atau password salah!'); return; }
    if(pgData.is_blocked){ hideLoginOverlay(); showLoginErr('⛔ Akun Anda diblokir. Hubungi Admin.'); return; }
    if(pgData.force_logout) await SB.from('pengurus').update({force_logout:false}).eq('id', pgData.id);
    const detectedRole = await resolvePengurusRole(pgData);
    showLoginOverlay('Selamat datang!', pgData.nama||user);
    SESSION = {role: detectedRole, user: pgData};
    _freshLoginPending = true;
    enterApp();
    return;
  }

  // Fallback (akun belum pernah migrasi ke Supabase Auth): cek password lewat RPC
  // aman di server — password_hash tidak pernah dikirim ke browser
  const {data: pgData, error: rpcErr} = await SB.rpc('login_pengurus_check', {p_username: user, p_password: pass});
  if(rpcErr || !pgData){ hideLoginOverlay(); showLoginErr('Username atau password salah!'); return; }
  if(pgData.is_blocked){ hideLoginOverlay(); showLoginErr('⛔ Akun Anda diblokir. Hubungi Admin.'); return; }

  // Password lama cocok - otomatis daftarkan ke Supabase Auth
  toast('Mengupgrade keamanan akun...');
  try{
    await SB.auth.signUp({ email, password: pass,
      options: { data: { username: user, nama: pgData.nama, role: pgData.role } }
    });
    await SB.auth.signInWithPassword({ email, password: pass });
  } catch(e){}

  if(pgData.force_logout) await SB.from('pengurus').update({force_logout:false}).eq('id', pgData.id);
  const detectedRole = await resolvePengurusRole(pgData);
  showLoginOverlay('Selamat datang!', pgData.nama||user);
  SESSION = {role: detectedRole, user: pgData};
  _freshLoginPending = true;
  enterApp();
}

async function loginSuper(){
  const user = document.getElementById('sa-user').value.trim();
  const pass = document.getElementById('sa-pass').value.trim();
  if(!user||!pass){ showLoginErr('Isi username dan password!'); return; }

  showLoginOverlay('Memverifikasi Admin...', 'Memeriksa kredensial');

  // Coba login via Supabase Auth dulu (tidak perlu baca tabel settings sama sekali)
  const email = user + '@annur.internal';
  const { data: authData, error: authErr } = await SB.auth.signInWithPassword({ email, password: pass });

  if(!authErr && authData?.user){
    const {data: pd} = await SB.from('settings').select('value').eq('key','super_profil').single();
    let sp = {}; try{ sp = JSON.parse(pd?.value||'{}'); }catch(e){}
    showLoginOverlay('Selamat datang, Admin!', sp.nama||'Kang Admin');
    SESSION = {role:'super', user:{id:'super', username:user, nama:sp.nama||'Kang Admin', foto_url:sp.foto_url||null, no_wa:sp.no_wa||''}};
    _freshLoginPending = true;
    enterApp();
    return;
  }

  // Fallback (belum pernah migrasi ke Supabase Auth): cek password lewat RPC,
  // aman di server — password Admin tidak pernah dikirim ke browser
  const {data: cocok, error: rpcErr} = await SB.rpc('login_super_check', {p_username: user, p_password: pass});
  if(rpcErr || !cocok){ hideLoginOverlay(); showLoginErr('Password Admin salah!'); return; }

  // Daftarkan ke Supabase Auth
  try{
    await SB.auth.signUp({ email, password: pass,
      options: { data: { username: user, nama: 'Kang Admin', role: 'super' } }
    });
    await SB.auth.signInWithPassword({ email, password: pass });
  } catch(e){}

  const {data: pd2} = await SB.from('settings').select('value').eq('key','super_profil').single();
  let sp2 = {}; try{ sp2 = JSON.parse(pd2?.value||'{}'); }catch(e){}
  showLoginOverlay('Selamat datang, Admin!', sp2.nama||'Kang Admin');
  SESSION = {role:'super', user:{id:'super', username:user, nama:sp2.nama||'Kang Admin', foto_url:sp2.foto_url||null, no_wa:sp2.no_wa||''}};
  _freshLoginPending = true;
  enterApp();
}


function showLoginOverlay(title='Memverifikasi...', sub='Harap tunggu sebentar'){
  const el = document.getElementById('login-overlay');
  const t = document.getElementById('login-overlay-title');
  const s = document.getElementById('login-overlay-sub');
  if(t) t.textContent = title;
  if(s) s.textContent = sub;
  if(el) el.style.display='flex';
}
function hideLoginOverlay(){
  const el = document.getElementById('login-overlay');
  if(el) el.style.display='none';
}

function showLoginErr(msg){
  const el = document.getElementById('login-err');
  el.textContent = msg;
  el.style.display='block';
  setTimeout(()=>el.style.display='none', 3000);
}

async function enterApp(){
  // Load config from DB -- dikasih batas waktu biar gak nyangkut. Kalau timeout,
  // CONFIG yang sudah di-cache localStorage (dari init-setup.js) tetap dipakai,
  // biar app tetap kebuka alih-alih layar putih kosong.
  const {data:sets, timedOut:setsTimedOut} = await withTimeout(SB.from('settings').select('*'), 8000);
  if(!setsTimedOut) (sets||[]).forEach(s=>{ CONFIG[s.key]=s.value; });

  // Simpan session persistent (bukan ortu)
  savePersistentSession();

  // Tambah class role ke body untuk CSS targeting
  document.body.classList.remove('role-super','role-pengurus','role-ortu','role-sekretaris','role-sekretariat','role-pengawas');
  document.body.classList.add('role-'+SESSION.role);

  document.getElementById('pg-login').style.display='none';
  document.getElementById('pg-app').classList.add('shown');
  const hdrBulanEl = document.getElementById('hdr-bulan');
  if(hdrBulanEl) hdrBulanEl.textContent = CONFIG.bulan_aktif||'—';
  const pesEl = document.getElementById('hdr-pesantren');
  if(pesEl) pesEl.textContent = CONFIG.pesantren_nama||'Pondok Pesantren';
  const subEl = document.getElementById('hdr-sub');
  if(subEl) subEl.textContent = 'Saku Santri';

  const roleLabels = {super:'🛡️ Admin', pengurus:'👨‍💼 '+((SESSION.user?.nama)||'Pengurus'), ortu:'👨‍👩‍👦 Orang Tua', sekretaris:'📋 '+((SESSION.user?.nama)||'Sekretaris'), sekretariat:'🏢 '+((SESSION.user?.nama)||'Sekretariat')};
  const hdrRoleEl = document.getElementById('hdr-role');
  if(hdrRoleEl) hdrRoleEl.textContent = roleLabels[SESSION.role]||'—';

  _suppressBroadcast = true;
  const {timedOut:dataTimedOut} = await withTimeout(loadAllData(), 12000);
  _suppressBroadcast = false;
  if(dataTimedOut) toast('Sebagian data lambat dimuat, koneksi mungkin lambat. Tarik layar ke bawah untuk muat ulang.', false);
  setupRealtimeSync();
  buildTabs();
  updateSidebarProfile();
  updateNotif();
  if(SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat') updateBadgePersetujuan();
  if(SESSION.role!=='ortu') updateBadgeNotifikasi();
  showTab(SESSION.role==='ortu'?'detail':'dashboard');
  // Tampilkan tombol Profil untuk pengurus & sekretariat
  const btnProfil = document.getElementById('btn-profil-hdr');
  if(btnProfil){
    const isPengurusRole = SESSION.role==='pengurus'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat'||SESSION.role==='super';
    btnProfil.style.display = isPengurusRole ? 'inline-flex' : 'none';
    if(isPengurusRole) updateHdrProfilAv();
  }
  // Bel notifikasi di header -- cuma buat role yang gak punya tab Notifikasi
  // sendiri (super/pengawas udah bisa lewat tab), biar tetap bisa lihat apa
  // yang dikirim Kang Admin tanpa perlu tab terpisah.
  const btnBell = document.getElementById('btn-notif-bell');
  const showBell = SESSION.role==='pengurus'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat';
  if(btnBell) btnBell.style.display = showBell ? 'inline-flex' : 'none';
  const topBell = document.getElementById('topbar-bell');
  if(topBell) topBell.style.display = showBell ? 'flex' : 'none';

  resetSessionTimer();
  if(SESSION.role==='ortu'){ renderDetailOrtu(); updateBadgeSyahriyah(); }
  if(SESSION.role==='pengurus'||SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat') startActivityTracking();

  // Daftarkan push notification untuk pengurus/super/sekretaris
  if(SESSION.role!=='ortu'){
    setTimeout(()=>registerPushNotification(), 2000);
  }

  hideLoginOverlay();
}

// loadAllData = ambil data + (opsional) kasih tahu device lain via broadcast
let _suppressBroadcast = false;
async function loadAllData(){
  await _loadAllDataCore();
  if(!_suppressBroadcast) broadcastDataChanged();
}

async function _loadAllDataCore(){
  // Load asrama & kobong DULU — karena loadSantriForRole butuh ALL_KOBONG sudah terisi
  const [as, ks, ps] = await Promise.all([
    SB.from('asrama').select('*').order('nama'),
    SB.from('kobong').select('*,asrama(id,nama)').order('nama'),
    (SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat'||SESSION.role==='pengawas') ? SB.from('pengurus').select('*').order('nama') : {data:[]}
  ]);
  ALL_ASRAMA = as.data||[];
  ALL_KOBONG = ks.data||[];
  ALL_PENGURUS = ps.data||[];
  // Baru load santri (butuh ALL_KOBONG dan ALL_ASRAMA sudah terisi)
  ALL_SANTRI = await loadSantriForRole();

  // Baru load transaksi (butuh ALL_SANTRI sudah terisi)
  ALL_TX = await loadTxForRole();

  populateKobongSelects();
  populateWaliSelects();
  populateFilterKelas();
}

// ===== REALTIME SYNC (via Supabase Broadcast — TIDAK butuh setting Replication apapun) =====
// Sinkronisasi antar device via visibilitychange
let _rtDebounceTimer = null;

function setupRealtimeSync(){
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

function _onVisibilityChange(){
  if(!document.hidden) refreshFromRealtime();
}

function teardownRealtimeSync(){
  clearTimeout(_rtDebounceTimer);
  document.removeEventListener('visibilitychange', _onVisibilityChange);
}

function broadcastDataChanged(){
  // broadcast dimatikan
}

function handleRealtimeChange(payload){
  // Debounce: kalau banyak event numpuk hampir bersamaan, refresh sekali saja
  clearTimeout(_rtDebounceTimer);
  _rtDebounceTimer = setTimeout(refreshFromRealtime, 600);
}

async function refreshFromRealtime(){
  // Jangan ganggu kalau user sedang buka modal (sedang input/edit form)
  if(document.querySelector('.modal.open')) return;
  if(_isLoading) return; // sedang ada proses simpan/hapus berjalan

  _suppressBroadcast = true; // jangan ikut broadcast balik, cegah loop
  await loadAllData();
  _suppressBroadcast = false;
  renderDashboard();
  renderTabelSantri();
  renderRiwayat();
  if(SESSION.role==='ortu') renderDetailOrtu();
}

async function loadSantriForRole(){
  try{
  if(SESSION.role==='super'||SESSION.role==='pengawas'){
    const {data,error} = await SB.from('santri').select('id,nama,kobong_id,pin,saldo,kelas,catatan,dapur_id,no_wa,foto_url,created_by,kecamatan,kota,jenis_kelamin,kobong(id,nama)').eq('is_arsip',false).order('nama');
    if(error) throw error;
    return data||[];
  }
  if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
    const asramaIds = JSON.parse(SESSION.user?.asrama_ids||'[]').map(String);
    if(!asramaIds.length) return [];
    const kobongIds = ALL_KOBONG.filter(k=>asramaIds.includes(String(k.asrama_id))).map(k=>k.id);
    if(!kobongIds.length) return [];
    const {data,error} = await SB.from('santri').select('id,nama,kobong_id,pin,saldo,kelas,catatan,dapur_id,no_wa,foto_url,created_by,kecamatan,kota,jenis_kelamin,kobong(id,nama)').in('kobong_id',kobongIds).eq('is_arsip',false).order('nama');
    if(error) throw error;
    return data||[];
  }
  if(SESSION.role==='pengurus'){
    const username = SESSION.user?.username||'';
    if(!username) return [];

    // Santri yang kelihatan HANYA yang wali-nya (created_by) = pengurus ini
    const {data, error} = await SB.from('santri').select('*,kobong(id,nama)').eq('created_by', username).eq('is_arsip',false).order('nama');
    if(error) throw error;
    return data||[];
  }
  return [];
  } catch(e){
    // Fallback: kolom is_arsip belum ada — query tanpa filter is_arsip
    console.warn('[DEBUG] loadSantriForRole fallback (is_arsip mungkin belum ada):', e.message);
    try{
      if(SESSION.role==='super'||SESSION.role==='pengawas'){
        const {data} = await SB.from('santri').select('id,nama,kobong_id,pin,saldo,kelas,catatan,dapur_id,no_wa,foto_url,created_by,kecamatan,kota,jenis_kelamin,kobong(id,nama)').order('nama');
        return data||[];
      }
      if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
        const asramaIds = JSON.parse(SESSION.user?.asrama_ids||'[]').map(String);
        if(!asramaIds.length) return [];
        const kobongIds = ALL_KOBONG.filter(k=>asramaIds.includes(String(k.asrama_id))).map(k=>k.id);
        if(!kobongIds.length) return [];
        const {data} = await SB.from('santri').select('id,nama,kobong_id,pin,saldo,kelas,catatan,dapur_id,no_wa,foto_url,created_by,kecamatan,kota,jenis_kelamin,kobong(id,nama)').in('kobong_id',kobongIds).order('nama');
        return data||[];
      }
      if(SESSION.role==='pengurus'){
        const username = SESSION.user?.username||'';
        if(!username) return [];
        const {data} = await SB.from('santri').select('*,kobong(id,nama)').eq('created_by', username).order('nama');
        return data||[];
      }
    } catch(e2){ console.error('loadSantriForRole gagal total:', e2); }
    return [];
  }
}

async function loadTxForRole(){
  if(SESSION.role==='ortu') return [];
  if(SESSION.role==='super'||SESSION.role==='pengawas'){
    const {data} = await SB.from('transaksi').select('*,santri(nama,kobong(id,nama))').order('tanggal',{ascending:false}).order('created_at',{ascending:false}).limit(500);
    return data||[];
  }
  if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'||SESSION.role==='pengurus'){
    const sids = ALL_SANTRI.map(s=>s.id);
    if(!sids.length) return [];
    const {data} = await SB.from('transaksi').select('*,santri(nama,kobong(id,nama))').in('santri_id',sids).order('tanggal',{ascending:false}).limit(1000);
    return data||[];
  }
  return [];
}

function populateWaliSelects(){
  if(SESSION.role!=='super' && SESSION.role!=='sekretaris' && SESSION.role!=='sekretariat'){
    ['dash-wali','santri-wali'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
    return;
  }
  const waliSet = new Set();
  ALL_SANTRI.forEach(s=>{ if(s.created_by) waliSet.add(s.created_by); });
  const walis = Array.from(waliSet).sort();
  ['dash-wali','santri-wali'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    const cur = el.value;
    el.style.display='inline-block';
    el.innerHTML = '<option value="">Semua Wali</option>';
    walis.forEach(w=>{
      const p = ALL_PENGURUS.find(x=>x.username===w);
      const label = p ? p.nama+' (@'+w+')' : (w==='kangadmin'?'\u{1F451} Kang Admin':w);
      el.innerHTML += '<option value="'+w+'" '+(cur===w?'selected':'')+'>'+ label +'</option>';
    });
  });
}

function populateKobongSelects(){
  // Filter asrama berdasarkan akses sekretariat
  const isSekretariat = SESSION && (SESSION.role === 'sekretariat' || SESSION.role === 'sekretaris');
  const allowedAsramaIds = isSekretariat
    ? JSON.parse(SESSION.user?.asrama_ids||'[]').map(String)
    : null;
  const visibleAsrama = allowedAsramaIds
    ? ALL_ASRAMA.filter(a=>allowedAsramaIds.includes(String(a.id)))
    : ALL_ASRAMA;

  // Populate asrama filter in kobong tab
  const asramaFilter = document.getElementById('filter-asrama-kobong');
  if(asramaFilter){
    const cur = asramaFilter.value;
    asramaFilter.innerHTML = '<option value="">Semua Asrama</option>';
    visibleAsrama.forEach(a => { asramaFilter.innerHTML += `<option value="${a.id}" ${cur==a.id?'selected':''}>${a.nama}</option>`; });
  }

  // Populate asrama selects in kobong modal
  const kobAsrama = document.getElementById('kob-asrama');
  if(kobAsrama){
    const cur = kobAsrama.value;
    kobAsrama.innerHTML = '<option value="">-- Pilih Asrama --</option>';
    visibleAsrama.forEach(a => { kobAsrama.innerHTML += `<option value="${a.id}" ${cur==a.id?'selected':''}>${a.nama}</option>`; });
  }

  // Populate asrama in santri modal
  const sAsrama = document.getElementById('s-asrama');
  if(sAsrama){
    const cur = sAsrama.value;
    sAsrama.innerHTML = '<option value="">-- Pilih Asrama --</option>';
    const asramaForModal = isSekretariat && allowedAsramaIds
      ? ALL_ASRAMA.filter(a=>allowedAsramaIds.includes(String(a.id)))
      : ALL_ASRAMA;
    asramaForModal.forEach(a => { sAsrama.innerHTML += `<option value="${a.id}" ${cur==a.id?'selected':''}>${a.nama}</option>`; });
  }

  // Populate santri-asrama filter dropdown
  const santriAsramaSel = document.getElementById('santri-asrama');
  if(santriAsramaSel){
    const cur = santriAsramaSel.value;
    santriAsramaSel.innerHTML = '<option value="">Semua Asrama</option>';
    visibleAsrama.forEach(a => { santriAsramaSel.innerHTML += `<option value="${a.id}" ${cur==a.id?'selected':''}>${a.nama}</option>`; });
  }

  // Populate dash-asrama filter dropdown (Dashboard)
  const dashAsramaSel = document.getElementById('dash-asrama');
  if(dashAsramaSel){
    const cur = dashAsramaSel.value;
    dashAsramaSel.innerHTML = '<option value="">Semua Asrama</option>';
    visibleAsrama.forEach(a => { dashAsramaSel.innerHTML += `<option value="${a.id}" ${cur==a.id?'selected':''}>${a.nama}</option>`; });
  }

  // Populate riw-asrama filter dropdown (Riwayat Transaksi)
  const riwAsramaSel = document.getElementById('riw-asrama');
  if(riwAsramaSel){
    const cur = riwAsramaSel.value;
    riwAsramaSel.innerHTML = '<option value="">Semua Asrama</option>';
    visibleAsrama.forEach(a => { riwAsramaSel.innerHTML += `<option value="${a.id}" ${cur==a.id?'selected':''}>${a.nama}</option>`; });
  }

  const sels = ['dash-kobong','santri-kobong','massal-kobong','riw-kobong','pg-kobong'];
  sels.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    const isMulti = el.multiple;
    const isSelect = el.tagName==='SELECT';
    if(!isSelect) return;

    // Pengurus bisa lihat semua kobong (untuk keperluan assign santri)
    let kobongs = ALL_KOBONG;
    // Sekretariat hanya lihat kobong dari asrama yang diizinkan
    if(isSekretariat && allowedAsramaIds) {
      kobongs = ALL_KOBONG.filter(k=>allowedAsramaIds.includes(String(k.asrama_id)));
    }

    const hasAll = !isMulti && !['s-kobong','massal-kobong'].includes(id);
    el.innerHTML = (hasAll?`<option value="">Semua Kobong</option>`:
      (id==='massal-kobong'?`<option value="">Pilih Kobong...</option>`:
      (id==='s-kobong'?`<option value="">-- Pilih Kobong --</option>`:'')));

    // For pg-kobong, group by asrama
    if(id === 'pg-kobong'){
      // Group kobongs by asrama
      const byAsrama = {};
      kobongs.forEach(k => {
        const aId = k.asrama_id || '__none__';
        const aNama = k.asrama?.nama || 'Tanpa Asrama';
        if(!byAsrama[aId]) byAsrama[aId] = {nama: aNama, list: []};
        byAsrama[aId].list.push(k);
      });
      Object.values(byAsrama).forEach(group => {
        el.innerHTML += `<optgroup label="🏛️ ${group.nama}">`;
        group.list.forEach(k => { el.innerHTML += `<option value="${k.id}">${k.nama}</option>`; });
        el.innerHTML += `</optgroup>`;
      });
    } else {
      kobongs.forEach(k=>{
        el.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
      });
    }
  });

  // Riwayat bulan
  const riw = document.getElementById('riw-bulan');
  if(riw){
    const months = new Set();
    ALL_TX.forEach(t=>{ if(t.tanggal) months.add(t.tanggal.substring(0,7)); });
    riw.innerHTML='<option value="">Semua Bulan</option>';
    [...months].sort().reverse().forEach(m=>{
      const [y,mo]=m.split('-');
      riw.innerHTML+=`<option value="${m}">${bNames[parseInt(mo)-1]} ${y}</option>`;
    });
  }
}

