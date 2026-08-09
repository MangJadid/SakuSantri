// ===== PIUTANG ALUMNI =====
let _plId = null;
function renderPiutangAlumni(){
  const q=(document.getElementById('cari-piutang')?.value||'').toLowerCase();
  const sf=document.getElementById('filter-piutang-status')?.value||'';
  let data = ALL_PIUTANG_ALUMNI.filter(p=>{
    if(q && !(p.nama_santri||'').toLowerCase().includes(q)) return false;
    if(sf && p.status_piutang!==sf) return false;
    return true;
  });

  // Total piutang belum lunas
  const totalBelum = ALL_PIUTANG_ALUMNI.filter(p=>p.status_piutang!=='lunas').reduce((s,p)=>s+Number(p.total_piutang||0),0);
  const badge = document.getElementById('piutang-total-badge');
  if(badge) badge.textContent = `Total Piutang: ${fmtRp(totalBelum)}`;

  const el = document.getElementById('piutang-list');
  const emptyEl = document.getElementById('piutang-empty');
  if(!data.length){ el.innerHTML=''; if(emptyEl) emptyEl.style.display='block'; _updatePiutangHapusMassal(); return; }
  if(emptyEl) emptyEl.style.display='none';

  el.innerHTML = data.map(p=>{
    const isLunas = p.status_piutang==='lunas';
    const tgl = p.tgl_keluar ? new Date(p.tgl_keluar).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const tglLunas = p.tgl_lunas ? new Date(p.tgl_lunas).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : null;
    return `<div style="border:1.5px solid ${isLunas?'var(--green-b)':'var(--border)'};border-radius:12px;padding:14px 16px;margin-bottom:10px;background:${isLunas?'var(--green-p)':'#fff'}">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;padding-top:2px">
          <input type="checkbox" class="piutang-cb" data-id="${p.id}" onchange="_updatePiutangHapusMassal()" style="width:16px;height:16px;cursor:pointer;accent-color:var(--red)">
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <strong style="font-size:14px;cursor:pointer;color:var(--green);text-decoration:underline" onclick="bukaMoRincianPiutang(${p.id})">${p.nama_santri}</strong>
            <span class="badge ${isLunas?'badge-lunas':'badge-belum'}">${isLunas?'✅ Lunas':'⏳ Belum Lunas'}</span>
          </div>
          <div style="font-size:12px;color:var(--text-m);display:flex;align-items:center;gap:5px">${svgIcon('home',12)} ${p.kobong_nama||'—'} · Kelas ${p.kelas||'—'} · Keluar: ${tgl}</div>
          ${p.catatan?`<div style="font-size:12px;color:var(--text-l);margin-top:3px;display:flex;align-items:center;gap:5px">${svgIcon('edit',12)} ${p.catatan}</div>`:''}
          ${tglLunas?`<div style="font-size:12px;color:var(--green);margin-top:3px;display:flex;align-items:center;gap:5px">${svgIcon('check-circle',12)} Dilunasi: ${tglLunas}${p.catatan_lunas?' — '+p.catatan_lunas:''}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:20px;font-weight:700;color:${isLunas?'var(--green)':'var(--red)'}">${fmtRp(p.total_piutang)}</div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;justify-content:flex-end">
            ${!isLunas?`<button class="btn btn-p btn-xs" onclick="bukaPiutangLunas('${p.id}')">${svgIcon('check-circle',12)} Tandai Lunas</button>`:''}
            ${p.no_wa?`<button class="btn btn-wa btn-xs" onclick="kirimWAPiutang('${p.id}')">${svgIcon('smartphone',12)} WA</button>`:''}
            <button class="btn btn-d btn-xs" onclick="hapusPiutang('${p.id}','${(p.nama_santri||'').replace(/'/g,'')}')" title="Hapus">${svgIcon('trash',13)}</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  _updatePiutangHapusMassal();
}

function _updatePiutangHapusMassal(){
  const cbs = document.querySelectorAll('.piutang-cb:checked');
  const btn = document.getElementById('btn-hapus-massal-piutang');
  const count = document.getElementById('piutang-selected-count');
  if(btn) btn.style.display = cbs.length>0 ? '' : 'none';
  if(count) count.textContent = cbs.length;
}

async function hapusPiutang(id, nama){
  konfirm(`Hapus piutang alumni "${nama}"? Data akan dihapus permanen!`, async ()=>{
    try{
      const {error} = await SB.from('piutang_alumni').delete().eq('id', id);
      if(error){ toast('Gagal hapus: '+error.message, false); return; }
      toast('🗑️ Piutang berhasil dihapus!');
      await loadAllData();
      renderPiutangAlumni();
    } catch(e){ toast('Error: '+e.message, false); }
  }, 'hapus');
}

async function hapusMassalPiutang(){
  const cbs = document.querySelectorAll('.piutang-cb:checked');
  const ids = [...cbs].map(cb=>cb.dataset.id);
  if(!ids.length) return;
  konfirm(`Hapus ${ids.length} piutang alumni? Data akan dihapus permanen!`, async ()=>{
    try{
      const {error} = await SB.from('piutang_alumni').delete().in('id', ids);
      if(error){ toast('Gagal hapus: '+error.message, false); return; }
      toast(`🗑️ ${ids.length} piutang berhasil dihapus!`);
      await loadAllData();
      renderPiutangAlumni();
    } catch(e){ toast('Error: '+e.message, false); }
  }, 'hapus');
}

function bukaPiutangLunas(id){
  const p = ALL_PIUTANG_ALUMNI.find(x=>String(x.id)===String(id));
  if(!p) return;
  _plId = id;
  document.getElementById('pl-nama').textContent = p.nama_santri;
  document.getElementById('pl-nominal').textContent = fmtRp(p.total_piutang);
  document.getElementById('pl-catatan').value='';
  openMo('mo-piutang-lunas');
}

async function prosesPiutangLunas(){
  if(!_plId){ toast('Data tidak ditemukan!',false); return; }
  const catatan = document.getElementById('pl-catatan').value.trim();
  const _lBtn = document.getElementById('btn-piutang-lunas')||null;
  setLoading(true, _lBtn, '✅ Tandai Lunas...', 'Memperbarui piutang...');
  try{
    const {error} = await SB.from('piutang_alumni').update({
      status_piutang:'lunas',
      tgl_lunas: today(),
      catatan_lunas: catatan||null,
    }).eq('id',_plId);
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast('✅ Piutang berhasil ditandai lunas!');
    closeMo('mo-piutang-lunas');
    await loadAllData();
    renderPiutangAlumni();
  } finally { setLoading(false, _lBtn); }
}

function kirimWAPiutang(id){
  const p = ALL_PIUTANG_ALUMNI.find(x=>String(x.id)===String(id));
  if(!p||!p.no_wa) return;
  const pesan = encodeURIComponent(
    `Assalamualaikum,\n\nKami dari Pondok Pesantren An-Nur ingin menginformasikan bahwa putra/putri Bapak/Ibu *${p.nama_santri}* masih memiliki tunggakan sebesar *${fmtRp(p.total_piutang)}*.\n\nMohon segera diselesaikan. Jazakallah khairan.`
  );
  const nomor = p.no_wa.replace(/\D/g,'').replace(/^0/,'62');
  window.open(`https://wa.me/${nomor}?text=${pesan}`,'_blank');
}

function cetakSuratBebas(santriId,nama){
  const s=getSantriById(santriId)||{};
  const tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('surat-bebas-content').innerHTML=`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:20px;font-weight:700">بِسْمِ اللّهِ الرَّحْمَنِ الرَّحِيْم</div>
      <div style="font-size:17px;font-weight:700;margin-top:12px">SURAT KETERANGAN BEBAS TANGGUNGAN</div>
      <div style="font-size:13px;color:var(--text-m)">Pondok Pesantren An-Nur</div>
    </div>
    <div style="margin-bottom:12px;font-size:13px">Yang bertanda tangan di bawah ini menerangkan bahwa santri:</div>
    <div style="margin-left:20px;margin-bottom:16px;font-size:13px;line-height:2.5">
      Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : <strong>${nama}</strong><br>
      Kobong &nbsp;&nbsp;&nbsp;&nbsp; : <strong>${s.kobong?.nama||getKobongNama(s.kobong_id)||'—'}</strong><br>
      Dapur &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : <strong>${getDapurNama(s.dapur_id)}</strong>
    </div>
    <div style="font-size:13px;margin-bottom:24px;line-height:1.8">Adalah benar telah <strong>melunasi seluruh kewajiban</strong> kepada pondok pesantren dan dinyatakan <strong>BEBAS TANGGUNGAN</strong>.</div>
    <div style="text-align:right;font-size:13px;margin-top:32px">
      <div>${tgl}</div>
      <div style="margin-top:8px">Bendahara Pondok Pesantren An-Nur</div>
      <div style="margin-top:60px;font-weight:700;display:inline-block;border-top:1px solid var(--text);padding-top:4px">( ____________________ )</div>
    </div>`;
  openMo('mo-surat-bebas');
}
function printSuratBebas(){
  const c=document.getElementById('surat-bebas-content').innerHTML;
  const w=window.open('','_blank');
  w.document.write('<html><head><style>body{font-family:"Times New Roman",serif;padding:40px;max-width:600px;margin:0 auto}@media print{body{padding:20px}}</style></head><body>'+c+'</body></html>');
  w.document.close(); w.print();
}

