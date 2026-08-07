// ===== ASRAMA-KOBONG CASCADE =====
let _waliManualDipilih = false;

// Refresh dropdown Wali Santri/Pengurus sesuai Asrama & Kobong yang dipilih di form Tambah/Edit Santri.
// - Cuma pengurus yang mengelola kobong di asrama tsb yang ditampilkan
// - Kalau kobong yang dipilih belum ada wali-nya, otomatis default ke user yang sedang input (sekretaris/admin)
function refreshWaliKobongDropdown(){
  const fgWali = document.getElementById('fg-wali-kobong');
  if(!fgWali) return;
  const bisaLihat = SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat';
  if(!bisaLihat){ fgWali.style.display='none'; return; }
  fgWali.style.display='block';

  const asramaId = document.getElementById('s-asrama')?.value||'';
  const kobongId = document.getElementById('s-kobong')?.value||'';
  const sel = document.getElementById('s-created-by');
  const hint = document.getElementById('s-wali-hint');
  if(!sel) return;

  // Pengurus yang mengelola kobong di asrama terpilih (kosong = semua pengurus)
  let relevan = ALL_PENGURUS.filter(p=>(p.role==='pengurus'||!p.role));
  if(asramaId){
    relevan = relevan.filter(p=>{
      const ids = JSON.parse(p.kobong_ids||'[]').map(Number);
      const cocokKobong = ids.some(kid=>{ const k=ALL_KOBONG.find(x=>x.id===kid); return k && String(k.asrama_id)===String(asramaId); });
      const asramaIds = JSON.parse(p.asrama_ids||'[]').map(String);
      const cocokAsrama = asramaIds.includes(String(asramaId));
      return cocokKobong || cocokAsrama;
    });
  }

  let html = `<option value="">— Kang Admin / Superadmin —</option>`;
  if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
    html += `<option value="${SESSION.user.username}">⭐ ${SESSION.user.nama} (Anda)</option>`;
  }
  html += relevan.map(p=>`<option value="${p.username}">${p.nama} (@${p.username})</option>`).join('');
  sel.innerHTML = html;

  if(!_waliManualDipilih){
    let defaultVal = '';
    let hintText = '';
    if(kobongId && kobongId!=='__belum__'){
      const adaWali = ALL_PENGURUS.find(p=>(p.role==='pengurus'||!p.role) && JSON.parse(p.kobong_ids||'[]').map(Number).includes(parseInt(kobongId)));
      if(adaWali){
        defaultVal = adaWali.username;
        hintText = `📌 Kobong ini sudah punya wali: ${adaWali.nama}`;
      } else if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
        defaultVal = SESSION.user.username;
        hintText = `ℹ️ Kobong ini belum punya wali, otomatis diisi atas nama Anda`;
      }
    }
    sel.value = defaultVal;
    if(hint){ hint.textContent = hintText; hint.style.display = hintText?'block':'none'; }
  } else if(hint){ hint.style.display='none'; }
}

function onAsramaChange(){
  const asramaId = document.getElementById('s-asrama')?.value;
  const kobSel = document.getElementById('s-kobong');
  if(!kobSel) return;

  // Auto-set jenis kelamin dari asrama (readonly)
  const asrama = ALL_ASRAMA.find(a=>String(a.id)===String(asramaId));
  const jk = asrama?.jenis_kelamin || '';
  const jkHidden = document.getElementById('s-jenis-kelamin');
  const jkText = document.getElementById('jk-display-text');
  const jkDisplay = document.getElementById('jk-display');
  if(jkHidden) jkHidden.value = jk;
  if(jkText && jkDisplay){
    if(jk==='putera'){
      jkText.textContent = '🧒 Putera';
      jkText.style.color = 'var(--green)';
      jkText.style.fontStyle = 'normal';
      jkText.style.fontWeight = '700';
      jkDisplay.style.background = 'var(--green-p)';
      jkDisplay.style.borderColor = 'var(--green-b)';
    } else if(jk==='puteri'){
      jkText.textContent = '👧 Puteri';
      jkText.style.color = '#6c3483';
      jkText.style.fontStyle = 'normal';
      jkText.style.fontWeight = '700';
      jkDisplay.style.background = '#f5eef8';
      jkDisplay.style.borderColor = '#d2b4de';
    } else {
      jkText.textContent = '⚠️ Asrama belum diset gender — edit asrama dulu!';
      jkText.style.color = 'var(--red)';
      jkText.style.fontStyle = 'italic';
      jkText.style.fontWeight = '400';
      jkDisplay.style.background = 'var(--red-p)';
      jkDisplay.style.borderColor = '#f5c6c2';
    }
  }

  // Populate kobong dari asrama ini + tambah "Belum Ditentukan"
  kobSel.innerHTML = '<option value="">-- Pilih Kobong (opsional) --</option>';
  const list = getKobongAccessible(asramaId);
  list.forEach(k=>{ kobSel.innerHTML+=`<option value="${k.id}">${k.nama}</option>`; });
  // Tambahkan opsi "Belum Ditentukan" di akhir
  kobSel.innerHTML += `<option value="__belum__">— Belum Ditentukan —</option>`;

  // Populate dapur
  const dapurSel = document.getElementById('s-dapur');
  if(!dapurSel) return;
  dapurSel.innerHTML = '<option value="">-- Pilih Dapur --</option>';
  const asramaNama = (asrama?.nama||'').toLowerCase();
  let dapurOptions = [];
  if(asramaNama.includes('ummi')){
    dapurOptions = [{ value:'dapur_ummi', label:'🍽️ Dapur Ummi' }];
  } else if(asramaNama.includes('badri') || asramaNama.includes('marfu')){
    dapurOptions = [
      { value:'dapur_bibi',    label:'🍽️ Dapur Bibi' },
      { value:'dapur_buonih', label:'🍽️ Dapur Bu Onih' }
    ];
  } else if(asramaNama.includes('bibi')){
    dapurOptions = [{ value:'dapur_bibi', label:'🍽️ Dapur Bibi' }];
  } else {
    dapurOptions = [
      { value:'dapur_ummi',    label:'🍽️ Dapur Ummi' },
      { value:'dapur_bibi',    label:'🍽️ Dapur Bibi' },
      { value:'dapur_buonih', label:'🍽️ Dapur Bu Onih' }
    ];
  }
  dapurOptions.forEach(d=>{ dapurSel.innerHTML += `<option value="${d.value}">${d.label}</option>`; });
  if(dapurOptions.length === 1) dapurSel.value = dapurOptions[0].value;

  refreshWaliKobongDropdown();
}

function onAsramaJKChange(){
  const jk = document.querySelector('input[name="asrama-jk"]:checked')?.value||'putera';
  const lblP = document.getElementById('lbl-asr-putera');
  const lblI = document.getElementById('lbl-asr-puteri');
  if(lblP) lblP.style.cssText = jk==='putera'
    ? 'flex:1;border:1.5px solid var(--green);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;background:var(--green-p);color:var(--green);transition:.2s'
    : 'flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:.2s;color:var(--text-m)';
  if(lblI) lblI.style.cssText = jk==='puteri'
    ? 'flex:1;border:1.5px solid #9c27b0;border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;background:#f5eef8;color:#6c3483;transition:.2s'
    : 'flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:.2s;color:var(--text-m)';
}

// ===== ASRAMA MANAGEMENT =====
function openModalTambahAsrama(){
  document.getElementById('mo-asrama-title').textContent='Tambah Asrama';
  document.getElementById('edit-asrama-id').value='';
  document.getElementById('asrama-nama').value='';
  document.getElementById('asrama-ket').value='';
  // Default putera
  const r = document.querySelector('input[name="asrama-jk"][value="putera"]');
  if(r) r.checked=true;
  onAsramaJKChange();
  openMo('mo-asrama');
}

function editAsrama(id){
  const a=ALL_ASRAMA.find(x=>x.id===id);
  if(!a) return;
  document.getElementById('mo-asrama-title').textContent='Edit Asrama';
  document.getElementById('edit-asrama-id').value=id;
  document.getElementById('asrama-nama').value=a.nama;
  document.getElementById('asrama-ket').value=a.keterangan||'';
  // Set radio jenis kelamin
  const jk = a.jenis_kelamin||'putera';
  const r = document.querySelector(`input[name="asrama-jk"][value="${jk}"]`);
  if(r) r.checked=true;
  onAsramaJKChange();
  openMo('mo-asrama');
}

async function simpanAsrama(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan data asrama...','Data asrama sedang disimpan.');
  setLoading(true, _lBtn);
  try {

  const id=document.getElementById('edit-asrama-id').value;
  const nama=document.getElementById('asrama-nama').value.trim();
  const ket=document.getElementById('asrama-ket').value.trim();
  const jenis_kelamin=document.querySelector('input[name="asrama-jk"]:checked')?.value||'putera';
  if(!nama){ toast('Nama asrama wajib diisi!',false); return; }
  if(id){
    const {error}=await SB.from('asrama').update({nama,keterangan:ket,jenis_kelamin}).eq('id',id);
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast('Asrama diperbarui!');
  } else {
    const {error}=await SB.from('asrama').insert({nama,keterangan:ket,jenis_kelamin});
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast('Asrama ditambahkan!');
  }
  closeMo('mo-asrama');
  await loadAllData();
  renderKobong();

  } finally { setLoading(false, _lBtn); }
}

async function hapusAsrama(id){
  if(_isLoading) return;
  try {

  const a=ALL_ASRAMA.find(x=>x.id===id);
  const cnt=ALL_KOBONG.filter(k=>k.asrama_id===id).length;
  konfirm(`Hapus asrama <strong>${a?.nama}</strong>?${cnt?` Ada ${cnt} kobong di sini — pindahkan kobong dulu!`:''}`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menghapus asrama...','Data asrama sedang dihapus.');
    setLoading(true, _lBtn2);
    try {
    if(cnt){ toast('Pindahkan kobong ke asrama lain dulu sebelum hapus!',false); return; }
    const {error}=await SB.from('asrama').delete().eq('id',id);
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast('Asrama dihapus');
    await loadAllData();
    renderKobong();
  
    } finally { setLoading(false, _lBtn2); }});

  } finally { setLoading(false, _lBtn); }
}

// ===== KOBONG MODAL HELPER =====
function openModalTambahKobong(){
  document.getElementById('mo-kobong-title').textContent='Tambah Kobong';
  document.getElementById('edit-kobong-id').value='';
  document.getElementById('kob-nama').value='';
  document.getElementById('kob-ket').value='';
  // Populate asrama in kobong modal
  const sel=document.getElementById('kob-asrama');
  sel.innerHTML='<option value="">-- Pilih Asrama --</option>';
  ALL_ASRAMA.forEach(a=>{ sel.innerHTML+=`<option value="${a.id}">${a.nama}</option>`; });
  openMo('mo-kobong');
}

// ===== KOBONG =====
function renderKobong(){
  // Filter asrama berdasarkan akses sekretariat
  const isSekretariat = SESSION && SESSION.role === 'sekretariat';
  const allowedAsramaIds = isSekretariat
    ? JSON.parse(SESSION.user?.asrama_ids||'[]').map(String)
    : null;

  const visibleAsrama = allowedAsramaIds
    ? ALL_ASRAMA.filter(a=>allowedAsramaIds.includes(String(a.id)))
    : ALL_ASRAMA;

  const isSuper = SESSION.role === 'super';
  const container = document.getElementById('asrama-kobong-grid');
  if(!container) return;

  // Simpan state expand sebelumnya
  const expandedIds = new Set([...document.querySelectorAll('.asrama-block.expanded')].map(el=>el.dataset.id));

  let html = '';
  visibleAsrama.forEach(a => {
    const kobongs = ALL_KOBONG.filter(k=>String(k.asrama_id)===String(a.id));
    const santriCount = ALL_SANTRI.filter(s=>kobongs.map(k=>k.id).includes(s.kobong_id)).length;
    const isExpanded = expandedIds.has(String(a.id));

    let kobongHtml = '';
    if(kobongs.length){
      kobongHtml = `<div class="kgrid" style="margin-top:12px">` +
        kobongs.map(k=>{
          const kSantri = ALL_SANTRI.filter(s=>s.kobong_id===k.id);
          const count = kSantri.length;
          const saldo = kSantri.reduce((a,s)=>a+s.saldo,0);
          return `<div class="kcard" onclick="lihatSantriKobong(${k.id})" style="cursor:pointer">
            <h3>${svgIcon('home',15)} ${k.nama}</h3>
            <div class="km">${k.keterangan||k.wali||'—'}</div>
            <div class="ks">
              <span style="display:inline-flex;align-items:center;gap:4px">${svgIcon('users',13)} ${count} santri</span>
              <span style="font-weight:600;color:${saldo<0?'var(--red)':'var(--green)'}">${rp(saldo)}</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:10px">
              <button class="btn btn-p btn-sm" onclick="event.stopPropagation();lihatSantriKobong(${k.id})">${svgIcon('users',14)} Lihat Santri</button>
              ${isSuper?`<button class="btn btn-o btn-sm" onclick="event.stopPropagation();editKobong(${k.id})">${svgIcon('edit',14)}</button>
              <button class="btn btn-d btn-sm" onclick="event.stopPropagation();hapusKobong(${k.id})">${svgIcon('trash',14)}</button>`:''}
            </div>
          </div>`;
        }).join('') +
      `</div>`;
    } else {
      kobongHtml = `<div style="padding:12px 0;color:var(--text-l);font-size:13px">Belum ada kobong di asrama ini.</div>`;
    }

    const jkBadge = a.jenis_kelamin==='puteri'
      ? '<span style="background:#f5eef8;color:#6c3483;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px">👧 Puteri</span>'
      : a.jenis_kelamin==='putera'
      ? '<span style="background:var(--green-p);color:var(--green);border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px">🧒 Putera</span>'
      : `<span style="background:var(--red-p);color:var(--red);border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px;display:inline-flex;align-items:center;gap:3px">${svgIcon('alert-triangle',11)} Belum diset — Edit!</span>`;

    html += `<div class="asrama-block ${isExpanded?'expanded':''}" data-id="${a.id}">
      <div class="asrama-block-header" onclick="toggleAsramaBlock(this)">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
          <h3>${svgIcon('building',15)} ${a.nama}${jkBadge}</h3>
          <span style="font-size:12px;color:var(--text-l);background:var(--bg);padding:2px 8px;border-radius:20px">${kobongs.length} kobong · ${santriCount} santri</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${isSuper?`<button class="btn btn-p btn-sm" onclick="event.stopPropagation();tambahKobongDiAsrama(${a.id})">${svgIcon('plus',14)} Kobong</button>
          <button class="btn btn-o btn-sm" onclick="event.stopPropagation();editAsrama(${a.id})">${svgIcon('edit',14)}</button>
          <button class="btn btn-d btn-sm" onclick="event.stopPropagation();hapusAsrama(${a.id})">${svgIcon('trash',14)}</button>`:''}
          <span class="asrama-chevron">▼</span>
        </div>
      </div>
      <div class="asrama-block-body ${isExpanded?'open':''}">
        ${kobongHtml}
      </div>
    </div>`;
  });

  container.innerHTML = html || '<div class="empty"><span class="ei">🏛️</span><p>Belum ada asrama.</p></div>';
}

function toggleAsramaBlock(headerEl){
  const block = headerEl.closest('.asrama-block');
  const body = block.querySelector('.asrama-block-body');
  const isOpen = block.classList.contains('expanded');
  block.classList.toggle('expanded', !isOpen);
  body.classList.toggle('open', !isOpen);
}

function tambahKobongDiAsrama(asramaId){
  // Buka modal tambah kobong dengan asrama sudah dipilih
  document.getElementById('mo-kobong-title').textContent = 'Tambah Kobong';
  document.getElementById('edit-kobong-id').value = '';
  document.getElementById('kob-nama').value = '';
  document.getElementById('kob-ket').value = '';
  // Set asrama
  const selAsrama = document.getElementById('kob-asrama');
  if(selAsrama) selAsrama.value = asramaId;
  // Trigger populate wali
  if(typeof onKobongAsramaChange === 'function') onKobongAsramaChange();
  openMo('mo-kobong');
}

// ===== LIHAT SANTRI PER KOBONG =====
function lihatSantriKobong(kobongId){
  const k = ALL_KOBONG.find(x=>x.id===kobongId);
  if(!k) return;
  const aNama = k.asrama?.nama||ALL_ASRAMA.find(a=>a.id===k.asrama_id)?.nama||'—';
  const santris = ALL_SANTRI.filter(s=>s.kobong_id===kobongId);
  const totalSaldo = santris.reduce((a,s)=>a+s.saldo,0);

  // Set header info
  document.getElementById('mo-kobong-santri-title').textContent = `🏠 ${k.nama} — Daftar Santri`;
  document.getElementById('kobong-santri-asrama').textContent = `🏛️ ${aNama}`;
  document.getElementById('kobong-santri-nama').textContent = k.nama;
  document.getElementById('kobong-santri-ket').textContent = k.keterangan||'';
  document.getElementById('kobong-santri-saldo').textContent = (totalSaldo<0?'− ':'')+rp(totalSaldo);
  document.getElementById('kobong-santri-count').textContent = `${santris.length} santri terdaftar`;

  const tbody = document.getElementById('kobong-santri-tbl');
  const emptyEl = document.getElementById('kobong-santri-empty');

  if(!santris.length){
    tbody.innerHTML='';
    emptyEl.style.display='block';
  } else {
    emptyEl.style.display='none';
    tbody.innerHTML = santris.map((s,i)=>{
      const saldoClass = s.saldo < 0 ? 'color:var(--red);font-weight:800' :
                         s.saldo === 0 ? 'color:var(--text-l);font-weight:700' :
                         s.saldo < (parseInt(CONFIG.kritis_batas)||50000) ? 'color:#e67e22;font-weight:700' :
                         'color:var(--green);font-weight:700';
      const saldoTxt = s.saldo<0
        ? `<span style="${saldoClass}">− Rp ${Math.abs(s.saldo).toLocaleString('id-ID')}</span>`
        : `<span style="${saldoClass}">Rp ${(s.saldo||0).toLocaleString('id-ID')}</span>`;
      return `<tr style="border-bottom:1px solid var(--border)" id="kob-row-${s.id}">
        <td style="padding:10px 12px"><input type="checkbox" class="kob-chk" value="${s.id}" onchange="updateMassalToolbar()" style="cursor:pointer;width:15px;height:15px"></td>
        <td style="padding:10px 12px">
          <div style="display:flex;align-items:center;gap:9px">
            <div class="av" style="width:34px;height:34px;font-size:13px;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
            <div>
              <div style="font-weight:600;font-size:13px">${s.nama}</div>
              ${s.catatan?`<div style="font-size:11px;color:var(--text-l)">${s.catatan}</div>`:''}
            </div>
          </div>
        </td>
        <td style="padding:10px 12px;font-size:12px;color:var(--text-m)">${s.kelas||'—'}</td>
        <td style="padding:10px 12px;text-align:right">${saldoTxt}</td>
        <td style="padding:10px 12px;text-align:center">
          <button class="btn btn-p btn-sm" onclick="closeMo('mo-kobong-santri');openDetailModal(${s.id})">${svgIcon('document',14)} Detail</button>
        </td>
      </tr>`;
    }).join('');
  }

  _currentKobongId = kobongId;
  // Reset toolbar
  const toolbar = document.getElementById('kobong-massal-toolbar');
  if(toolbar) toolbar.style.display='none';
  openMo('mo-kobong-santri');
}

function editKobong(id){
  const k=ALL_KOBONG.find(x=>x.id===id);
  if(!k) return;
  document.getElementById('mo-kobong-title').textContent='Edit Kobong';
  document.getElementById('edit-kobong-id').value=id;
  // Populate asrama select
  const sel=document.getElementById('kob-asrama');
  sel.innerHTML='<option value="">-- Pilih Asrama --</option>';
  ALL_ASRAMA.forEach(a=>{ sel.innerHTML+=`<option value="${a.id}" ${k.asrama_id===a.id?'selected':''}>${a.nama}</option>`; });
  document.getElementById('kob-nama').value=k.nama;
  document.getElementById('kob-ket').value=k.keterangan||'';
  openMo('mo-kobong');
}

async function simpanKobong(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan data kobong...','Data kobong sedang disimpan.');
  setLoading(true, _lBtn);
  try {

  const id=document.getElementById('edit-kobong-id').value;
  const asrama_id=parseInt(document.getElementById('kob-asrama').value)||null;
  const nama=document.getElementById('kob-nama').value.trim();
  const ket=document.getElementById('kob-ket').value.trim();
  if(!nama){ toast('Nama kobong wajib diisi!',false); return; }
  if(!asrama_id){ toast('Pilih asrama dulu!',false); return; }

  if(id){
    const {error}=await SB.from('kobong').update({nama,asrama_id,keterangan:ket}).eq('id',id);
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast('Kobong diperbarui!');
  } else {
    const {error}=await SB.from('kobong').insert({nama,asrama_id,keterangan:ket});
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast('Kobong ditambahkan!');
  }
  closeMo('mo-kobong');
  document.getElementById('edit-kobong-id').value='';
  document.getElementById('kob-nama').value='';
  document.getElementById('kob-ket').value='';
  await loadAllData();
  renderKobong();

  } finally { setLoading(false, _lBtn); }
}

async function hapusKobong(id){
  if(_isLoading) return;
  try {

  const k=ALL_KOBONG.find(x=>x.id===id);
  const cnt=ALL_SANTRI.filter(s=>s.kobong_id===id).length;
  konfirm(`Hapus kobong <strong>${k?.nama}</strong>?${cnt?` Ada ${cnt} santri di sini yang perlu dipindah dulu!`:''}`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menghapus kobong...','Data kobong sedang dihapus.');
    setLoading(true, _lBtn2);
    try {
    if(cnt){ toast('Pindahkan santri dulu sebelum hapus kobong!',false); return; }
    await SB.from('kobong').delete().eq('id',id);
    toast('Kobong dihapus');
    await loadAllData();
    renderKobong();
  
    } finally { setLoading(false, _lBtn2); }});

  } finally { setLoading(false, _lBtn); }
}

