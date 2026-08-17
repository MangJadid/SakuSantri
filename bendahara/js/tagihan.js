// ===== TAGIHAN TABLE =====
function updateTagihanBulanInfo(){
  const bulan = bulanAktif();
  const el = document.getElementById('tagihan-bulan-info');
  if(!el || !bulan) return;
  const tgBulanIni = ALL_TAGIHAN.filter(t=>(t.bulan||'').toLowerCase()===bulan.toLowerCase());
  const lunas = tgBulanIni.filter(t=>t.status==='lunas').length;
  const belum = tgBulanIni.filter(t=>t.status!=='lunas').length;
  const total = tgBulanIni.length;
  el.innerHTML = `
    <span style="font-size:12px;background:var(--green-p);color:var(--green);border:1px solid var(--green-b);border-radius:20px;padding:3px 10px;font-weight:600;display:inline-flex;align-items:center;gap:4px">
      ${svgIcon('calendar',12)} ${bulan}
    </span>
    <span style="font-size:12px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:3px 10px;font-weight:600;display:inline-flex;align-items:center;gap:4px">
      ${svgIcon('check-circle',12)} Lunas: ${lunas} santri
    </span>
    <span style="font-size:12px;background:#fff5f5;color:var(--red);border:1px solid #fecaca;border-radius:20px;padding:3px 10px;font-weight:600;display:inline-flex;align-items:center;gap:4px">
      ${svgIcon('circle-minus',12)} Belum: ${belum} santri
    </span>
    <span style="font-size:12px;background:var(--bg);color:var(--text-m);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-weight:600;display:inline-flex;align-items:center;gap:4px">
      ${svgIcon('trending-up',12)} Total: ${total}
    </span>
  `;
}

// Pecah nominal terbayar per tagihan menjadi porsi makan & listrik:
// uang makan diprioritaskan dulu sampai terpenuhi, sisanya baru masuk ke listrik.
// Contoh: nominal makan 380rb, listrik 40rb. Cicilan 300rb -> semua ke makan.
// Cicilan 400rb -> makan lunas 380rb, sisa 20rb masuk ke listrik.
function _pecahBayar(list){
  let bayarMakan=0, bayarListrik=0;
  list.forEach(t=>{
    const nomMakan = Number(t.nominal_makan||0);
    const nomListrik = Number(t.nominal_listrik||0);
    const bayar = t.status==='lunas' ? Number(t.nominal||(nomMakan+nomListrik)) : Number(t.nominal_bayar||0);
    if(bayar<=0) return;
    const bm = Math.min(bayar, nomMakan);
    const bl = Math.min(bayar-bm, nomListrik);
    bayarMakan += bm;
    bayarListrik += bl;
  });
  return {bayarMakan, bayarListrik};
}

function renderTagihanTable(keepPage){
  if(!keepPage) _pageState.tagihan = 1;
  const q=document.getElementById('cari-tagihan')?.value.toLowerCase()||'';
  const asramaF=document.getElementById('filter-asrama-tagihan')?.value||'';
  const tahunF=document.getElementById('filter-tahun-tagihan')?.value||'';
  const bulanF=document.getElementById('filter-bulan-tagihan')?.value||'';
  const statusF=document.getElementById('filter-status-tagihan')?.value||'';
  const kobongF=document.getElementById('filter-kobong-tagihan')?.value||'';
  const kelasF=document.getElementById('filter-kelas-tagihan')?.value||'';
  const waliF=document.getElementById('filter-wali-tagihan')?.value||'';

  let filtered = getTagihanFiltered().filter(t=>{
    const s=getSantriById(t.santri_id)||{};
    if(q && !((s.nama||t.santri_nama||'').toLowerCase().includes(q))) return false;
    if(asramaF && String(s.kobong?.asrama_id||'')!==asramaF) return false;
    if(tahunF && !(t.bulan||'').endsWith(tahunF)) return false;
    if(bulanF && (t.bulan||'')!==bulanF) return false;
    if(statusF && (t.status||'belum')!==statusF) return false;
    if(kobongF && String(s.kobong_id||'')!==kobongF) return false;
    if(kelasF && (s.kelas||'')!==kelasF) return false;
    if(waliF && (s.created_by||'')!==waliF) return false;
    return true;
  });

  const pageStart=((_pageState.tagihan||1)-1)*PAGE_SIZE;
  const rows=paginate(filtered,'tagihan').map((t,i)=>{
    const s=getSantriById(t.santri_id)||{};
    const kobongNama=s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const statusBadge=t.status==='lunas'?`<span class="badge badge-lunas">✅ Lunas</span>`:t.status==='cicil'?`<span class="badge badge-cicil">⏳ Cicilan</span>`:`<span class="badge badge-belum">❌ Belum</span>`;
    return `<tr>
      <td style="color:var(--text-l)">${pageStart+i+1}</td>
      <td class="col-nama"><div style="display:flex;align-items:center;gap:8px">
        <div class="av" style="background:${avColor(s.nama||'')}22;color:${avColor(s.nama||'')}">${s.foto_url?`<img src="${s.foto_url}" style="width:100%;height:100%;object-fit:cover">`:avLetter(s.nama||'?')}</div>
        <button onclick="openDetailModal('${t.santri_id}')" style="background:none;border:none;cursor:pointer;font-weight:600;text-align:left;color:var(--text);padding:0">${s.nama||t.santri_nama||'—'}</button>
      </div></td>
      <td>${s.kelas||'—'}</td>
      <td><span class="badge badge-bg">${kobongNama}</span></td>
      <td><span class="badge badge-dapur">${getDapurEmoji(t.dapur_id)} ${getDapurNama(t.dapur_id)}</span></td>
      <td>${t.bulan||'—'}</td>
      <td>${fmtRp(t.nominal_makan||0)}</td>
      <td>${fmtRp(t.nominal_listrik||0)}</td>
      <td><strong>${fmtRp(t.nominal)}</strong></td>
      <td>${statusBadge}</td>
      <td style="display:flex;gap:4px">
        ${t.status!=='lunas'?`<button class="btn btn-p btn-xs mutating-only" onclick="bukaMoBayarMulti('${t.santri_id}','${t.id}')">${svgIcon('cash',12)} Bayar</button>`:''}
        ${s.no_wa&&t.status!=='lunas'?`<button class="btn btn-wa btn-xs mutating-only" onclick="kirimWASantri('${t.santri_id}','${t.bulan||bulanAktif()}')">${svgIcon('smartphone',12)}</button>`:''}
        ${isKangAdmin()?`<button class="btn btn-d btn-xs mutating-only" onclick="hapusTagihan('${t.id}')">${svgIcon('trash',12)}</button>`:''}
      </td>
    </tr>`;
  }).join('');

  const tbody=document.getElementById('tagihan-tbody');
  tbody.innerHTML=rows||`<tr><td colspan="11"><div class="empty"><span class="ei">📋</span><p>Tidak ada data tagihan.</p></div></td></tr>`;

  // Summary cards (dari semua filtered, bukan hanya halaman ini)
  const totalNom  = filtered.reduce((a,t)=>a+Number(t.nominal||0),0);
  const totalMakan= filtered.reduce((a,t)=>a+Number(t.nominal_makan||0),0);
  const totalListrik=filtered.reduce((a,t)=>a+Number(t.nominal_listrik||0),0);
  const totalBayar= filtered.reduce((a,t)=>a+Number(t.nominal_bayar||0),0);
  const totalTunggak=filtered.filter(t=>t.status!=='lunas').reduce((a,t)=>a+(Number(t.nominal)-Number(t.nominal_bayar||0)),0);
  const jmlLunas  = filtered.filter(t=>t.status==='lunas').length;
  const jmlBelum  = filtered.filter(t=>t.status==='belum').length;
  const jmlCicil  = filtered.filter(t=>t.status==='cicil').length;
  const {bayarMakan, bayarListrik} = _pecahBayar(filtered);
  const tunggakMakan = totalMakan - bayarMakan;
  const tunggakListrik = totalListrik - bayarListrik;
  const summEl = document.getElementById('tagihan-summary');
  if(summEl) summEl.innerHTML = filtered.length===0 ? '' : `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      <div style="background:#f8faf9;border:1.5px solid var(--border);border-radius:10px;padding:12px 16px">
        <div style="font-size:10px;color:var(--text-l);font-weight:600;text-transform:uppercase;margin-bottom:4px">Total Tagihan</div>
        <div style="font-size:17px;font-weight:800;color:var(--text)">${fmtRp(totalNom)}</div>
        <div style="font-size:11px;color:var(--text-l);margin-top:4px;display:flex;gap:10px">
          <span>${svgIcon('utensils',11)} ${fmtRp(totalMakan)}</span><span>${svgIcon('zap',11)} ${fmtRp(totalListrik)}</span>
        </div>
        <div style="font-size:10px;color:var(--text-l);margin-top:2px">${filtered.length} tagihan · ✅${jmlLunas} ⏳${jmlCicil} ❌${jmlBelum}</div>
      </div>
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:12px 16px">
        <div style="font-size:10px;color:var(--text-l);font-weight:600;text-transform:uppercase;margin-bottom:4px">Terbayar</div>
        <div style="font-size:17px;font-weight:800;color:var(--green)">${fmtRp(totalBayar)}</div>
        <div style="font-size:11px;color:var(--text-l);margin-top:4px;display:flex;gap:10px">
          <span>${svgIcon('utensils',11)} ${fmtRp(Math.round(bayarMakan))}</span><span>${svgIcon('zap',11)} ${fmtRp(Math.round(bayarListrik))}</span>
        </div>
      </div>
      <div style="background:#fff5f5;border:1.5px solid #fecaca;border-radius:10px;padding:12px 16px">
        <div style="font-size:10px;color:var(--text-l);font-weight:600;text-transform:uppercase;margin-bottom:4px">Tunggakan</div>
        <div style="font-size:17px;font-weight:800;color:var(--red)">${fmtRp(totalTunggak)}</div>
        <div style="font-size:11px;color:var(--text-l);margin-top:4px;display:flex;gap:10px">
          <span>${svgIcon('utensils',11)} ${fmtRp(Math.round(tunggakMakan))}</span><span>${svgIcon('zap',11)} ${fmtRp(Math.round(tunggakListrik))}</span>
        </div>
      </div>
    </div>`;

  renderPaginationUI('tagihan-pagination', filtered.length, 'tagihan', 'renderTagihanTable(true)');
}

// ===== SANTRI TABLE =====
function renderSantri(keepPage){
  if(!keepPage) _pageState.santri = 1;
  const q=document.getElementById('cari-santri')?.value.toLowerCase()||'';
  const asramaF=document.getElementById('filter-asrama-santri')?.value||'';
  const kobongF=document.getElementById('filter-kobong-santri')?.value||'';
  const kelasF=document.getElementById('filter-kelas-santri')?.value||'';


  let filtered=ALL_SANTRI.filter(s=>{
    if(q && !s.nama.toLowerCase().includes(q)) return false;
    // Filter berdasarkan dapur aktif
    if(ACTIVE_DAPUR && String(s.dapur_id||'')!==String(ACTIVE_DAPUR)) return false;
    if(asramaF && String(s.kobong?.asrama_id||'')!==asramaF) return false;
    if(kobongF && String(s.kobong_id||'')!==kobongF) return false;
    if(kelasF && (s.kelas||'')!==kelasF) return false;
    return true;
  });

  const grid=document.getElementById('santri-grid');
  const empty=document.getElementById('santri-empty');

  if(!filtered.length){
    grid.innerHTML=''; empty.style.display='block';
    renderPaginationUI('santri-pagination', 0, 'santri', 'renderSantri(true)');
    return;
  }
  empty.style.display='none';

  // Kelompokkan tagihan per santri sekali di awal (bukan filter linear di dalam
  // loop) -- ALL_TAGIHAN bisa ribuan baris (riwayat berbulan-bulan), filter
  // per-baris santri di dalam .map() jadi O(n×m) dan kerasa lag pas ganti tab.
  const tagihanBySantri = new Map();
  ALL_TAGIHAN.forEach(t=>{
    const key = String(t.santri_id);
    if(!tagihanBySantri.has(key)) tagihanBySantri.set(key, []);
    tagihanBySantri.get(key).push(t);
  });

  const pageStart=((_pageState.santri||1)-1)*PAGE_SIZE;
  const rows=paginate(filtered,'santri').map((s,i)=>{
    const kobongNama=s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const tagSantri=tagihanBySantri.get(String(s.id))||[];
    const totalTagihan=tagSantri.reduce((a,t)=>a+Number(t.nominal),0);
    const totalBayar=tagSantri.filter(t=>t.status==='lunas').reduce((a,t)=>a+Number(t.nominal_bayar||t.nominal),0);
    const totalTunggak=tagSantri.filter(t=>t.status!=='lunas').reduce((a,t)=>a+(Number(t.nominal)-Number(t.nominal_bayar||0)),0);
    const hasTunggak=totalTunggak>0;
    const statusBadge=hasTunggak
      ?`<span class="badge badge-belum">❌ ${fmtRp(totalTunggak)}</span>`
      :`<span class="badge badge-lunas">✅ Lunas</span>`;
    return `<tr>
      <td style="color:var(--text-l);font-size:12px">${pageStart+i+1}</td>
      <td class="col-nama">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="av" style="background:${avColor(s.nama)}22;color:${avColor(s.nama)};width:38px;height:38px;flex-shrink:0">
            ${s.foto_url?`<img src="${s.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:avLetter(s.nama)}
          </div>
          <div>
            <button onclick="openDetailModal('${s.id}')" style="background:none;border:none;cursor:pointer;font-weight:700;font-size:14px;text-align:left;color:var(--text);padding:0;display:block">${s.nama}</button>
            <div style="font-size:11px;color:var(--text-l)">${s.kelas?'Kelas '+s.kelas:'—'}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-bg">${kobongNama}</span></td>
      <td>${s.dapur_id?`<span class="badge badge-dapur">${getDapurEmoji(s.dapur_id)} ${getDapurNama(s.dapur_id)}</span>`:'<span style="color:var(--text-l);font-size:12px">—</span>'}</td>
      <td>
        <div style="font-size:12px;color:var(--text-m)">${fmtRp(totalTagihan)}</div>
        <div style="font-size:11px;color:var(--text-l)">Bayar: ${fmtRp(totalBayar)}</div>
      </td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn btn-b btn-xs" onclick="openDetailModal('${s.id}')">${svgIcon('document',12)} Detail</button>
          ${hasTunggak?`<button class="btn btn-p btn-xs mutating-only" onclick="bukaMoBayarMulti('${s.id}')">${svgIcon('cash',12)}</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');

  grid.innerHTML=`<div class="tbl-wrap"><table>
    <thead><tr>
      <th>#</th><th class="col-nama">Nama Santri</th><th>Kobong</th><th>Dapur</th><th>Total Tagihan</th><th>Status</th><th>Aksi</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;

  renderPaginationUI('santri-pagination', filtered.length, 'santri', 'renderSantri(true)');
}

// ===== DETAIL SANTRI MODAL (Universal) =====
let _lastDetailSantriId = null;


// ===== HAPUS TAGIHAN DARI DETAIL MODAL =====
function hapusTagihanDetail(tagihanId, bulanLabel){
  konfirm(
    `Hapus tagihan <strong>${bulanLabel}</strong> secara permanen?<br><span style="color:var(--red);font-size:12px">⚠️ Aksi ini tidak bisa dibatalkan!</span>`,
    async()=>{
      setLoading(true, null, '🗑️ Menghapus Tagihan...', bulanLabel);
      try{
        const {error} = await SB.from('tagihan_pondok').delete().eq('id', Number(tagihanId));
        if(error){ toast('❌ Gagal hapus: '+error.message); return; }
        toast('🗑 Tagihan berhasil dihapus!');
        await loadAllData();
        fillSelects(); renderDashboard(); renderTagihanTable(); renderRekap();
        const _tid = _lastDetailSantriId;
        if(_tid) await openDetailModal(_tid);
      } finally { setLoading(false, null); }
    }, 'hapus', 'HAPUS TAGIHAN'
  );
}

async function openDetailModal(santriId){
  _lastDetailSantriId = santriId;
  const s=getSantriById(santriId);
  if(!s){ toast('❌ Santri tidak ditemukan!'); return; }

  // Load tagihan santri ini - sort kronologis (tahun dulu, lalu bulan)
  const _bulanOrder=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function _parseBulanTahun(str){ const p=(str||'').split(' '); const bIdx=_bulanOrder.indexOf(p[0]); const thn=parseInt(p[1])||0; return thn*100+(bIdx>=0?bIdx:99); }
  const tagSantri=ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)).sort((a,b)=>_parseBulanTahun(b.bulan)-_parseBulanTahun(a.bulan));

  // Kalkulasi benar: total nominal, total sudah bayar (nominal_bayar), sisa
  const totalTagihan=tagSantri.reduce((a,t)=>a+Number(t.nominal),0);
  const totalSudahBayar=tagSantri.reduce((a,t)=>a+Number(t.nominal_bayar||0),0);
  const totalSisa=totalTagihan-totalSudahBayar;

  const kobongNama=s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
  const asramaNama=getAsramaNama(s.kobong?.asrama_id||'');

  // Load deposit
  document.getElementById('mo-detail-nama').textContent=s.nama;

  // Skeleton loading — tampil dulu sebelum fetch
  document.getElementById('mo-detail-body').innerHTML=`
    <div style="padding:4px 0">
      <div style="background:linear-gradient(135deg,#064e29,#0a6b38,#0d5c30);border-radius:16px;overflow:hidden;margin-bottom:14px;padding:24px 20px 0">
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px">
          <div style="width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.15);margin-bottom:12px"></div>
          <div style="height:16px;background:rgba(255,255,255,.2);border-radius:6px;width:55%;margin-bottom:8px"></div>
          <div style="height:10px;background:rgba(255,255,255,.12);border-radius:6px;width:40%"></div>
        </div>
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px">
          <div style="height:28px;background:rgba(255,255,255,.1);border-radius:99px;width:90px"></div>
          <div style="height:28px;background:rgba(255,255,255,.1);border-radius:99px;width:100px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1px 1fr;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.1);margin:0 -20px;padding:14px 20px">
          <div style="text-align:center">
            <div style="height:8px;background:rgba(255,255,255,.15);border-radius:4px;width:60%;margin:0 auto 10px"></div>
            <div style="height:20px;background:rgba(255,255,255,.2);border-radius:4px;width:80%;margin:0 auto"></div>
          </div>
          <div style="background:rgba(255,255,255,.1)"></div>
          <div style="text-align:center">
            <div style="height:8px;background:rgba(255,255,255,.15);border-radius:4px;width:60%;margin:0 auto 10px"></div>
            <div style="height:20px;background:rgba(255,255,255,.2);border-radius:4px;width:80%;margin:0 auto"></div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div style="background:#fff;border:1.5px solid #FECACA;border-radius:14px;padding:16px 14px;min-height:80px">
          <div style="height:8px;background:#f0f0f0;border-radius:4px;width:70%;margin-bottom:10px"></div>
          <div style="height:18px;background:#e0e0e0;border-radius:4px;width:80%"></div>
        </div>
        <div style="background:#fff;border:1.5px solid #BBF7D0;border-radius:14px;padding:16px 14px;min-height:80px">
          <div style="height:8px;background:#f0f0f0;border-radius:4px;width:70%;margin-bottom:10px"></div>
          <div style="height:18px;background:#e0e0e0;border-radius:4px;width:80%"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;color:#9CA3AF;font-size:13px">
        <div style="width:16px;height:16px;border:2px solid #D1FAE5;border-top-color:#0D4F2E;border-radius:50%;animation:spin 0.7s linear infinite"></div>
        Memuat data...
      </div>
    </div>`;
  openMo('mo-detail');

  // Fetch deposit setelah skeleton tampil
  let saldoDeposit=0;
  try {
    const {data:dep}=await SB.from('santri_deposit').select('*').eq('santri_id',santriId).maybeSingle();
    saldoDeposit=dep?Number(dep.saldo||0):0;
  } catch(e){ saldoDeposit=0; }

  // Build riwayat tagihan
  let riwayatHtml='';
  if(!tagSantri.length){
    riwayatHtml=`<div class="empty"><span class="ei">📋</span><p>Belum ada tagihan</p></div>`;
  } else {
    riwayatHtml=tagSantri.map(t=>{
      const sudahBayar=Number(t.nominal_bayar||0);
      const sisa=Number(t.nominal)-sudahBayar;
      const statusBadge=t.status==='lunas'?`<span class="badge badge-lunas">✅ Lunas</span>`:t.status==='cicil'?`<span class="badge badge-cicil">⏳ Cicil<br><small>Bayar: ${fmtRp(sudahBayar)}<br>Sisa: ${fmtRp(sisa)}</small></span>`:`<span class="badge badge-belum">❌ Belum</span>`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border-l)">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:3px">${t.bulan||'—'}</div>
          <div style="font-size:11.5px;color:var(--text-l)">${t.dicatat_oleh?'· '+t.dicatat_oleh:''} ${t.tgl_bayar?'· '+fmtTgl(t.tgl_bayar):''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end">
          <div style="text-align:right">
            <div style="font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.3px">${fmtRp(t.nominal)}</div>
            ${sisa>0&&t.status!=='belum'?`<div style="font-size:11px;color:var(--red)">Sisa: ${fmtRp(sisa)}</div>`:''}
          </div>
          ${statusBadge}
          ${t.status!=='lunas'?`<button class="btn btn-p btn-xs mutating-only" onclick="closeMo('mo-detail');bukaMoBayarMulti('${t.santri_id}','${t.id}')">${svgIcon('cash',12)}</button>`:''}
          <button class="btn btn-xs mutating-only" style="background:#fee2e2;color:var(--red);border:1px solid #fecaca" onclick="hapusTagihanDetail('${t.id}','${(t.bulan||'').replace(/'/g,'')}')">${svgIcon('trash',12)}</button>
        </div>
      </div>`;
    }).join('');
  }

  const hasTunggak=totalSisa>0;
  const hasWA=!!(s.no_wa);
  const nomBulan=getNominalMakan()+getNominalListrik();

  document.getElementById('mo-detail-body').innerHTML=`
    <!-- HEADER CARD — Stacked Glass -->
    <div style="background:linear-gradient(135deg,#064e29 0%,#0a6b38 40%,#0d5c30 100%);border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:0 8px 24px rgba(6,78,41,.4);position:relative">
      <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(212,175,55,.12);filter:blur(40px);pointer-events:none;z-index:0"></div>
      <div style="position:absolute;bottom:-20px;left:-20px;width:120px;height:120px;border-radius:50%;background:rgba(${hasTunggak?'220,38,38':'74,222,128'},.08);filter:blur(30px);pointer-events:none;z-index:0"></div>
      <div style="display:flex;flex-direction:column;align-items:center;padding:22px 20px 16px;position:relative;z-index:1">
        <div style="position:relative;margin-bottom:12px">
          <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.08));border:2px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.2);overflow:hidden">
            ${s.foto_url?`<img src="${s.foto_url}" style="width:100%;height:100%;object-fit:cover">`:avLetter(s.nama)}
          </div>
          <div style="position:absolute;inset:-4px;border-radius:50%;border:1.5px solid rgba(${hasTunggak?'220,38,38':'212,175,55'},.5);pointer-events:none"></div>
          <div style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;border-radius:50%;background:${hasTunggak?'#f87171':'#4ADE80'};border:3px solid #064e29"></div>
        </div>
        <div style="color:#fff;font-size:17px;font-weight:800;text-align:center">${s.nama}</div>
        <div style="color:rgba(255,255,255,.5);font-size:11px;margin-top:3px;text-align:center">Kelas ${s.kelas||'—'} · ${asramaNama||'—'}</div>
      </div>
      <div style="display:flex;justify-content:center;gap:8px;padding:0 20px 14px;position:relative;z-index:1;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:99px;padding:5px 12px;font-size:11px;color:rgba(255,255,255,.85);font-weight:500">${svgIcon('utensils',11)} ${getDapurNama(s.dapur_id)}</div>
        <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:99px;padding:5px 12px;font-size:11px;color:rgba(255,255,255,.85);font-weight:500">${svgIcon('home',11)} ${kobongNama}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1px 1fr;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.1);padding:14px 20px;position:relative;z-index:1">
        <div style="text-align:center">
          <div style="color:rgba(${hasTunggak?'255,120,120':'74,222,128'},.8);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;display:flex;align-items:center;justify-content:center;gap:4px">${hasTunggak?svgIcon('alert-triangle',10)+' Sisa Tagihan':svgIcon('check-circle',10)+' Status'}</div>
          <div style="color:${hasTunggak?'#ff8a8a':'#4ADE80'};font-size:19px;font-weight:900;letter-spacing:-.5px">${hasTunggak?fmtRp(totalSisa):'Lunas'}</div>
          <div style="color:rgba(255,255,255,.4);font-size:9.5px;margin-top:3px">${hasTunggak?'Ada tunggakan':'Semua terbayar'}</div>
        </div>
        <div style="background:rgba(255,255,255,.1)"></div>
        <div style="text-align:center">
          <div style="color:rgba(212,175,55,.8);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Progress</div>
          <div style="color:#F59E0B;font-size:19px;font-weight:900;letter-spacing:-.5px">${totalTagihan>0?Math.round(totalSudahBayar/totalTagihan*100):100}%</div>
          <div style="color:rgba(212,175,55,.6);font-size:9.5px;margin-top:3px">terbayar</div>
        </div>
      </div>
    </div>
            <!-- DEPOSIT CARD (jika ada) -->
    ${saldoDeposit>0?`
    <div style="background:var(--gold-p);border:1.5px solid var(--gold-b);border-radius:16px;padding:18px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">${svgIcon('bank',12)} Saldo Deposit</div>
        <div style="font-size:26px;font-weight:800;color:var(--gold);letter-spacing:-.5px">${fmtRp(saldoDeposit)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:var(--text-m);font-weight:600">~${Math.floor(saldoDeposit/nomBulan)} bulan lagi</div>
        <div style="font-size:11px;color:var(--text-l);margin-top:2px">otomatis terpotong</div>
      </div>
    </div>`:''}

    <!-- STAT CARDS 2 kolom -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#fff;border:1.5px solid #FECACA;border-radius:14px;padding:16px 14px;min-height:80px;box-shadow:0 4px 14px rgba(0,0,0,.08)">
        <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Total Tagihan</div>
        <div style="font-size:16px;font-weight:800;color:#DC2626;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmtRp(totalTagihan)}</div>
      </div>
      <div style="background:#fff;border:1.5px solid #6EE7A0;border-radius:14px;padding:16px 14px;min-height:80px;box-shadow:0 4px 14px rgba(0,0,0,.08)">
        <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Sudah Bayar</div>
        <div style="font-size:16px;font-weight:800;color:#0D4F2E;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmtRp(totalSudahBayar)}</div>
      </div>
    </div>

    <!-- TOMBOL AKSI - lebar penuh -->
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
      ${hasTunggak?`<button class="btn btn-p mutating-only" style="width:100%;justify-content:center;padding:14px;font-size:14px;border-radius:12px" onclick="closeMo('mo-detail');bukaMoBayarMulti('${santriId}')">${svgIcon('cash',14)} Bayar Tagihan</button>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-g mutating-only" style="justify-content:center;padding:12px;border-radius:12px" onclick="closeMo('mo-detail');bukaMoBayarMulti('${santriId}');setTimeout(()=>switchModeTab('deposit'),300)">${svgIcon('bank',14)} Deposit</button>
        <button class="btn btn-b mutating-only" style="justify-content:center;padding:12px;border-radius:12px" onclick="bukaModalGeneratePerSantri('${santriId}')">${svgIcon('zap',14)} Generate</button>
        ${hasWA&&hasTunggak?`<button class="btn btn-wa mutating-only" style="justify-content:center;padding:12px;border-radius:12px" onclick="kirimWASantri('${santriId}','${bulanAktif()}')">${svgIcon('smartphone',14)} WA Tagihan</button>`:''}
        <button class="btn btn-d mutating-only" style="justify-content:center;padding:12px;border-radius:12px;${hasWA&&hasTunggak?'':'grid-column:1/-1'}" onclick="bukaModalHapusTagihanSantri('${santriId}')">${svgIcon('trash',14)} Hapus Tagihan</button>
      </div>
    </div>

    <!-- RIWAYAT TAGIHAN -->
    <div style="background:var(--white);border:1.5px solid var(--border-l);border-radius:16px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border-l);background:var(--green-p);display:flex;align-items:center;gap:8px">
        ${svgIcon('document',16)}
        <span style="font-family:'Lora',serif;font-size:17px;font-weight:700;color:var(--green)">Riwayat Tagihan</span>
      </div>
      <div style="padding:16px 20px">${riwayatHtml}</div>
    </div>
`;
}

// ===== GENERATE & HAPUS TAGIHAN PER SANTRI =====
let _genSantriId = null;
let _hapusSantriId = null;

function bukaModalGeneratePerSantri(santriId){
  _genSantriId = santriId;
  const s = getSantriById(santriId);
  if(!s){ toast('Santri tidak ditemukan!',false); return; }

  const info = document.getElementById('mo-gen-santri-info');
  if(info) info.innerHTML = `<strong>${s.nama}</strong> · ${s.kelas?'Kelas '+s.kelas+' · ':''}<span style="color:var(--green)">Generate tagihan untuk santri ini saja</span>`;

  // Populate tahun
  const now = new Date();
  const thn = now.getFullYear();
  const tahunEl = document.getElementById('gen-santri-tahun');
  tahunEl.innerHTML = '';
  for(let y=thn;y>=thn-3;y--){
    tahunEl.innerHTML += `<option value="${y}" ${y===thn?'selected':''}>${y}</option>`;
  }

  // Default nominal dari config
  document.getElementById('gen-santri-makan').value = CONFIG.nominal_makan||380000;
  document.getElementById('gen-santri-listrik').value = CONFIG.nominal_listrik||40000;
  document.getElementById('gen-santri-warn').style.display='none';

  onGenSantriTahunChange();
  closeMo('mo-detail');
  openMo('mo-gen-santri');
}

function onGenSantriTahunChange(){
  const URUTAN_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tahun = document.getElementById('gen-santri-tahun')?.value||'';
  const listEl = document.getElementById('gen-santri-bulan-list');
  if(!listEl||!tahun) return;
  const now = new Date();
  const bulanAktif = URUTAN_BULAN[now.getMonth()];
  listEl.innerHTML = URUTAN_BULAN.map(b=>`
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;background:var(--white);border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;font-weight:400">
      <input type="checkbox" name="gen-santri-bulan" value="${b} ${tahun}" style="accent-color:var(--green);width:15px;height:15px" onchange="_syncBtnPilihSemuaBulanSantri()" ${(b===bulanAktif && String(tahun)===String(now.getFullYear()))?'checked':''}> ${b}
    </label>`).join('');
  _syncBtnPilihSemuaBulanSantri();
}

function togglePilihSemuaBulanSantri(){
  const boxes = document.querySelectorAll('#gen-santri-bulan-list input[name="gen-santri-bulan"]');
  const semuaCentang = [...boxes].every(b=>b.checked);
  boxes.forEach(b=>b.checked = !semuaCentang);
  _syncBtnPilihSemuaBulanSantri();
}

function _syncBtnPilihSemuaBulanSantri(){
  const boxes = document.querySelectorAll('#gen-santri-bulan-list input[name="gen-santri-bulan"]');
  const btn = document.getElementById('btn-pilih-semua-bulan-santri');
  if(!btn||!boxes.length) return;
  const semuaCentang = [...boxes].every(b=>b.checked);
  btn.textContent = semuaCentang ? '☑️ Batal Semua' : '☐ Pilih Semua';
}

async function prosesGeneratePerSantri(){
  if(_isLoading) return;
  const santriId = _genSantriId;
  const bulanChecked = [...document.querySelectorAll('#gen-santri-bulan-list input[name="gen-santri-bulan"]:checked')].map(b=>b.value);
  const nomMakan = parseInt(document.getElementById('gen-santri-makan')?.value)||0;
  const nomListrik = parseInt(document.getElementById('gen-santri-listrik')?.value)||0;
  if(!bulanChecked.length){ toast('Pilih minimal satu bulan!',false); return; }
  if(!nomMakan&&!nomListrik){ toast('Isi minimal satu nominal!',false); return; }

  const s = getSantriById(santriId);
  if(!s){ toast('Santri tidak ditemukan!',false); return; }

  const warn = document.getElementById('gen-santri-warn');
  warn.style.display='none';

  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true,_lBtn);
  try {
    const nom = nomMakan + nomListrik;
    const {data:dep} = await SB.from('santri_deposit').select('*').eq('santri_id',santriId).maybeSingle();
    let saldoDep = dep ? Number(dep.saldo||0) : 0;
    let berhasil = 0;
    const dilewati = [];

    for(const bulan of bulanChecked){
      const sudah = ALL_TAGIHAN.find(t=>String(t.santri_id)===String(santriId)&&(t.bulan||'').toLowerCase()===bulan.toLowerCase());
      if(sudah){ dilewati.push(bulan); continue; }

      const status = saldoDep >= nom ? 'lunas' : 'belum';
      const sudahBayar = status==='lunas' ? nom : 0;

      const {error} = await SB.from('tagihan_pondok').insert({
        santri_id: santriId,
        bulan,
        nominal: nom,
        nominal_makan: nomMakan,
        nominal_listrik: nomListrik,
        status,
        nominal_bayar: sudahBayar,
        tgl_bayar: status==='lunas' ? today() : null,
        dicatat_oleh: SESSION.nama||SESSION.username,
      });
      if(error){
        if(!(error.message && error.message.includes('uq_santri_bulan'))){
          toast('❌ Gagal '+bulan+': '+error.message,false);
        }
        dilewati.push(bulan);
        continue;
      }

      if(status==='lunas'){
        saldoDep -= nom;
        if(dep) await SB.from('santri_deposit').update({saldo:Math.max(0,saldoDep)}).eq('id',dep.id);
      }
      berhasil++;
    }

    if(berhasil) toast(`✅ ${berhasil} tagihan untuk ${s.nama} berhasil dibuat!`);
    if(dilewati.length){
      warn.innerHTML = `⚠️ ${dilewati.length} bulan dilewati (tagihan sudah ada): ${dilewati.join(', ')}`;
      warn.style.display='block';
    }
    if(berhasil){
      await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable();
    }
    if(!dilewati.length) closeMo('mo-gen-santri');
    bukaDetail(santriId);
  } finally { setLoading(false,_lBtn); }
}

function bukaModalHapusTagihanSantri(santriId){
  _hapusSantriId = santriId;
  const s = getSantriById(santriId);
  if(!s){ toast('Santri tidak ditemukan!',false); return; }

  const tagihan = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId));
  const info = document.getElementById('mo-hapus-santri-info');
  if(info) info.innerHTML = `<strong>${s.nama}</strong> punya <strong>${tagihan.length} tagihan</strong> total`;

  // Populate bulan
  const URUTAN_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function bulanOrder(b){ const [nm,thn]=b.split(' '); const bi=URUTAN_BULAN.indexOf(nm); return parseInt(thn||0)*12+(bi>=0?bi:99); }
  const bulanList = [...new Set(tagihan.map(t=>t.bulan).filter(Boolean))].sort((a,b)=>bulanOrder(b)-bulanOrder(a));
  const bulanEl = document.getElementById('hapus-santri-bulan');
  if(bulanEl) bulanEl.innerHTML = '<option value="">Semua Tagihan ('+tagihan.length+')</option>'
    + bulanList.map(b=>{
      const cnt = tagihan.filter(t=>t.bulan===b).length;
      return `<option value="${b}">${b} (${cnt} tagihan)</option>`;
    }).join('');

  updateHapusSantriPreview(santriId);
  closeMo('mo-detail');
  openMo('mo-hapus-tagihan-santri');
}

function updateHapusSantriPreview(santriId){
  const bulan = document.getElementById('hapus-santri-bulan')?.value||'';
  const preview = document.getElementById('hapus-santri-preview');
  if(!preview) return;
  const id = santriId||_hapusSantriId;
  const tagihan = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(id)&&(!bulan||(t.bulan||'').toLowerCase()===bulan.toLowerCase()));
  const lunas = tagihan.filter(t=>t.status==='lunas').length;
  const belum = tagihan.filter(t=>t.status==='belum').length;
  preview.innerHTML = `Akan menghapus <strong>${tagihan.length} tagihan</strong>${bulan?' bulan <strong>'+bulan+'</strong>':''}<br>
    <span style="font-size:12px">✅ Lunas: ${lunas} &nbsp;|&nbsp; ❌ Belum: ${belum}</span>
    ${lunas>0?`<br><span style="color:var(--red);font-size:12px;font-weight:600">⚠️ Termasuk ${lunas} tagihan yang sudah lunas!</span>`:''}`;
}

async function prosesHapusTagihanSantri(){
  if(_isLoading) return;
  const santriId = _hapusSantriId;
  const bulan = document.getElementById('hapus-santri-bulan')?.value||'';
  const s = getSantriById(santriId);
  const tagihan = ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)&&(!bulan||(t.bulan||'').toLowerCase()===bulan.toLowerCase()));
  if(!tagihan.length){ toast('Tidak ada tagihan!',false); return; }

  konfirm(
    `Hapus <strong>${tagihan.length} tagihan</strong>${bulan?' bulan <strong>'+bulan+'</strong>':' semua bulan'} milik <strong>${s?.nama||santriId}</strong>?<br><br>Aksi ini <strong>tidak bisa dibatalkan</strong>.`,
    async()=>{
      const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
      setLoading(true,_lBtn2);
      try {
        const ids = tagihan.map(t=>t.id);
        // Hapus per batch 100 — hindari URL terlalu panjang di Supabase
        for(let i=0;i<ids.length;i+=100){
          const batch=ids.slice(i,i+100);
          const {error}=await SB.from('tagihan_pondok').delete().in('id',batch);
          if(error){ toast('❌ Gagal: '+error.message,false); return; }
        }
        toast(`🗑️ ${ids.length} tagihan dihapus!`);
        closeMo('mo-hapus-tagihan-santri');
        await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable();
        bukaDetail(santriId);
      } finally { setLoading(false,_lBtn2); }
    }, 'hapus'
  );
}
