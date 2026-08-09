// ===== KELULUSAN: TAB SWITCH =====
function klsSetTab(tab){
  ['proses','piutang'].forEach(t=>{
    document.getElementById('kls-panel-'+t).style.display = t===tab?'block':'none';
    const btn = document.getElementById('klstab-'+t);
    if(btn) btn.className = t===tab ? 'btn btn-p' : 'btn btn-o';
  });
  if(tab==='piutang') renderPiutangAlumni();
  if(tab==='proses') renderKelulusan();
}

// ===== KELULUSAN: RENDER TABEL =====
function renderKelulusan(){
  const cari=document.getElementById('cari-kelulusan').value.toLowerCase();
  const filterL=document.getElementById('filter-status-lulus').value;
  const perSantri={};
  ALL_TAGIHAN.forEach(t=>{
    if(!perSantri[t.santri_id]) perSantri[t.santri_id]={id:t.santri_id,nama:t.santri_nama||getSantriById(t.santri_id)?.nama||'—',dapur_id:t.dapur_id,total:0,lunas:0};
    perSantri[t.santri_id].total+=Number(t.nominal);
    if(t.status==='lunas') perSantri[t.santri_id].lunas+=Number(t.nominal_bayar||t.nominal);
  });
  // Santri tanpa tagihan juga perlu ditampilkan
  ALL_SANTRI.forEach(s=>{
    if(!perSantri[s.id]) perSantri[s.id]={id:s.id,nama:s.nama,dapur_id:s.dapur_id,total:0,lunas:0};
  });
  let data=Object.values(perSantri).map(d=>({...d,tunggak:d.total-d.lunas,bebas:d.total<=d.lunas}));
  if(cari) data=data.filter(d=>d.nama.toLowerCase().includes(cari));
  if(filterL==='bebas') data=data.filter(d=>d.bebas);
  if(filterL==='tunggak') data=data.filter(d=>!d.bebas);
  data.sort((a,b)=>a.nama.localeCompare(b.nama));

  const rows=data.map((d,i)=>{
    const s=getSantriById(d.id)||{};
    const kobongNama=s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const kelas=s.kelas||'—';
    // Tentukan opsi naik jenjang berdasarkan kelas
    const kelasNum=parseInt(s.kelas)||0;
    const bisaNaikJenjang = kelasNum===6||kelasNum===9||kelasNum===12;
    return `<tr>
      <td>${i+1}</td>
      <td class="col-nama"><button onclick="openDetailModal('${d.id}')" style="background:none;border:none;cursor:pointer;font-weight:600;color:var(--green)">${d.nama}</button></td>
      <td><span class="badge badge-bg">${kelas}</span></td>
      <td><span class="badge badge-bg">${kobongNama}</span></td>
      <td>${fmtRp(d.total)}</td>
      <td style="color:var(--green)">${fmtRp(d.lunas)}</td>
      <td style="color:${d.tunggak>0?'var(--red)':'var(--green)'};font-weight:700">${fmtRp(d.tunggak)}</td>
      <td><span class="badge ${d.bebas?'badge-lunas':'badge-belum'}">${d.bebas?'✅ Bebas':'❌ Tunggakan'}</span></td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        ${bisaNaikJenjang?`<button class="btn btn-p btn-xs" onclick="bukaNaikJenjang('${d.id}')">${kelasNum===12?svgIcon('graduation-cap',12)+' Lulus':svgIcon('trending-up',12)+' Naik Jenjang'}</button>`:''}
        ${d.bebas?`<button class="btn btn-p btn-xs" onclick="cetakSuratBebas('${d.id}','${d.nama}')">${svgIcon('graduation-cap',12)} Surat</button>`:`<button class="btn btn-b btn-xs" onclick="bukaMoBayarMulti('${d.id}')">${svgIcon('cash',12)} Lunasi</button>`}
        <button class="btn btn-d btn-xs" onclick="bukaSantriKeluar('${d.id}')">${svgIcon('log-out',12)} Keluar</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('kelulusan-tbody').innerHTML=rows||`<tr><td colspan="9"><div class="empty"><span class="ei">🎓</span><p>Tidak ada data.</p></div></td></tr>`;
}

// ===== NAIK JENJANG =====
let _njSantriId = null;
function bukaNaikJenjang(santriId){
  const s = getSantriById(santriId)||{};
  const kelasNum = parseInt(s.kelas)||0;

  // Kelas 12: alur lulus → arsip (sama seperti santri keluar)
  if(kelasNum===12){
    _skSantriId = santriId;
    document.getElementById('sk-nama').textContent = s.nama||'—';
    document.getElementById('sk-info').textContent = `Kelas 12 — Lulus MA 🎓`;
    document.getElementById('sk-catatan').value = 'Lulus MA';
    document.getElementById('btn-proses-keluar').textContent = '🎓 Proses Kelulusan';

    // Reset radio
    const radios = document.querySelectorAll('input[name="sk-opsi"]');
    if(radios.length) radios[0].checked=true;

    // Cek tunggakan
    const tunggak = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)&&t.status!=='lunas')
      .reduce((sum,t)=>sum+Number(t.nominal-(t.nominal_bayar||0)),0);
    const warnEl = document.getElementById('sk-tunggakan-warn');
    const bebasEl = document.getElementById('sk-bebas-info');
    if(tunggak>0){
      warnEl.style.display='block'; bebasEl.style.display='none';
      document.getElementById('sk-jumlah-tunggak').textContent = fmtRp(tunggak);
    } else {
      warnEl.style.display='none';
      bebasEl.style.display='block';
      bebasEl.innerHTML=svgIcon('trash',13)+' Santri bebas tunggakan dan siap diwisuda. Data akan <strong>dihapus permanen</strong> dari database.';
    }
    openMo('mo-santri-keluar');
    return;
  }

  // Kelas 6 & 9: naik jenjang biasa
  _njSantriId = santriId;
  const kelasBaru = kelasNum===6?'7':'10';
  const jenjangLabel = kelasNum===6?'MI → MTs (Kelas 6 ke 7)':'MTs → MA (Kelas 9 ke 10)';

  document.getElementById('nj-nama').textContent = s.nama||'—';
  document.getElementById('nj-info').textContent = `Kelas ${s.kelas||'—'} • ${jenjangLabel}`;
  document.getElementById('nj-kelas-baru').value = kelasBaru;

  const tunggak = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)&&t.status!=='lunas')
    .reduce((sum,t)=>sum+Number(t.nominal-(t.nominal_bayar||0)),0);
  const njWarn = document.getElementById('nj-tunggakan-info');
  if(tunggak>0){
    njWarn.style.display='block';
    njWarn.innerHTML=`${svgIcon('alert-triangle',13)} Masih punya tunggakan <strong>${fmtRp(tunggak)}</strong> — dilanjutkan ke jenjang berikutnya.`;
  } else {
    njWarn.style.display='none';
  }
  openMo('mo-naik-jenjang');
}

async function prosesNaikJenjang(){
  if(!_njSantriId) return;
  const kelasBaru = document.getElementById('nj-kelas-baru').value.trim();
  if(!kelasBaru){ toast('Isi kelas baru!',false); return; }
  const _lBtn = document.getElementById('btn-naik-jenjang')||null;
  setLoading(true, _lBtn, '🎓 Naik Jenjang...', 'Memperbarui data santri...');
  try{
    const {error} = await SB.from('santri').update({kelas:kelasBaru}).eq('id',_njSantriId);
    if(error){ toast('Gagal: '+error.message,false); return; }
    const s = getSantriById(_njSantriId)||{};
    toast(`✅ ${s.nama} berhasil naik ke kelas ${kelasBaru}!`);
    closeMo('mo-naik-jenjang');
    await loadAllData();
    renderKelulusan();
  } finally { setLoading(false, _lBtn); }
}

// ===== SANTRI KELUAR =====
let _skSantriId = null;
function bukaSantriKeluar(santriId){
  const s = getSantriById(santriId)||{};
  _skSantriId = santriId;
  document.getElementById('sk-nama').textContent = s.nama||'—';
  document.getElementById('sk-info').textContent = `Kelas ${s.kelas||'—'} • ${s.kobong?.nama||getKobongNama(s.kobong_id)||'—'}`;
  document.getElementById('sk-catatan').value='';

  // Reset radio
  const radios = document.querySelectorAll('input[name="sk-opsi"]');
  if(radios.length) radios[0].checked=true;

  // Cek tunggakan
  const tunggak = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)&&t.status!=='lunas')
    .reduce((sum,t)=>sum+Number(t.nominal-(t.nominal_bayar||0)),0);

  const warnEl = document.getElementById('sk-tunggakan-warn');
  const bebasEl = document.getElementById('sk-bebas-info');
  if(tunggak>0){
    warnEl.style.display='block'; bebasEl.style.display='none';
    document.getElementById('sk-jumlah-tunggak').textContent = fmtRp(tunggak);
  } else {
    warnEl.style.display='none'; bebasEl.style.display='block';
    bebasEl.innerHTML=svgIcon('trash',13)+' Santri bebas tunggakan. Data akan <strong>dihapus permanen</strong> dari database.';  }
  openMo('mo-santri-keluar');
}

function skUpdateOpsi(){
  // Highlight selected option visually
  const val = document.querySelector('input[name="sk-opsi"]:checked')?.value;
  document.querySelectorAll('input[name="sk-opsi"]').forEach(r=>{
    const lbl = r.closest('label');
    if(lbl) lbl.style.borderColor = r.checked?'var(--green)':' var(--border)';
  });
}

async function prosesSantriKeluar(){
  if(!_skSantriId){ toast('Santri tidak ditemukan!',false); return; }
  const s = getSantriById(_skSantriId)||{};
  const opsi = document.querySelector('input[name="sk-opsi"]:checked')?.value||'piutang';
  const catatan = document.getElementById('sk-catatan').value.trim();
  const tglKeluar = today();
  const btn = document.getElementById('btn-proses-keluar');

  const tunggakanList = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(_skSantriId)&&t.status!=='lunas');
  const totalTunggak = tunggakanList.reduce((sum,t)=>sum+Number(t.nominal-(t.nominal_bayar||0)),0);

  setLoading(true, btn, '🚪 Proses Keluar...', s.nama);
  try{
    if(totalTunggak>0){
      if(opsi==='lunas'){
        const ids = tunggakanList.map(t=>t.id);
        // Update per batch 100 — hindari URL terlalu panjang di Supabase
        for(let i=0;i<ids.length;i+=100){
          const batch=ids.slice(i,i+100);
          await SB.from('tagihan_pondok').update({status:'lunas',nominal_bayar:null,tgl_bayar:tglKeluar,dicatat_oleh:'Dibebaskan saat keluar'}).in('id',batch);
        }
        // Bebas tunggakan → hapus permanen
        await SB.from('santri').delete().eq('id',_skSantriId);
        toast(`✅ ${s.nama} telah keluar dan dihapus dari database.`);
      } else {
        // Catat piutang → arsipkan saja
        // Simpan rincian tagihan belum lunas
        const rincian = tunggakanList.map(t=>({
          id: t.id,
          bulan: t.bulan,
          tahun: t.tahun,
          jenis: t.jenis||'Tagihan',
          nominal: t.nominal,
          nominal_bayar: t.nominal_bayar||0,
          sisa: t.nominal-(t.nominal_bayar||0),
        }));
        await SB.from('piutang_alumni').insert({
          santri_id: _skSantriId,
          nama_santri: s.nama,
          kobong_nama: s.kobong?.nama||getKobongNama(s.kobong_id)||'—',
          kelas: s.kelas||'—',
          total_piutang: totalTunggak,
          status_piutang: 'belum',
          tgl_keluar: tglKeluar,
          catatan: catatan||null,
          no_wa: s.no_wa||null,
          rincian: rincian,
        });
        const {error} = await SB.from('santri').update({is_arsip:true, tgl_keluar:tglKeluar, catatan_keluar:catatan||null}).eq('id',_skSantriId);
        if(error){ toast('Gagal arsip: '+error.message,false); return; }
        toast(`✅ ${s.nama} diarsipkan. Tunggakan ${fmtRp(totalTunggak)} dicatat sebagai piutang.`);
      }
    } else {
      // Bebas tunggakan → hapus permanen langsung
      const {error} = await SB.from('santri').delete().eq('id',_skSantriId);
      if(error){ toast('Gagal hapus: '+error.message,false); return; }
      toast(`✅ ${s.nama} telah keluar dan dihapus dari database.`);
    }
    closeMo('mo-santri-keluar');
    await loadAllData();
    renderKelulusan();
  } catch(e){
    toast('Error: '+e.message,false);
  } finally {
    setLoading(false, btn);
  }
}

