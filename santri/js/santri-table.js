function renderTabelSantri(){
  const q = document.getElementById('santri-cari')?.value.toLowerCase()||'';
  const af = document.getElementById('santri-asrama')?.value||'';
  const kf = document.getElementById('santri-kobong')?.value||'';
  const wf = document.getElementById('santri-wali')?.value||'';
  const klf = document.getElementById('santri-kelas')?.value||'';
  const gf = document.getElementById('santri-gender')?.value||'';
  const kritis = parseInt(CONFIG.kritis_batas)||50000;
  const isSekretariat = SESSION.role==='sekretariat'||SESSION.role==='sekretaris';
  const canBulk = SESSION.role==='super'||SESSION.role==='sekretariat'||SESSION.role==='sekretaris';

  const cbAll = document.getElementById('santri-cb-all');
  if(cbAll) cbAll.style.display = canBulk ? '' : 'none';
  const btnPilih = document.getElementById('btn-toggle-pilih-santri');
  if(btnPilih) btnPilih.style.display = canBulk ? '' : 'none';

  let filtered = ALL_SANTRI.filter(s=>{
    if(q && !s.nama.toLowerCase().includes(q)) return false;
    if(af){
      const kobong = ALL_KOBONG.find(k=>k.id===s.kobong_id);
      if(!kobong || String(kobong.asrama_id)!==String(af)) return false;
    }
    if(kf && String(s.kobong_id)!==kf) return false;
    if(wf && s.created_by!==wf) return false;
    if(klf && s.kelas!==klf) return false;
    if(gf && s.jenis_kelamin!==gf) return false;
    return true;
  });

  let html='';
  filtered.forEach((s,i)=>{
    const k = s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const sc = s.saldo<0?'s-minus':s.saldo===0?'s-nol':s.saldo<kritis?'s-warn':'s-ok';
    const isChecked = _bulkSelected.has(s.id);
    // Klik nama buka Detail -- cuma di HP (mobile), desktop gak berubah perilakunya
    const klikNamaMobile = `if(window.innerWidth<=640) openDetailModal(${s.id})`;
    html+=`<tr style="${isChecked?'background:#f0fdf4;':''}">
      <td class="cb-col" style="width:36px">${canBulk?`<input type="checkbox" ${isChecked?'checked':''} onchange="santriToggleOne(${s.id},this.checked)" style="accent-color:var(--green);cursor:pointer;width:16px;height:16px">`:''}</td>
      <td style="color:var(--text-l);font-size:12px">${i+1}</td>
      <td class="col-nama" onclick="${klikNamaMobile}"><div style="display:flex;align-items:center;gap:9px">
        <div class="av" style="background:${avColor(s.nama)}22;color:${avColor(s.nama)};overflow:hidden">${s.foto_url?'<img src="'+s.foto_url+'" style="width:100%;height:100%;object-fit:cover">':avLetter(s.nama)}</div>
        <div><strong>${s.nama}</strong>${s.kelas?`<div style="font-size:11px;color:var(--text-l)">Kelas ${s.kelas}</div>`:''}
        </div>
      </div></td>
      <td><span class="badge bg">${k}</span></td>
      <td>${s.pin && s.pin.length > 10 ? `<span style="color:var(--red);font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px" onclick="editSantri(${s.id})" title="PIN perlu direset">${svgIcon('alert-triangle',12)} Perlu Reset</span>` : `<code style="font-family:'DM Mono',monospace;font-size:12px;background:var(--bg);padding:2px 7px;border-radius:5px">${s.pin}</code>`}</td>
      <td><strong class="${sc}">${s.saldo<0?'−':''} ${rp(s.saldo)}</strong></td>
      <td>
        <div class="tbl-act" style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-o btn-sm act-detail" onclick="openDetailModal(${s.id})">${svgIcon('document',14)}</button>
          ${!isSekretariat?`<button class="btn btn-p btn-sm act-tx" onclick="openTxModal(${s.id})">${svgIcon('plus',14)} Tx</button>`:''}
          <button class="btn btn-o btn-sm act-edit" onclick="editSantri(${s.id})">${svgIcon('edit',14)}</button>
          <button class="btn btn-d btn-sm act-hapus" onclick="hapusSantri(${s.id})">${svgIcon('trash',14)}</button>
        </div>
      </td>
    </tr>`;
  });
  document.getElementById('santri-tbl').innerHTML = html||`<tr><td colspan="7"><div class="empty"><span class="ei">👥</span><p>Belum ada santri</p></div></td></tr>`;

  updateBulkBar();

  const pgEl = document.getElementById('santri-pagination');
  if(pgEl) pgEl.innerHTML = '';
  setTimeout(activateLazyLoad, 50);
}

// HP: cek box kolom disembunyikan sampai tombol ini ditekan (biar tabel gak
// penuh cek box yang jarang dipakai) -- desktop gak kena, selalu tampil.
function toggleModePilihSantri(){
  const tw = document.getElementById('santri-tw');
  if(!tw) return;
  const aktif = tw.classList.toggle('pilih-aktif');
  const btn = document.getElementById('btn-toggle-pilih-santri');
  if(btn) btn.textContent = aktif ? '✕ Batal Pilih' : '☑️ Pilih Santri';
  if(!aktif){ _bulkSelected.clear(); renderTabelSantri(); }
}

function santriToggleOne(id, checked){
  if(checked) _bulkSelected.add(id);
  else _bulkSelected.delete(id);
  updateBulkBar();
  // Rerender hanya baris yg berubah warna tanpa full rerender
  renderTabelSantri();
}

function santriToggleAll(checked){
  const q=(document.getElementById('santri-cari')?.value||'').toLowerCase();
  const af=document.getElementById('santri-asrama')?.value||'';
  const kf=document.getElementById('santri-kobong')?.value||'';
  const wf=document.getElementById('santri-wali')?.value||'';
  const klf=document.getElementById('santri-kelas')?.value||'';
  const gf=document.getElementById('santri-gender')?.value||'';
  ALL_SANTRI.filter(s=>{
    if(q && !s.nama.toLowerCase().includes(q)) return false;
    if(af){
      const kobong = ALL_KOBONG.find(k=>k.id===s.kobong_id);
      if(!kobong || String(kobong.asrama_id)!==String(af)) return false;
    }
    if(kf && String(s.kobong_id)!==kf) return false;
    if(wf && s.created_by!==wf) return false;
    if(klf && s.kelas!==klf) return false;
    if(gf && s.jenis_kelamin!==gf) return false;
    return true;
  }).forEach(s=>{ if(checked) _bulkSelected.add(s.id); else _bulkSelected.delete(s.id); });
  renderTabelSantri();
}

function updateBulkBar(){
  const cnt = _bulkSelected.size;
  const bar = document.getElementById('bulk-action-bar');
  const lbl = document.getElementById('bulk-count-label');
  if(bar) bar.style.display = cnt>0 ? 'flex' : 'none';
  if(lbl) lbl.textContent = cnt+' santri dipilih';
}

function bulkBatalPilih(){
  _bulkSelected.clear();
  renderTabelSantri();
}

// Daftar pengurus yang relevan buat dipilih jadi Wali — Kang Admin lihat semua,
// sekretaris/sekretariat cuma lihat pengurus yang kobong/asrama-nya ada di dalam scope asramanya sendiri.
function getPengurusRelevanUntukWali(){
  let list = ALL_PENGURUS.filter(p=>(p.role==='pengurus'||!p.role));
  if(SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
    const myAsrama = JSON.parse(SESSION.user?.asrama_ids||'[]').map(String);
    list = list.filter(p=>{
      const pAsrama = JSON.parse(p.asrama_ids||'[]').map(String);
      const cocokAsrama = pAsrama.some(a=>myAsrama.includes(a));
      const kIds = JSON.parse(p.kobong_ids||'[]').map(Number);
      const cocokKobong = kIds.some(kid=>{ const k=ALL_KOBONG.find(x=>x.id===kid); return k && myAsrama.includes(String(k.asrama_id)); });
      return cocokAsrama || cocokKobong;
    });
  }
  return list;
}

function bulkEditSantri(){
  const cnt = _bulkSelected.size;
  if(!cnt){ toast('Pilih santri dulu!', false); return; }
  document.getElementById('bulk-edit-count').textContent = cnt+' santri';
  document.getElementById('bulk-edit-kelas').value = '';
  // Populate kobong
  const selK = document.getElementById('bulk-edit-kobong');
  selK.innerHTML = '<option value="">— Tidak diubah —</option>' +
    getKobongAccessible().map(k=>`<option value="${k.id}">${k.nama}</option>`).join('');
  // Populate wali
  const selW = document.getElementById('bulk-edit-wali');
  const diriSendiri = (SESSION.role==='sekretaris'||SESSION.role==='sekretariat') ? `<option value="${SESSION.user.username}">⭐ ${SESSION.user.nama} (Anda)</option>` : '';
  selW.innerHTML = '<option value="">— Tidak diubah —</option><option value="__null__">— Tidak Ada / Superadmin —</option>' + diriSendiri +
    getPengurusRelevanUntukWali().map(p=>`<option value="${p.username}">👨‍💼 ${p.nama}</option>`).join('');
  openMo('mo-bulk-edit');
}

async function simpanBulkEdit(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan perubahan...','Memperbarui data santri, harap tunggu.');
  setLoading(true, _lBtn);
  try {

  const kobongVal = document.getElementById('bulk-edit-kobong').value;
  const kelasVal  = document.getElementById('bulk-edit-kelas').value.trim();
  const waliVal   = document.getElementById('bulk-edit-wali').value;

  if(!kobongVal && !kelasVal && !waliVal){ toast('Isi minimal satu field yang ingin diubah!', false); return; }

  const upd = {};
  if(kobongVal)            upd.kobong_id  = parseInt(kobongVal);
  if(kelasVal)             { upd.kelas = kelasVal; upd.catatan = kelasVal; }
  if(waliVal === '__null__') upd.created_by = null;
  else if(waliVal)         upd.created_by = waliVal;

  const ids = [..._bulkSelected];
  const btn = document.getElementById('btn-bulk-edit-simpan');

  konfirm(`Ubah data <strong>${ids.length} santri</strong>?${kobongVal?` Kobong → <strong>${ALL_KOBONG.find(k=>k.id==kobongVal)?.nama}</strong>`:''}${kelasVal?` Kelas → <strong>${kelasVal}</strong>`:''}${waliVal?` Wali → <strong>${waliVal==='__null__'?'Tanpa Wali':ALL_PENGURUS.find(p=>p.username==waliVal)?.nama}</strong>`:''}`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menyimpan perubahan...','Memperbarui data santri yang dipilih.');
    setLoading(true, _lBtn2);
    try {
    // Lock tombol
    if(btn){ btn.disabled=true; btn.textContent='⏳ Menyimpan...'; }
    try{
      // Update satu per satu agar tidak ada yang terlewat
      let berhasil = 0;
      for(const id of ids){
        const sLama = ALL_SANTRI.find(x=>x.id===id);
        const {error} = await SB.from('santri').update(upd).eq('id', id);
        if(!error){
          berhasil++;
          if(sLama){
            const newVals = {...sLama, kobong_id: upd.kobong_id??sLama.kobong_id, kelas: upd.kelas??sLama.kelas};
            const diffObj = _diffFields(SANTRI_FIELD_APPROVAL, sLama, newVals);
            await catatRiwayatSantri({santri_id:id, santri_nama:sLama.nama, asrama_id:getAsramaIdBySantri(sLama), jenis:'edit', diffObj, sumber:'langsung'});
          }
        }
      }
      if(berhasil < ids.length){
        toast(`⚠️ ${berhasil}/${ids.length} santri berhasil diubah`, false);
      } else {
        toast(`✅ ${berhasil} santri berhasil diperbarui!`);
      }
      _bulkSelected.clear();
      closeMo('mo-bulk-edit');
      await loadAllData();
      populateWaliSelects();
      populateKobongSelects();
      renderTabelSantri();
    } catch(e){
      toast('Gagal: '+e.message, false);
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='✅ Simpan Perubahan'; }
    }
  
    } finally { setLoading(false, _lBtn2); }}, 'lainnya');

  } finally { setLoading(false, _lBtn); }
}

async function bulkHapusSantri(){
  if(_isLoading) return;
  try {

  const ids = [..._bulkSelected];
  if(!ids.length){ toast('Pilih santri dulu!', false); return; }

  // Pengurus: ajukan permintaan hapus massal ke admin
  if(SESSION.role==='pengurus'){
    const namaList = ids.map(id=>ALL_SANTRI.find(s=>s.id===id)?.nama||'?').join(', ');
    konfirm(`Ajukan permintaan hapus untuk <strong>${ids.length} santri</strong>?<br><div style="font-size:12px;color:var(--text-m);margin-top:6px">${namaList}</div>`, async()=>{
      const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
      showLoadingOverlay('Mengirim permintaan...','Permintaan hapus santri sedang dikirim.');
      setLoading(true, _lBtn2);
      try{
        const rows = ids.map(id=>{
          const s = ALL_SANTRI.find(x=>x.id===id);
          return {
            santri_id: parseInt(String(id),10),
            santri_nama: s?.nama||'—',
            asrama_id: s ? getAsramaIdBySantri(s) : null,
            jenis: 'hapus',
            diajukan_oleh: SESSION.user?.username||'',
            diajukan_nama: SESSION.user?.nama||'',
            alasan: 'Permintaan hapus massal dari pengurus',
            status: 'pending'
          };
        });
        const {error} = await SB.from('permintaan_perubahan_santri').insert(rows);
        if(error){ toast('Gagal kirim: '+error.message, false); return; }
        toast(`✅ ${ids.length} permintaan hapus dikirim, menunggu persetujuan sekretaris!`);
        _bulkSelected.clear();
        await updateBadgePersetujuan();
        renderTabelSantri();
      } finally { setLoading(false, _lBtn2); }
    }, 'lainnya');
    return;
  }

  // Super/sekretariat: hapus langsung
  konfirm(`Hapus <strong>${ids.length} santri</strong> beserta semua transaksinya?<br><span style="color:var(--red);font-size:12px">⚠️ Tindakan ini tidak dapat dibatalkan!</span>`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menghapus santri...','Menghapus data santri beserta seluruh transaksinya.');
    setLoading(true, _lBtn2);
    try {
    const targetSantri = ids.map(id=>ALL_SANTRI.find(s=>s.id===id)).filter(Boolean);
    const {error} = await SB.from('santri').delete().in('id', ids);
    if(error){ toast('Gagal hapus: '+error.message, false); return; }
    for(const s of targetSantri){
      await catatRiwayatSantri({santri_id:s.id, santri_nama:s.nama, asrama_id:getAsramaIdBySantri(s), jenis:'hapus', diffObj:null, sumber:'langsung'});
    }
    toast(`✅ ${ids.length} santri dihapus!`);
    _bulkSelected.clear();
    await loadAllData();
    renderTabelSantri();
  
    } finally { setLoading(false, _lBtn2); }}, 'hapus');

  } finally { setLoading(false, _lBtn); }
}

