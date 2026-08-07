
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

// ===== LOADING SCREEN: fade-out halus sebelum hilang =====
function hideLoadingScreen(){
  const el = document.getElementById('pg-loading');
  if(!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){ el.style.display='none'; return; }
  el.classList.add('pg-fade-out');
  setTimeout(()=>{ el.style.display='none'; }, 350);
}

// ===== SHA-256 HASHING (Web Crypto API) =====
async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ===== SESSION TIMEOUT (30 menit) =====
const SESSION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 jam
let sessionTimer = null;
let sessionExpireAt = null;

function resetSessionTimer(){
  clearTimeout(sessionTimer);
  sessionExpireAt = Date.now() + SESSION_TIMEOUT_MS;
  sessionTimer = setTimeout(()=>{
    toast('Sesi telah berakhir. Silakan login kembali.', false);
    setTimeout(doLogout, 1500);
  }, SESSION_TIMEOUT_MS);
}

function cancelSessionTimer(){
  clearTimeout(sessionTimer);
  sessionTimer = null;
  sessionExpireAt = null;
}

// Reset timer setiap ada aktivitas user
['click','keydown','touchstart'].forEach(ev=>{
  document.addEventListener(ev, ()=>{ if(SESSION) resetSessionTimer(); }, {passive:true});
});

// ===== CONFIG & STATE =====
let SB = null; // Supabase client
let CONFIG = {}; // {url, key, pesantren_nama, kritis_batas, bulan_aktif}

// ===== LOADING LOCK HELPER =====
let _isLoading = false;
function setLoading(loading, btnEl, originalText){
  _isLoading = loading;
  if(!loading) hideLoadingOverlay();
  const overlay = document.getElementById('loading-overlay');
  if(overlay && loading) overlay.style.display = 'flex';
  if(btnEl){
    if(loading){
      btnEl.disabled = true;
      btnEl._origText = btnEl.innerHTML;
      btnEl.innerHTML = '<span class="spin-inline"></span> Memproses...';
    } else {
      btnEl.disabled = false;
      btnEl.innerHTML = originalText || btnEl._origText || btnEl.innerHTML;
    }
  }
}

let SESSION = null; // {role:'super'|'pengurus'|'ortu', user:{...}, santri:{...}}

let ALL_SANTRI = [];
let ALL_KOBONG = [];
let ALL_ASRAMA = [];
let ALL_PENGURUS = [];
let ALL_TX = [];

// Debounce utility — cegah render berlebihan saat mengetik di kotak cari
function debounce(fn, delay=300){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); };
}
const renderTabelSantriDebounced = ()=>{ renderTabelSantri(); };
const renderDashboardDebounced = ()=>{ renderDashboard(); };
const renderRiwayatDebounced = ()=>{ renderRiwayat(); };
const COLORS = ['#1a5c3a','#2471a3','#6c3483','#c0392b','#e67e22','#148f77','#1e8449','#2980b9','#8e44ad','#c0392b','#d35400','#16a085'];

// ===== UTILS =====
const rp = v => 'Rp '+Math.abs(v||0).toLocaleString('id-ID');

// Format tanggal + hari: "Jumat, 29 Mei 2026"
const hariNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function fmtTanggal(tgl){
  if(!tgl) return '—';
  const d = new Date(tgl + 'T00:00:00');
  const hari = hariNames[d.getDay()];
  const tglNum = d.getDate();
  const bln = bNames[d.getMonth()];
  const thn = d.getFullYear();
  return `${hari}, ${tglNum} ${bln} ${thn}`;
}
const rpSaldo = v => (v < 0 ? `<span style="color:var(--red);font-weight:800">− Rp ${Math.abs(v||0).toLocaleString('id-ID')}</span>` : `Rp ${(v||0).toLocaleString('id-ID')}`);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const bNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const avColor = name => COLORS[name ? name.charCodeAt(0) % COLORS.length : 0];
const avLetter = name => (name||'?')[0].toUpperCase();

function toast(msg, ok=true){
  const w = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast '+(ok?'ok':'err');
  t.textContent = msg;
  w.appendChild(t);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(()=>{
    if(reduceMotion){ t.remove(); return; }
    t.classList.add('closing');
    setTimeout(()=>t.remove(), 200);
  }, 3500);
}

function openMo(id){
  const mo = document.getElementById(id);
  if(!mo) return;
  mo.classList.remove('closing');
  mo.classList.add('open');
}
function closeMo(id){
  const mo = document.getElementById(id);
  if(!mo || !mo.classList.contains('open') || mo.classList.contains('closing')) return;
  // Keluar cermin masuk (bukan teleport) -- tunggu animasi kelar baru display:none
  // beneran. Kalau reduced-motion aktif, animasinya sendiri udah dimatiin global
  // (lihat aturan @media di bawah), jadi gak perlu nunggu jeda tanpa alasan.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion){ mo.classList.remove('open'); return; }
  mo.classList.add('closing');
  setTimeout(()=>{ mo.classList.remove('open','closing'); }, 200);
}
document.addEventListener('click',e=>{if(e.target.classList.contains('mo'))closeMo(e.target.id)});

function konfirm(msg, fn, tipe, okLabel){
  // tipe: 'hapus' (default), 'wa', 'lainnya', 'duplikat'
  document.getElementById('hapus-msg').innerHTML = msg;
  const okBtn = document.getElementById('hapus-ok');
  const judul = document.getElementById('hapus-judul');
  const wrap = document.getElementById('hapus-msg-wrap');

  if(tipe === 'wa'){
    judul.textContent = '📲 Konfirmasi Kirim WA';
    okBtn.textContent = 'Ya, Kirim';
    okBtn.className = 'btn btn-wa';
    wrap.className = 'info-box';
  } else if(tipe === 'lainnya'){
    judul.textContent = '⚠️ Konfirmasi';
    okBtn.textContent = okLabel || 'Ya, Lanjutkan';
    okBtn.className = 'btn btn-g';
    wrap.className = 'warn-box';
  } else if(tipe === 'duplikat'){
    judul.textContent = '⚠️ Nama Serupa Ditemukan!';
    okBtn.textContent = 'Tetap Tambahkan';
    okBtn.className = 'btn btn-g';
    wrap.className = 'warn-box';
  } else if(tipe === 'simpan'){
    judul.textContent = '📋 Konfirmasi Edit';
    okBtn.textContent = okLabel || 'Simpan';
    okBtn.className = 'btn btn-p';
    wrap.className = 'info-box';
  } else if(tipe === 'pindah'){
    judul.textContent = '🏠 Pindah Kobong';
    okBtn.textContent = okLabel || 'Pindahkan';
    okBtn.className = 'btn btn-p';
    wrap.className = 'info-box';
  } else {
    judul.textContent = '⚠️ Konfirmasi Hapus';
    okBtn.textContent = 'Ya, Hapus';
    okBtn.className = 'btn btn-d';
    wrap.className = 'warn-box';
  }

  okBtn.onclick = ()=>{closeMo('mo-hapus');fn();};
  openMo('mo-hapus');
}

function switchRole(r){
  ['ortu','pengurus','super'].forEach(x=>{
    document.getElementById('rt-'+x).classList.toggle('act', x===r);
    document.getElementById('form-'+(x==='super'?'super':x)).style.display = x===r?'block':'none';
  });
  document.getElementById('login-err').style.display='none';
}

