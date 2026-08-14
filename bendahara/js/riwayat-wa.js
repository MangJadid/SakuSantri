function renderRiwayat(keepPage){
  if(!keepPage) _pageState.riwayat = 1;
  const q=document.getElementById('cari-riwayat')?.value.toLowerCase()||'';
  const tahunF=document.getElementById('filter-tahun-riwayat')?.value||'';
  const bulanF=document.getElementById('filter-bulan-riwayat')?.value||'';
  let filtered=ALL_TAGIHAN.filter(t=>{
    const s=getSantriById(t.santri_id)||{};
    if(q && !((s.nama||t.santri_nama||'').toLowerCase().includes(q))) return false;
    if(tahunF && !(t.bulan||'').endsWith(tahunF)) return false;
    if(bulanF && (t.bulan||'')!==bulanF) return false;
    return t.status==='lunas'||t.status==='cicil';
  }).sort((a,b)=>(b.tgl_bayar||'').localeCompare(a.tgl_bayar||''));

  const pageStart=((_pageState.riwayat||1)-1)*PAGE_SIZE;
  const rows=paginate(filtered,'riwayat').map((t,i)=>{
    const s=getSantriById(t.santri_id)||{};
    return `<tr>
      <td style="color:var(--text-l)">${pageStart+i+1}</td>
      <td style="color:var(--text-l);font-size:12px">${fmtTgl(t.tgl_bayar)||'—'}</td>
      <td class="col-nama"><button onclick="openDetailModal('${t.santri_id}')" style="background:none;border:none;cursor:pointer;font-weight:600;color:var(--green)">${s.nama||t.santri_nama||'—'}</button></td>
      <td><span class="badge badge-dapur">${getDapurEmoji(t.dapur_id)} ${getDapurNama(t.dapur_id)}</span></td>
      <td>${t.keterangan||'—'}</td>
      <td>${t.bulan||'—'}</td>
      <td><strong style="color:var(--green)">${fmtRp(t.nominal_bayar||t.nominal)}</strong></td>
      <td style="font-size:12px;color:var(--text-l)">${t.dicatat_oleh||'—'}</td>
    </tr>`;
  }).join('');

  document.getElementById('riwayat-tbody').innerHTML=rows||'';
  document.getElementById('riwayat-empty').style.display=rows?'none':'block';
  renderPaginationUI('riwayat-pagination', filtered.length, 'riwayat', 'renderRiwayat(true)');
}

// ===== WA =====
function buildWAPesan(santriId, bulan){
  const s=getSantriById(santriId)||{};
  // Support multi-bulan (array) atau single bulan (string)
  const bulanArr = Array.isArray(bulan) ? bulan : [bulan||bulanAktif()];
  const tagihan = ALL_TAGIHAN.filter(t=>
    String(t.santri_id)===String(santriId) &&
    bulanArr.includes(t.bulan||'') &&
    t.status!=='lunas'
  );
  const total = tagihan.reduce((a,t)=>a+Number(t.nominal)-(Number(t.nominal_bayar||0)),0);
  const rincian = tagihan.length
    ? tagihan.map(t=>{ const sisa=Number(t.nominal)-Number(t.nominal_bayar||0); return `• Tagihan ${t.bulan}: ${fmtRp(sisa)}`; }).join('\n')
    : bulanArr.map(b=>`• Tunggakan ${b}`).join('\n');
  const bulanStr = bulanArr.join(', ');
  const tmpl=CONFIG.wa_template_bend||getDefaultWATemplate();
  return tmpl
    .replace(/{{nama}}/g, s.nama||santriId)
    .replace(/{{bulan}}/g, bulanStr)
    .replace(/{{total}}/g, fmtRp(total))
    .replace(/{{rincian}}/g, rincian)
    .replace(/{{link}}/g, CONFIG.link_saku_santri||'https://mangjadid.my.id/santri')
    .replace(/{{pondok}}/g, CONFIG.pesantren_nama||'Pondok Pesantren An-Nur');
}
function getDefaultWATemplate(){
  return `Assalamu'alaikum Wr. Wb. 🌿\n\nKepada Yth.\nOrang Tua / Wali Santri *{{nama}}*\n\nBerikut informasi tagihan bulan *{{bulan}}*:\n\n{{rincian}}\n\n*Total: {{total}}*\n\nMohon segera dilunasi.\n\nCek tagihan/tunggakan secara langsung di:\n🔗 {{link}}\n\nJazakumullahu Khairan 🙏\n*{{pondok}}*`;
}
function kirimWASantri(santriId, bulan){
  const s=getSantriById(santriId)||{};
  const noWA=(s.no_wa||'').replace(/\D/g,'').replace(/^0/,'62');
  if(!noWA){ toast('⚠️ Nomor WA tidak tersedia!'); return; }
  const pesan=buildWAPesan(santriId,bulan||bulanAktif());
  window.open(`https://wa.me/${noWA}?text=${encodeURIComponent(pesan)}`,'_blank');
}
function kirimWABelumBayar(){
  bukaWAMassal('tagihan');
}
function getTagihanForWAMassal(source){
  // Baca filter dari tab yang aktif (tagihan atau rekap)
  let asramaF='', tahunF='', bulanF='', kobongF='', kelasF='', waliF='';
  if(source==='tagihan'){
    asramaF=document.getElementById('filter-asrama-tagihan')?.value||'';
    tahunF=document.getElementById('filter-tahun-tagihan')?.value||'';
    bulanF=document.getElementById('filter-bulan-tagihan')?.value||'';
    kobongF=document.getElementById('filter-kobong-tagihan')?.value||'';
    kelasF=document.getElementById('filter-kelas-tagihan')?.value||'';
    waliF=document.getElementById('filter-wali-tagihan')?.value||'';
  } else if(source==='rekap'){
    asramaF=document.getElementById('filter-asrama-rekap')?.value||'';
    tahunF=document.getElementById('filter-tahun-rekap')?.value||'';
    bulanF=document.getElementById('filter-bulan-rekap')?.value||'';
    kobongF=document.getElementById('filter-kobong-rekap')?.value||'';
    kelasF=document.getElementById('filter-kelas-rekap')?.value||'';
    waliF=document.getElementById('filter-wali-rekap')?.value||'';
  }
  return getTagihanFiltered().filter(t=>{
    const s=getSantriById(t.santri_id)||{};
    if(t.status==='lunas') return false;
    if(asramaF && String(s.kobong?.asrama_id||'')!==asramaF) return false;
    if(tahunF && !(t.bulan||'').endsWith(tahunF)) return false;
    if(bulanF && (t.bulan||'')!==bulanF) return false;
    if(kobongF && String(s.kobong_id||'')!==kobongF) return false;
    if(kelasF && (s.kelas||'')!==kelasF) return false;
    if(waliF && (s.created_by||'')!==waliF) return false;
    return true;
  });
}

function bukaWAMassal(source){
  source = source || 'tagihan';
  const bulanPilih = document.getElementById('wa-bulan')?.value || '';
  const bulan = bulanPilih || bulanAktif();
  const belum = getTagihanForWAMassal(source);
  // Jika tidak ada filter bulan aktif, filter by bulan aktif
  const filtered = belum.filter(t=> bulanPilih ? true : (t.bulan||'')==bulan);
  const santriMap={};
  filtered.forEach(t=>{ if(!santriMap[t.santri_id]) santriMap[t.santri_id]=[]; santriMap[t.santri_id].push(t); });

  // Info filter aktif
  const filterInfo = [];
  const src = source==='rekap' ? 'rekap' : 'tagihan';
  const kb = document.getElementById(`filter-kobong-${src}`)?.selectedOptions[0]?.text;
  const as = document.getElementById(`filter-asrama-${src}`)?.selectedOptions[0]?.text;
  const kl = document.getElementById(`filter-kelas-${src}`)?.value;
  const bl = document.getElementById(`filter-bulan-${src}`)?.value || bulan;
  if(kb && kb!=='Semua Kobong') filterInfo.push(`Kobong: ${kb}`);
  if(as && as!=='Semua Asrama') filterInfo.push(`Asrama: ${as}`);
  if(kl) filterInfo.push(`Kelas: ${kl}`);
  if(bl) filterInfo.push(`Bulan: ${bl}`);

  let html = filterInfo.length ? `<div style="font-size:11px;color:var(--text-l);margin-bottom:10px;padding:6px 10px;background:var(--bg2);border-radius:8px;display:flex;align-items:center;gap:5px">${svgIcon('sliders',12)} Filter aktif: ${filterInfo.join(' · ')}</div>` : '';
  Object.entries(santriMap).forEach(([sid,tags])=>{
    const s=getSantriById(sid)||{};
    const total=tags.reduce((a,t)=>a+Number(t.nominal)-Number(t.nominal_bayar||0),0);
    const hasWA=!!(s.no_wa);
    const bulanTag = tags.map(t=>t.bulan).filter(Boolean).join(', ') || bulan;
    html+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--rad-sm);${hasWA?'':'opacity:.5'}">
      <div>
        <div style="font-weight:600;font-size:13px">${s.nama||sid}</div>
        <div style="font-size:11px;color:var(--text-l)">${s.no_wa||'No WA tidak ada'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:700;color:var(--red)">${fmtRp(total)}</span>
        ${hasWA?`<button class="btn btn-wa btn-xs mutating-only" onclick="kirimWASantri('${sid}','${bulanTag.split(',')[0].trim()}')">${svgIcon('smartphone',12)} Kirim</button>`:`<span style="display:inline-flex;cursor:default;opacity:.5" title="No WA belum diinput">${svgIcon('smartphone',14)}</span>`}
      </div>
    </div>`;
  });
  document.getElementById('wa-list').innerHTML=html||`<div class="empty"><span class="ei">✅</span><p>Tidak ada tunggakan untuk filter yang dipilih!</p></div>`;
  // Simpan source untuk kirimWASemua
  document.getElementById('mo-wa-massal').dataset.source = source;
  openMo('mo-wa-massal');
}
// State WA antrian
let _waMassalQueue = [];
let _waMassalIdx = 0;
let _waMassalBulan = '';

function kirimWASemua(){
  const source = document.getElementById('mo-wa-massal')?.dataset.source || 'tagihan';
  const bulanPilih = document.getElementById('wa-bulan')?.value || '';
  const bulan = bulanPilih || bulanAktif();
  const belum = getTagihanForWAMassal(source);
  const filtered = belum.filter(t=> bulanPilih ? true : (t.bulan||'')==bulan);
  const santriIds = [...new Set(filtered.map(t=>t.santri_id))];
  const adaWA = santriIds.filter(sid=>{ const s=getSantriById(sid)||{}; return !!(s.no_wa); });
  const tanpaWA = santriIds.length - adaWA.length;

  if(!adaWA.length){ toast('⚠️ Tidak ada santri belum bayar yang punya no WA!', false); return; }

  const info = `Kirim WA ke <strong>${adaWA.length} santri</strong> yang belum bayar?` +
    (tanpaWA>0?`<br><br>✅ Ada no WA: <strong>${adaWA.length} santri</strong><br>⚠️ Tanpa no WA: <strong>${tanpaWA} santri</strong> (akan dilewati)<br><br>Pesan akan dibuka satu per satu di WhatsApp.`:'<br><br>Pesan akan dibuka satu per satu di WhatsApp.');

  konfirm(info, ()=>{
    _waMassalQueue = adaWA;
    _waMassalIdx = 0;
    _waMassalBulan = bulan;
    closeMo('mo-wa-massal');
    kirimWAMassalNext();
  }, 'wa');
}

function kirimWAMassalNext(){
  if(_waMassalIdx >= _waMassalQueue.length){
    toast(`✅ Selesai! ${_waMassalQueue.length} chat WA sudah dibuka.`);
    return;
  }
  const sid = _waMassalQueue[_waMassalIdx];
  const s = getSantriById(sid)||{};
  const noWA = (s.no_wa||'').replace(/\D/g,'').replace(/^0/,'62');
  const bulan = _waMassalBulan;
  const pesan = buildWAPesan(sid, bulan);
  window.open(`https://wa.me/${noWA}?text=${encodeURIComponent(pesan)}`, '_blank');
  _waMassalIdx++;

  // Tampilkan progress modal
  const remaining = _waMassalQueue.length - _waMassalIdx;
  if(remaining > 0){
    konfirm(
      `📱 Chat WA untuk <strong>${s.nama}</strong> sudah dibuka.<br><br>Sisa: <strong>${remaining} santri</strong> lagi.`,
      ()=>{ kirimWAMassalNext(); },
      'wa',
      null
    );
  } else {
    toast(`✅ Selesai! Semua ${_waMassalQueue.length} chat WA sudah dibuka.`);
  }
}

