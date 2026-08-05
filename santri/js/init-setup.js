// ===== INIT =====
(async function init(){
  // Hardcoded Supabase config — skip setup screen
  const HARDCODED_URL = 'https://tajdid.jadidsaepul0.workers.dev';
  const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmZubWZ3dHhnY2d2a2JianhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ2NjUsImV4cCI6MjA5NTU3MDY2NX0.-xenaY9VPUzodik7nnN1emtnhg0WTqdU6dToyXSpwec';

  // Load config from localStorage
  const raw = localStorage.getItem('siujang_cfg');
  if(raw){ try{ CONFIG = JSON.parse(raw); }catch(e){} }

  // Always use hardcoded URL & key
  CONFIG.url = HARDCODED_URL;
  CONFIG.key = HARDCODED_KEY;
  localStorage.setItem('siujang_cfg', JSON.stringify(CONFIG));

  if(!CONFIG.url || !CONFIG.key){
    document.getElementById('pg-loading').style.display='none';
    document.getElementById('pg-setup').style.display='flex';
    return;
  }

  // Init Supabase
  try{
    SB = supabase.createClient(CONFIG.url, CONFIG.key);
    // Test connection
    const {error} = await SB.from('santri').select('id',{count:'exact',head:true});
    if(error && error.code === '42P01'){
      // Tables don't exist yet, go to setup
      document.getElementById('pg-loading').style.display='none';
      document.getElementById('pg-setup').style.display='flex';
      document.getElementById('setup-url').value = CONFIG.url;
      document.getElementById('setup-key').value = CONFIG.key;
      return;
    }
  }catch(e){
    document.getElementById('pg-loading').style.display='none';
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
        if(SESSION.role!=='super'){
          const {data:pg} = await SB.from('pengurus').select('force_logout,is_blocked').eq('id',SESSION.user.id).single();
          if(pg?.force_logout || pg?.is_blocked) ditolak = true;
        }
        if(!ditolak){
          const sid = getDeviceSessionId();
          const {data:ses} = await SB.from('login_sessions').select('revoked').eq('session_id', sid).maybeSingle();
          if(ses?.revoked){
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
      document.getElementById('pg-loading').style.display='none';
      // lanjut ke tampilan login biasa di bawah (tidak return)
    } else {
      document.getElementById('pg-loading').style.display='none';
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

  document.getElementById('pg-loading').style.display='none';
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

