// ===== PERMINTAAN HAPUS SANTRI (Pengurus) =====
async function kirimPermintaanHapus(){
  const id = document.getElementById('req-hapus-santri-id').value;
  const alasan = document.getElementById('req-hapus-alasan').value.trim();
  if(!alasan){ toast('Isi alasan penghapusan dulu!', false); return; }
  const s = ALL_SANTRI.find(x=>String(x.id)===String(id));
  if(!s){ toast('Santri tidak ditemukan!', false); return; }

  showLoadingOverlay('Mengirim permintaan...','Permintaan hapus sedang dikirim ke sekretaris.');
  try{
    const {error} = await SB.from('permintaan_perubahan_santri').insert({
      santri_id: parseInt(String(id), 10),
      santri_nama: s.nama,
      asrama_id: getAsramaIdBySantri(s),
      jenis: 'hapus',
      diajukan_oleh: SESSION.user?.username||'',
      diajukan_nama: SESSION.user?.nama||'',
      alasan,
      status: 'pending'
    });
    if(error){ toast('Gagal kirim: '+error.message, false); return; }
    toast('✅ Permintaan hapus dikirim, menunggu persetujuan sekretaris!');
    closeMo('mo-req-hapus');
    await updateBadgePersetujuan();
  } catch(e){ toast('Error: '+e.message, false); }
  finally { hideLoadingOverlay(); }
}

async function updateBadgePersetujuan(){
  if(!SESSION || (SESSION.role!=='super' && SESSION.role!=='sekretaris' && SESSION.role!=='sekretariat')) return;
  try{
    let q = SB.from('permintaan_perubahan_santri').select('id',{count:'exact'}).eq('status','pending');
    const allowed = getAllowedAsramaIdsApproval();
    if(allowed) q = q.in('asrama_id', allowed.length?allowed:[-1]);
    const {data} = await q;
    const cnt = data?.length||0;
    ['badge-persetujuan','badge-persetujuan-grid','badge-persetujuan-sb'].forEach(elId=>{
      const badge = document.getElementById(elId);
      if(!badge) return;
      badge.style.display = cnt>0 ? 'inline' : 'none';
      badge.textContent = cnt>9 ? '9+' : cnt;
    });
  } catch(e){}
}

// ===== SUB-MENU: PERSETUJUAN vs RIWAYAT =====
function prsShowSub(mode){
  document.getElementById('prs-sub-pending')?.classList.toggle('act', mode==='pending');
  document.getElementById('prs-sub-riwayat')?.classList.toggle('act', mode==='riwayat');
  const vp = document.getElementById('prs-view-pending'), vr = document.getElementById('prs-view-riwayat');
  if(vp) vp.style.display = mode==='pending' ? '' : 'none';
  if(vr) vr.style.display = mode==='riwayat' ? '' : 'none';
  if(mode==='pending') renderPersetujuan();
  else renderRiwayatPersetujuan();
}

// Catat riwayat saat santri baru ditambahkan
async function _catatRiwayatTambah(s){
  if(!s) return;
  const diffObj = {
    nama:      { label:'Nama',        lama:null, baru:s.nama||'—' },
    kelas:     { label:'Kelas',       lama:null, baru:s.kelas||'—' },
    kobong_id: { label:'Kobong/Asrama', lama:null, baru:_labelKobongAsrama(s.kobong_id) },
    dapur_id:  { label:'Dapur',       lama:null, baru:_labelDapur(s.dapur_id) },
  };
  await catatRiwayatSantri({santri_id:s.id, santri_nama:s.nama, asrama_id:getAsramaIdBySantri(s), jenis:'tambah', diffObj, sumber:'langsung'});
}

function _rowDiffHtml(dataLama, dataBaru){
  if(!dataLama && !dataBaru) return '';
  const keys = new Set([...Object.keys(dataLama||{}), ...Object.keys(dataBaru||{})]);
  const labelMap = {...SANTRI_FIELD_APPROVAL, ...SANTRI_FIELD_BEBAS};
  let out = '';
  keys.forEach(k=>{
    const label = labelMap[k]?.label || k;
    out += `<div>🔸 <strong>${label}:</strong> ${dataLama?.[k]??'—'} → <strong style="color:var(--green)">${dataBaru?.[k]??'—'}</strong></div>`;
  });
  return out;
}

async function renderPersetujuan(){
  const sec = document.getElementById('persetujuan-list');
  if(!sec) return;
  sec.innerHTML = '<div class="empty"><span class="ei">⏳</span><p>Memuat data...</p></div>';

  try{
    let q = SB.from('permintaan_perubahan_santri').select('*').eq('status','pending').order('created_at',{ascending:false});
    const allowed = getAllowedAsramaIdsApproval();
    if(allowed) q = q.in('asrama_id', allowed.length?allowed:[-1]);
    const {data, error} = await q;
    if(error) throw error;
    const list = data||[];

    if(!list.length){
      sec.innerHTML = `<div class="empty"><span class="ei">✅</span><p>Tidak ada permintaan yang menunggu persetujuan</p></div>`;
      await updateBadgePersetujuan();
      return;
    }

    let html = '';
    list.forEach(r=>{
      const tgl = new Date(r.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const jenisBadge = r.jenis==='hapus'
        ? `<span style="background:var(--red-p);color:var(--red);border:1.5px solid #fca5a5;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('trash',11)} Hapus Santri</span>`
        : `<span style="background:var(--blue-p);color:var(--blue);border:1.5px solid var(--blue-b);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('edit',11)} Edit Data</span>`;

      html += `<div style="background:var(--white);border:1.5px solid #fde68a;border-radius:12px;padding:16px 18px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="av" style="background:${avColor(r.santri_nama)}22;color:${avColor(r.santri_nama)}">${(r.santri_nama||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:14px">${r.santri_nama||'—'}</div>
              <div style="font-size:11px;color:var(--text-l)">ID Santri: ${r.santri_id}</div>
            </div>
          </div>
          ${jenisBadge}
        </div>
        <div style="font-size:12.5px;color:var(--text-m);margin-bottom:8px;line-height:1.6">
          ${r.jenis==='edit'?_rowDiffHtml(r.data_lama,r.data_baru):''}
          ${r.alasan?`<div>📋 <strong>Alasan:</strong> ${r.alasan}</div>`:''}
          <div>👨‍💼 <strong>Diajukan oleh:</strong> ${r.diajukan_nama||r.diajukan_oleh||'—'} · ${tgl}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          <button class="btn btn-g btn-sm" onclick="${r.jenis==='hapus'?`approveHapus(${parseInt(r.id,10)},${parseInt(r.santri_id,10)},'${(r.santri_nama||'').replace(/'/g,"\\'")}')`:`approveEdit(${parseInt(r.id,10)})`}">${svgIcon('check',14)} ${r.jenis==='hapus'?'Setujui & Hapus':'Setujui Perubahan'}</button>
          <button class="btn btn-d btn-sm" onclick="rejectPermintaan(${parseInt(r.id,10)})">${svgIcon('x',14)} Tolak</button>
        </div>
      </div>`;
    });
    sec.innerHTML = html;
  } catch(e){
    sec.innerHTML = `<div class="warn-box">Gagal memuat data: ${e.message}</div>`;
  }
  await updateBadgePersetujuan();
}

async function renderRiwayatPersetujuan(){
  const sec = document.getElementById('riwayat-persetujuan-list');
  if(!sec) return;
  sec.innerHTML = '<div class="empty"><span class="ei">⏳</span><p>Memuat data...</p></div>';
  const btnBersih = document.getElementById('btn-bersih-riwayat');
  if(btnBersih) btnBersih.style.display = SESSION.role==='super' ? 'inline-block' : 'none';

  // Dropdown filter asrama hanya untuk Kang Admin (sekretaris sudah otomatis dibatasi ke asramanya sendiri)
  const asramaSel = document.getElementById('prs-riwayat-asrama');
  if(asramaSel){
    if(SESSION.role==='super'){
      if(!asramaSel.dataset.filled){
        asramaSel.innerHTML = '<option value="">Semua Asrama</option>' + ALL_ASRAMA.map(a=>`<option value="${a.id}">${a.nama}</option>`).join('');
        asramaSel.dataset.filled = '1';
      }
      asramaSel.style.display = '';
    } else {
      asramaSel.style.display = 'none';
    }
  }

  const q_cari = (document.getElementById('prs-riwayat-cari')?.value||'').toLowerCase();
  const q_jenis = document.getElementById('prs-riwayat-jenis')?.value||'';
  const q_asramaAdmin = SESSION.role==='super' ? (document.getElementById('prs-riwayat-asrama')?.value||'') : '';
  const allowed = getAllowedAsramaIdsApproval();

  try{
    // 1) Perubahan yang benar-benar terjadi (langsung, disetujui, maupun santri baru ditambahkan)
    let q1 = SB.from('riwayat_perubahan_santri').select('*').order('created_at',{ascending:false}).limit(300);
    if(allowed) q1 = q1.in('asrama_id', allowed.length?allowed:[-1]);
    if(q_asramaAdmin) q1 = q1.eq('asrama_id', q_asramaAdmin);
    if(q_jenis) q1 = q1.eq('jenis', q_jenis);
    // 2) Permintaan yang ditolak (tidak pernah benar-benar mengubah data, tapi tetap perlu terlihat di riwayat)
    let q2 = SB.from('permintaan_perubahan_santri').select('*').eq('status','rejected').order('updated_at',{ascending:false}).limit(200);
    if(allowed) q2 = q2.in('asrama_id', allowed.length?allowed:[-1]);
    if(q_asramaAdmin) q2 = q2.eq('asrama_id', q_asramaAdmin);
    if(q_jenis) q2 = q2.eq('jenis', q_jenis);

    const [r1, r2] = await Promise.all([q1, q2]);
    if(r1.error) throw r1.error;
    if(r2.error) throw r2.error;

    let gabungan = [
      ...(r1.data||[]).map(r=>({...r, _tipe:'riwayat', _tgl:r.created_at})),
      ...(r2.data||[]).map(r=>({...r, _tipe:'ditolak', _tgl:r.updated_at||r.created_at}))
    ];
    if(q_cari) gabungan = gabungan.filter(r=>(r.santri_nama||'').toLowerCase().includes(q_cari));
    gabungan.sort((a,b)=> new Date(b._tgl) - new Date(a._tgl));

    if(!gabungan.length){
      sec.innerHTML = `<div class="empty"><span class="ei">📋</span><p>Belum ada riwayat perubahan data santri</p></div>`;
      return;
    }

    let html = '';
    gabungan.forEach(r=>{
      const tgl = new Date(r._tgl).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const jenisLabel = r.jenis==='hapus' ? '🗑️ Hapus Santri' : r.jenis==='tambah' ? '➕ Tambah Santri Baru' : '✏️ Edit Data';
      let sumberBadge, aktorHtml;
      if(r._tipe==='ditolak'){
        sumberBadge = `<span style="background:var(--red-p);color:var(--red);border:1.5px solid #fca5a5;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('x',11)} Ditolak</span>`;
        aktorHtml = `<div>👨‍💼 <strong>Diajukan oleh:</strong> ${r.diajukan_nama||r.diajukan_oleh||'—'}</div>
          <div>🔐 <strong>Ditolak oleh:</strong> ${r.diproses_nama||r.diproses_oleh||'—'}</div>
          ${r.catatan_admin?`<div>💬 <strong>Catatan:</strong> ${r.catatan_admin}</div>`:''}`;
      } else if(r.sumber==='persetujuan'){
        sumberBadge = `<span style="background:var(--green-p);color:var(--green);border:1.5px solid var(--green-b);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('check-circle',11)} Disetujui</span>`;
        aktorHtml = `<div>👨‍💼 <strong>Diajukan oleh:</strong> ${r.diajukan_nama||r.diajukan_oleh||'—'}</div>
          <div>🔐 <strong>Disetujui oleh:</strong> ${r.diubah_nama||r.diubah_oleh||'—'}</div>
          ${r.alasan?`<div>📋 <strong>Alasan:</strong> ${r.alasan}</div>`:''}`;
      } else {
        sumberBadge = `<span style="background:var(--blue-p);color:var(--blue);border:1.5px solid var(--blue-b);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('check',11)} Langsung</span>`;
        aktorHtml = `<div>👤 <strong>Diubah oleh:</strong> ${r.diubah_nama||r.diubah_oleh||'—'}</div>`;
      }

      html += `<div style="background:var(--white);border:1.5px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="av" style="background:${avColor(r.santri_nama)}22;color:${avColor(r.santri_nama)}">${(r.santri_nama||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:14px">${r.santri_nama||'—'}</div>
              <div style="font-size:11px;color:var(--text-l)">${jenisLabel} · ${tgl}</div>
            </div>
          </div>
          ${sumberBadge}
        </div>
        <div style="font-size:12.5px;color:var(--text-m);line-height:1.6">
          ${(r.jenis==='edit'||r.jenis==='tambah')?_rowDiffHtml(r.data_lama,r.data_baru):''}
          ${aktorHtml}
        </div>
        ${SESSION.role==='super'?`<div style="margin-top:10px"><button class="btn btn-d btn-sm" onclick="hapusRiwayatEntry(${parseInt(r.id,10)},'${r._tipe}')">${svgIcon('trash',14)} Hapus Entri</button></div>`:''}
      </div>`;
    });
    sec.innerHTML = html;
  } catch(e){
    sec.innerHTML = `<div class="warn-box">Gagal memuat data: ${e.message}</div>`;
  }
}

// ===== HAPUS RIWAYAT (khusus Kang Admin) =====
async function hapusRiwayatEntry(id, tipe){
  if(SESSION.role!=='super') return;
  konfirm('Hapus entri riwayat ini secara permanen? Tindakan ini tidak bisa dibatalkan.', async()=>{
    showLoadingOverlay('Menghapus entri riwayat...','');
    try{
      const table = tipe==='ditolak' ? 'permintaan_perubahan_santri' : 'riwayat_perubahan_santri';
      const {error} = await SB.from(table).delete().eq('id', id);
      if(error){ toast('Gagal hapus: '+error.message, false); return; }
      toast('Entri riwayat dihapus');
      renderRiwayatPersetujuan();
    } catch(e){ toast('Error: '+e.message, false); }
    finally { hideLoadingOverlay(); }
  }, 'hapus');
}

function bukaModalBersihkanRiwayat(){
  if(SESSION.role!=='super') return;
  const modal = document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;width:100%;max-width:420px;padding:24px;box-shadow:0 24px 64px rgba(0,0,0,.3)">
    <h3 style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:6px">${svgIcon('trash',15)} Bersihkan Riwayat</h3>
    <div style="font-size:12px;color:var(--text-m);margin-bottom:16px;line-height:1.6">Hapus permanen riwayat perubahan santri (termasuk riwayat permintaan yang ditolak) yang lebih lama dari periode berikut. Tindakan ini <strong>tidak bisa dibatalkan</strong>.</div>
    <div class="fg" style="margin-bottom:18px">
      <label>Hapus riwayat lebih lama dari</label>
      <select id="bersih-riwayat-periode" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
        <option value="30">1 Bulan</option>
        <option value="90">3 Bulan</option>
        <option value="180">6 Bulan</option>
        <option value="365">1 Tahun</option>
        <option value="0">Semua Riwayat (hapus total)</option>
      </select>
    </div>
    <div style="display:flex;gap:9px;justify-content:flex-end">
      <button class="btn btn-o" onclick="this.closest('div[style]').remove()">Batal</button>
      <button class="btn btn-d" id="btn-konfirm-bersih">${svgIcon('trash',14)} Hapus</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-konfirm-bersih').onclick = ()=>{
    const hari = parseInt(document.getElementById('bersih-riwayat-periode').value,10);
    modal.remove();
    konfirm(`Yakin hapus ${hari===0?'<strong>SEMUA</strong>':'riwayat lebih dari <strong>'+hari+' hari</strong>'}? Tindakan ini permanen dan tidak bisa dibatalkan.`, async()=>{
      showLoadingOverlay('Membersihkan riwayat...','');
      try{
        let cutoffISO = null;
        if(hari>0){
          const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-hari);
          cutoffISO = cutoff.toISOString();
        }
        let q1 = SB.from('riwayat_perubahan_santri').delete().select('id');
        let q2 = SB.from('permintaan_perubahan_santri').delete().eq('status','rejected').select('id');
        if(cutoffISO){ q1 = q1.lt('created_at', cutoffISO); q2 = q2.lt('updated_at', cutoffISO); }
        else { q1 = q1.neq('id', 0); q2 = q2.neq('id', 0); }
        const [r1, r2] = await Promise.all([q1, q2]);
        if(r1.error || r2.error){ toast('Gagal bersihkan: '+(r1.error?.message||r2.error?.message), false); return; }
        const jumlahHapus = (r1.data?.length||0) + (r2.data?.length||0);
        toast(jumlahHapus>0 ? `✅ ${jumlahHapus} riwayat berhasil dibersihkan!` : 'ℹ️ Tidak ada riwayat yang cocok untuk dihapus pada periode ini.');
        renderRiwayatPersetujuan();
      } catch(e){ toast('Error: '+e.message, false); }
      finally { hideLoadingOverlay(); }
    }, 'hapus');
  };
}

async function approveHapus(reqId, santriId, santriNama){
  konfirm(`Setujui penghapusan santri <strong>${santriNama}</strong>? Data santri beserta semua transaksinya akan <strong>dihapus permanen</strong>.`, async()=>{
    showLoadingOverlay('Menghapus santri...','Data santri sedang dihapus dari server.');
    try{
      const santriIdInt = parseInt(String(santriId), 10);
      if(!santriIdInt){ toast("ID santri tidak valid!", false); return; }
      const req = (await SB.from('permintaan_perubahan_santri').select('*').eq('id',parseInt(String(reqId),10)).single()).data;
      const sTarget = ALL_SANTRI.find(x=>x.id===santriIdInt);
      const asramaId = sTarget ? getAsramaIdBySantri(sTarget) : req?.asrama_id;
      const {error: errHapus} = await SB.from("santri").delete().eq("id", santriIdInt);
      if(errHapus){ toast('Gagal hapus santri: '+errHapus.message, false); return; }
      const {error: errUpd} = await SB.from('permintaan_perubahan_santri').update({
        status: 'approved',
        diproses_oleh: SESSION.user?.username||'',
        diproses_nama: SESSION.user?.nama||'',
        updated_at: new Date().toISOString()
      }).eq('id', parseInt(String(reqId),10));
      if(errUpd){ toast('Gagal update status: '+errUpd.message, false); return; }
      await catatRiwayatSantri({santri_id:santriIdInt, santri_nama:santriNama, asrama_id:asramaId, jenis:'hapus', diffObj:null, sumber:'persetujuan', permintaan_id:parseInt(String(reqId),10), diajukan_oleh:req?.diajukan_oleh, diajukan_nama:req?.diajukan_nama, alasan:req?.alasan});
      toast('✅ Santri berhasil dihapus!');
      await loadAllData();
      renderTabelSantri();
      renderDashboard();
      renderPersetujuan();
    } catch(e){ toast('Error: '+e.message, false); }
    finally { hideLoadingOverlay(); }
  }, 'hapus');
}

async function approveEdit(reqId){
  const {data:req, error:errGet} = await SB.from('permintaan_perubahan_santri').select('*').eq('id',reqId).single();
  if(errGet || !req){ toast('Permintaan tidak ditemukan!', false); return; }
  konfirm(`Setujui perubahan data santri <strong>${req.santri_nama}</strong>?`, async()=>{
    showLoadingOverlay('Menyimpan perubahan...','Perubahan data santri sedang diterapkan.');
    try{
      const santriIdInt = parseInt(String(req.santri_id),10);
      const {error: errUpd} = await SB.from('santri').update(_buildUpdateFromPermintaan(req)).eq('id', santriIdInt);
      if(errUpd){ toast('Gagal terapkan perubahan: '+errUpd.message, false); return; }
      const {error: errStatus} = await SB.from('permintaan_perubahan_santri').update({
        status: 'approved',
        diproses_oleh: SESSION.user?.username||'',
        diproses_nama: SESSION.user?.nama||'',
        updated_at: new Date().toISOString()
      }).eq('id', reqId);
      if(errStatus){ toast('Gagal update status: '+errStatus.message, false); return; }
      const diffObj = {};
      Object.keys(req.data_baru||{}).forEach(k=>{ diffObj[k] = {label:(SANTRI_FIELD_APPROVAL[k]?.label||k), lama:req.data_lama?.[k], baru:req.data_baru?.[k]}; });
      await catatRiwayatSantri({santri_id:santriIdInt, santri_nama:req.santri_nama, asrama_id:req.asrama_id, jenis:'edit', diffObj, sumber:'persetujuan', permintaan_id:reqId, diajukan_oleh:req.diajukan_oleh, diajukan_nama:req.diajukan_nama, alasan:req.alasan});
      toast('✅ Perubahan data santri disetujui!');
      await loadAllData();
      renderTabelSantri();
      renderDashboard();
      renderPersetujuan();
    } catch(e){ toast('Error: '+e.message, false); }
    finally { hideLoadingOverlay(); }
  }, 'lainnya');
}

// Bangun payload update santri dari permintaan edit. Karena data_baru menyimpan LABEL tampilan
// (bukan id mentah) untuk kobong/dapur, field tsb dicocokkan balik ke id via nama.
function _buildUpdateFromPermintaan(req){
  const upd = {};
  const baru = req.data_baru||{};
  if('nama' in baru) upd.nama = baru.nama;
  if('kelas' in baru){ upd.kelas = baru.kelas==='—'?'':baru.kelas; upd.catatan = upd.kelas; }
  if('kobong_id' in baru){
    const namaKobong = (baru.kobong_id||'').split(' (')[0];
    const k = ALL_KOBONG.find(x=>x.nama===namaKobong);
    if(k) upd.kobong_id = k.id;
  }
  if('dapur_id' in baru){
    const map = {'Dapur Ummi':'dapur_ummi','Dapur Bibi':'dapur_bibi','Dapur Bu Onih':'dapur_buonih'};
    upd.dapur_id = map[baru.dapur_id] || null;
  }
  return upd;
}

async function rejectPermintaan(reqId){
  // Tampilkan input catatan penolakan
  const modal = document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;width:100%;max-width:420px;padding:24px;box-shadow:0 24px 64px rgba(0,0,0,.3)">
    <h3 style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:6px">${svgIcon('x',15)} Tolak Permintaan</h3>
    <div class="fg" style="margin-bottom:16px">
      <label>Catatan Penolakan (opsional)</label>
      <textarea id="reject-catatan" rows="3" placeholder="Mis: Santri masih aktif, data belum lengkap, dll..." style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;resize:vertical;outline:none"></textarea>
    </div>
    <div style="display:flex;gap:9px;justify-content:flex-end">
      <button class="btn btn-o" onclick="this.closest('div[style]').remove()">Batal</button>
      <button class="btn btn-d" id="btn-konfirm-reject">${svgIcon('x',14)} Tolak</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-konfirm-reject').onclick = async()=>{
    const catatan = document.getElementById('reject-catatan').value.trim();
    modal.remove();
    showLoadingOverlay('Menolak permintaan...','');
    try{
      const {error: errRej} = await SB.from('permintaan_perubahan_santri').update({
        status: 'rejected',
        diproses_oleh: SESSION.user?.username||'',
        diproses_nama: SESSION.user?.nama||'',
        catatan_admin: catatan||null,
        updated_at: new Date().toISOString()
      }).eq('id', parseInt(String(reqId),10));
      if(errRej){ toast('Gagal tolak: '+errRej.message, false); return; }
      toast('Permintaan ditolak');
      renderPersetujuan();
    } catch(e){ toast('Error: '+e.message, false); }
    finally { hideLoadingOverlay(); }
  };
}

