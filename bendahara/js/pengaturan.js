// ===== PENGATURAN =====
function renderPengaturan(){
  document.getElementById('set-makan').value=getNominalMakan();
  document.getElementById('set-listrik').value=getNominalListrik();
  document.getElementById('set-bulan').value=bulanAktif();
  const tmpl=document.getElementById('set-wa-template');
  if(tmpl) tmpl.value=CONFIG.wa_template_bend||getDefaultWATemplate();
  // Sembunyikan panel khusus Kang Admin untuk pengelola lain
  document.querySelectorAll('.kangadmin-only').forEach(el=>{
    el.style.display = isKangAdmin() ? '' : 'none';
  });
  renderHapusPanel();
}

function renderGeneratePanel(){
  if(!isKangAdmin()) return;

  // Tahun: 3 tahun ke belakang sampai tahun ini
  const tahunEl=document.getElementById('gen-tahun');
  const now=new Date();
  const thn=now.getFullYear();
  tahunEl.innerHTML='';
  for(let y=thn;y>=thn-3;y--){
    tahunEl.innerHTML+=`<option value="${y}" ${y===thn?'selected':''}>${y}</option>`;
  }

  // Pre-fill nominal makan dari config
  document.getElementById('gen-nominal-makan').value=getNominalMakan()||380000;
  document.getElementById('gen-nominal-listrik').value=getNominalListrik()||40000;

  // Bulan checklist
  const BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanList=document.getElementById('gen-bulan-list');
  bulanList.innerHTML=BULAN.map((b,i)=>`
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text)">
      <input type="checkbox" name="gen-bulan" value="${b}" style="accent-color:var(--green);width:15px;height:15px"> ${b}
    </label>`).join('');

  // Asrama checklist
  renderAsramaCheckList();
  // Kelas checklist
  renderKelasCheckList();
}

function renderAsramaCheckList(){
  const el=document.getElementById('gen-asrama-list');
  if(!ALL_ASRAMA||!ALL_ASRAMA.length){ el.innerHTML='<span style="font-size:12px;color:var(--text-l)">Belum ada asrama.</span>'; return; }
  el.innerHTML=ALL_ASRAMA.map(a=>`
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text)">
      <input type="checkbox" name="gen-asrama" value="${a.id}" style="accent-color:var(--green);width:16px;height:16px"> <span style="display:inline-flex;align-items:center;gap:5px">${svgIcon('home',13)} ${a.nama}</span>
    </label>`).join('');
}

function togglePilihSemuaAsrama(){
  const checks=[...document.querySelectorAll('input[name="gen-asrama"]')];
  const allChecked=checks.every(c=>c.checked);
  checks.forEach(c=>c.checked=!allChecked);
  document.getElementById('btn-pilih-semua-asrama').textContent=allChecked?'☑ Pilih Semua':'☐ Batal Semua';
  updateGenPreview();
}

function renderKelasCheckList(){
  const el = document.getElementById('gen-kelas-list');
  if(!el) return;
  // Ambil semua kelas unik dari santri aktif
  const kelasList = [...new Set(ALL_SANTRI.map(s=>s.kelas).filter(Boolean))].sort((a,b)=>{
    const na=parseInt(a)||0, nb=parseInt(b)||0;
    return na-nb || a.localeCompare(b);
  });
  if(!kelasList.length){ el.innerHTML='<span style="font-size:12px;color:var(--text-l)">Belum ada data kelas.</span>'; return; }
  el.innerHTML = kelasList.map(k=>`
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text)">
      <input type="checkbox" name="gen-kelas" value="${k}" style="accent-color:var(--green);width:15px;height:15px"> Kelas ${k}
    </label>`).join('');
}

function togglePilihSemuaKelas(){
  const checks=[...document.querySelectorAll('input[name="gen-kelas"]')];
  const allChecked=checks.every(c=>c.checked);
  checks.forEach(c=>c.checked=!allChecked);
  document.getElementById('btn-pilih-semua-kelas').textContent=allChecked?'☑ Pilih Semua':'☐ Batal Semua';
  updateGenPreview();
}


function updateGenPreview(){
  const asramaIds=[...document.querySelectorAll('input[name="gen-asrama"]:checked')].map(c=>c.value);
  const bulanList=[...document.querySelectorAll('input[name="gen-bulan"]:checked')].map(c=>c.value);
  const tahun=document.getElementById('gen-tahun').value;
  const prev=document.getElementById('gen-preview');
  if(!asramaIds.length||!bulanList.length){ prev.style.display='none'; return; }

  // Hitung estimasi santri — harus konsisten dengan prosesGenerateTagihan
  const kobongDiAsrama=ALL_KOBONG.filter(k=>asramaIds.includes(String(k.asrama_id))).map(k=>k.id);
  const kelasList=[...document.querySelectorAll('input[name="gen-kelas"]:checked')].map(c=>c.value);
  // BUG FIX 9: filter dapur agar preview count sama dengan yang benar-benar di-generate
  let santriFiltered=ALL_SANTRI.filter(s=>kobongDiAsrama.includes(s.kobong_id)).filter(s=>s.dapur_id&&s.dapur_id!==null&&s.dapur_id!=='');
  if(kelasList.length>0) santriFiltered=santriFiltered.filter(s=>kelasList.includes(String(s.kelas)));
  const santriCount=santriFiltered.length;
  const santriTanpaDapur=ALL_SANTRI.filter(s=>kobongDiAsrama.includes(s.kobong_id)).filter(s=>!s.dapur_id||s.dapur_id===null||s.dapur_id==='').length;
  const asramaNama=asramaIds.map(id=>ALL_ASRAMA.find(a=>String(a.id)===id)?.nama).filter(Boolean).join(', ');
  const total=santriCount*bulanList.length;

  prev.style.display='block';
  prev.innerHTML=`
    <strong>${svgIcon('document',13)} Preview Generate:</strong><br>
    ${svgIcon('home',12)} Asrama: <strong>${asramaNama}</strong><br>
    ${svgIcon('calendar',12)} Bulan: <strong>${bulanList.map(b=>b+' '+tahun).join(', ')}</strong><br>
    ${svgIcon('users',12)} Santri: <strong>${santriCount}</strong> &times; <strong>${bulanList.length} bulan</strong> = <strong>${total} tagihan</strong><br>
    ${santriTanpaDapur>0?`<small style="color:var(--red)">${svgIcon('alert-triangle',12)} ${santriTanpaDapur} santri tanpa dapur tidak akan di-generate</small><br>`:''}
    <small style="color:var(--text-l)">* Santri yang sudah punya tagihan bulan tersebut akan dilewati</small>`;
}

// Pasang event listener saat render
document.addEventListener('change', function(e){
  if(e.target.name==='gen-asrama'||e.target.name==='gen-bulan'||e.target.id==='gen-tahun'||e.target.name==='gen-kelas'){
    updateGenPreview();
    // Update tombol pilih semua
    const checks=[...document.querySelectorAll('input[name="gen-asrama"]')];
    if(checks.length){
      const btn=document.getElementById('btn-pilih-semua-asrama');
      if(btn) btn.textContent=checks.every(c=>c.checked)?'&#9744; Batal Semua':'&#9745; Pilih Semua';
    }
  }
});

async function prosesGenerateTagihan(){
  if(_isLoading) return;
  const asramaIds=[...document.querySelectorAll('input[name="gen-asrama"]:checked')].map(c=>c.value);
  const bulanList=[...document.querySelectorAll('input[name="gen-bulan"]:checked')].map(c=>c.value);
  const tahun=document.getElementById('gen-tahun').value;
  // Nominal di form ini jadi FALLBACK untuk asrama yang belum dikonfigurasi khusus
  // (lihat konfigurasi-tagihan.js) — asrama yang sudah dikonfigurasi pakai jenis+nominalnya sendiri.
  const fallbackMakan=parseInt(document.getElementById('gen-nominal-makan').value)||getNominalMakan()||380000;
  const fallbackListrik=parseInt(document.getElementById('gen-nominal-listrik').value)||getNominalListrik()||0;

  if(!asramaIds.length){ toast('⚠️ Pilih minimal satu asrama!'); return; }
  if(!bulanList.length){ toast('⚠️ Pilih minimal satu bulan!'); return; }

  const kelasList=[...document.querySelectorAll('input[name="gen-kelas"]:checked')].map(c=>c.value);
  const kobongDiAsrama=ALL_KOBONG.filter(k=>asramaIds.includes(String(k.asrama_id))).map(k=>k.id);
  let santriTarget=ALL_SANTRI.filter(s=>kobongDiAsrama.includes(s.kobong_id)).filter(s=>s.dapur_id&&s.dapur_id!==null&&s.dapur_id!=='');
  // Filter per kelas jika ada yang dipilih
  if(kelasList.length>0){
    santriTarget=santriTarget.filter(s=>kelasList.includes(String(s.kelas)));
  }
  // Dedup santriTarget by id — cegah santri muncul 2x jika ada data ganda di DB
  const _seenIds=new Set();
  santriTarget=santriTarget.filter(s=>{ const k=String(s.id); if(_seenIds.has(k)) return false; _seenIds.add(k); return true; });
  if(!santriTarget.length){ toast('⚠️ Tidak ada santri di asrama/kelas yang dipilih!'); return; }

  const bulanTahunList=bulanList.map(b=>`${b} ${tahun}`);
  const asramaNama=asramaIds.map(id=>ALL_ASRAMA.find(a=>String(a.id)===id)?.nama).filter(Boolean).join(', ');
  const total=santriTarget.length*bulanList.length;

  konfirm(
    `Generate <strong>${total} tagihan</strong> untuk:<br>&#127963;&#65039; <strong>${asramaNama}</strong><br>&#128197; <strong>${bulanTahunList.join(', ')}</strong><br><br>Santri yang sudah punya tagihan di bulan tersebut akan dilewati.`,
    async()=>{
      const _lBtn2=document.querySelector('#btn-generate-tagihan')||null;
      setLoading(true, _lBtn2, '⚙️ Generate Tagihan...', 'Menyiapkan data...');
      try{
        const santriIds=santriTarget.map(s=>Number(s.id));

        // ─── FINAL FIX: Pakai ALL_TAGIHAN (sudah di-load di memory) ───────
        // Tidak perlu query ke DB lagi → tidak ada masalah URL limit, batch,
        // atau network. ALL_TAGIHAN sudah pasti lengkap dari loadAllData().
        // Build existSet dari data lokal yang sudah ada.
        const existSet = new Set(
          ALL_TAGIHAN
            .filter(t => santriIds.includes(Number(t.santri_id)))
            .filter(t => bulanTahunList.includes(String(t.bulan).trim()))
            .map(t => `${String(Number(t.santri_id))}__${String(t.bulan).trim()}`)
        );
        // ─────────────────────────────────────────────────────────────────

        // Helper bulan_mulai_tagihan check
        const URUTAN_BULAN_GEN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        function bulanToNumGen(b){ if(!b) return 0; const [nm,thn]=b.split(' '); return parseInt(thn||0)*12+URUTAN_BULAN_GEN.indexOf(nm); }

        // Ambil deposit dari memory juga jika ada, fallback ke DB per batch kecil
        const depositMap={};
        const BATCH_SIZE=50;
        for(let bi=0; bi<santriIds.length; bi+=BATCH_SIZE){
          const batchIds = santriIds.slice(bi, bi+BATCH_SIZE);
          const {data:deps}=await SB.from('santri_deposit').select('*').in('santri_id',batchIds);
          (deps||[]).forEach(d=>{ depositMap[String(d.santri_id)]=d; });
        }

        let totalInsert=0, totalLewat=0, totalSkip=0, totalLunas=0, totalCicil=0;
        const depositUpdates=[];

        for(const [bulanIdx, bulanTahun] of bulanTahunList.entries()){
          setLoadingProgress(bulanIdx, bulanTahunList.length, `Memproses ${bulanTahun}...`);
          const bulanNum=bulanToNumGen(bulanTahun);
          const toInsert=[];
          for(const s of santriTarget){
            // BUG FIX 3: cek bulan_mulai_tagihan per bulan (bukan hanya sekali di luar loop)
            if(s.bulan_mulai_tagihan && bulanToNumGen(s.bulan_mulai_tagihan) > bulanNum){
              totalSkip++; continue;
            }
            // BUG FIX 2: key sama persis dengan existSet (Number + trim)
            if(existSet.has(`${String(Number(s.id))}__${String(bulanTahun).trim()}`)){ totalLewat++; continue; }
            const {rincian, nominal:nom, nominal_makan, nominal_listrik} = buildTagihanBreakdown(s.kobong?.asrama_id, fallbackMakan, fallbackListrik);
            const dep=depositMap[String(s.id)];
            const saldoDep=dep?Number(dep.saldo||0):0;
            let bayar=0, status='belum', newDep=saldoDep;
            if(saldoDep>0){
              if(saldoDep>=nom){ bayar=nom; status='lunas'; newDep=saldoDep-nom; totalLunas++; }
              else{ bayar=saldoDep; status='cicil'; newDep=0; totalCicil++; }
              depositUpdates.push({santri_id:Number(s.id),saldo:newDep,dep_id:dep?.id});
            }
            toInsert.push({
              santri_id:Number(s.id), santri_nama:s.nama, dapur_id:s.dapur_id||null,
              bulan:bulanTahun, nominal_makan, nominal_listrik, nominal:nom, rincian,
              nominal_bayar:bayar, status, tgl_tagihan:today(),
              tgl_bayar:bayar>0?today():null,
              keterangan:bayar>0?`Auto dari deposit (saldo: ${fmtRp(saldoDep)})`:'',
              dicatat_oleh:SESSION.nama||SESSION.username,
            });
          }
          if(toInsert.length){
            // Dedup toInsert by santri_id+bulan — safety net terakhir
            const _seenInsert=new Set();
            const toInsertFinal=toInsert.filter(r=>{ const k=`${r.santri_id}__${r.bulan}`; if(_seenInsert.has(k)) return false; _seenInsert.add(k); return true; });
            // Insert per batch 10 row
            const INSERT_BATCH = 10;
            for(let ii=0; ii<toInsertFinal.length; ii+=INSERT_BATCH){
              const batch = toInsertFinal.slice(ii, ii+INSERT_BATCH);
              const {error}=await SB.from('tagihan_pondok').insert(batch);
              if(error){ toast('❌ Gagal: '+error.message); return; }
            }
            totalInsert+=toInsertFinal.length;
            // update existSet setelah insert agar bulan berikutnya tidak double
            toInsertFinal.forEach(t=>existSet.add(`${String(Number(t.santri_id))}__${String(t.bulan).trim()}`));
          }
        }
        // Selesai semua bulan
        setLoadingProgress(bulanTahunList.length, bulanTahunList.length, 'Menyimpan deposit...');

        // Update deposit PARALEL (bukan satu per satu) — jauh lebih cepat
        await Promise.all(depositUpdates
          .filter(u=>u.dep_id)
          .map(u=>SB.from('santri_deposit').update({saldo:u.saldo}).eq('id',u.dep_id))
        );

        const s2=document.getElementById('loading-subtitle');
        if(s2) s2.textContent='Memuat ulang data...';

        let msg=`✅ ${totalInsert} tagihan dibuat!`;
        if(totalLewat) msg+=` ⏭️ ${totalLewat} dilewati (sudah ada).`;
        if(totalSkip) msg+=` ⏳ ${totalSkip} dilewati (belum waktunya).`;
        if(totalLunas) msg+=` ${totalLunas} lunas (deposit).`;
        if(totalCicil) msg+=` ${totalCicil} cicilan.`;
        toast(msg);
        // Reload data dari DB untuk konsistensi (id dari DB diperlukan untuk hapus/bayar)
        await loadAllData();
        fillSelects(); renderDashboard(); renderTagihanTable();
        renderGeneratePanel();
        renderHapusPanel();
      }finally{ setLoading(false,_lBtn2); }
    },'generate'
  );
}

function renderTanpaDapur(){
  // Filter dropdown kelas
  const kelasSet = new Set(ALL_SANTRI.map(s=>s.kelas).filter(Boolean));
  const kelasOpts = [...kelasSet].sort((a,b)=>parseInt(a)-parseInt(b)).map(k=>`<option value="${k}">${k}</option>`).join('');
  const elKelas = document.getElementById('filter-kelas-tanpadapur');
  if(elKelas) elKelas.innerHTML = '<option value="">Semua Kelas</option>' + kelasOpts;

  // Filter dropdown asrama
  const asramaOpts = ALL_ASRAMA.map(a=>`<option value="${a.id}">${a.nama}</option>`).join('');
  const elAsrama = document.getElementById('filter-asrama-tanpadapur');
  if(elAsrama) elAsrama.innerHTML = '<option value="">Semua Asrama</option>' + asramaOpts;

  const filterKelas = document.getElementById('filter-kelas-tanpadapur')?.value || '';
  const filterAsrama = document.getElementById('filter-asrama-tanpadapur')?.value || '';

  let list = ALL_SANTRI.filter(s=>!s.dapur_id || s.dapur_id === null || s.dapur_id === '');

  if(filterKelas) list = list.filter(s=>String(s.kelas)===filterKelas);
  if(filterAsrama) list = list.filter(s=>String(s.kobong?.asrama_id||'')===filterAsrama);

  const count = document.getElementById('tanpa-dapur-count');
  if(count) count.textContent = `Total: ${list.length} santri`;

  const el = document.getElementById('tanpa-dapur-list');
  if(!el) return;

  if(!list.length){
    el.innerHTML = '<div class="empty"><span class="ei">✅</span><p>Semua santri sudah terdaftar di dapur.</p></div>';
    return;
  }

  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:var(--green);color:#fff">
      <th style="padding:8px;text-align:left">#</th>
      <th style="padding:8px;text-align:left">Nama</th>
      <th style="padding:8px;text-align:left">Kelas</th>
      <th style="padding:8px;text-align:left">Kobong</th>
      <th style="padding:8px;text-align:left">Asrama</th>
    </tr></thead>
    <tbody>${list.map((s,i)=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px">${i+1}</td>
      <td style="padding:8px;font-weight:600">${s.nama}</td>
      <td style="padding:8px">${s.kelas||'-'}</td>
      <td style="padding:8px">${s.kobong?.nama||'-'}</td>
      <td style="padding:8px">${getAsramaNama(s.kobong?.asrama_id)||'-'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

async function simpanPengaturan(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const makan=parseInt(document.getElementById('set-makan').value)||380000;
  const listrik=parseInt(document.getElementById('set-listrik').value)||40000;
  const bulan=document.getElementById('set-bulan').value.trim();
  const upserts=[
    {key:'nominal_makan',value:String(makan)},
    {key:'nominal_listrik',value:String(listrik)},
  ];
  if(bulan) upserts.push({key:'bulan_aktif',value:bulan});
  await SB.from('settings').upsert(upserts);
  upserts.forEach(u=>CONFIG[u.key]=u.value);
  document.getElementById('hdr-bulan').textContent=bulanAktif();
  toast('✅ Pengaturan disimpan!');

  } finally { setLoading(false, _lBtn); }
}

async function gantiPassAdmin(){
  const p1=document.getElementById('set-pass1').value;
  const p2=document.getElementById('set-pass2').value;
  if(!p1||p1!==p2){ toast('⚠️ Password tidak cocok atau kosong!'); return; }
  const enc=new TextEncoder().encode(p1);
  const h=await crypto.subtle.digest('SHA-256',enc);
  const hex=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
  await SB.from('settings').upsert({key:'super_pass',value:hex});
  document.getElementById('set-pass1').value=''; document.getElementById('set-pass2').value='';
  toast('✅ Password berhasil diubah!');
}

async function simpanTemplateWA(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const tmpl=document.getElementById('set-wa-template')?.value.trim();
  if(!tmpl){ toast('⚠️ Template kosong!'); return; }
  await SB.from('settings').upsert({key:'wa_template_bend',value:tmpl});
  CONFIG.wa_template_bend=tmpl; toast('✅ Template WA disimpan!');

  } finally { setLoading(false, _lBtn); }
}
function resetTemplateWA(){ konfirm('Reset template WA ke pesan default?', ()=>{ document.getElementById('set-wa-template').value=getDefaultWATemplate(); toast('↺ Template direset!'); }, 'lainnya'); }

// ===== BACKUP =====
function backupLengkap(){
  const santri=getSantriFiltered();
  const tagihan=getTagihanFiltered();
  const wb=XLSX.utils.book_new();
  const wsSantri=XLSX.utils.json_to_sheet(santri.map(s=>({Nama:s.nama,Kelas:s.kelas||'—',Kobong:s.kobong?.nama||getKobongNama(s.kobong_id)||'—',Dapur:getDapurNama(s.dapur_id),WA:s.no_wa||'—'})));
  const wsTagihan=XLSX.utils.json_to_sheet(tagihan.map(t=>{const s=getSantriById(t.santri_id)||{}; return {Santri:s.nama||t.santri_nama,Bulan:t.bulan,Makan:t.nominal_makan,Listrik:t.nominal_listrik,Total:t.nominal,Bayar:t.nominal_bayar||0,Status:t.status,TglBayar:t.tgl_bayar||'—',DicatatOleh:t.dicatat_oleh||'—'}}));
  XLSX.utils.book_append_sheet(wb,wsSantri,'Santri'); XLSX.utils.book_append_sheet(wb,wsTagihan,'Tagihan');
  XLSX.writeFile(wb,`backup_bendahara_${today()}.xlsx`);
  toast('✅ Backup didownload!');
}
function backupSemuaData(){ backupLengkap(); }

// ===== SQL MIGRASI =====
function getSQLMigrasi(){
  return `-- Migrasi: tambah kolom no_wa di bendahara_users
alter table bendahara_users add column if not exists no_wa text;

-- Tabel tagihan_pondok (bendahara)
create table if not exists tagihan_pondok (
  id bigserial primary key,
  santri_id bigint references santri(id) on delete cascade,
  santri_nama text,
  dapur_id text,
  bulan text not null,
  nominal_makan integer default 0,
  nominal_listrik integer default 0,
  nominal integer not null,
  nominal_bayar integer default 0,
  status text default 'belum',
  tgl_tagihan date,
  tgl_bayar date,
  keterangan text,
  dicatat_oleh text,
  created_at timestamptz default now()
);
alter table tagihan_pondok enable row level security;
create policy "allow_all" on tagihan_pondok for all using (true) with check (true);

-- Tabel bendahara_users
create table if not exists bendahara_users (
  id bigserial primary key,
  username text unique not null,
  password_hash text,
  nama_tampilan text,
  foto_url text,
  role text default 'pengelola',
  dapur_id text,
  created_at timestamptz default now()
);
alter table bendahara_users enable row level security;
create policy "allow_all" on bendahara_users for all using (true) with check (true);

-- Tabel akses asrama per bendahara
create table if not exists bendahara_akses (
  id bigserial primary key,
  bendahara_id bigint references bendahara_users(id) on delete cascade,
  asrama_id bigint,
  asrama_nama text,
  created_at timestamptz default now(),
  unique(bendahara_id, asrama_id)
);
alter table bendahara_akses enable row level security;
create policy "allow_all" on bendahara_akses for all using (true) with check (true);

-- Tabel deposit santri
create table if not exists santri_deposit (
  id bigserial primary key,
  santri_id bigint references santri(id) on delete cascade,
  saldo integer default 0,
  tgl_terakhir date,
  keterangan text,
  dicatat_oleh text,
  created_at timestamptz default now(),
  unique(santri_id)
);
alter table santri_deposit enable row level security;
create policy "allow_all" on santri_deposit for all using (true) with check (true);

-- Tabel monitor aktivitas (LAMA -- 1 baris per username, ketimpa tiap login
-- baru. Gak dipakai lagi oleh app, dibiarkan aja gak masalah kalau mau dihapus manual)
create table if not exists bendahara_activity (
  id bigserial primary key,
  username text unique,
  nama text, role text, device text,
  last_seen timestamptz default now(),
  login_at timestamptz default now()
);
alter table bendahara_activity enable row level security;
create policy "allow_all" on bendahara_activity for all using (true) with check (true);

-- Tabel monitor aktivitas per-device (BARU -- samain pola sama login_sessions
-- punya Saku Santri: 1 baris per device/sesi, bukan per akun, jadi 1 akun bisa
-- kelihatan login dari beberapa device sekaligus & bisa di-logout satu-satu)
create table if not exists bendahara_login_sessions (
  id bigserial primary key,
  session_id text unique not null,
  bendahara_id bigint,
  bendahara_username text,
  bendahara_nama text,
  bendahara_role text,
  device_name text,
  user_agent text,
  last_seen timestamptz default now(),
  is_online boolean default true,
  revoked boolean default false,
  created_at timestamptz default now()
);
alter table bendahara_login_sessions enable row level security;
create policy "allow_all" on bendahara_login_sessions for all using (true) with check (true);

-- Fitur Kelulusan & Piutang Alumni
alter table santri add column if not exists is_arsip boolean default false;
alter table santri add column if not exists tgl_keluar date;
alter table santri add column if not exists catatan_keluar text;

create table if not exists piutang_alumni (
  id bigserial primary key,
  santri_id bigint,
  nama_santri text,
  kobong_nama text,
  kelas text,
  total_piutang numeric default 0,
  status_piutang text default 'belum',
  tgl_keluar date,
  tgl_lunas date,
  catatan text,
  catatan_lunas text,
  no_wa text,
  created_at timestamptz default now()
);
alter table piutang_alumni enable row level security;
create policy "allow_all" on piutang_alumni for all using (true) with check (true);

-- Kolom bulan mulai tagihan (untuk santri baru masuk tengah tahun)
alter table santri add column if not exists bulan_mulai_tagihan text;

-- Kolom jenis kelamin asrama & santri
alter table asrama add column if not exists jenis_kelamin text default 'putera';
alter table santri add column if not exists jenis_kelamin text default 'putera';

-- TRIGGER: hapus tagihan otomatis saat santri dihapus
-- (berlaku dari Saku Santri maupun Bendahara maupun Supabase dashboard)
create or replace function hapus_tagihan_saat_santri_dihapus()
returns trigger as $$
begin
  delete from tagihan_pondok where santri_id = OLD.id;
  delete from santri_deposit where santri_id = OLD.id;
  return OLD;
end;
$$ language plpgsql;

drop trigger if exists trigger_hapus_tagihan on santri;
create trigger trigger_hapus_tagihan
before delete on santri
for each row
execute function hapus_tagihan_saat_santri_dihapus();

-- Fitur Konfigurasi Tagihan Per Asrama (jenis tagihan custom + rincian breakdown)
alter table tagihan_pondok add column if not exists rincian jsonb;

create table if not exists konfigurasi_tagihan_asrama (
  id bigserial primary key,
  asrama_id bigint references asrama(id) on delete cascade,
  jenis text not null,
  nominal integer not null default 0,
  urutan integer default 0,
  created_at timestamptz default now()
);
alter table konfigurasi_tagihan_asrama enable row level security;
create policy "allow_all" on konfigurasi_tagihan_asrama for all using (true) with check (true);

-- ================================================================
-- MIGRASI KEAMANAN (WAJIB): Login Aman untuk bendahara_users
-- Saat ini siapa pun bisa membaca password (terenkripsi) semua akun
-- bendahara langsung dari database tanpa login. SQL ini menutup celah
-- itu. Login tetap berjalan seperti biasa setelah dijalankan.
--
-- CATATAN: aplikasi Saku Santri & Bendahara berbagi satu database
-- Supabase yang sama. Kalau migrasi keamanan serupa sudah pernah
-- dijalankan lewat panel Pengaturan di Saku Santri, bagian "settings"
-- di bawah ini SUDAH tidak perlu diulang (fungsi login_super_check
-- dan kunci tabel settings sudah ada) — cukup jalankan bagian
-- bendahara_users-nya saja.
-- ================================================================
create extension if not exists pgcrypto;

-- Cek login Pengelola/Bendahara di server, tidak pernah kirim password_hash ke browser
create or replace function login_bendahara_check(p_username text, p_password text)
returns jsonb
language plpgsql security definer
as $$
declare v_row bendahara_users%rowtype;
begin
  select * into v_row from bendahara_users where username = p_username;
  if not found then return null; end if;
  if v_row.password_hash = encode(digest(p_password,'sha256'),'hex')
     or v_row.password_hash = encode(convert_to(p_password,'UTF8'),'base64') then
    return to_jsonb(v_row) - 'password_hash';
  end if;
  return null;
end; $$;

-- Kunci: tabel bendahara_users cuma boleh dibaca kalau sudah login
drop policy if exists "allow_all" on bendahara_users;
create policy "select_authenticated" on bendahara_users for select to authenticated using (true);
create policy "insert_authenticated" on bendahara_users for insert to authenticated with check (true);
create policy "update_authenticated" on bendahara_users for update to authenticated using (true);
create policy "delete_authenticated" on bendahara_users for delete to authenticated using (true);

-- Cek login Kang Admin di server (SAMA seperti login Admin di Saku Santri —
-- aman dijalankan ulang meski sudah pernah dibuat lewat panel Saku Santri)
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

-- Kunci tabel settings (lewati bagian ini kalau sudah dijalankan dari Saku Santri)
drop policy if exists "allow_all" on settings;
drop policy if exists "select_public_settings" on settings;
drop policy if exists "select_secrets_authenticated" on settings;
drop policy if exists "insert_authenticated" on settings;
drop policy if exists "update_authenticated" on settings;
create policy "select_public_settings" on settings for select
  using (key not in ('super_pass','super_user'));
create policy "select_secrets_authenticated" on settings for select to authenticated using (true);
create policy "insert_authenticated" on settings for insert to authenticated with check (true);
create policy "update_authenticated" on settings for update to authenticated using (true);

-- Migrasi: Pisahkan Notifikasi per App (Bendahara vs Saku Santri)
-- Notifikasi & subscription push lama (app_source masih kosong) tetap
-- kelihatan/kepakai di kedua app, yang baru ke depannya otomatis kepisah
-- sesuai app pengirimnya.
-- CATATAN: Edge Function "send-push" di Supabase juga WAJIB diupdate
-- (destructure & insert/filter kolom app_source dari body request) supaya
-- kolom ini benar-benar kepakai -- lewati bagian ini kalau sudah dijalankan
-- dari Saku Santri.
alter table push_notifications add column if not exists app_source text;
alter table push_subscriptions add column if not exists app_source text;`;
}

