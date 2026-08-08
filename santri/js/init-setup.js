// ===== INIT =====
// Bungkus promise jaringan dengan batas waktu -- tanpa ini, koneksi yang lambat/
// nyangkut bikin layar loading nunggu selamanya pas buka/masuk app lagi (baru bisa
// lanjut kalau user refresh manual, kadang harus dobel). Kalau lewat batas waktu,
// anggap "timedOut" dan lanjutkan alur normal alih-alih macet total.
function withTimeout(promise, ms){
  return Promise.race([
    Promise.resolve(promise).then(result => ({...result, timedOut:false})),
    new Promise(resolve => setTimeout(()=>resolve({timedOut:true}), ms))
  ]);
}

(async function init(){
  // Deteksi otomatis lingkungan: di localhost (XAMPP) pakai API lokal (lihat api/
  // dan shared/supabase-client.js), di domain publik pakai Supabase asli -- satu
  // kode buat dua tempat, gak perlu diubah manual tiap mau push/deploy. IP LAN
  // ikut dihitung lokal juga -- biar tes dari HP lewat IP komputer (bukan cuma
  // "localhost") tetap nyambung ke API lokal, samain sama cek di index.html.
  const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname)
    || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(location.hostname);
  const HARDCODED_URL = isLocalDev ? '../api' : 'https://tajdid.jadidsaepul0.workers.dev';
  const HARDCODED_KEY = isLocalDev
    ? 'e3d37d584dce22eba5836211744f18ffab5a7c663ef2fe48f5c2447fa3e8ac0e'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmZubWZ3dHhnY2d2a2JianhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ2NjUsImV4cCI6MjA5NTU3MDY2NX0.-xenaY9VPUzodik7nnN1emtnhg0WTqdU6dToyXSpwec';

  // Load config from localStorage
  const raw = localStorage.getItem('siujang_cfg');
  if(raw){ try{ CONFIG = JSON.parse(raw); }catch(e){} }

  // Always use hardcoded URL & key
  CONFIG.url = HARDCODED_URL;
  CONFIG.key = HARDCODED_KEY;
  localStorage.setItem('siujang_cfg', JSON.stringify(CONFIG));

  if(!CONFIG.url || !CONFIG.key){
    hideLoadingScreen();
    document.getElementById('pg-setup').style.display='flex';
    return;
  }

  // Init Supabase
  try{
    SB = supabase.createClient(CONFIG.url, CONFIG.key);
    // Test connection -- dikasih batas waktu 8 detik. Kalau nyangkut/timeout, JANGAN
    // lempar ke layar setup database (data sebenarnya sudah ada, cuma jaringan lambat) --
    // lanjut aja ke alur normal biar user gak nyangkut di loading screen selamanya.
    const {error, timedOut} = await withTimeout(
      SB.from('santri').select('id',{count:'exact',head:true}), 8000
    );
    if(!timedOut && error && error.code === '42P01'){
      // Tables don't exist yet, go to setup
      hideLoadingScreen();
      document.getElementById('pg-setup').style.display='flex';
      document.getElementById('setup-url').value = CONFIG.url;
      document.getElementById('setup-key').value = CONFIG.key;
      return;
    }
  }catch(e){
    hideLoadingScreen();
    document.getElementById('pg-setup').style.display='flex';
    return;
  }

  // Cek persistent session — auto login untuk pengurus & super
  const savedSession = loadPersistentSession();
  if(savedSession){
    SESSION = {role: savedSession.role, user: savedSession.user||null};

    // Validasi dulu: apakah device ini sudah di-logout paksa / akun diblokir admin?
    // Ini WAJIB dicek di sini (sebelum enterApp), bukan cuma lewat ping berkala —
    // supaya device yang sudah di-logout tidak bisa "hidup lagi" cuma dengan reload.
    let ditolak = false;
    if(SESSION.role!=='ortu' && SESSION.user?.id){
      try{
        // Dikasih batas waktu juga -- kalau nyangkut, JANGAN anggap ditolak (bisa
        // salah nge-logout user yang sah cuma gara-gara jaringan lambat). Anggap
        // saja belum sempat kecek, lanjutkan sesi yang tersimpan.
        if(SESSION.role!=='super'){
          const {data:pg, timedOut} = await withTimeout(
            SB.from('pengurus').select('force_logout,is_blocked').eq('id',SESSION.user.id).single(), 8000
          );
          if(!timedOut && (pg?.force_logout || pg?.is_blocked)) ditolak = true;
        }
        if(!ditolak){
          const sid = getDeviceSessionId();
          const {data:ses, timedOut} = await withTimeout(
            SB.from('login_sessions').select('revoked').eq('session_id', sid).maybeSingle(), 8000
          );
          if(!timedOut && ses?.revoked){
            ditolak = true;
            SB.from('login_sessions').delete().eq('session_id', sid).then(()=>{}).catch(()=>{}); // bersihkan barisnya sendiri
          }
        }
      }catch(e){}
    }

    if(ditolak){
      SESSION = null;
      clearPersistentSession();
      if(SB && SB.auth) SB.auth.signOut().catch(()=>{});
      hideLoadingScreen();
      // lanjut ke tampilan login biasa di bawah (tidak return)
    } else {
      hideLoadingScreen();
      await enterApp();
      // Cek notifikasi untuk pengurus yang sudah login
      if(SESSION && SESSION.role !== 'ortu'){
        setTimeout(()=>registerPushNotification(), 2000);
      }
      return;
    }
  }

  // Load santri names for ortu datalist
  await loadSantriNames();

  hideLoadingScreen();
  document.getElementById('pg-login').style.display='flex';
  document.getElementById('login-sub').textContent = CONFIG.pesantren_nama || 'PONDOK PESANTREN AN-NUR';
})();

async function loadSantriNames(){
  // datalist dihapus untuk keamanan — riwayat tidak ditampilkan di login
}

// ===== SETUP =====
async function doSetup(){
  const url = document.getElementById('setup-url').value.trim();
  const key = document.getElementById('setup-key').value.trim();
  const nama = document.getElementById('setup-nama').value.trim();
  const pass = document.getElementById('setup-pass').value.trim();
  const errEl = document.getElementById('setup-err');
  errEl.style.display='none';

  if(!url||!key||!nama||!pass){ errEl.textContent='Semua kolom wajib diisi!'; errEl.style.display='block'; return; }
  if(pass.length < 6){ errEl.textContent='Password minimal 6 karakter!'; errEl.style.display='block'; return; }

  try{
    SB = supabase.createClient(url, key);
    // Create tables via RPC-less approach: just insert settings to test
    // We'll use direct SQL via Supabase management — but since we can't run DDL from client,
    // we use a seed approach: try to create tables via a special init function if available
    // Instead, we'll provide SQL instructions and use localStorage as fallback indicator

    // Try to create tables by inserting dummy then deleting
    // Actually, we'll provide the SQL and use Supabase dashboard
    // For now, store config and show SQL instructions
    const passHash = await sha256(pass);
  CONFIG = { url, key, pesantren_nama: nama, super_pass: passHash, kritis_batas: 50000, bulan_aktif: bNames[new Date().getMonth()]+' '+new Date().getFullYear() };
    localStorage.setItem('siujang_cfg', JSON.stringify(CONFIG));

    // Test connection
    const {error} = await SB.from('settings').select('*').limit(1);
    if(error){
      // Tables need to be created — show SQL modal
      showSQLModal(nama, pass);
      return;
    }

    await SB.from('settings').upsert({key:'pesantren_nama',value:nama});
    await SB.from('settings').upsert({key:'super_pass',value:passHash});
    await SB.from('settings').upsert({key:'kritis_batas',value:'50000'});
    await SB.from('settings').upsert({key:'bulan_aktif',value:CONFIG.bulan_aktif});

    await loadSantriNames();
    document.getElementById('pg-setup').style.display='none';
    document.getElementById('pg-login').style.display='flex';
    document.getElementById('login-sub').textContent = nama;
    toast('Setup berhasil! Silakan login.');
  }catch(e){
    errEl.textContent = 'Gagal terhubung: '+e.message;
    errEl.style.display='block';
  }
}

function showSQLModal(nama, pass){
  const sql = `-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)

create table if not exists settings (
  key text primary key,
  value text
);

create table if not exists asrama (
  id bigserial primary key,
  nama text not null unique,
  keterangan text,
  created_at timestamptz default now()
);

create table if not exists kobong (
  id bigserial primary key,
  nama text not null unique,
  asrama_id bigint references asrama(id),
  keterangan text,
  created_at timestamptz default now()
);

create table if not exists pengurus (
  id bigserial primary key,
  nama text not null,
  username text not null unique,
  password_hash text not null,
  kobong_ids text default '[]',
  created_at timestamptz default now()
);

create table if not exists santri (
  id bigserial primary key,
  nama text not null,
  kobong_id bigint references kobong(id),
  pin text default '1234',
  saldo bigint default 0,
  catatan text,
  foto_url text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists transaksi (
  id bigserial primary key,
  santri_id bigint references santri(id) on delete cascade,
  tanggal date not null,
  jenis text not null,
  keterangan text,
  nominal bigint not null,
  oleh text,
  created_at timestamptz default now()
);

insert into settings (key, value) values
  ('pesantren_nama', '${nama}'),
  ('super_pass', '${passHash}'),
  ('kritis_batas', '50000'),
  ('bulan_aktif', '${CONFIG.bulan_aktif}')
on conflict (key) do update set value = excluded.value;

-- Aktifkan Row Level Security (opsional tapi disarankan)
alter table settings enable row level security;
alter table asrama enable row level security;
alter table kobong enable row level security;
alter table pengurus enable row level security;
alter table santri enable row level security;
alter table transaksi enable row level security;

-- Policy: izinkan semua akses dari anon key (untuk single-page app ini)
create policy "allow_all" on settings for all using (true) with check (true);
create policy "allow_all" on asrama for all using (true) with check (true);
create policy "allow_all" on kobong for all using (true) with check (true);
create policy "allow_all" on pengurus for all using (true) with check (true);
create policy "allow_all" on santri for all using (true) with check (true);
create policy "allow_all" on transaksi for all using (true) with check (true);`;

  const div = document.createElement('div');
  div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  div.innerHTML=`<div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;padding:24px">
    <h3 style="font-family:'Amiri',serif;font-size:20px;color:var(--green);margin-bottom:12px">🗄️ Satu Langkah Lagi!</h3>
    <p style="font-size:13px;color:var(--text-m);margin-bottom:12px;line-height:1.6">
      Buka <strong>Supabase Dashboard</strong> → Project Anda → <strong>SQL Editor</strong> → <strong>New Query</strong> → paste SQL di bawah → klik <strong>Run</strong>. Lalu klik "Sudah Dijalankan".
    </p>
    <textarea style="width:100%;height:280px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:12px;resize:vertical;outline:none" readonly>${sql}</textarea>
    <div style="display:flex;gap:9px;margin-top:14px;flex-wrap:wrap">
      <button onclick="navigator.clipboard.writeText(document.querySelector('textarea').value);this.textContent='✅ Tersalin!'" style="padding:9px 18px;background:var(--blue-p);color:var(--blue);border:1px solid #bee3f8;border-radius:9px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">📋 Salin SQL</button>
      <button onclick="this.closest('div[style]').remove();window.location.reload()" style="padding:9px 18px;background:var(--green);color:#fff;border:none;border-radius:9px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">✅ Sudah Dijalankan → Lanjut</button>
    </div>
  </div>`;
  document.body.appendChild(div);
}

