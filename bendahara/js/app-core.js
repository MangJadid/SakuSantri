const { createClient } = supabase;
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
    if(pb) pb.style.width='0%';
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
  if(pb) pb.style.width=`${Math.round((current/total)*100)}%`;
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
let santriPage = 1, tagihanPage = 1, riwayatPage = 1;
const PAGE_SIZE = 20;
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
  const SB_URL = 'https://tajdid.jadidsaepul0.workers.dev';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmZubWZ3dHhnY2d2a2JianhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ2NjUsImV4cCI6MjA5NTU3MDY2NX0.-xenaY9VPUzodik7nnN1emtnhg0WTqdU6dToyXSpwec';
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
            toast('⚠️ Anda telah di-logout oleh Kang Admin', false);
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
      await SB.from('bendahara_users').upsert({
        username:'admin', password_hash:await sha256('admin123'),
        nama_tampilan:'Kang Admin / Bendahara Utama', role:'super', dapur_id:null
      },{onConflict:'username'});
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
    // Ambil data dari tabel dulu untuk validasi is_blocked
    const {data,error} = await SB.from('bendahara_users').select('*').eq('username',user).single();
    if(error||!data){ hideLoginOverlay(); showLoginErr('❌ Username tidak ditemukan!'); return; }
    if(data.is_blocked){ hideLoginOverlay(); showLoginErr('⛔ Akun diblokir. Hubungi Kang Admin.'); return; }

    // Coba login via Supabase Auth
    const email = user + '@annur.internal';
    const { data: authData, error: authErr } = await SB.auth.signInWithPassword({ email, password: pass });

    if(authErr){
      // Fallback: cek password lama SHA-256
      const passHash = await sha256(pass);
      if(data.password_hash !== passHash){ hideLoginOverlay(); showLoginErr('❌ Password salah!'); return; }
      // Password lama cocok - otomatis daftarkan ke Supabase Auth
      try{
        await SB.auth.signUp({ email, password: pass,
          options: { data: { username: user, nama: data.nama_tampilan, role: data.role } }
        });
        await SB.auth.signInWithPassword({ email, password: pass });
      } catch(e){}
    }

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
            toast('⚠️ Anda telah di-logout oleh Kang Admin', false);
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
  showLoginOverlay('Memverifikasi Kang Admin...');
  try {
    const {data:dp} = await SB.from('settings').select('value').eq('key','super_pass').single();
    const {data:du} = await SB.from('settings').select('value').eq('key','super_user').single();
    const storedPass = dp?.value||''; const storedUser = du?.value||'superadmin';
    if(user!==storedUser){ hideLoginOverlay(); showLoginErr('❌ Username salah!'); return; }

    // Coba login via Supabase Auth dulu
    const email = user + '@annur.internal';
    const { data: authData, error: authErr } = await SB.auth.signInWithPassword({ email, password: pass });

    if(authErr){
      // Fallback: cek password SHA-256
      const ok = await sha256(pass) === storedPass;
      if(!ok){ hideLoginOverlay(); showLoginErr('❌ Password salah!'); return; }
      // Daftarkan ke Supabase Auth
      try{
        await SB.auth.signUp({ email, password: pass,
          options: { data: { username: user, nama: 'Kang Admin', role: 'kangadmin' } }
        });
        await SB.auth.signInWithPassword({ email, password: pass });
      } catch(e){}
    }

    SESSION = {role:'kangadmin', nama:'Kang Admin', username:storedUser, dapur_id:null, akses_asrama:[]};
    saveSession(); trackActivity();
    MONITOR_INTERVAL = setInterval(async()=>{
      await trackActivity();
      if(SESSION?.id){
        try{
          const {data:chk} = await SB.from('bendahara_users').select('force_logout,is_blocked').eq('id',SESSION.id).single();
          if(chk?.force_logout || chk?.is_blocked){
            toast('⚠️ Anda telah di-logout oleh Kang Admin', false);
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
  document.getElementById('pg-app').style.display='block';
  document.getElementById('hdr-bulan').textContent = CONFIG.bulan_aktif||BULAN_AKTIF_DEFAULT;
  document.getElementById('hdr-role').textContent = isAdmin ? '👑 Kang Admin' : ('🍳 '+(SESSION.dapur_ids&&SESSION.dapur_ids.length>0?SESSION.dapur_ids.map(did=>getDapurNama(did)).join(', '):SESSION.nama||'Pengelola'));

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
function getSantriById(id){ return ALL_SANTRI.find(s=>String(s.id)===String(id)); }

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
// Ukuran font otomatis mengecil kalau teks nilainya makin panjang (cegah card kepotong/wrap aneh di HP)
function fitValPx(text, base=22, min=12){
  const len = String(text).length;
  if(len<=7) return base;
  if(len<=9) return base-3;
  if(len<=11) return base-6;
  if(len<=13) return Math.max(min, base-8);
  if(len<=16) return Math.max(min-1, base-10);
  return Math.max(min-2, 9);
}
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
  if(hasAkses('dashboard')) t+=tab('dashboard','📊 Dashboard');
  if(hasAkses('tagihan')) t+=tab('tagihan','📋 Tagihan');
  if(hasAkses('santri')) t+=tab('santri','👥 Santri');
  if(hasAkses('rekap')) t+=tab('rekap','📊 Rekap Tunggakan');
  if(hasAkses('kelulusan')) t+=tab('kelulusan','🎓 Kelulusan');
  if(hasAkses('riwayat')) t+=tab('riwayat','📜 Riwayat');
  if(hasAkses('tfadmin')) t+=tab('tfadmin','💸 TF Admin');
  if(hasAkses('import')) t+=tab('import','📥 Import');
  if(hasAkses('kobong')) t+=tab('kobong','🏠 Kobong');
  if(isAdmin){
    t+=tab('manajemen','👥 Manajemen Bendahara');
    t+=tab('monitor','👁️ Monitor');
    t+=tab('tanpaDapur','🍽️ Tanpa Dapur');
    t+=tab('generate','⚡ Generate Tagihan');
    t+=tab('pengaturan','⚙️ Pengaturan');
  }
  tabs.innerHTML=t;

  // Set SQL migrasi di pengaturan
  if(isAdmin){
    const sqlEl = document.getElementById('sql-migrasi');
    if(sqlEl) sqlEl.value = getSQLMigrasi();
  }
}
function tab(id,l){ return `<button class="tb" id="tab-${id}" onclick="showTab('${id}')">${l}</button>`; }

function showTab(id){
  const isAdmin=isKangAdmin();
  // Cek role dari hdr-role sebagai fallback jika SESSION belum siap
  const isAdminFallback = document.getElementById('hdr-role')?.textContent?.includes('Kang Admin');
  if(['pengaturan','manajemen','monitor','tanpaDapur','generate'].includes(id) && !isAdmin && !isAdminFallback) return;

  // Reset filter saat pindah tab
  resetFiltersBendahara();

  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('act'));
  document.querySelectorAll('.tb').forEach(t=>t.classList.remove('act'));
  const s=document.getElementById('sec-'+id), t=document.getElementById('tab-'+id);
  if(s) s.classList.add('act'); if(t) t.classList.add('act');
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

