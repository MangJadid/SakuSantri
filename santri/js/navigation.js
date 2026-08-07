// Menu selain dashboard/santri/massal/riwayat (4 itu masuk bottom nav di HP).
// Dipakai buat grid "Fitur Lainnya" di dashboard -- icon + warna sesuai referensi.
const MENU_LAINNYA = [
  {id:'kobong', label:'Kobong', icon:svgIcon('home'), c:'b'},
  {id:'naikkelas', label:'Naik Kelas', icon:svgIcon('graduation-cap'), c:'p'},
  {id:'pengurus', label:'Pengurus', icon:svgIcon('person'), c:'g'},
  {id:'persetujuan', label:'Persetujuan', icon:svgIcon('check-circle'), c:'g'},
  {id:'notifikasi', label:'Notifikasi', icon:svgIcon('bell'), c:'gg'},
  {id:'monitor', label:'Monitor', icon:svgIcon('eye'), c:'b'},
  {id:'pengaturan', label:'Pengaturan', icon:svgIcon('settings'), c:'r'},
];

function buildTabs(){
  const tabs = document.getElementById('main-tabs');
  let t = '';
  if(SESSION.role==='ortu'){
    tabs.classList.add('tabs-ortu');
    t += tab('detail',svgIcon('wallet',14)+' Saldo Santri');
    t += tab('syahriyah',svgIcon('document',14)+' Uang Syahriyah<span id="badge-syahriyah" class="badge-tab" style="display:none">0</span>');
  } else {
    tabs.classList.remove('tabs-ortu');
    t += tab('dashboard',svgIcon('home',14)+' Dashboard');
    t += tab('santri',svgIcon('users',14)+' Santri');
    if(SESSION.role!=='sekretaris'&&SESSION.role!=='sekretariat'){
      t += tab('massal',svgIcon('wallet',14)+' Transaksi');
    }
    t += tab('riwayat',svgIcon('document',14)+' Riwayat');
    if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
      t += tab('kobong',svgIcon('home',14)+' Kobong');
      t += tab('naikkelas',svgIcon('graduation-cap',14)+' Naik Kelas');
      t += tab('persetujuan',svgIcon('check-circle',14)+' Persetujuan<span id="badge-persetujuan" style="display:none;background:var(--red);color:#fff;border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:5px">0</span>');
    }
    if(SESSION.role==='super'||SESSION.role==='pengawas'){
      t += tab('kobong',svgIcon('home',14)+' Kobong');
      t += tab('naikkelas',svgIcon('graduation-cap',14)+' Naik Kelas');
      t += tab('pengurus',svgIcon('person',14)+' Pengurus');
      t += tab('persetujuan',svgIcon('check-circle',14)+' Persetujuan<span id="badge-persetujuan" style="display:none;background:var(--red);color:#fff;border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:5px">0</span>');
      t += tab('notifikasi',svgIcon('bell',14)+' Notifikasi<span id="badge-notifikasi-tab" style="display:none;background:var(--red);color:#fff;border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:5px">0</span>');
      t += tab('monitor',svgIcon('eye',14)+' Monitor');
    }
    if(SESSION.role==='super'){
      t += tab('pengaturan',svgIcon('settings',14)+' Pengaturan');
    }
  }
  tabs.innerHTML = t;
  buildMobileNav();
}

// Bottom nav (4 utama) + grid "Fitur Lainnya" di dashboard -- HP saja.
// Dibangun dari tab yang SUDAH ada di #main-tabs, jadi otomatis ikut aturan role.
function buildMobileNav(){
  const bnav = document.getElementById('bottom-nav');
  const grid = document.getElementById('mnav-grid');
  if(!bnav || !grid) return;

  if(SESSION.role==='ortu'){
    bnav.innerHTML=''; grid.innerHTML='';
    document.body.classList.remove('has-bnav');
    return;
  }
  document.body.classList.add('has-bnav');

  const primer = [
    {id:'dashboard', label:'Beranda', icon:svgIcon('home',20)},
    {id:'santri', label:'Santri', icon:svgIcon('users',20)},
    {id:'massal', label:'Transaksi', icon:svgIcon('wallet',20)},
    {id:'riwayat', label:'Riwayat', icon:svgIcon('document',20)},
  ].filter(m => document.getElementById('tab-'+m.id));

  bnav.innerHTML = '<span class="bnav-highlight" id="bnav-highlight"></span>' + primer.map(m => `
    <button class="bnav-item" id="bnav-${m.id}" onclick="showTab('${m.id}')">
      <span class="bnav-ic">${m.icon}</span><span>${m.label}</span>
    </button>`).join('');
  requestAnimationFrame(moveBnavHighlight);
  window.addEventListener('resize', moveBnavHighlight);

  const lainnya = MENU_LAINNYA.filter(m => document.getElementById('tab-'+m.id));
  grid.innerHTML = lainnya.length ? `
    <div class="mnav-label"><i></i>Fitur Lainnya</div>
    <div class="mnav-items">
      ${lainnya.map(m => `
        <button class="mnav-item" onclick="showTab('${m.id}')">
          <span class="sci ${m.c}">${m.icon}</span><span>${m.label}</span>
          ${m.id==='notifikasi'?'<span id="badge-notifikasi-grid" class="mnav-badge" style="display:none">0</span>':''}
          ${m.id==='persetujuan'?'<span id="badge-persetujuan-grid" class="mnav-badge" style="display:none">0</span>':''}
        </button>`).join('')}
    </div>` : '';
  if(typeof updateBadgeNotifikasi==='function') updateBadgeNotifikasi();
  if(typeof updateBadgePersetujuan==='function') updateBadgePersetujuan();
}

// Geser pill highlight ke tombol bottom-nav yang lagi aktif (ukur posisi asli,
// bukan pecahan persen tetap -- jumlah tombol bisa beda-beda per role).
function moveBnavHighlight(){
  const hl = document.getElementById('bnav-highlight');
  const active = document.querySelector('.bnav-item.act');
  if(!hl || !active) { if(hl) hl.style.opacity = '0'; return; }
  hl.style.opacity = '1';
  hl.style.width = active.offsetWidth - 12 + 'px';
  hl.style.transform = 'translateX(' + (active.offsetLeft + 6) + 'px)';
}

function tab(id, label){
  return `<button class="tb" id="tab-${id}" onclick="showTab('${id}')">${label}</button>`;
}

function showTab(id){
  // Cegah akses tab yang tidak sesuai role
  if(id==='pengaturan' && SESSION && SESSION.role!=='super') return;
  if((id==='monitor'||id==='pengurus') && SESSION && SESSION.role!=='super' && SESSION.role!=='pengawas') return;
  if((id==='kobong'||id==='naikkelas'||id==='persetujuan') && SESSION && SESSION.role!=='super' && SESSION.role!=='sekretaris' && SESSION.role!=='sekretariat' && SESSION.role!=='pengawas') return;
  if(['dashboard','santri','massal','riwayat','kobong','pengurus','monitor','naikkelas','pengaturan','persetujuan'].includes(id) && SESSION && SESSION.role==='ortu') return;

  // Reset filter HANYA saat pindah ke tab yang berbeda
  const tabAktif = document.querySelector('.tb.act')?.id?.replace('tab-','');
  if(tabAktif && tabAktif !== id) resetAllFilters();

  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('act'));
  document.querySelectorAll('.tb').forEach(t=>t.classList.remove('act'));
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('act'));
  const s=document.getElementById('sec-'+id), t=document.getElementById('tab-'+id);
  if(s) s.classList.add('act');
  if(t) t.classList.add('act');
  document.getElementById('bnav-'+id)?.classList.add('act');
  moveBnavHighlight();
  if(id==='dashboard') renderDashboard();
  if(id==='santri') renderTabelSantri();
  if(id==='massal') renderMassal();
  if(id==='riwayat') renderRiwayat();
  if(id==='kobong') renderKobong();
  if(id==='pengurus') renderPengurus();
  if(id==='notifikasi') renderNotifikasi();
  if(id==='keuangan') renderKeuangan();
  if(id==='monitor') renderMonitor();
  if(id==='naikkelas') renderNaikKelas();
  if(id==='persetujuan') prsShowSub('pending');
  if(id==='syahriyah') renderSyahriyahOrtu();
  if(id==='pengaturan'){
    if(SESSION.role==='super'){
      // Inject konten pengaturan jika belum ada
      const sec = document.getElementById('sec-pengaturan');
      if(!sec.dataset.loaded){
        sec.dataset.loaded = '1';
        sec.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="two">
          <div class="panel"><div class="ph"><h2>${svgIcon('settings',16)} Pengaturan Umum</h2></div><div class="pb">
            <div class="fg" style="margin-bottom:12px"><label>Nama Pondok</label><input type="text" id="set-nama" placeholder="Nama Pondok Pesantren"></div>
            <div class="fg" style="margin-bottom:12px"><label>Bulan Aktif</label><input type="text" id="set-bulan" placeholder="Juni 2025"></div>
            <div class="fg" style="margin-bottom:16px"><label>Batas Saldo Kritis (Rp)</label><input type="number" id="set-kritis" placeholder="50000"></div>
            <button class="btn btn-p btn-sm" onclick="simpanPengaturan()">${svgIcon('save',14)} Simpan</button>
          </div></div>
          <div class="panel"><div class="ph"><h2>${svgIcon('lock',16)} Ganti Akun Kang Admin</h2></div><div class="pb">
            <div class="fg" style="margin-bottom:12px"><label>Username Baru</label><input type="text" id="set-user1" placeholder="Username baru..."></div>
            <div class="fg" style="margin-bottom:12px"><label>Ulangi Username</label><input type="text" id="set-user2" placeholder="Ulangi username..."></div>
            <button class="btn btn-b btn-sm" style="margin-bottom:16px" onclick="gantiUsername()">${svgIcon('person',14)} Ganti Username</button>
            <hr style="margin-bottom:16px;border:none;border-top:1px solid var(--border)">
            <div class="fg" style="margin-bottom:12px"><label>Password Baru</label><input type="password" id="set-pass1" placeholder="••••••••"></div>
            <div class="fg" style="margin-bottom:16px"><label>Ulangi Password</label><input type="password" id="set-pass2" placeholder="••••••••"></div>
            <button class="btn btn-p btn-sm" onclick="gantiPass()">${svgIcon('key',14)} Ganti Password</button>
          </div></div>
        </div>
        <div class="panel"><div class="ph"><h2>${svgIcon('link',16)} Koneksi Supabase</h2></div><div class="pb">
          <div class="info-box" style="margin-bottom:14px"><strong>URL:</strong> <span id="set-url-display" style="font-family:'DM Mono',monospace;font-size:12px"></span><br><strong>Status:</strong> <span id="set-status">—</span></div>
          <div style="margin-bottom:20px"><button class="btn btn-b btn-sm" onclick="cekKoneksi()">${svgIcon('search',14)} Cek Koneksi</button></div>
          <details style="margin-bottom:16px">
          <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text-m);padding:8px 0;user-select:none">🔧 SQL Migrasi Database (Lanjutan)</summary>
          <div style="margin-top:12px">
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">🏛️ Migrasi: Tambah Tabel Asrama</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jika database sudah ada sebelumnya, jalankan SQL ini di Supabase → SQL Editor untuk menambah fitur Asrama.</div>
            <textarea readonly style="width:100%;height:110px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">-- Tambah tabel asrama (jika belum ada)
create table if not exists asrama (
  id bigserial primary key,
  nama text not null unique,
  keterangan text,
  created_at timestamptz default now()
);
alter table asrama enable row level security;
create policy "allow_all" on asrama for all using (true) with check (true);

-- Tambah kolom asrama_id ke kobong (jika belum ada)
alter table kobong add column if not exists asrama_id bigint references asrama(id);</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL Migrasi</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">📲 Migrasi: Tambah Kolom No WA & Template WA</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini untuk menambah kolom No WA orang tua pada tabel santri.</div>
            <textarea readonly style="width:100%;height:60px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">-- Tambah kolom no WA orang tua
alter table santri add column if not exists no_wa text;</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">🆔 Migrasi: Tambah Kolom NISN</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini untuk menambah kolom NISN pada tabel santri.</div>
            <textarea readonly style="width:100%;height:40px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">alter table santri add column if not exists nisn text;</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">🍳 Migrasi: Tambah Kolom Kelas & Dapur</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini untuk menambah kolom kelas dan dapur pada tabel santri (diperlukan untuk fitur input dapur).</div>
            <textarea readonly style="width:100%;height:60px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">alter table santri add column if not exists kelas text;
alter table santri add column if not exists dapur_id text;</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">📋 Migrasi: Tambah Kolom Role & Asrama Sekretaris</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini untuk mengaktifkan fitur Sekretaris (role baru dengan akses per asrama).</div>
            <textarea readonly style="width:100%;height:60px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">alter table pengurus add column if not exists role text default 'pengurus';
alter table pengurus add column if not exists asrama_ids text default '[]';</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">📱 Migrasi: Tambah Kolom No HP Pengurus</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini agar pengurus/sekretaris bisa menyimpan nomor HP/WA di profil mereka.</div>
            <textarea readonly style="width:100%;height:40px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">alter table pengurus add column if not exists no_wa text;</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">🖼️ Migrasi: Tambah Kolom Foto Profil Pengurus</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini agar pengurus/sekretaris bisa menyimpan foto profil mereka.</div>
            <textarea readonly style="width:100%;height:40px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">alter table pengurus add column if not exists foto_url text;</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">🗑️ Migrasi: Persetujuan & Riwayat Perubahan Santri</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini agar pengurus bisa mengajukan permintaan hapus/edit data santri (nama, kelas, asrama, kobong, dapur) yang perlu disetujui sekretaris asrama terkait — lengkap dengan riwayat perubahannya.</div>
            <textarea readonly style="width:100%;height:220px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">CREATE TABLE IF NOT EXISTS permintaan_perubahan_santri (
  id bigint generated always as identity primary key,
  santri_id bigint not null,
  santri_nama text,
  asrama_id bigint,
  jenis text default 'hapus',
  data_lama jsonb,
  data_baru jsonb,
  diajukan_oleh text,
  diajukan_nama text,
  alasan text,
  status text default 'pending',
  diproses_oleh text,
  diproses_nama text,
  catatan_admin text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table permintaan_perubahan_santri enable row level security;
create policy "allow_all" on permintaan_perubahan_santri for all using (true) with check (true);

CREATE TABLE IF NOT EXISTS riwayat_perubahan_santri (
  id bigint generated always as identity primary key,
  santri_id bigint not null,
  santri_nama text,
  asrama_id bigint,
  jenis text not null,
  data_lama jsonb,
  data_baru jsonb,
  diubah_oleh text,
  diubah_nama text,
  sumber text default 'langsung',
  permintaan_id bigint,
  diajukan_oleh text,
  diajukan_nama text,
  alasan text,
  created_at timestamptz default now()
);
alter table riwayat_perubahan_santri enable row level security;
create policy "allow_all" on riwayat_perubahan_santri for all using (true) with check (true);</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL</button></div>
          </div>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:6px">📱 Migrasi: Riwayat Login & Monitor Device (per perangkat)</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">Jalankan SQL ini agar tab Monitor bisa menampilkan detail model HP/PC (mis. "POCO X5"), riwayat login tiap perangkat, dan tombol logout per-device (mirip riwayat login IG). Jika tabel <code>activity_log</code> lama masih ada, tidak apa-apa dibiarkan — tidak dipakai lagi.</div>
            <textarea readonly style="width:100%;height:220px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">-- Tabel riwayat login per perangkat/browser (1 baris = 1 sesi/device)
CREATE TABLE IF NOT EXISTS login_sessions (
  id bigint generated always as identity primary key,
  session_id text not null unique,
  pengurus_id text,
  pengurus_username text,
  pengurus_nama text,
  pengurus_role text,
  device_name text,
  user_agent text,
  is_online boolean default true,
  revoked boolean default false,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);
alter table login_sessions enable row level security;
create policy "allow_all" on login_sessions for all using (true) with check (true);
create index if not exists idx_login_sessions_pengurus on login_sessions(pengurus_id);

-- Pastikan kolom force_logout & is_blocked ada di tabel pengurus (untuk logout/blokir semua device)
alter table pengurus add column if not exists force_logout boolean default false;
alter table pengurus add column if not exists is_blocked boolean default false;</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL Migrasi</button></div>
          </div>
          <div style="background:#fff1f1;border:1px solid #fca5a5;border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:#b91c1c;margin-bottom:6px">🔒 Migrasi Keamanan: Login Aman (Wajib!)</div>
            <div style="font-size:12px;color:var(--text-m);margin-bottom:10px;line-height:1.7">PENTING: saat ini siapa pun bisa membaca password (terenkripsi) semua pengurus &amp; Admin langsung dari database tanpa login. Jalankan SQL ini untuk menutup celah tersebut — proses login tetap berjalan seperti biasa setelah ini.</div>
            <textarea readonly style="width:100%;height:280px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">create extension if not exists pgcrypto;

-- Cek login pengurus di server, tidak pernah kirim password_hash ke browser
create or replace function login_pengurus_check(p_username text, p_password text)
returns jsonb
language plpgsql security definer
as $$
declare v_row pengurus%rowtype;
begin
  select * into v_row from pengurus where username = p_username;
  if not found then return null; end if;
  if v_row.password_hash = encode(digest(p_password,'sha256'),'hex')
     or v_row.password_hash = encode(convert_to(p_password,'UTF8'),'base64') then
    return to_jsonb(v_row) - 'password_hash';
  end if;
  return null;
end; $$;

-- Cek login Admin (super) di server
create or replace function login_super_check(p_username text, p_password text)
returns boolean
language plpgsql security definer
as $$
declare v_stored text; v_user text;
begin
  select value into v_stored from settings where key='super_pass';
  select coalesce(value,'superadmin') into v_user from settings where key='super_user';
  if p_username <> v_user then return false; end if;
  return v_stored = encode(digest(p_password,'sha256'),'hex')
      or v_stored = encode(convert_to(p_password,'UTF8'),'base64');
end; $$;

-- Kunci: tabel pengurus cuma boleh dibaca kalau sudah login
drop policy if exists "allow_all" on pengurus;
drop policy if exists "select_authenticated" on pengurus;
drop policy if exists "insert_authenticated" on pengurus;
drop policy if exists "update_authenticated" on pengurus;
drop policy if exists "delete_authenticated" on pengurus;
create policy "select_authenticated" on pengurus for select to authenticated using (true);
create policy "insert_authenticated" on pengurus for insert to authenticated with check (true);
create policy "update_authenticated" on pengurus for update to authenticated using (true);
create policy "delete_authenticated" on pengurus for delete to authenticated using (true);

-- Kunci: tabel settings — data umum tetap terbaca (perlu utk layar login), data password dikunci
-- (Kalau migrasi ini sudah pernah dijalankan dari panel Bendahara, bagian ini aman diulang)
drop policy if exists "allow_all" on settings;
drop policy if exists "select_public_settings" on settings;
drop policy if exists "select_secrets_authenticated" on settings;
drop policy if exists "insert_authenticated" on settings;
drop policy if exists "update_authenticated" on settings;
create policy "select_public_settings" on settings for select
  using (key not in ('super_pass','super_user'));
create policy "select_secrets_authenticated" on settings for select to authenticated using (true);
create policy "insert_authenticated" on settings for insert to authenticated with check (true);
create policy "update_authenticated" on settings for update to authenticated using (true);</textarea>
            <div style="margin-top:8px"><button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value);toast('SQL migrasi disalin!')">📋 Salin SQL Migrasi</button></div>
          </div>
          </div>
          </details>
          <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:6px">⚠️ Reset Konfigurasi</div>
          <div style="font-size:12px;color:var(--text-m);margin-bottom:12px;line-height:1.7">Hanya gunakan jika ingin ganti database Supabase. Semua pengguna akan logout dan perlu setup ulang.<br>Ketik <strong>RESET</strong> untuk mengaktifkan tombol.</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" id="reset-konfirm-input" placeholder="Ketik RESET di sini..." oninput="cekInputReset()" style="padding:8px 12px;border:1.5px solid #f5c6c2;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;width:200px">
            <button class="btn btn-d btn-sm" id="btn-reset" onclick="resetSetup()" disabled style="opacity:.4;cursor:not-allowed">🗑 Reset Konfigurasi</button>
          </div>
        </div></div>
        <div class="panel"><div class="ph"><h2>🖼️ Setup Storage Foto (Agar Tidak Lag)</h2></div><div class="pb">
          <div class="info-box" style="margin-bottom:12px">Jalankan SQL ini di <strong>Supabase → SQL Editor</strong> agar foto santri disimpan di Storage (bukan di database), sehingga website lebih ringan dan cepat.</div>
          <textarea readonly style="width:100%;height:120px;font-family:'DM Mono',monospace;font-size:11px;border:1.5px solid var(--border);border-radius:8px;padding:10px;resize:none;outline:none;background:var(--bg)">-- Buat bucket storage untuk foto santri
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- Policy: izinkan semua akses (read & upload)
create policy "public read fotos" on storage.objects
  for select using (bucket_id = 'fotos');
create policy "public upload fotos" on storage.objects
  for insert with check (bucket_id = 'fotos');
create policy "public update fotos" on storage.objects
  for update using (bucket_id = 'fotos');
create policy "public delete fotos" on storage.objects
  for delete using (bucket_id = 'fotos');</textarea>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-b btn-sm" onclick="navigator.clipboard.writeText(this.closest('.pb').querySelector('textarea').value);toast('SQL disalin!')">📋 Salin SQL</button>
            <button class="btn btn-p btn-sm" onclick="testStorage()">${svgIcon('search',14)} Cek Status Storage</button>
          </div>
          <div id="storage-status" style="margin-top:10px;font-size:13px"></div>
        </div></div>
        <div class="panel"><div class="ph"><h2>${svgIcon('message-square',16)} Kata-kata Greeting Dashboard</h2></div><div class="pb">
          <p style="font-size:13px;color:var(--text-m);margin-bottom:14px;line-height:1.7">Kata-kata ini akan muncul di greeting dashboard pengurus secara bergantian setiap login.</p>
          <div id="greeting-list" style="margin-bottom:14px"></div>
          <div style="display:flex;gap:8px">
            <input type="text" id="greeting-input" placeholder="Tulis kata-kata motivasi..." style="flex:1;padding:9px 13px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13.5px;outline:none" onkeydown="if(event.key==='Enter') tambahGreeting()">
            <button class="btn btn-p btn-sm" onclick="tambahGreeting()">${svgIcon('plus',14)} Tambah</button>
          </div>
        </div></div>
        <div class="panel"><div class="ph"><h2>${svgIcon('message-square',16)} Template Pesan WA Saldo Kritis</h2></div><div class="pb">
          <div class="info-box" style="margin-bottom:14px">Variabel: <code style="background:var(--green-p);color:var(--green);padding:2px 6px;border-radius:4px;font-size:12px">{{nama}}</code> <code style="background:var(--green-p);color:var(--green);padding:2px 6px;border-radius:4px;font-size:12px">{{kobong}}</code> <code style="background:var(--green-p);color:var(--green);padding:2px 6px;border-radius:4px;font-size:12px">{{saldo}}</code> <code style="background:var(--green-p);color:var(--green);padding:2px 6px;border-radius:4px;font-size:12px">{{pin}}</code> <code style="background:var(--green-p);color:var(--green);padding:2px 6px;border-radius:4px;font-size:12px">{{link}}</code></div>
          <div class="fg" style="margin-bottom:14px"><label>Template Pesan</label><textarea id="set-wa-template" rows="10" style="font-family:'DM Mono',monospace;font-size:12.5px;line-height:1.7;resize:vertical" placeholder="Tulis template pesan WA..."></textarea></div>
          <button class="btn btn-p btn-sm" onclick="simpanTemplateWA()">${svgIcon('save',14)} Simpan Template</button>
        </div></div>
        <div class="panel"><div class="ph"><h2>${svgIcon('archive',16)} Backup & Tutup Bulan</h2></div><div class="pb">
          <p style="font-size:13px;color:var(--text-m);margin-bottom:16px;line-height:1.7">Lakukan ini di <strong>awal setiap bulan baru</strong> agar website tetap ringan. Data bulan lalu diarsip ke Excel, lalu transaksi lama dihapus. Saldo santri tetap terbawa sebagai transaksi pembuka bulan baru.</p>
          <div style="background:var(--gold-p);border:1px solid var(--gold-l);border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.8;color:#7a5c00">
            <strong>⚠️ Urutan wajib:</strong><br>1️⃣ Backup dulu → 2️⃣ Baru Tutup Bulan<br><span style="font-size:12px;opacity:.8">Tombol Tutup Bulan baru aktif setelah backup dilakukan.</span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-p" onclick="backupSemuaData()" id="btn-backup">${svgIcon('archive',14)} 1. Backup Lengkap</button>
            <button class="btn btn-d" onclick="konfirmasiTutupBulan()" id="btn-tutup-bulan" disabled style="opacity:.4;cursor:not-allowed">${svgIcon('lock',14)} 2. Tutup Bulan</button>
          </div>
          <div id="tutup-status" style="margin-top:12px;font-size:13px"></div>
        </div></div>`;
      }
      document.getElementById('set-url-display').textContent = CONFIG.url||'—';
      document.getElementById('set-nama').value = CONFIG.pesantren_nama||'';
      document.getElementById('set-bulan').value = CONFIG.bulan_aktif||'';
      document.getElementById('set-kritis').value = CONFIG.kritis_batas||50000;
      loadGreetingList(); loadTemplateWAInput();
    }
  }
}

