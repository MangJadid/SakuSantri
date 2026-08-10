// ===== REKAP TUNGGAKAN =====
function renderRekap(){
  const mode=document.getElementById('rekap-mode').value;
  const cari=document.getElementById('cari-rekap').value.toLowerCase();
  const statusF=document.getElementById('filter-status-rekap').value;
  const asramaF=document.getElementById('filter-asrama-rekap')?.value||'';
  const tahunF=document.getElementById('filter-tahun-rekap')?.value||'';
  const bulanF=document.getElementById('filter-bulan-rekap')?.value||'';
  const kobongF=document.getElementById('filter-kobong-rekap')?.value||'';
  const kelasF=document.getElementById('filter-kelas-rekap')?.value||'';
  const waliF=document.getElementById('filter-wali-rekap')?.value||'';
  const content=document.getElementById('rekap-content');
  document.getElementById('rekap-pagination').innerHTML='';

  // Filter tagihan berdasarkan filter yang dipilih
  let tagihanF=getTagihanFiltered().filter(t=>{
    const s=getSantriById(t.santri_id)||{};
    if(tahunF && !(t.bulan||'').endsWith(tahunF)) return false;
    if(bulanF && (t.bulan||'')!==bulanF) return false;
    if(asramaF && String(s.kobong?.asrama_id||'')!==asramaF) return false;
    if(kobongF && String(s.kobong_id||'')!==kobongF) return false;
    if(kelasF && (s.kelas||'')!==kelasF) return false;
    return true;
  });

  if(mode==='santri'){
    const perSantri={};
    tagihanF.forEach(t=>{
      const s=getSantriById(t.santri_id)||{};
      if(!perSantri[t.santri_id]) perSantri[t.santri_id]={
        id:t.santri_id,
        nama:s.nama||t.santri_nama||'—',
        no_wa:s.no_wa||'',
        dapur_id:s.dapur_id||t.dapur_id,
        kobong:s.kobong?.nama||getKobongNama(s.kobong_id)||'—',
        kelas:s.kelas||'—',
        total:0,lunas:0,makan:0,listrik:0,tagihan:[]
      };
      perSantri[t.santri_id].total+=Number(t.nominal);
      perSantri[t.santri_id].makan+=Number(t.nominal_makan||0);
      perSantri[t.santri_id].listrik+=Number(t.nominal_listrik||0);
      if(t.status==='lunas') perSantri[t.santri_id].lunas+=Number(t.nominal_bayar||t.nominal);
      else perSantri[t.santri_id].lunas+=Number(t.nominal_bayar||0);
      perSantri[t.santri_id].tagihan.push(t);
    });
    let data=Object.values(perSantri).map(d=>({...d,tunggak:d.total-d.lunas}));
    if(cari) data=data.filter(d=>d.nama.toLowerCase().includes(cari));
    if(statusF==='tunggak') data=data.filter(d=>d.tunggak>0);
    if(statusF==='lunas') data=data.filter(d=>d.tunggak<=0);
    data.sort((a,b)=>b.tunggak-a.tunggak);

    const pageStart=((_pageState.rekap||1)-1)*PAGE_SIZE;
    const rows=paginate(data,'rekap').map((d,i)=>{
      const pct=d.total>0?Math.round(d.lunas/d.total*100):100;
      return `<tr>
        <td>${pageStart+i+1}</td>
        <td class="col-nama"><button onclick="openDetailModal('${d.id}')" style="background:none;border:none;cursor:pointer;font-weight:600;color:var(--green)">${d.nama}</button></td>
        <td><span class="badge badge-bg">${d.kobong}</span></td>
        <td>${d.kelas}</td>
        <td><span class="badge badge-dapur">${getDapurEmoji(d.dapur_id)} ${getDapurNama(d.dapur_id)}</span></td>
        <td style="color:var(--text-m)">${fmtRp(d.makan)}</td>
        <td style="color:var(--text-m)">${fmtRp(d.listrik)}</td>
        <td>${fmtRp(d.total)}</td>
        <td style="color:var(--green)">${fmtRp(d.lunas)}</td>
        <td style="color:${d.tunggak>0?'var(--red)':'var(--green)'};font-weight:700">${fmtRp(d.tunggak)}</td>
        <td style="min-width:100px"><div class="prog-wrap"><div class="prog-fill" style="width:${pct}%"></div></div><div style="font-size:10px;color:var(--text-l);margin-top:2px">${pct}%</div></td>
        <td><div style="display:flex;gap:4px">${d.tunggak>0?`<button class="btn btn-p btn-xs" onclick="bukaMoBayarMulti('${d.id}')">${svgIcon('cash',12)}</button>`:''}<button class="btn btn-b btn-xs" onclick="openDetailModal('${d.id}')">${svgIcon('document',12)}</button>${d.tunggak>0?(d.no_wa?`<button class="btn btn-wa btn-xs" onclick="kirimWASantriRekap('${d.id}')">${svgIcon('smartphone',12)}</button>`:`<span style="display:inline-flex;cursor:default;opacity:.5" title="No WA belum diinput">${svgIcon('smartphone',14)}</span>`):''}</div></td>
      </tr>`;
    }).join('');
    content.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="col-nama">Santri</th><th>Kobong</th><th>Kelas</th><th>Dapur</th><th>Uang Makan</th><th>Uang Listrik</th><th>Total Tagihan</th><th>Sudah Bayar</th><th>Tunggakan</th><th>Progres</th><th>Aksi</th></tr></thead><tbody>${rows||'<tr><td colspan="12"><div class="empty"><span class="ei">✅</span><p>Tidak ada tunggakan!</p></div></td></tr>'}</tbody></table></div>`;
    renderPaginationUI('rekap-pagination', data.length, 'rekap', 'renderRekap()');
  } else if(mode==='bulan'){
    const perBulan={};
    tagihanF.forEach(t=>{
      const b=t.bulan||'—';
      if(!perBulan[b]) perBulan[b]={bulan:b,total:0,lunas:0,belum:0,santriSet:new Set()};
      perBulan[b].total+=Number(t.nominal);
      if(t.status==='lunas') perBulan[b].lunas+=Number(t.nominal);
      else perBulan[b].belum+=(Number(t.nominal)-Number(t.nominal_bayar||0));
      perBulan[b].santriSet.add(t.santri_id);
    });
    const _bo=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; function _pbIdx(str){ const p=(str||'').split(' '); return (parseInt(p[1])||0)*100+_bo.indexOf(p[0]); } let data=Object.values(perBulan).sort((a,b)=>_pbIdx(b.bulan)-_pbIdx(a.bulan));
    if(cari) data=data.filter(d=>d.bulan.toLowerCase().includes(cari));
    const rows=data.map((d,i)=>{
      const pct=d.total>0?Math.round(d.lunas/d.total*100):100;
      return `<tr><td>${i+1}</td><td style="font-weight:600">${d.bulan}</td><td>${d.santriSet.size} santri</td><td>${fmtRp(d.total)}</td><td style="color:var(--green)">${fmtRp(d.lunas)}</td><td style="color:${d.belum>0?'var(--red)':'var(--green)'};font-weight:700">${fmtRp(d.belum)}</td><td style="min-width:100px"><div class="prog-wrap"><div class="prog-fill" style="width:${pct}%"></div></div><div style="font-size:10px;color:var(--text-l);margin-top:2px">${pct}%</div></td></tr>`;
    }).join('');
    content.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Bulan</th><th>Santri</th><th>Total Tagihan</th><th>Terkumpul</th><th>Sisa</th><th>Progres</th></tr></thead><tbody>${rows||'<tr><td colspan="7"><div class="empty"><span class="ei">📋</span><p>Tidak ada data.</p></div></td></tr>'}</tbody></table></div>`;
  } else if(mode==='kelas'){
    const perKelas={};
    tagihanF.forEach(t=>{
      const s=getSantriById(t.santri_id)||{};
      const k=s.kelas||'—';
      if(!perKelas[k]) perKelas[k]={kelas:k,total:0,lunas:0,tunggak:0,santriSet:new Set(),belumSet:new Set()};
      perKelas[k].total+=Number(t.nominal);
      if(t.status==='lunas') perKelas[k].lunas+=Number(t.nominal_bayar||t.nominal);
      else{ perKelas[k].tunggak+=(Number(t.nominal)-Number(t.nominal_bayar||0)); perKelas[k].belumSet.add(t.santri_id); }
      perKelas[k].santriSet.add(t.santri_id);
    });
    let data=Object.values(perKelas).sort((a,b)=>(parseInt(a.kelas)||0)-(parseInt(b.kelas)||0));
    if(cari) data=data.filter(d=>d.kelas.toLowerCase().includes(cari));
    const rows=data.map((d,i)=>{
      const pct=d.total>0?Math.round(d.lunas/d.total*100):100;
      return `<tr>
        <td>${i+1}</td>
        <td style="font-weight:700">Kelas ${d.kelas}</td>
        <td>${d.santriSet.size} santri</td>
        <td>${d.belumSet.size} santri</td>
        <td>${fmtRp(d.total)}</td>
        <td style="color:var(--green)">${fmtRp(d.lunas)}</td>
        <td style="color:${d.tunggak>0?'var(--red)':'var(--green)'};font-weight:700">${fmtRp(d.tunggak)}</td>
        <td style="min-width:100px"><div class="prog-wrap"><div class="prog-fill" style="width:${pct}%"></div></div><div style="font-size:10px;color:var(--text-l);margin-top:2px">${pct}%</div></td>
      </tr>`;
    }).join('');
    content.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Kelas</th><th>Total Santri</th><th>Nunggak</th><th>Total Tagihan</th><th>Terbayar</th><th>Tunggakan</th><th>Progres</th></tr></thead><tbody>${rows||'<tr><td colspan="8"><div class="empty"><span class="ei">✅</span><p>Tidak ada data.</p></div></td></tr>'}</tbody></table></div>`;
  }

  // Update summary nominal
  updateRekapSummary(tagihanF);
}

function updateRekapSummary(tagihanF){
  const el = document.getElementById('rekap-summary');
  if(!el) return;
  const total = tagihanF.reduce((a,t)=>a+Number(t.nominal),0);
  const makan = tagihanF.reduce((a,t)=>a+Number(t.nominal_makan||0),0);
  const listrik = tagihanF.reduce((a,t)=>a+Number(t.nominal_listrik||0),0);
  const lunas = tagihanF.filter(t=>t.status==='lunas').reduce((a,t)=>a+Number(t.nominal_bayar||t.nominal),0);
  const tunggak = tagihanF.filter(t=>t.status!=='lunas').reduce((a,t)=>a+(Number(t.nominal)-Number(t.nominal_bayar||0)),0);
  const {bayarMakan, bayarListrik} = _pecahBayar(tagihanF);
  const tunggakMakan = makan - bayarMakan;
  const tunggakListrik = listrik - bayarListrik;
  el.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        <div style="background:#f8faf9;border:1.5px solid var(--border);border-radius:10px;padding:12px 16px">
          <div style="font-size:10px;color:var(--text-l);font-weight:600;text-transform:uppercase">Total Tagihan</div>
          <div style="font-size:17px;font-weight:800;color:var(--text)">${fmtRp(total)}</div>
          <div style="font-size:11px;color:var(--text-l);margin-top:4px;display:flex;gap:10px">
            <span>${svgIcon('utensils',11)} ${fmtRp(makan)}</span><span>${svgIcon('zap',11)} ${fmtRp(listrik)}</span>
          </div>
          <div style="font-size:10px;color:var(--text-l);margin-top:2px">${tagihanF.length} tagihan</div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:12px 16px">
          <div style="font-size:10px;color:var(--text-l);font-weight:600;text-transform:uppercase">Terbayar</div>
          <div style="font-size:17px;font-weight:800;color:var(--green)">${fmtRp(lunas)}</div>
          <div style="font-size:11px;color:var(--text-l);margin-top:4px;display:flex;gap:10px">
            <span>${svgIcon('utensils',11)} ${fmtRp(Math.round(bayarMakan))}</span><span>${svgIcon('zap',11)} ${fmtRp(Math.round(bayarListrik))}</span>
          </div>
        </div>
        <div style="background:#fff5f5;border:1.5px solid #fecaca;border-radius:10px;padding:12px 16px">
          <div style="font-size:10px;color:var(--text-l);font-weight:600;text-transform:uppercase">Tunggakan</div>
          <div style="font-size:17px;font-weight:800;color:var(--red)">${fmtRp(tunggak)}</div>
          <div style="font-size:11px;color:var(--text-l);margin-top:4px;display:flex;gap:10px">
            <span>${svgIcon('utensils',11)} ${fmtRp(Math.round(tunggakMakan))}</span><span>${svgIcon('zap',11)} ${fmtRp(Math.round(tunggakListrik))}</span>
          </div>
        </div>
    </div>
  `;
}


// ===== KIRIM WA TUNGGAKAN =====
// Kirim pengingat WA berisi SELURUH tunggakan santri (semua bulan belum lunas),
// bukan cuma bulan aktif — beda dengan tombol WA di tab Tagihan yang memang per-bulan.
function kirimWASantriRekap(santriId){
  const s = getSantriById(santriId);
  if(!s) return;
  const noWa = s.no_wa || '';
  const tagBelum = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId) && t.status!=='lunas');
  const bulanTunggak = tagBelum.map(t=>t.bulan);
  const tunggakan = tagBelum.reduce((a,t)=>a+(Number(t.nominal)-Number(t.nominal_bayar||0)),0);
  const pesan = buildWAPesan(santriId, bulanTunggak);
  const pesanEnc = encodeURIComponent(pesan);

  konfirm(
    `Kirim pesan tunggakan via WhatsApp ke:<br><strong>${s.nama}</strong><br>Tunggakan: <strong>${fmtRp(tunggakan)}</strong><br>Bulan: ${bulanTunggak.join(', ')||'—'}<br><br>${noWa?`No WA: <strong>${noWa}</strong>`:'⚠️ No WA belum diisi — akan buka WA tanpa nomor'}`,
    ()=>{
      if(noWa){
        const noBersih = noWa.replace(/[^0-9]/g,'').replace(/^0/,'62');
        window.open(`https://wa.me/${noBersih}?text=${pesanEnc}`,'_blank');
      } else {
        window.open(`https://wa.me/?text=${pesanEnc}`,'_blank');
      }
    },
    'Kirim WA'
  );
}

function kirimWAMassal(){
  // Ambil semua santri yang punya tunggakan dari data yang sedang ditampilkan
  const mode = document.getElementById('rekap-mode').value;
  if(mode !== 'santri'){ toast('⚠️ Ganti mode ke Per Santri dulu!', false); return; }

  const cari = document.getElementById('cari-rekap').value.toLowerCase();
  const statusF = document.getElementById('filter-status-rekap').value;
  const asramaF = document.getElementById('filter-asrama-rekap')?.value||'';
  const tahunF = document.getElementById('filter-tahun-rekap')?.value||'';
  const bulanF = document.getElementById('filter-bulan-rekap')?.value||'';
  const kobongF = document.getElementById('filter-kobong-rekap')?.value||'';
  const kelasF = document.getElementById('filter-kelas-rekap')?.value||'';

  let tagihanF = getTagihanFiltered().filter(t=>{
    const s = getSantriById(t.santri_id)||{};
    if(tahunF && !(t.bulan||'').endsWith(tahunF)) return false;
    if(bulanF && (t.bulan||'') !== bulanF) return false;
    if(asramaF && String(s.kobong?.asrama_id||'') !== asramaF) return false;
    if(kobongF && String(s.kobong_id||'') !== kobongF) return false;
    if(kelasF && (s.kelas||'') !== kelasF) return false;
    return true;
  });

  const perSantri = {};
  tagihanF.forEach(t=>{
    const s = getSantriById(t.santri_id)||{};
    if(!perSantri[t.santri_id]) perSantri[t.santri_id] = {
      id:t.santri_id, nama:s.nama||t.santri_nama||'—',
      no_wa:s.no_wa||'', total:0, lunas:0, bulanTunggak:[]
    };
    perSantri[t.santri_id].total += Number(t.nominal);
    if(t.status==='lunas') perSantri[t.santri_id].lunas += Number(t.nominal_bayar||t.nominal);
    else { perSantri[t.santri_id].lunas += Number(t.nominal_bayar||0); perSantri[t.santri_id].bulanTunggak.push(t.bulan); }
  });

  let data = Object.values(perSantri).map(d=>({...d, tunggak:d.total-d.lunas})).filter(d=>d.tunggak>0);
  if(cari) data = data.filter(d=>d.nama.toLowerCase().includes(cari));

  if(!data.length){ toast('⚠️ Tidak ada santri dengan tunggakan!', false); return; }

  const adaNoWA = data.filter(d=>d.no_wa).length;
  const tanpaNoWA = data.length - adaNoWA;

  konfirm(
    `Kirim WA ke <strong>${data.length} santri</strong> yang punya tunggakan?<br><br>✅ Ada no WA: <strong>${adaNoWA} santri</strong><br>⚠️ Tanpa no WA: <strong>${tanpaNoWA} santri</strong> (akan dilewati)<br><br>Pesan akan dibuka satu per satu di WhatsApp.`,
    async ()=>{
      let sent = 0;
      for(const d of data){
        if(!d.no_wa) continue;
        const noBersih = d.no_wa.replace(/[^0-9]/g,'').replace(/^0/,'62');
        const pesan = buildWAPesan(d.id, d.bulanTunggak);
        window.open(`https://wa.me/${noBersih}?text=${encodeURIComponent(pesan)}`,'_blank');
        sent++;
        await new Promise(r=>setTimeout(r,600)); // jeda antar tab
      }
      toast(`✅ ${sent} pesan WA dikirim! (${tanpaNoWA} dilewati karena tidak ada no WA)`);
    },
    'Kirim Semua WA'
  );
}

function exportRekapExcel(){
  const perSantri={};
  getTagihanFiltered().forEach(t=>{
    const k=t.santri_id;
    if(!perSantri[k]) perSantri[k]={nama:t.santri_nama||getSantriById(k)?.nama||'—',dapur:getDapurNama(t.dapur_id)||'—',total:0,lunas:0};
    perSantri[k].total+=Number(t.nominal);
    if(t.status==='lunas') perSantri[k].lunas+=Number(t.nominal_bayar||t.nominal);
  });
  const rows=[['#','Nama Santri','Dapur','Total Tagihan','Sudah Bayar','Tunggakan','Status']];
  Object.values(perSantri).forEach((d,i)=>{
    const tunggak=d.total-d.lunas;
    rows.push([i+1,d.nama,d.dapur,d.total,d.lunas,tunggak,tunggak>0?'Ada Tunggakan':'Lunas']);
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Rekap Tunggakan');
  XLSX.writeFile(wb,`rekap_tunggakan_${today()}.xlsx`);
  toast('✅ Excel didownload!');
}

// ===== KELULUSAN =====
