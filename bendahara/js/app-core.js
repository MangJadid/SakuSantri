const { createClient } = supabase;

// ===== HEADER AUTO-HIDE ON SCROLL (HP) -- turun sembunyi, tarik dikit ke atas langsung muncul lagi, kayak Instagram =====
(function(){
  let lastY = window.scrollY || 0;
  window.addEventListener('scroll', () => {
    if(window.innerWidth > 640) return; // desktop: header selalu tampil
    const hdr = document.querySelector('header');
    if(!hdr) return;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if(y > lastY && y > 80) hdr.classList.add('hdr-hidden');
    else if(y < lastY) hdr.classList.remove('hdr-hidden');
    lastY = y;
  }, {passive:true});
})();

// ===== KUNCI KOLOM NAMA (tabel) -- opsional, tersimpan per-user =====
function toggleFreezeNama(){
  const active = document.body.classList.toggle('freeze-nama');
  localStorage.setItem('freeze_nama_kolom_bd', active ? '1' : '0');
  document.querySelectorAll('.freeze-toggle-btn').forEach(b=>b.classList.toggle('active', active));
}
function initFreezeNama(){
  const on = localStorage.getItem('freeze_nama_kolom_bd') === '1';
  if(!on) return;
  document.body.classList.add('freeze-nama');
  document.querySelectorAll('.freeze-toggle-btn').forEach(b=>b.classList.add('active'));
}
initFreezeNama();

// ===== SHA-256 HELPER =====
async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
// ===== LOADING LOCK HELPER =====
let _isLoading = false;
function setLoading(loading, btnEl, title='Memproses...', subtitle=''){
  _isLoading = loading;
  const overlay = document.getElementById('loading-overlay');
  if(overlay){
    overlay.style.display = loading ? 'flex' : 'none';
    const t=document.getElementById('loading-title');
    const s=document.getElementById('loading-subtitle');
    const pw=document.getElementById('loading-progress-wrap');
    const pb=document.getElementById('loading-progress-bar');
    const pt=document.getElementById('loading-progress-text');
    if(t) t.textContent=title;
    if(s) s.textContent=subtitle;
    if(pw) pw.style.display='none';
    if(pb) pb.style.transform='scaleX(0)';
    if(pt) pt.textContent='';
  }
  if(btnEl){
    if(loading){
      btnEl.disabled = true;
      btnEl._origText = btnEl.innerHTML;
      btnEl.innerHTML = '<span class="spin-inline"></span> Memproses...';
    } else {
      btnEl.disabled = false;
      btnEl.innerHTML = btnEl._origText || btnEl.innerHTML;
    }
  }
  // Setelah overlay hilang, tampilkan toast yang tertunda
  if(!loading && _pendingToast){
    const msg = _pendingToast;
    _pendingToast = null;
    setTimeout(()=>_showToast(msg), 150);
  }
}
function setLoadingProgress(current, total, subtitle=''){
  const pw=document.getElementById('loading-progress-wrap');
  const pb=document.getElementById('loading-progress-bar');
  const pt=document.getElementById('loading-progress-text');
  const s=document.getElementById('loading-subtitle');
  if(pw) pw.style.display='block';
  if(pb) pb.style.transform=`scaleX(${total?current/total:0})`;
  if(pt) pt.textContent=`${current} / ${total}`;
  if(s&&subtitle) s.textContent=subtitle;
}

let SB, SESSION = null, CONFIG = {};
let ALL_SANTRI = [], ALL_TAGIHAN = [], ALL_AKUN = [], ALL_AKSES = [], ALL_ASRAMA = [], ALL_KOBONG = [];
let ALL_TF_ADMIN = [];
let ACTIVE_DAPUR = null;
let MONITOR_INTERVAL = null;
let IMPORT_PARSED = [];
let BAYAR_TAG_ID = null;
let MULTI_SANTRI_ID = null;
let fotoBase64 = null, fotoFile = null;

// ===== KONFIGURASI =====
function getNominalMakan(){ return parseInt(CONFIG.nominal_makan)||380000; }
function getNominalListrik(){ return parseInt(CONFIG.nominal_listrik)||40000; }

const DAPUR_LIST = [
  {id:'dapur_bibi',   nama:'Dapur Bibi',    emoji:'🍲'},
  {id:'dapur_ummi',   nama:'Dapur Ummi',    emoji:'🥘'},
  {id:'dapur_buonih', nama:'Dapur Bu Onih', emoji:'🍛'},
];
const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const now2 = new Date();
const BULAN_AKTIF_DEFAULT = BULAN_NAMES[now2.getMonth()] + ' ' + now2.getFullYear();

// ===== INIT =====
(async function init(){
  // Deteksi otomatis lingkungan: di localhost (XAMPP) pakai API lokal (lihat api/
  // dan shared/supabase-client.js), di domain publik pakai Supabase asli -- satu
  // kode buat dua tempat, gak perlu diubah manual tiap mau push/deploy. IP LAN
  // ikut dihitung lokal juga -- biar tes dari HP lewat IP komputer (bukan cuma
  // "localhost") tetap nyambung ke API lokal, samain sama cek di index.html.
  const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname)
    || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(location.hostname);
  const SB_URL = isLocalDev ? '../api' : 'https://tajdid.jadidsaepul0.workers.dev';
  const SB_KEY = isLocalDev
    ? 'e3d37d584dce22eba5836211744f18ffab5a7c663ef2fe48f5c2447fa3e8ac0e'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmZubWZ3dHhnY2d2a2JianhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ2NjUsImV4cCI6MjA5NTU3MDY2NX0.-xenaY9VPUzodik7nnN1emtnhg0WTqdU6dToyXSpwec';
  SB = createClient(SB_URL, SB_KEY);

  try {
    const {data:sets} = await SB.from('settings').select('*');
    (sets||[]).forEach(s=>{ CONFIG[s.key]=s.value; });

    await ensureSuperAccount();

    const saved = loadSession();
    if(saved){
      SESSION = saved;
      trackActivity();
    MONITOR_INTERVAL = setInterval(async()=>{
      await trackActivity();
      if(SESSION?.id){
        try{
          const {data:chk} = await SB.from('bendahara_users').select('force_logout,is_blocked').eq('id',SESSION.id).single();
          if(chk?.force_logout || chk?.is_blocked){
            toast('⚠️ Anda telah di-logout oleh Admin', false);
            setTimeout(()=>doLogout(), 2000);
          }
        }catch(e){}
      }
    }, 30*1000);
      await enterApp();
      return;
    }
    document.getElementById('pg-login').style.display='flex';
  } catch(e){
    console.error('Init error:', e);
    document.getElementById('pg-login').style.display='flex';
  } finally {
    document.getElementById('pg-loading').style.display='none';
  }
})();

async function ensureSuperAccount(){
  try {
    const {data,error} = await SB.from('bendahara_users').select('id').eq('role','super').limit(1);
    if(error || !data || !data.length){
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      const randomPass = Array.from(bytes, b => chars[b % chars.length]).join('');
      await SB.from('bendahara_users').upsert({
        username:'admin', password_hash:await sha256(randomPass),
        nama_tampilan:'Admin / Bendahara Utama', role:'super', dapur_id:null
      },{onConflict:'username'});
      alert('🔑 Akun Admin pertama dibuat otomatis:\n\nUsername: admin\nPassword: '+randomPass+'\n\nCatat password ini SEKARANG — pesan ini hanya muncul sekali. Segera login lalu ganti password lewat menu Ganti Password.');
    }
  } catch(e){}
}

// ===== SESSION =====
const SESS_KEY = 'bend_sess_v3';
function saveSession(){ if(SESSION) localStorage.setItem(SESS_KEY, JSON.stringify({...SESSION, savedAt:Date.now()})); }
function loadSession(){
  try {
    const r=localStorage.getItem(SESS_KEY); if(!r) return null;
    const d=JSON.parse(r);
    if(Date.now()-d.savedAt > 48*3600*1000){ localStorage.removeItem(SESS_KEY); return null; }
    return d;
  } catch(e){ return null; }
}
function clearSession(){ localStorage.removeItem(SESS_KEY); }

// ===== LOGIN =====
function switchLoginTab(tab){
  document.getElementById('form-bend').style.display = tab==='bend'?'block':'none';
  document.getElementById('form-admin').style.display = tab==='admin'?'block':'none';
  document.getElementById('ltab-bend').classList.toggle('act', tab==='bend');
  document.getElementById('ltab-admin').classList.toggle('act', tab==='admin');
  document.getElementById('login-err').style.display='none';
}

async function showLoginOverlay(msg='Sedang masuk...'){
  const ov = document.getElementById('login-overlay');
  document.getElementById('login-overlay-text').textContent = msg;
  ov.style.display = 'flex';
}
function hideLoginOverlay(){
  const ov = document.getElementById('login-overlay');
  ov.style.display = 'none';
}

async function doLogin(){
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if(!user||!pass){ showLoginErr('⚠️ Isi username dan password!'); return; }
  showLoginOverlay('Memverifikasi akun...');
  try {
    let data;
    // Coba login via Supabase Auth dulu (tidak perlu baca tabel bendahara_users sama sekali)
    const email = user + '@annur.internal';
    const { data: authData, error: authErr } = await SB.auth.signInWithPassword({ email, password: pass });

    if(!authErr && authData?.user){
      const res = await SB.from('bendahara_users').select('*').eq('username',user).single();
      data = res.data;
      if(!data){ hideLoginOverlay(); showLoginErr('❌ Username tidak ditemukan!'); return; }
    } else {
      // Fallback (belum migrasi ke Supabase Auth): cek password lewat RPC,
      // aman di server — password_hash tidak pernah dikirim ke browser
      const {data: rpcData, error: rpcErr} = await SB.rpc('login_bendahara_check', {p_username: user, p_password: pass});
      if(rpcErr || !rpcData){ hideLoginOverlay(); showLoginErr('❌ Username atau password salah!'); return; }
      data = rpcData;
      // Password cocok - otomatis daftarkan ke Supabase Auth
      try{
        await SB.auth.signUp({ email, password: pass,
          options: { data: { username: user, nama: data.nama_tampilan, role: data.role } }
        });
        await SB.auth.signInWithPassword({ email, password: pass });
      } catch(e){}
    }

    if(data.is_blocked){ hideLoginOverlay(); showLoginErr('⛔ Akun diblokir. Hubungi Admin.'); return; }

    if(data.force_logout){ await SB.from('bendahara_users').update({force_logout:false}).eq('id',data.id); }
    const {data:akses} = await SB.from('bendahara_akses').select('*').eq('bendahara_id',data.id);
    // Parse akses_fitur
    let _aksF = [];
    try{ const af=JSON.parse(data.akses_fitur||'null'); _aksF=Array.isArray(af)?af:[]; }catch(e){}
    SESSION = {
      id:data.id, role: data.role||'pengelola_dapur', nama:data.nama_tampilan,
      username:data.username, dapur_id:data.dapur_id,
      akses_asrama:(akses||[]).map(a=>String(a.asrama_id)),
      foto_url: data.foto_url || null,
      akses_fitur: _aksF
    };
    // Parse dapur_id: bisa JSON array baru atau string lama
    try{ const arr=JSON.parse(data.dapur_id||'null'); SESSION.dapur_ids=Array.isArray(arr)?arr:[String(data.dapur_id)]; }
    catch(e){ SESSION.dapur_ids=data.dapur_id?[String(data.dapur_id)]:null; }
    saveSession(); trackActivity();
    MONITOR_INTERVAL = setInterval(async()=>{
      await trackActivity();
      if(SESSION?.id){
        try{
          const {data:chk} = await SB.from('bendahara_users').select('force_logout,is_blocked').eq('id',SESSION.id).single();
          if(chk?.force_logout || chk?.is_blocked){
            toast('⚠️ Anda telah di-logout oleh Admin', false);
            setTimeout(()=>doLogout(), 2000);
          }
        }catch(e){}
      }
    }, 30*1000);
    document.getElementById('pg-login').style.display='none';
    showLoginOverlay('Memuat data pesantren...');
    await enterApp();
  } catch(e){ hideLoginOverlay(); showLoginErr('❌ Gagal login!'); }
}

async function doLoginAdmin(){
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value;
  if(!user||!pass){ showLoginErr('⚠️ Isi username dan password!'); return; }
  showLoginOverlay('Memverifikasi Admin...');
  try {
    // Coba login via Supabase Auth dulu (tidak perlu baca tabel settings sama sekali)
    const email = user + '@annur.internal';
    const { data: authData, error: authErr } = await SB.auth.signInWithPassword({ email, password: pass });

    if(authErr || !authData?.user){
      // Fallback (belum migrasi ke Supabase Auth): cek password lewat RPC,
      // aman di server — password Kang Admin tidak pernah dikirim ke browser
      const {data: cocok, error: rpcErr} = await SB.rpc('login_super_check', {p_username: user, p_password: pass});
      if(rpcErr || !cocok){ hideLoginOverlay(); showLoginErr('❌ Username atau password salah!'); return; }
      // Daftarkan ke Supabase Auth
      try{
        await SB.auth.signUp({ email, password: pass,
          options: { data: { username: user, nama: 'Admin', role: 'kangadmin' } }
        });
        await SB.auth.signInWithPassword({ email, password: pass });
      } catch(e){}
    }

    SESSION = {role:'kangadmin', nama:'Admin', username:user, dapur_id:null, akses_asrama:[]};
    saveSession(); trackActivity();
    MONITOR_INTERVAL = setInterval(async()=>{
      await trackActivity();
      if(SESSION?.id){
        try{
          const {data:chk} = await SB.from('bendahara_users').select('force_logout,is_blocked').eq('id',SESSION.id).single();
          if(chk?.force_logout || chk?.is_blocked){
            toast('⚠️ Anda telah di-logout oleh Admin', false);
            setTimeout(()=>doLogout(), 2000);
          }
        }catch(e){}
      }
    }, 30*1000);
    document.getElementById('pg-login').style.display='none';
    showLoginOverlay('Memuat data pesantren...');
    await enterApp();
  } catch(e){ hideLoginOverlay(); showLoginErr('❌ Gagal login! Cek koneksi.'); }
}

function showLoginErr(msg){
  const el=document.getElementById('login-err');
  el.textContent=msg; el.style.display='block';
  setTimeout(()=>el.style.display='none',3000);
}

// ===== ENTER APP =====
async function enterApp(){
  const isAdmin = isKangAdmin();
  document.getElementById('pg-app').classList.add('shown');
  document.getElementById('hdr-bulan').textContent = CONFIG.bulan_aktif||BULAN_AKTIF_DEFAULT;
  document.getElementById('hdr-role').textContent = isAdmin ? '👑 Admin' : ('🍳 '+(SESSION.dapur_ids&&SESSION.dapur_ids.length>0?SESSION.dapur_ids.map(did=>getDapurNama(did)).join(', '):SESSION.nama||'Pengelola'));

  if(!isAdmin) ACTIVE_DAPUR = (SESSION.dapur_ids&&SESSION.dapur_ids.length===1)?SESSION.dapur_ids[0]:null;

  buildDapurBar();
  adjustTabsStickyPos();
  buildTabs();
  _suppressBroadcast = true;
  await loadAllData();
  _suppressBroadcast = false;
  setupRealtimeSync();
  fillSelects();
  showTab('dashboard');
  updateHeaderProfilAv(); // tampilkan tombol Profil di header
  updateSidebarProfileBD(); // isi nama/role/avatar sidebar+topbar desktop
  // Tampilkan tombol menu akun & lonceng notifikasi di header (mobile-only-el yang atur tampil/sembunyinya per lebar layar)
  const btnAccTrigger = document.getElementById('btn-acc-trigger-bd');
  if(btnAccTrigger) btnAccTrigger.style.removeProperty('display');
  const btnBellBD = document.getElementById('btn-notif-bell-bd');
  if(btnBellBD) btnBellBD.style.removeProperty('display');
  const topbarBellBD = document.getElementById('topbar-bell-bd');
  if(topbarBellBD) topbarBellBD.style.display = 'flex';
  updateBadgeNotifikasiBD();
  setTimeout(()=>registerPushNotificationBD(), 2000);
  hideLoginOverlay();
}

function isKangAdmin(){ 
  if(!SESSION) return false;
  return SESSION.role==='kangadmin' || SESSION.role==='super' || SESSION.username==='kangadmin';
}

// ===== LOAD DATA =====
let ALL_PIUTANG_ALUMNI = [];
let ALL_KONFIG_TAGIHAN = [];

// loadAllData = ambil data + (opsional) kasih tahu device lain via broadcast
let _suppressBroadcast = false;
async function loadAllData(){
  await _loadAllDataCore();
  if(!_suppressBroadcast) broadcastDataChanged();
}

async function _loadAllDataCore(){
  const isAdmin = isKangAdmin();
  const queries = [
    (async()=>{ let all=[],from=0,step=1000; while(true){ const {data,error}=await SB.from('santri').select('id,nama,kelas,kobong_id,kobong(id,nama,asrama_id),no_wa,dapur_id,catatan,foto_url,pin,created_by').neq('is_arsip',true).order('nama').order('id').range(from,from+step-1); if(error||!data||!data.length) break; all=[...all,...data]; if(data.length<step) break; from+=step; } return {data:all}; })(),
    (async()=>{ let all=[],from=0,step=1000; while(true){ const {data,error}=await SB.from('tagihan_pondok').select('id,santri_id,santri_nama,dapur_id,bulan,nominal,nominal_makan,nominal_listrik,nominal_bayar,status,tgl_tagihan,tgl_bayar,keterangan,dicatat_oleh,created_at,rincian').order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,from+step-1); if(error||!data||!data.length) break; all=[...all,...data]; if(data.length<step) break; from+=step; } return {data:all}; })(),
    SB.from('asrama').select('*').order('nama'),
    SB.from('kobong').select('*,asrama(id,nama)').order('nama'),
    SB.from('piutang_alumni').select('*').order('tgl_keluar',{ascending:false}),
    SB.from('tf_admin').select('*').order('created_at',{ascending:false}),
    SB.from('konfigurasi_tagihan_asrama').select('*').order('asrama_id').order('urutan'),
  ];
  if(isAdmin){
    queries.push(SB.from('bendahara_users').select('id,username,nama_tampilan,role,dapur_id,foto_url,created_at').order('created_at'));
    queries.push(SB.from('bendahara_akses').select('*'));
  }
  const results = await Promise.all(queries);
  const [r0,r1,r2,r3,r4,r5,r6,r7,r8] = results;

  ALL_ASRAMA = r2.data||[];
  ALL_KOBONG = r3.data||[];
  ALL_PIUTANG_ALUMNI = r4.data||[];
  ALL_TF_ADMIN = r5.data||[];
  ALL_KONFIG_TAGIHAN = r6.data||[];
  ALL_AKUN = r7?.data||[];
  ALL_AKSES = r8?.data||[];

  let santri = r0.data||[];
  if(!isAdmin && SESSION.akses_asrama && SESSION.akses_asrama.length>0){
    const aksesSet = new Set(SESSION.akses_asrama.map(String));
    santri = santri.filter(s=>aksesSet.has(String(s.kobong?.asrama_id||'')));
  } else if(!isAdmin && SESSION.dapur_ids && SESSION.dapur_ids.length>0){
    const dapurSet = new Set(SESSION.dapur_ids.map(String));
    santri = santri.filter(s=>dapurSet.has(String(s.dapur_id)));
  }
  ALL_SANTRI = santri;
  _santriByIdCache = null;

  let tagihan = r1.data||[];
  const santriIds = new Set(ALL_SANTRI.map(s=>String(s.id)));
  ALL_TAGIHAN = tagihan.filter(t=>santriIds.has(String(t.santri_id)));

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
  if(document.querySelector('.mo.open')) return;
  if(_isLoading) return; // sedang ada proses simpan/hapus berjalan

  _suppressBroadcast = true; // jangan ikut broadcast balik, cegah loop
  await loadAllData();
  _suppressBroadcast = false;
  fillSelects();
  renderDashboard();
  renderTagihanTable();
}

// ===== HELPERS =====
function getDapurNama(id){ return DAPUR_LIST.find(d=>d.id===id)?.nama||'—'; }
function getDapurEmoji(id){ return DAPUR_LIST.find(d=>d.id===id)?.emoji||'🍳'; }
function getAsramaNama(id){ return ALL_ASRAMA.find(a=>String(a.id)===String(id))?.nama||'—'; }
function getKobongNama(id){ return ALL_KOBONG.find(k=>String(k.id)===String(id))?.nama||'—'; }
// Cache lookup santri by-id -- dipanggil dari dalam loop di banyak tempat
// (renderTagihanTable dst), .find() linear di array ratusan santri x ribuan
// baris tagihan itu yang bikin lag pas ganti tab. Map di-invalidate manual
// tiap ALL_SANTRI di-assign ulang (lihat _loadAllDataCore).
let _santriByIdCache = null;
function getSantriById(id){
  if(!_santriByIdCache) _santriByIdCache = new Map(ALL_SANTRI.map(s=>[String(s.id), s]));
  return _santriByIdCache.get(String(id));
}

// ===== PAGINASI (tabel Tagihan/Santri/Riwayat bisa ratusan-ribuan baris --
// cuma render 1 halaman sekaligus biar gak berat tiap ganti tab/filter) =====
const PAGE_SIZE = 50;
const _pageState = {};
function paginate(list, key){
  const page = _pageState[key] || 1;
  const start = (page-1)*PAGE_SIZE;
  return list.slice(start, start+PAGE_SIZE);
}
function renderPaginationUI(containerId, totalItems, key, renderCall){
  const el = document.getElementById(containerId);
  if(!el) return;
  const totalPages = Math.max(1, Math.ceil(totalItems/PAGE_SIZE));
  let page = _pageState[key] || 1;
  if(page>totalPages){ page=totalPages; _pageState[key]=page; }
  if(totalPages<=1){ el.innerHTML=''; return; }
  const goto = p => `_pageState['${key}']=${p};${renderCall}`;
  const btn = (p,label,disabled,active) => `<button class="pg-btn ${active?'act':''}" ${disabled?'disabled':''} onclick="${goto(p)}">${label}</button>`;
  let html = btn(page-1,'‹',page<=1,false);
  const maxBtns=7;
  let startP=Math.max(1,page-Math.floor(maxBtns/2));
  let endP=Math.min(totalPages,startP+maxBtns-1);
  startP=Math.max(1,endP-maxBtns+1);
  for(let p=startP;p<=endP;p++) html+=btn(p,String(p),false,p===page);
  html += btn(page+1,'›',page>=totalPages,false);
  el.innerHTML = html;
}

function getSantriFiltered(){
  if(ACTIVE_DAPUR) return ALL_SANTRI.filter(s=>String(s.dapur_id)===String(ACTIVE_DAPUR));
  // Jika pengelola (bukan admin) dengan multi-dapur tapi tidak ada filter aktif → tampilkan semua dapur yang diizinkan (sudah di-filter di ALL_SANTRI)
  return ALL_SANTRI;
}
function getTagihanFiltered(){
  const sf = getSantriFiltered();
  const ids = new Set(sf.map(s=>String(s.id)));
  return ALL_TAGIHAN.filter(t=>ids.has(String(t.santri_id)));
}

const avColors=['#1a5c3a','#2471a3','#6c3483','#b8860b','#c0392b','#16a085','#8e44ad','#d35400'];
function avColor(n){ if(!n) return avColors[0]; let h=0; for(let i=0;i<n.length;i++) h=(h+n.charCodeAt(i)*31)%avColors.length; return avColors[h]; }
function avLetter(n){ return n?n[0].toUpperCase():'?'; }
function fmtRp(n){ return 'Rp '+Number(n||0).toLocaleString('id-ID'); }
function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtTgl(s){ if(!s) return '—'; try{ return new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return s; } }

function bulanAktif(){ return CONFIG.bulan_aktif||BULAN_AKTIF_DEFAULT; }

// ===== ADJUST TABS STICKY POSITION =====
function adjustTabsStickyPos(){
  const bar = document.getElementById('dapur-bar');
  const tabs = document.getElementById('main-tabs');
  if(!bar || !tabs) return;
  const visible = getComputedStyle(bar).display !== 'none';
  tabs.style.top = visible ? '116px' : '66px';
}

// ===== DAPUR BAR =====
function buildDapurBar(){
  const isAdmin = isKangAdmin();
  const bar = document.getElementById('dapur-bar');
  const tabs = document.getElementById('dapur-tabs');

  // Pengelola: tampilkan dapur bar jika punya akses lebih dari 1 dapur
  if(!isAdmin){
    if(SESSION.dapur_ids && SESSION.dapur_ids.length>1){
      bar.style.display='flex';
      let t=`<button class="dtab act" id="dtab-all" onclick="setActiveDapur(null,this)">🌐 Semua Dapur</button>`;
      SESSION.dapur_ids.forEach(did=>{
        const d=DAPUR_LIST.find(x=>String(x.id)===String(did));
        if(d) t+=`<button class="dtab" id="dtab-${d.id}" onclick="setActiveDapur('${d.id}',this)">${d.emoji} ${d.nama}</button>`;
      });
      tabs.innerHTML=t; ACTIVE_DAPUR=null;
    } else {
      bar.style.display='none';
      if(SESSION.dapur_ids && SESSION.dapur_ids.length===1) ACTIVE_DAPUR=SESSION.dapur_ids[0];
    }
    return;
  }

  // Kang Admin: tampilkan semua dapur
  bar.style.display='flex';
  let t=`<button class="dtab act" id="dtab-all" onclick="setActiveDapur(null,this)">🌐 Semua Dapur</button>`;
  DAPUR_LIST.forEach(d=>{
    t+=`<button class="dtab" id="dtab-${d.id}" onclick="setActiveDapur('${d.id}',this)">${d.emoji} ${d.nama}</button>`;
  });
  tabs.innerHTML=t;
}

function setActiveDapur(id,el){
  ACTIVE_DAPUR=id;
  document.querySelectorAll('.dtab').forEach(t=>t.classList.remove('act'));
  if(el) el.classList.add('act');
  renderDashboard(); renderTagihanTable(); renderSantri(); renderRiwayat(); renderRekap();
}

// ===== TABS =====
function hasAkses(fitur){
  if(isKangAdmin()) return true;
  const af = SESSION?.akses_fitur;
  if(!af || !af.length) return true; // kosong = semua akses
  return af.includes(fitur);
}

function buildTabs(){
  const isAdmin=isKangAdmin();
  const tabs=document.getElementById('main-tabs');
  let t='';
  if(hasAkses('dashboard')) t+=tab('dashboard',svgIcon('home',14)+' Dashboard');
  if(hasAkses('tagihan')) t+=tab('tagihan',svgIcon('document',14)+' Tagihan');
  if(hasAkses('santri')) t+=tab('santri',svgIcon('users',14)+' Santri');
  if(hasAkses('rekap')) t+=tab('rekap',svgIcon('trending-up',14)+' Rekap Tunggakan');
  if(hasAkses('kelulusan')) t+=tab('kelulusan',svgIcon('graduation-cap',14)+' Kelulusan');
  if(hasAkses('riwayat')) t+=tab('riwayat',svgIcon('document',14)+' Riwayat');
  if(hasAkses('tfadmin')) t+=tab('tfadmin',svgIcon('bank',14)+' TF Admin');
  if(hasAkses('import')) t+=tab('import',svgIcon('upload',14)+' Import');
  if(hasAkses('kobong')) t+=tab('kobong',svgIcon('home',14)+' Kobong');
  if(isAdmin){
    t+=tab('manajemen',svgIcon('users',14)+' Manajemen Bendahara');
    t+=tab('monitor',svgIcon('eye',14)+' Monitor');
    t+=tab('tanpaDapur',svgIcon('alert-triangle',14)+' Tanpa Dapur');
    t+=tab('generate',svgIcon('refresh',14)+' Generate Tagihan');
    t+=tab('notifikasi',svgIcon('bell',14)+' Notifikasi');
    t+=tab('pengaturan',svgIcon('settings',14)+' Pengaturan');
  }
  tabs.innerHTML=t;
  buildMobileNavBD();
  buildSidebarBD();

  // Set SQL migrasi di pengaturan
  if(isAdmin){
    const sqlEl = document.getElementById('sql-migrasi');
    if(sqlEl) sqlEl.value = getSQLMigrasi();
  }
}
function tab(id,l){ return `<button class="tb" id="tab-${id}" onclick="showTab('${id}')">${l}</button>`; }

// ===== SIDEBAR DESKTOP: menu dikelompokkan per kategori, item difilter otomatis
// sesuai akses (cuma ditampilkan kalau tab-nya beneran ada di #main-tabs) =====
const SIDEBAR_GROUPS_BD = [
  { label:'Utama', items:[
    {id:'dashboard', label:'Dashboard', icon:'home'},
  ]},
  { label:'Tagihan & Pembayaran', items:[
    {id:'tagihan', label:'Tagihan', icon:'document'},
    {id:'riwayat', label:'Riwayat', icon:'document'},
    {id:'tfadmin', label:'TF Admin', icon:'bank'},
    {id:'import', label:'Import', icon:'upload'},
  ]},
  { label:'Data Santri', items:[
    {id:'santri', label:'Santri', icon:'users'},
    {id:'kobong', label:'Kobong', icon:'home'},
    {id:'rekap', label:'Rekap Tunggakan', icon:'trending-up'},
    {id:'kelulusan', label:'Kelulusan', icon:'graduation-cap'},
  ]},
  { label:'Administrasi', items:[
    {id:'manajemen', label:'Manajemen Bendahara', icon:'users'},
    {id:'monitor', label:'Monitor', icon:'eye'},
    {id:'tanpaDapur', label:'Tanpa Dapur', icon:'alert-triangle'},
    {id:'generate', label:'Generate Tagihan', icon:'refresh'},
    {id:'notifikasi', label:'Notifikasi', icon:'bell'},
    {id:'pengaturan', label:'Pengaturan', icon:'settings'},
  ]},
];

function buildSidebarBD(){
  const nav = document.getElementById('sidebar-nav-bd');
  if(!nav) return;
  let html = '';
  SIDEBAR_GROUPS_BD.forEach(g=>{
    const items = g.items.filter(m=>document.getElementById('tab-'+m.id));
    if(!items.length) return;
    html += `<div class="sidebar-group"><div class="sidebar-group-label">${g.label}</div>`;
    items.forEach(m=>{
      html += `<button class="sidebar-item" id="sbar-bd-${m.id}" onclick="showTab('${m.id}')">
        <span class="sidebar-item-ic">${svgIcon(m.icon,18)}</span>
        <span class="sidebar-item-label">${m.label}</span>
      </button>`;
    });
    html += `</div>`;
  });
  nav.innerHTML = html;
  syncSidebarActiveBD();
}

const TAB_TITLES_BD = {
  dashboard:'Dashboard', tagihan:'Tagihan', santri:'Santri', rekap:'Rekap Tunggakan',
  kelulusan:'Kelulusan', riwayat:'Riwayat', tfadmin:'TF Admin', import:'Import',
  kobong:'Kobong', manajemen:'Manajemen Bendahara', monitor:'Monitor',
  tanpaDapur:'Tanpa Dapur', generate:'Generate Tagihan', notifikasi:'Notifikasi', pengaturan:'Pengaturan',
};

function syncSidebarActiveBD(){
  const activeTab = document.querySelector('.tb.act');
  const id = activeTab ? activeTab.id.replace('tab-','') : null;
  document.querySelectorAll('.sidebar-item').forEach(b=>b.classList.remove('act'));
  if(id) document.getElementById('sbar-bd-'+id)?.classList.add('act');
  const titleEl = document.getElementById('topbar-title-bd');
  if(titleEl) titleEl.textContent = TAB_TITLES_BD[id] || 'Dashboard';
}

// Kotak cari di topbar desktop -- filter langsung tabel tab aktif kalau ada
// search box-nya, kalau tidak loncat ke tab Tagihan dulu.
const BD_TOPBAR_SEARCH_MAP = {
  tagihan: {input:'cari-tagihan', fn:()=>renderTagihanTable()},
  santri: {input:'cari-santri', fn:()=>renderSantri()},
  rekap: {input:'cari-rekap', fn:()=>renderRekap()},
  kelulusan: {input:'cari-kelulusan', fn:()=>renderKelulusan()},
  tfadmin: {input:'cari-tf', fn:()=>renderTFAdmin()},
  riwayat: {input:'cari-riwayat', fn:()=>renderRiwayat()},
};
function topbarSearchGoBD(value){
  let activeId = document.querySelector('.tb.act')?.id?.replace('tab-','');
  if(!BD_TOPBAR_SEARCH_MAP[activeId] && value.trim()!==''){
    showTab('tagihan');
    activeId = 'tagihan';
  }
  const cfg = BD_TOPBAR_SEARCH_MAP[activeId];
  if(cfg){
    const el = document.getElementById(cfg.input);
    if(el){ el.value = value; cfg.fn(); }
  }
}

// ===== SIDEBAR DESKTOP: ciutkan/lebarkan -- tersimpan per-browser =====
function toggleSidebarCollapseBD(){
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebar_collapsed_bd', collapsed ? '1' : '0');
}
function initSidebarCollapseBD(){
  if(localStorage.getItem('sidebar_collapsed_bd') === '1') document.body.classList.add('sidebar-collapsed');
}
initSidebarCollapseBD();

// Sidebar + topbar desktop -- nama/role/avatar, dipanggil sekali di enterApp().
function updateSidebarProfileBD(){
  if(!SESSION) return;
  const isAdmin = isKangAdmin();
  const nama = SESSION.nama || 'Pengguna';
  const roleLabel = isAdmin ? 'Admin' : 'Pengelola Dapur';
  ['sidebar-profile-name-bd','topbar-profile-name-bd'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent = nama; });
  ['sidebar-profile-role-bd','topbar-profile-role-bd'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent = roleLabel; });
  const initial = (nama||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  ['sidebar-av-bd','topbar-av-bd'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent = initial; });
  const subEl = document.getElementById('sidebar-brand-sub-bd');
  if(subEl) subEl.textContent = CONFIG.pesantren_nama || 'Pondok Pesantren';
}

// ===== MOBILE NAV: bottom nav (5 utama) + grid "Fitur Lainnya" (HP saja) =====
// Diporting 1:1 dari pola Saku Santri: dibangun dari tab yang SUDAH ada di
// #main-tabs, otomatis ikut aturan akses (hasAkses/isAdmin) yang sama.
const MENU_LAINNYA_BD = [
  {id:'rincianDapur', label:'Rincian Dapur', icon:svgIcon('trending-up'), c:'gg', action:'toggleRincianDapurBD()'},
  {id:'kelulusan', label:'Kelulusan', icon:svgIcon('graduation-cap'), c:'p'},
  {id:'tfadmin', label:'TF Admin', icon:svgIcon('bank'), c:'gg'},
  {id:'import', label:'Import', icon:svgIcon('upload'), c:'b'},
  {id:'kobong', label:'Kobong', icon:svgIcon('home'), c:'g'},
  {id:'manajemen', label:'Manajemen', icon:svgIcon('users'), c:'g'},
  {id:'monitor', label:'Monitor', icon:svgIcon('eye'), c:'b'},
  {id:'tanpaDapur', label:'Tanpa Dapur', icon:svgIcon('alert-triangle'), c:'r'},
  {id:'generate', label:'Generate Tagihan', icon:svgIcon('refresh'), c:'gg'},
  {id:'notifikasi', label:'Notifikasi', icon:svgIcon('bell'), c:'gg'},
  {id:'pengaturan', label:'Pengaturan', icon:svgIcon('settings'), c:'r'},
];

function buildMobileNavBD(){
  const bnav = document.getElementById('bottom-nav-bd');
  const grid = document.getElementById('mnav-grid-bd');
  if(!bnav || !grid) return;
  document.body.classList.add('has-bnav');

  const primer = [
    {id:'dashboard', label:'Dashboard', icon:svgIcon('home',20)},
    {id:'tagihan', label:'Tagihan', icon:svgIcon('document',20)},
    {id:'santri', label:'Santri', icon:svgIcon('users',20)},
    {id:'rekap', label:'Tunggakan', icon:svgIcon('trending-up',20)},
    {id:'riwayat', label:'Riwayat', icon:svgIcon('document',20)},
  ].filter(m => document.getElementById('tab-'+m.id));

  bnav.innerHTML = '<span class="bnav-highlight" id="bnav-highlight-bd"></span>' + primer.map(m => `
    <button class="bnav-item" id="bnav-bd-${m.id}" onclick="showTab('${m.id}')">
      <span class="bnav-ic">${m.icon}</span><span>${m.label}</span>
    </button>`).join('');
  requestAnimationFrame(moveBnavHighlightBD);
  window.addEventListener('resize', moveBnavHighlightBD);

  const lainnya = MENU_LAINNYA_BD.filter(m => m.action || document.getElementById('tab-'+m.id));
  grid.innerHTML = lainnya.length ? `
    <div class="mnav-label"><i></i>Fitur Lainnya</div>
    <div class="mnav-items">
      ${lainnya.map(m => `
        <button class="mnav-item" onclick="${m.action || `showTab('${m.id}')`}">
          <span class="sci ${m.c}">${m.icon}</span><span>${m.label}</span>
        </button>`).join('')}
    </div>` : '';
}

function toggleRincianDapurBD(){
  const el = document.getElementById('dapur-cards-wrap');
  if(!el) return;
  el.classList.toggle('show');
  if(el.classList.contains('show')) el.scrollIntoView({behavior:'smooth', block:'start'});
}

function moveBnavHighlightBD(){
  // Desktop: bottom-nav disembunyikan total, jangan baca offsetWidth/offsetLeft
  // di sini -- itu bikin browser paksa hitung layout (reflow) tiap ganti tab,
  // padahal hasilnya gak kepakai sama sekali karena elemennya display:none.
  if(window.innerWidth > 640) return;
  const hl = document.getElementById('bnav-highlight-bd');
  const active = document.querySelector('#bottom-nav-bd .bnav-item.act');
  if(!hl || !active) { if(hl) hl.style.opacity = '0'; return; }
  hl.style.opacity = '1';
  hl.style.width = active.offsetWidth - 12 + 'px';
  hl.style.transform = 'translateX(' + (active.offsetLeft + 6) + 'px)';
}

// ===== PANEL AKUN (geser dari kanan, HP saja) =====
function openAccountDrawerBD(){
  const isAdmin = isKangAdmin();
  const av = document.getElementById('acc-av-bd');
  av.textContent = (SESSION.nama||'P').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  document.getElementById('acc-name-bd').textContent = SESSION.nama || 'Pengguna';
  document.getElementById('acc-user-bd').textContent = '@' + (SESSION.username || '—');
  document.getElementById('acc-role-badge-bd').textContent = isAdmin ? '👑 Admin' : '🍳 Pengelola Dapur';
  document.getElementById('acc-dapur-bd').textContent = isAdmin
    ? 'Semua Dapur'
    : (SESSION.dapur_ids && SESSION.dapur_ids.length ? SESSION.dapur_ids.map(id=>getDapurNama(id)).join(', ') : '—');
  document.getElementById('acc-periode-bd').textContent = CONFIG.bulan_aktif || '—';

  const waAdminUrl = `https://wa.me/6287789179398?text=${encodeURIComponent('Assalamualaikum, saya '+(SESSION.nama||'bendahara')+' butuh bantuan terkait aplikasi Bendahara.')}`;
  const items = [
    {ic:svgIcon('person'), title:'Profil Saya', sub:'Lihat & edit profil', onclick:"closeAccountDrawerBD();bukaModalProfil()"},
  ];
  if(isAdmin){
    items.push({ic:svgIcon('settings'), title:'Pengaturan', sub:'Preferensi aplikasi', onclick:"closeAccountDrawerBD();showTab('pengaturan')"});
  }
  items.push({ic:svgIcon('help-circle'), title:'Bantuan', sub:'Hubungi admin via WhatsApp', onclick:`closeAccountDrawerBD();window.open('${waAdminUrl}','_blank')`});

  document.getElementById('acc-menu-bd').innerHTML = items.map(m => `
    <button class="acc-menu-item" onclick="${m.onclick}">
      <span class="acc-menu-ic">${m.ic}</span>
      <span class="acc-menu-txt"><b>${m.title}</b><span>${m.sub}</span></span>
      <span class="acc-menu-chev">›</span>
    </button>`).join('');

  document.getElementById('acc-overlay-bd').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeAccountDrawerBD(){
  document.getElementById('acc-overlay-bd').classList.remove('show');
  document.body.style.overflow = '';
}

// ===== BEL NOTIFIKASI (baca-saja, HP saja) =====
// Sumber sama persis push_notifications yang dikirim Kang Admin dari Saku
// Santri -- kalau dihapus di sana, otomatis hilang di sini juga (1 tabel).
let _notifBaruCountBD = 0;
function _notifLastSeenKeyBD(){ return 'notif_last_seen_id_bd_'+(SESSION?.username||'guest'); }

async function updateBadgeNotifikasiBD(){
  if(!SESSION){ _notifBaruCountBD = 0; return; }
  try{
    const lastSeen = parseInt(localStorage.getItem(_notifLastSeenKeyBD())||'0');
    const {data} = await SB.from('push_notifications').select('id',{count:'exact'}).or('app_source.eq.bendahara,app_source.is.null').gt('id', lastSeen);
    _notifBaruCountBD = data?.length||0;
  } catch(e){ _notifBaruCountBD = 0; }
  const el = document.getElementById('badge-notif-bell-bd');
  if(el){
    el.style.display = _notifBaruCountBD>0 ? 'inline' : 'none';
    el.textContent = _notifBaruCountBD>9 ? '9+' : _notifBaruCountBD;
  }
  const dot = document.getElementById('topbar-bell-dot-bd');
  if(dot) dot.style.display = _notifBaruCountBD>0 ? 'block' : 'none';
}

async function openNotifBellPanelBD(){
  openMo('mo-notif-bell-bd');
  const listEl = document.getElementById('notif-bell-list-bd');
  listEl.innerHTML = '<div class="empty"><span class="ei">🔔</span><p>Memuat...</p></div>';
  const { data: riwayat } = await SB.from('push_notifications').select('*').or('app_source.eq.bendahara,app_source.is.null').order('created_at', {ascending:false}).limit(20);
  if(riwayat?.length){
    const maxId = Math.max(...riwayat.map(n=>n.id));
    localStorage.setItem(_notifLastSeenKeyBD(), String(maxId));
    _notifBaruCountBD = 0;
    updateBadgeNotifikasiBD();
  }
  if(!riwayat?.length){
    listEl.innerHTML = '<div class="empty"><span class="ei">🔔</span><p>Belum ada notifikasi</p></div>';
    return;
  }
  listEl.innerHTML = riwayat.map(n=>{
    const tgl = new Date(n.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div style="border:1.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="font-weight:700;font-size:13px">${n.judul}</div>
      <div style="font-size:12px;color:var(--text-m);margin-top:2px">${n.pesan}</div>
      <div style="font-size:11px;color:var(--text-l);margin-top:4px">${tgl}</div>
    </div>`;
  }).join('');
}

// ===== KIRIM NOTIFIKASI (Kang Admin) — porting dari Saku Santri, target
// diambil dari ALL_AKUN (akun bendahara) karena di sini gak ada mekanisme
// push_subscriptions sendiri. Nulis ke tabel push_notifications yang sama. =====
function onNotifTipeChangeBD(){
  const tipe = document.getElementById('notif-tipe-bd')?.value;
  const judulEl = document.getElementById('notif-judul-bd');
  const pesanEl = document.getElementById('notif-pesan-bd');
  if(tipe==='tutup_bulan'){
    if(judulEl) judulEl.value = '📅 Pengingat Tutup Bulan';
    if(pesanEl) pesanEl.value = `Mohon segera selesaikan input data bulan ${bulanAktif()} sebelum ditutup. Pastikan semua transaksi sudah tercatat dengan benar.`;
  } else {
    if(judulEl) judulEl.value = '';
    if(pesanEl) pesanEl.value = '';
  }
}

async function renderNotifikasiBD(){
  const sel = document.getElementById('notif-target-bd');
  if(sel){
    sel.innerHTML = '<option value="">Semua Pengelola</option>';
    (ALL_AKUN||[]).forEach(a=>{
      sel.innerHTML += `<option value="${a.username}">${a.nama_tampilan||a.username}</option>`;
    });
  }
  const { data: riwayat } = await SB.from('push_notifications').select('*').or('app_source.eq.bendahara,app_source.is.null').order('created_at', {ascending:false}).limit(20);
  const listEl = document.getElementById('notif-riwayat-list-bd');
  if(!listEl) return;
  if(!riwayat?.length){ listEl.innerHTML='<div style="color:var(--text-l);font-size:13px;text-align:center;padding:16px">Belum ada notifikasi dikirim</div>'; return; }
  listEl.innerHTML = riwayat.map(n=>{
    const tgl = new Date(n.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div style="border:1.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${n.judul}</div>
          <div style="font-size:12px;color:var(--text-m);margin-top:2px">${n.pesan}</div>
          <div style="font-size:11px;color:var(--text-l);margin-top:4px">
            ${n.target_username?`👤 ${n.target_username}`:'👥 Semua'} · ${tgl}
          </div>
        </div>
        <button onclick="hapusNotifikasiBD(${n.id})" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--red);font-size:13px" title="Hapus">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

async function kirimNotifikasiBD(){
  const judul = document.getElementById('notif-judul-bd')?.value?.trim();
  const pesan = document.getElementById('notif-pesan-bd')?.value?.trim();
  const tipe = document.getElementById('notif-tipe-bd')?.value;
  const target = document.getElementById('notif-target-bd')?.value;

  if(!judul){ toast('Isi judul notifikasi!', false); return; }
  if(!pesan){ toast('Isi pesan notifikasi!', false); return; }

  toast('⏳ Mengirim notifikasi...');
  try{
    const res = await fetch('https://menfnmfwtxgcgvkbbjxh.supabase.co/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmZubWZ3dHhnY2d2a2JianhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ2NjUsImV4cCI6MjA5NTU3MDY2NX0.-xenaY9VPUzodik7nnN1emtnhg0WTqdU6dToyXSpwec`
      },
      body: JSON.stringify({
        judul, pesan, tipe,
        target_username: target || null,
        dikirim_oleh: SESSION?.username || 'kangadmin',
        app_source: 'bendahara'
      })
    });
    const data = await res.json();
    if(data.success){
      toast(`✅ Notifikasi terkirim!`);
      document.getElementById('notif-judul-bd').value='';
      document.getElementById('notif-pesan-bd').value='';
      renderNotifikasiBD();
    } else {
      toast('Gagal kirim: '+(data.error||'Unknown error'), false);
    }
  } catch(e){
    toast('Error: '+e.message, false);
  }
}

async function hapusNotifikasiBD(id){
  konfirm('Hapus notifikasi ini?', async()=>{
    const {error} = await SB.from('push_notifications').delete().eq('id', id);
    if(error){ toast('Gagal hapus: '+error.message, false); return; }
    toast('🗑️ Notifikasi dihapus!');
    renderNotifikasiBD();
  }, 'hapus');
}

function showTab(id){
  const isAdmin=isKangAdmin();
  // Cek role dari hdr-role sebagai fallback jika SESSION belum siap
  const isAdminFallback = document.getElementById('hdr-role')?.textContent?.includes('Admin');
  if(['pengaturan','manajemen','monitor','tanpaDapur','generate','notifikasi'].includes(id) && !isAdmin && !isAdminFallback) return;

  // Reset filter saat pindah tab
  resetFiltersBendahara();

  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('act'));
  document.querySelectorAll('.tb').forEach(t=>t.classList.remove('act'));
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('act'));
  const s=document.getElementById('sec-'+id), t=document.getElementById('tab-'+id);
  if(s) s.classList.add('act'); if(t) t.classList.add('act');
  document.getElementById('bnav-bd-'+id)?.classList.add('act');
  moveBnavHighlightBD();
  syncSidebarActiveBD();
  if(id==='dashboard') renderDashboard();
  if(id==='tagihan') renderTagihanTable();
  if(id==='santri') renderSantri();
  if(id==='rekap') renderRekap();
  if(id==='kelulusan') renderKelulusan();
  if(id==='riwayat') renderRiwayat();
  if(id==='tfadmin') renderTFAdmin();
  if(id==='kobong') renderKobongBendahara();
  if(id==='manajemen') renderManajemenBendahara();
  if(id==='monitor') renderMonitor();
  if(id==='pengaturan') renderPengaturan();
  if(id==='tanpaDapur') renderTanpaDapur();
  if(id==='notifikasi') renderNotifikasiBD();
  if(id==='generate'){ renderKonfigurasiTagihanPanel(); renderGeneratePanel(); }
}

// ===== FILL SELECTS =====
function fillSelects(){
  const isAdmin=isKangAdmin();
  // Dapur select di form santri
  const dapurOpts = DAPUR_LIST.map(d=>`<option value="${d.id}">${d.emoji} ${d.nama}</option>`).join('');
  ['s-dapur','akun-dapur'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML='<option value="">-- Pilih Dapur --</option>'+dapurOpts; });

  // Asrama select
  ['filter-asrama-tagihan','filter-asrama-santri','filter-asrama-rekap','s-asrama'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur = el.value;
    const hasAll = id!=='s-asrama';
    const asramaOptsSel = ALL_ASRAMA.map(a=>`<option value="${a.id}" ${cur===String(a.id)?'selected':''}>${a.nama}</option>`).join('');
    el.innerHTML=(hasAll?'<option value="">Semua Asrama</option>':'')+asramaOptsSel;
  });

  // Populate wali dropdowns
  const waliList = [...new Set(ALL_SANTRI.map(s=>s.created_by).filter(Boolean))].sort();
  ['filter-wali-tagihan','filter-wali-rekap'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="">Semua Wali</option>`;
    // Cari nama pengurus jika ada
    waliList.forEach(w=>{
      const pg = ALL_AKUN?.find(b=>b.username===w)||{nama_tampilan:w};
      el.innerHTML += `<option value="${w}" ${cur===w?'selected':''}>${pg.nama_tampilan||w}</option>`;
    });
  });

  ['filter-kobong-tagihan','filter-kobong-santri','filter-kobong-rekap'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur = el.value;
    const kobongOptsSel = ALL_KOBONG.map(k=>`<option value="${k.id}" ${cur===String(k.id)?'selected':''}>${k.nama}</option>`).join('');
    el.innerHTML='<option value="">Semua Kobong</option>'+kobongOptsSel;
  });

  // Kelas dari data santri
  const kelasSet = new Set(ALL_SANTRI.map(s=>s.kelas).filter(Boolean));
  const kelasList = [...kelasSet].sort((a,b)=>parseInt(a)-parseInt(b));
  ['filter-kelas-tagihan','filter-kelas-santri','filter-kelas-rekap'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur = el.value;
    const kelasOptsSel = kelasList.map(k=>`<option value="${k}" ${cur===String(k)?'selected':''}>${k}</option>`).join('');
    el.innerHTML='<option value="">Semua Kelas</option>'+kelasOptsSel;
  });

  // Nama bulan untuk sorting yang benar
  const URUTAN_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function bulanOrder(b){
    if(!b) return 9999;
    const [nama, thn] = b.split(' ');
    const bi = URUTAN_BULAN.indexOf(nama);
    return parseInt(thn||0)*12 + (bi>=0?bi:99);
  }

  // Bulan di tagihan filter — urut benar, terbaru di atas
  const bulanSet = new Set(ALL_TAGIHAN.map(t=>t.bulan).filter(Boolean));
  const bulanSorted = [...bulanSet].sort((a,b)=>bulanOrder(b)-bulanOrder(a)); // desc (terbaru dulu)
  const bulanOptsBase = bulanSorted.map(b=>`<option value="${b}">${b}</option>`).join('');
  ['filter-bulan-tagihan','filter-bulan-riwayat','filter-bulan-rekap'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur = el.value;
    const bulanOptsSel = bulanSorted.map(b=>`<option value="${b}" ${cur===b?'selected':''}>${b}</option>`).join('');
    el.innerHTML='<option value="">Semua Bulan</option>'+bulanOptsSel;
  });
  // wa-bulan tetap seperti biasa
  const waEl=document.getElementById('wa-bulan');
  if(waEl) waEl.innerHTML='<option value="">Bulan aktif</option>'+bulanOptsBase;

  // Tahun dropdown — ambil dari bulan yang ada
  const tahunSet = new Set(bulanSorted.map(b=>b.split(' ')[1]).filter(Boolean));
  const tahunSorted = [...tahunSet].sort((a,b)=>parseInt(b)-parseInt(a));
  ['filter-tahun-tagihan','filter-tahun-riwayat','filter-tahun-rekap','filter-tahun-tf'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur = el.value;
    const tahunOptsSel = tahunSorted.map(t=>`<option value="${t}" ${cur===t?'selected':''}>${t}</option>`).join('');
    el.innerHTML='<option value="">Semua Tahun</option>'+tahunOptsSel;
  });

  // Hapus semua button — hanya kangadmin
  const btnHapus = document.getElementById('btn-hapus-semua');
  const btnHapusSm = document.getElementById('btn-hapus-semua-set');
  if(btnHapus) btnHapus.style.display=isAdmin?'inline-flex':'none';
  if(btnHapusSm) btnHapusSm.style.display=isAdmin?'inline-flex':'none';
}


function renderKobongBendahara(){
  const isAdmin = SESSION.role === 'kangadmin';
  const container = document.getElementById('asrama-kobong-grid-bend');
  if(!container) return;

  // Filter asrama berdasarkan akses bendahara
  let visibleAsrama = ALL_ASRAMA;
  if(!isAdmin && SESSION.akses_asrama && SESSION.akses_asrama.length > 0){
    visibleAsrama = ALL_ASRAMA.filter(a => SESSION.akses_asrama.includes(String(a.id)));
  }

  // Simpan state expand sebelumnya
  const expandedIds = new Set([...document.querySelectorAll('.asrama-block.expanded')].map(el=>el.dataset.id));

  let html = '';
  visibleAsrama.forEach(a => {
    const kobongs = ALL_KOBONG.filter(k=>String(k.asrama_id)===String(a.id));
    const santriCount = ALL_SANTRI.filter(s=>kobongs.map(k=>k.id).includes(s.kobong_id)).length;
    const isExpanded = expandedIds.has(String(a.id));

    let kobongHtml = '';
    if(kobongs.length){
      kobongHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:12px">' +
        kobongs.map(k=>{
          const kSantri = ALL_SANTRI.filter(s=>s.kobong_id===k.id);
          const count = kSantri.length;
          const tunggakan = ALL_TAGIHAN ? ALL_TAGIHAN.filter(t=>kSantri.map(s=>String(s.id)).includes(String(t.santri_id)) && t.status!=='lunas').length : 0;
          return `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:12px;cursor:pointer" onclick="lihatSantriKobongBend(${k.id})">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">🏠 ${k.nama}</div>
            <div style="font-size:12px;color:var(--text-l);margin-bottom:6px">${k.keterangan||'—'}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px">
              <span>👥 ${count} santri</span>
              ${tunggakan>0?`<span style="color:var(--red);font-weight:600">⚠️ ${tunggakan} tunggakan</span>`:'<span style="color:var(--green)">✅ Lunas</span>'}
            </div>
          </div>`;
        }).join('') +
      '</div>';
    } else {
      kobongHtml = '<div style="padding:12px 0;color:var(--text-l);font-size:13px">Belum ada kobong di asrama ini.</div>';
    }

    html += `<div class="asrama-block ${isExpanded?'expanded':''}" data-id="${a.id}">
      <div class="asrama-block-header" onclick="toggleAsramaBlockBend(this)">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
          <h3>🏛️ ${a.nama}</h3>
          <span style="font-size:12px;color:var(--text-l);background:var(--bg);padding:2px 8px;border-radius:20px">${kobongs.length} kobong · ${santriCount} santri</span>
        </div>
        <span class="asrama-chevron">▼</span>
      </div>
      <div class="asrama-block-body ${isExpanded?'open':''}">
        ${kobongHtml}
      </div>
    </div>`;
  });

  container.innerHTML = html || '<div class="empty"><span class="ei">🏛️</span><p>Belum ada asrama.</p></div>';
}

function toggleAsramaBlockBend(headerEl){
  const block = headerEl.closest('.asrama-block');
  const body = block.querySelector('.asrama-block-body');
  const isOpen = block.classList.contains('expanded');
  block.classList.toggle('expanded', !isOpen);
  body.classList.toggle('open', !isOpen);
}

function lihatSantriKobongBend(kobongId){
  const k = ALL_KOBONG.find(x=>x.id===kobongId); if(!k) return;
  const aNama = ALL_ASRAMA.find(a=>a.id===k.asrama_id)?.nama||'—';
  const santris = ALL_SANTRI.filter(s=>s.kobong_id===kobongId);
  const tagihanKobong = ALL_TAGIHAN ? ALL_TAGIHAN.filter(t=>santris.map(s=>String(s.id)).includes(String(t.santri_id))) : [];

  // Buat modal sederhana
  konfirm(
    `<div style="text-align:left">
      <div style="font-size:11px;color:var(--text-l);margin-bottom:4px">🏛️ ${aNama}</div>
      <div style="font-family:'Amiri',serif;font-size:18px;font-weight:700;margin-bottom:12px">🏠 ${k.nama}</div>
      <div style="max-height:300px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--green);color:#fff">
            <th style="padding:7px 10px;text-align:left">Santri</th>
            <th style="padding:7px 10px;text-align:left">Kelas</th>
            <th style="padding:7px 10px;text-align:right">Tunggakan</th>
          </tr></thead>
          <tbody>
            ${santris.length ? santris.map(s=>{
              const tg = tagihanKobong.filter(t=>String(t.santri_id)===String(s.id) && t.status!=='lunas');
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px 10px;font-weight:500">${s.nama}</td>
                <td style="padding:8px 10px;color:var(--text-l)">${s.kelas||'—'}</td>
                <td style="padding:8px 10px;text-align:right;${tg.length?'color:var(--red);font-weight:600':'color:var(--green)'}">${tg.length ? tg.length+' tagihan' : '✅'}</td>
              </tr>`;
            }).join('') : '<tr><td colspan="3" style="padding:16px;text-align:center;color:var(--text-l)">Belum ada santri</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`,
    null, 'info'
  );
}

function filterKobongBySantriAsrama(){
  const asramaId = document.getElementById('filter-asrama-santri')?.value||'';
  const el = document.getElementById('filter-kobong-santri'); if(!el) return;
  let kobong = asramaId ? ALL_KOBONG.filter(k=>String(k.asrama_id||'')==asramaId) : ALL_KOBONG;
  el.innerHTML='<option value="">Semua Kobong</option>'+kobong.map(k=>`<option value="${k.id}">${k.nama}</option>`).join('');
}

function onAsramaChange(){
  const asramaId = document.getElementById('s-asrama')?.value||'';
  const el=document.getElementById('s-kobong'); if(!el) return;
  const kobong = asramaId ? ALL_KOBONG.filter(k=>String(k.asrama_id||'')==asramaId) : ALL_KOBONG;
  el.innerHTML='<option value="">-- Pilih Kobong (opsional) --</option>'+kobong.map(k=>`<option value="${k.id}">${k.nama}</option>`).join('');
  // Auto isi jenis kelamin dari nama asrama
  const genderEl = document.getElementById('s-gender');
  if(genderEl && asramaId){
    const asrama = ALL_ASRAMA.find(a=>String(a.id)===String(asramaId));
    const nama = (asrama?.nama||'').toLowerCase();
    if(nama.includes('putra')||nama.includes('badri')||nama.includes('marfu')||nama.includes('putra')) genderEl.value='Putra';
    else if(nama.includes('putri')||nama.includes('ummi')||nama.includes('aisyah')||nama.includes('astri')) genderEl.value='Putri';
    else genderEl.value='';
    genderEl.placeholder = genderEl.value || '— otomatis dari asrama —';
  } else if(genderEl){
    genderEl.value='';
    genderEl.placeholder='— otomatis dari asrama —';
  }
}

