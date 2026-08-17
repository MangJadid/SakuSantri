// ===== COLLAPSIBLE FILTER PANEL (generic, dipakai di semua tab) =====
const REKAP_FILTER_IDS = ['filter-asrama-rekap','filter-tahun-rekap','filter-bulan-rekap','filter-status-rekap','filter-kobong-rekap','filter-kelas-rekap','filter-wali-rekap'];
const TAGIHAN_FILTER_IDS = ['filter-asrama-tagihan','filter-tahun-tagihan','filter-bulan-tagihan','filter-status-tagihan','filter-kobong-tagihan','filter-kelas-tagihan','filter-wali-tagihan'];
const SANTRI_FILTER_IDS = ['filter-asrama-santri','filter-kobong-santri','filter-kelas-santri'];
function toggleFilterPanel(ctx){
  const panel = document.getElementById('filter-panel-'+ctx);
  const btn = document.getElementById('filter-toggle-'+ctx);
  if(!panel||!btn) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  btn.classList.toggle('active', !isOpen);
}
function updateFilterBadge(ctx, selectIds){
  const btn = document.getElementById('filter-toggle-'+ctx);
  if(!btn) return;
  const badge = btn.querySelector('.fb-badge');
  let count = 0;
  selectIds.forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.value) count++;
  });
  if(badge){
    if(count>0){ badge.textContent = count; badge.style.display='flex'; }
    else { badge.style.display='none'; }
  }
  const panelOpen = document.getElementById('filter-panel-'+ctx)?.classList.contains('open');
  btn.classList.toggle('active', count>0 || !!panelOpen);
}
function resetFilterPanel(ctx, selectIds, callback){
  selectIds.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const cariEl = document.getElementById('cari-'+ctx);
  updateFilterBadge(ctx, selectIds);
  if(typeof callback==='function') callback();
}
function fillBulanByTahun(ctx){
  const URUTAN_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function bulanOrder(b){ const [nm,thn]=b.split(' '); const bi=URUTAN_BULAN.indexOf(nm); return parseInt(thn||0)*12+(bi>=0?bi:99); }

  const tahunEl = document.getElementById(`filter-tahun-${ctx}`);
  const bulanEl = document.getElementById(`filter-bulan-${ctx}`);
  if(!tahunEl||!bulanEl) return;

  const tahun = tahunEl.value;
  const bulanSet = new Set(ALL_TAGIHAN.map(t=>t.bulan).filter(Boolean));
  let bulanList = [...bulanSet].sort((a,b)=>bulanOrder(b)-bulanOrder(a));
  if(tahun) bulanList = bulanList.filter(b=>b.endsWith(tahun));

  bulanEl.innerHTML = '<option value="">Semua Bulan</option>'
    + bulanList.map(b=>`<option value="${b}">${b}</option>`).join('');
}

async function generateTagihanBulanIni(){
  if(_isLoading) return;
  const bulan=bulanAktif();
  const sf=getSantriFiltered();
  if(!sf.length){ toast('⚠️ Tidak ada santri!'); return; }

  const nomMakan=getNominalMakan(), nomListrik=getNominalListrik();
  const sudahAda=getTagihanFiltered().filter(t=>(t.bulan||'').toLowerCase()===bulan.toLowerCase());
  const santriSudah=new Set(sudahAda.map(t=>String(t.santri_id)));
  const URUTAN_BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function bulanToNum(b){ if(!b) return 0; const [nm,thn]=b.split(' '); return parseInt(thn||0)*12+URUTAN_BULAN.indexOf(nm); }
  const bulanNum = bulanToNum(bulan);

  const toProcess=sf.filter(s=>s.dapur_id&&s.dapur_id!==null&&s.dapur_id!=='').filter(s=>{
    if(santriSudah.has(String(s.id))) return false;
    if(s.bulan_mulai_tagihan){
      const mulaiNum = bulanToNum(s.bulan_mulai_tagihan);
      if(mulaiNum > bulanNum) return false;
    }
    return true;
  });
  const skipped = sf.filter(s=>!santriSudah.has(String(s.id))&&s.bulan_mulai_tagihan&&bulanToNum(s.bulan_mulai_tagihan)>bulanNum).length;

  if(!toProcess.length){ toast(`ℹ️ Semua santri sudah punya tagihan bulan ini${skipped?` (${skipped} santri belum waktunya)`:''}!`); return; }

  if(sudahAda.length){
    konfirm(
      `Tagihan <strong>${bulan}</strong> sudah ada sebanyak <strong>${sudahAda.length} tagihan</strong>.<br>Generate untuk <strong>${toProcess.length} santri</strong> yang belum.${skipped?`<br><span style="color:var(--text-m);font-size:12px">⏭️ ${skipped} santri dilewati (belum waktunya)</span>`:''}`,
      ()=>_lanjutGenerate(bulan, toProcess, nomMakan, nomListrik), 'generate');
    return;
  }
  if(skipped) toast(`⏭️ ${skipped} santri dilewati karena bulan mulai tagihan belum tercapai`,false);
  await _lanjutGenerate(bulan, toProcess, nomMakan, nomListrik);
}

async function _lanjutGenerate(bulan, toProcess, fallbackMakan, fallbackListrik){
  const _lBtn = document.querySelector('[onclick*="generateTagihanBulanIni"]')||null;
  setLoading(true, _lBtn, '⚙️ Generate Tagihan...', `Memproses ${bulan}...`);
  try{
    const {data:deposits}=await SB.from('santri_deposit').select('*').in('santri_id',toProcess.map(s=>Number(s.id)));
    const depositMap={};
    (deposits||[]).forEach(d=>{ depositMap[String(d.santri_id)]=d; });

    const toInsert=[];
    const depositUpdates=[];

    for(const s of toProcess){
      const {rincian, nominal:nom, nominal_makan, nominal_listrik} = buildTagihanBreakdown(s.kobong?.asrama_id, fallbackMakan, fallbackListrik);
      const dep=depositMap[String(s.id)];
      const saldoDep=dep?Number(dep.saldo||0):0;
      let bayar=0, status='belum', newDep=saldoDep;

      if(saldoDep>0){
        if(saldoDep>=nom){ bayar=nom; status='lunas'; newDep=saldoDep-nom; }
        else { bayar=saldoDep; status='cicil'; newDep=0; }
        depositUpdates.push({santri_id:Number(s.id), saldo:newDep, dep_id:dep?.id});
      }

      toInsert.push({
        santri_id:Number(s.id), santri_nama:s.nama, dapur_id:s.dapur_id||null,
        bulan, nominal_makan, nominal_listrik, nominal:nom, rincian,
        nominal_bayar:bayar, status, tgl_tagihan:today(),
        tgl_bayar: bayar>0 ? today() : null,
        keterangan:bayar>0?`Auto dari deposit (saldo: ${fmtRp(saldoDep)})`:'',
        dicatat_oleh:SESSION.nama||SESSION.username,
      });
    }

    const INSERT_BATCH_SGL = 10;
    for(let ii=0; ii<toInsert.length; ii+=INSERT_BATCH_SGL){
      const batch = toInsert.slice(ii, ii+INSERT_BATCH_SGL);
      const {error}=await SB.from('tagihan_pondok').insert(batch);
      if(error){ toast('❌ Gagal generate: '+error.message); return; }
    }

    // Update deposit PARALEL
    await Promise.all(depositUpdates
      .filter(u=>u.dep_id)
      .map(u=>SB.from('santri_deposit').update({saldo:u.saldo}).eq('id',u.dep_id))
    );

    const autoLunas=toInsert.filter(t=>t.status==='lunas').length;
    const autoCicil=toInsert.filter(t=>t.status==='cicil').length;
    let msg=`✅ ${toInsert.length} tagihan dibuat!`;
    if(autoLunas) msg+=` ${autoLunas} lunas (deposit).`;
    if(autoCicil) msg+=` ${autoCicil} cicilan (deposit).`;
    toast(msg);
    await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable();
  } finally { setLoading(false, _lBtn); }
}

// ===== BAYAR TAGIHAN =====
function bukaMoBayar(tagId){
  const t=ALL_TAGIHAN.find(x=>String(x.id)===String(tagId));
  if(!t){ toast('❌ Tagihan tidak ditemukan!'); return; }
  BAYAR_TAG_ID=tagId;
  const s=getSantriById(t.santri_id)||{};
  const sudahBayar=Number(t.nominal_bayar||0);
  const sisaBayar=Number(t.nominal)-sudahBayar;
  const nomMakan=Number(t.nominal_makan||0);
  const nomListrik=Number(t.nominal_listrik||0);
  const hasRincian=Array.isArray(t.rincian)&&t.rincian.length>0;

  document.getElementById('bayar-nama').textContent=`${s.nama||'—'} — ${t.bulan}`;

  // Info deposit jika ada
  const depEl=document.getElementById('bayar-deposit-info');
  depEl.style.display='none';

  const breakdownHtml = hasRincian
    ? t.rincian.map(r=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:var(--bg);border-radius:8px"><span>${r.jenis||'Tagihan'}</span><strong>${fmtRp(r.nominal||0)}</strong></div>`).join('')
    : `${nomMakan?`<div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:var(--bg);border-radius:8px"><span>Uang Makan</span><strong>${fmtRp(nomMakan)}</strong></div>`:''}
       ${nomListrik?`<div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:var(--bg);border-radius:8px"><span>Uang Listrik</span><strong>${fmtRp(nomListrik)}</strong></div>`:''}`;

  document.getElementById('bayar-detail').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:5px">
      ${breakdownHtml}
      ${sudahBayar>0?`<div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:var(--gold-p);border-radius:8px"><span>Sudah Dibayar</span><strong style="color:var(--gold)">${fmtRp(sudahBayar)}</strong></div>`:''}
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:var(--green-p);border-radius:8px;border:1px solid var(--green-b)"><span><strong>Sisa Tagihan</strong></span><strong style="color:var(--red)">${fmtRp(sisaBayar)}</strong></div>
    </div>`;

  // Shortcut nominal
  const shortcuts=[];
  if(sisaBayar>0) shortcuts.push({label:'Lunas '+fmtRp(sisaBayar), val:sisaBayar});
  if(hasRincian){
    t.rincian.forEach(r=>{
      const v=Number(r.nominal||0);
      if(sisaBayar>=v&&v>0) shortcuts.push({label:(r.jenis||'Item')+' '+fmtRp(v), val:v});
    });
  } else {
    if(sisaBayar>=nomMakan&&nomMakan>0) shortcuts.push({label:'Makan '+fmtRp(nomMakan), val:nomMakan});
    if(sisaBayar>=nomListrik&&nomListrik>0) shortcuts.push({label:'Listrik '+fmtRp(nomListrik), val:nomListrik});
  }
  const half=Math.floor(sisaBayar/2);
  if(half>0&&half!==sisaBayar) shortcuts.push({label:'½ '+fmtRp(half), val:half});

  document.getElementById('bayar-shortcuts').innerHTML=shortcuts.map(sc=>
    `<button class="btn btn-o btn-xs" onclick="document.getElementById('bayar-nominal').value=${sc.val};updateBayarSisa()">${sc.label}</button>`
  ).join('');

  document.getElementById('bayar-nominal').value=sisaBayar;
  document.getElementById('bayar-tgl').value=today();
  document.getElementById('bayar-ket').value='';
  document.getElementById('bayar-sisa-wrap').style.display='none';
  document.getElementById('bayar-lunas-wrap').style.display='block';
  openMo('mo-bayar');
}

function updateBayarSisa(){
  const t=ALL_TAGIHAN.find(x=>String(x.id)===String(BAYAR_TAG_ID));
  if(!t) return;
  const bayar=parseInt(document.getElementById('bayar-nominal').value)||0;
  const sisa=Number(t.nominal)-(Number(t.nominal_bayar||0))-bayar;
  const sisaWrap=document.getElementById('bayar-sisa-wrap');
  const lunasWrap=document.getElementById('bayar-lunas-wrap');
  if(sisa>0){
    sisaWrap.style.display='block';
    lunasWrap.style.display='none';
    document.getElementById('bayar-sisa-val').textContent=fmtRp(sisa);
  } else {
    sisaWrap.style.display='none';
    lunasWrap.style.display='block';
  }
}

async function prosesBayar(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const t=ALL_TAGIHAN.find(x=>String(x.id)===String(BAYAR_TAG_ID));
  if(!t){ toast('❌ Tagihan tidak ditemukan!'); return; }
  let bayar=parseInt(document.getElementById('bayar-nominal').value)||0;
  const tgl=document.getElementById('bayar-tgl').value;
  const ket=document.getElementById('bayar-ket').value.trim();
  if(!bayar||!tgl){ toast('⚠️ Isi nominal dan tanggal!'); return; }
  if(bayar<=0){ toast('⚠️ Nominal harus lebih dari 0!'); return; }

  // Ambil semua tagihan belum lunas santri ini, urutkan dari terlama
  const BULAN_ORDER=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const parseBulan = b => { const p=(b||'').split(' '); return parseInt(p[1]||0)*100+BULAN_ORDER.indexOf(p[0]); };

  const semuaTagihan = ALL_TAGIHAN
    .filter(x=>String(x.santri_id)===String(t.santri_id) && x.status!=='lunas')
    .sort((a,b)=>parseBulan(a.bulan)-parseBulan(b.bulan)); // terlama dulu

  // Pastikan tagihan yang dipilih ada di urutan pertama
  const idx = semuaTagihan.findIndex(x=>String(x.id)===String(BAYAR_TAG_ID));
  if(idx>0){ const [cur]=semuaTagihan.splice(idx,1); semuaTagihan.unshift(cur); }

  let sisa=bayar, sukses=0;
  for(const tg of semuaTagihan){
    if(sisa<=0) break;
    const sudahBayar=Number(tg.nominal_bayar||0);
    const kurang=Number(tg.nominal)-sudahBayar;
    if(kurang<=0) continue;
    const bayarSekarang=Math.min(sisa,kurang);
    const totalBayar=sudahBayar+bayarSekarang;
    const status=totalBayar>=Number(tg.nominal)?'lunas':'cicil';
    const {error}=await SB.from('tagihan_pondok').update({
      nominal_bayar:totalBayar, status, tgl_bayar:tgl,
      keterangan:ket||null, dicatat_oleh:SESSION.nama||SESSION.username
    }).eq('id',tg.id);
    if(!error){ sukses++; sisa-=bayarSekarang; }
  }

  toast(`✅ ${fmtRp(bayar)} dialokasikan ke ${sukses} tagihan!`);
  closeMo('mo-bayar');
  await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable();

  } finally { setLoading(false, _lBtn); }
}

// ===== BAYAR MULTI / DEPOSIT =====
function switchModeTab(mode){
  document.getElementById('mode-bulan').style.display=mode==='bulan'?'block':'none';
  document.getElementById('mode-deposit').style.display=mode==='deposit'?'block':'none';
  document.getElementById('mode-tab-bulan').classList.toggle('act',mode==='bulan');
  document.getElementById('mode-tab-deposit').classList.toggle('act',mode==='deposit');
  if(mode==='deposit') initDepositMode();
}

async function bukaMoBayarMulti(santriId){
  try {
  MULTI_SANTRI_ID=santriId;
  const s=getSantriById(santriId)||{};
  document.getElementById('multi-bayar-nama').textContent=s.nama||'—';
  document.getElementById('mo-multi-title').textContent='💰 Bayar Tagihan — '+s.nama;

  // Load tagihan belum lunas
  const tagBelum=ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)&&t.status!=='lunas')
    .sort((a,b)=>{ const bo=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; const pa=(a.bulan||'').split(' '),pb=(b.bulan||'').split(' '); const ta=parseInt(pa[1])||0,tb=parseInt(pb[1])||0; if(tb!==ta) return tb-ta; return bo.indexOf(pb[0])-bo.indexOf(pa[0]); });

  // Load deposit - pakai maybeSingle agar tidak error jika kosong
  let saldoDep=0;
  try {
    const {data:dep}=await SB.from('santri_deposit').select('*').eq('santri_id',santriId).maybeSingle();
    saldoDep=dep?Number(dep.saldo||0):0;
  } catch(e){ saldoDep=0; }

  // Info deposit di mode bulan
  const depAda=document.getElementById('multi-deposit-ada');
  if(saldoDep>0){
    depAda.style.display='block';
    depAda.innerHTML=`<div class="success-box">${svgIcon('bank',13)} Saldo Deposit: <strong>${fmtRp(saldoDep)}</strong></div>`;
  } else depAda.style.display='none';

  document.getElementById('multi-bulan-list').innerHTML=tagBelum.map(t=>{
    const sisa=Number(t.nominal)-Number(t.nominal_bayar||0);
    return `<label class="bulan-item" id="bitem-${t.id}">
      <input type="checkbox" value="${t.id}" data-nom="${sisa}" onchange="updateMultiTotal()" class="multi-check">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${t.bulan||'—'}</div>
        <div style="font-size:11px;color:var(--text-l)">${fmtRp(t.nominal_makan||0)} Makan + ${fmtRp(t.nominal_listrik||0)} Listrik${t.nominal_bayar>0?` · Bayar: ${fmtRp(t.nominal_bayar)}`:''}</div>
      </div>
      <strong style="font-size:13px;color:var(--red)">${fmtRp(sisa)}</strong>
    </label>`;
  }).join('')||'<div class="empty"><span class="ei">✅</span><p>Semua lunas!</p></div>';

  document.getElementById('multi-total').value='Rp 0';
  document.getElementById('multi-tgl-bayar').value=today();
  document.getElementById('multi-ket').value='';
  switchModeTab('bulan');
  openMo('mo-multi-bayar');
  } catch(e){ toast('❌ Error: '+e.message); console.error(e); }
}

function updateMultiTotal(){
  let total=0;
  document.querySelectorAll('.multi-check:checked').forEach(c=>{ total+=parseInt(c.dataset.nom)||0; });
  document.getElementById('multi-total').value=fmtRp(total);
  document.querySelectorAll('.bulan-item').forEach(li=>{
    li.classList.toggle('checked',li.querySelector('.multi-check')?.checked);
  });
}

function formatMultiTotalInput(el){
  const n=parseInt(el.value.replace(/\D/g,''))||0;
  el.value=n>0?fmtRp(n):'';
}

async function prosesMultiBayar(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const checked=[...document.querySelectorAll('.multi-check:checked')].map(c=>({id:c.value,nom:parseInt(c.dataset.nom)||0}));
  if(!checked.length){ toast('⚠️ Pilih minimal satu bulan!'); return; }
  const tgl=document.getElementById('multi-tgl-bayar').value;
  const ket=document.getElementById('multi-ket').value.trim();
  if(!tgl){ toast('⚠️ Isi tanggal!'); return; }

  const totalTagihan=checked.reduce((a,c)=>a+c.nom,0);
  let bayarMasuk=parseInt(document.getElementById('multi-total').value.replace(/\D/g,''))||0;
  if(bayarMasuk<=0){ toast('⚠️ Isi nominal yang akan dibayar!'); return; }
  if(bayarMasuk>totalTagihan) bayarMasuk=totalTagihan;
  const isCicil=bayarMasuk<totalTagihan;

  // Alokasikan dari bulan terlama dulu (cicilan mengisi tagihan lama lebih dulu)
  const BULAN_ORDER=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const parseBulan=b=>{ const p=(b||'').split(' '); return parseInt(p[1]||0)*100+BULAN_ORDER.indexOf(p[0]); };
  const urut=[...checked].sort((a,b)=>{
    const ta=ALL_TAGIHAN.find(x=>String(x.id)===String(a.id))?.bulan||'';
    const tb=ALL_TAGIHAN.find(x=>String(x.id)===String(b.id))?.bulan||'';
    return parseBulan(ta)-parseBulan(tb);
  });

  let sisa=bayarMasuk, sukses=0;
  for(const {id,nom} of urut){
    if(sisa<=0) break;
    const t=ALL_TAGIHAN.find(x=>String(x.id)===String(id)); if(!t) continue;
    const bayarSekarang=Math.min(sisa,nom);
    const totalBayar=(Number(t.nominal_bayar||0))+bayarSekarang;
    const status=totalBayar>=Number(t.nominal)?'lunas':'cicil';
    const {error}=await SB.from('tagihan_pondok').update({
      nominal_bayar:totalBayar, status, tgl_bayar:tgl,
      keterangan:ket||null, dicatat_oleh:SESSION.nama||SESSION.username
    }).eq('id',id);
    if(!error){ sukses++; sisa-=bayarSekarang; }
  }
  toast(isCicil?`✅ ${fmtRp(bayarMasuk)} dialokasikan ke ${sukses} tagihan (cicilan)!`:`✅ ${sukses} tagihan berhasil!`);
  closeMo('mo-multi-bayar');
  await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable();

  } finally { setLoading(false, _lBtn); }
}

// ===== DEPOSIT =====
async function initDepositMode(){
  const santriId=MULTI_SANTRI_ID;
  let saldoDep=0;
  try {
    const {data:dep}=await SB.from('santri_deposit').select('*').eq('santri_id',santriId).maybeSingle();
    saldoDep=dep?Number(dep.saldo||0):0;
  } catch(e){ saldoDep=0; }
  const nomBulan=getNominalMakan()+getNominalListrik();

  const saldoEl=document.getElementById('deposit-saldo-ada');
  if(saldoDep>0){
    saldoEl.innerHTML=`<div class="success-box">${svgIcon('bank',13)} Saldo deposit saat ini: <strong>${fmtRp(saldoDep)}</strong> (~${Math.floor(saldoDep/nomBulan)} bulan)</div>`;
  } else {
    saldoEl.innerHTML=`<div class="info-box">Belum ada deposit. Tambah deposit sekarang.</div>`;
  }

  // Shortcut: 1,2,3,4,5,6 bulan
  const shortcuts=[1,2,3,4,5,6].map(n=>{
    const val=n*nomBulan;
    return `<button class="btn btn-o btn-xs" onclick="document.getElementById('deposit-nominal').value=${val};updateDepositInfo()">${n} bln (${fmtRp(val)})</button>`;
  }).join('');
  document.getElementById('deposit-shortcuts').innerHTML=shortcuts;
  document.getElementById('deposit-nominal').value='';
  document.getElementById('deposit-tgl').value=today();
  document.getElementById('deposit-ket').value='';
  document.getElementById('deposit-info').style.display='none';
}

function updateDepositInfo(){
  const nominal=parseInt(document.getElementById('deposit-nominal').value)||0;
  const nomBulan=getNominalMakan()+getNominalListrik();
  const bulan=Math.floor(nominal/nomBulan);
  const sisa=nominal%nomBulan;
  const infoEl=document.getElementById('deposit-info');
  const infoText=document.getElementById('deposit-info-text');
  if(nominal>0){
    infoEl.style.display='block';
    infoText.innerHTML=`${svgIcon('bank',13)} Deposit <strong>${fmtRp(nominal)}</strong> = <strong>${bulan} bulan</strong> tagihan${sisa>0?` + sisa ${fmtRp(sisa)}`:''}<br><small style="color:var(--text-m)">Otomatis terpotong saat generate tagihan berikutnya</small>`;
  } else infoEl.style.display='none';
}

async function prosesDeposit(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const santriId=MULTI_SANTRI_ID;
  const nominal=parseInt(document.getElementById('deposit-nominal').value)||0;
  const tgl=document.getElementById('deposit-tgl').value;
  const ket=document.getElementById('deposit-ket').value.trim();
  if(!nominal||nominal<=0){ toast('⚠️ Isi jumlah deposit!'); return; }
  if(!tgl){ toast('⚠️ Isi tanggal!'); return; }

  // Cek deposit existing
  let dep=null;
  try {
    const {data:d}=await SB.from('santri_deposit').select('*').eq('santri_id',santriId).maybeSingle();
    dep=d;
  } catch(e){ dep=null; }
  const saldoLama=dep?Number(dep.saldo||0):0;
  let saldoBaru=saldoLama+nominal;

  // Otomatis potong tunggakan yang ada
  const tagBelum=ALL_TAGIHAN.filter(t=>String(t.santri_id)===String(santriId)&&t.status!=='lunas')
    .sort((a,b)=>(a.bulan||'').localeCompare(b.bulan||'')); // urutkan dari bulan terlama

  let totalDipotong=0;
  for(const t of tagBelum){
    if(saldoBaru<=0) break;
    const sisa=Number(t.nominal)-Number(t.nominal_bayar||0);
    if(sisa<=0) continue;
    const bayarSekarang=Math.min(sisa, saldoBaru);
    const totalBayar=Number(t.nominal_bayar||0)+bayarSekarang;
    const status=totalBayar>=Number(t.nominal)?'lunas':'cicil';
    await SB.from('tagihan_pondok').update({
      nominal_bayar:totalBayar, status, tgl_bayar:tgl,
      keterangan:`Dari deposit${ket?' - '+ket:''}`,
      dicatat_oleh:SESSION.nama||SESSION.username
    }).eq('id',t.id);
    saldoBaru-=bayarSekarang;
    totalDipotong+=bayarSekarang;
  }

  // Simpan sisa deposit
  if(dep){
    await SB.from('santri_deposit').update({
      saldo:saldoBaru, tgl_terakhir:tgl,
      keterangan:ket||'Tambah deposit', dicatat_oleh:SESSION.nama||SESSION.username
    }).eq('id',dep.id);
  } else {
    await SB.from('santri_deposit').insert({
      santri_id:santriId, saldo:saldoBaru, tgl_terakhir:tgl,
      keterangan:ket||'Deposit awal', dicatat_oleh:SESSION.nama||SESSION.username
    });
  }

  let msg=`🏦 Deposit ${fmtRp(nominal)} berhasil!`;
  if(totalDipotong>0) msg+=` ${fmtRp(totalDipotong)} dipotong untuk tunggakan.`;
  if(saldoBaru>0) msg+=` Sisa deposit: ${fmtRp(saldoBaru)}.`;
  toast(msg);
  closeMo('mo-multi-bayar');
  await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable(); renderSantri();

  } finally { setLoading(false, _lBtn); }
}

async function hapusTagihan(id){
  if(_isLoading) return;
  konfirm('Hapus tagihan ini secara permanen?', async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    setLoading(true, _lBtn2, '🗑️ Menghapus Tagihan...', 'Mohon tunggu...');
    try {
      const {error}=await SB.from('tagihan_pondok').delete().eq('id', Number(id));
      if(error){ toast('❌ Gagal: '+error.message); return; }
      toast('🗑 Tagihan dihapus!');
      await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable(); renderRekap();
    } finally { setLoading(false, _lBtn2); }
  }, 'hapus');
}

async function hapusSemuaTagihan(){
  if(_isLoading) return;
  if(!isKangAdmin()){ toast('⛔ Hanya Admin!'); return; }
  const total = ALL_TAGIHAN.length;
  if(!total){ toast('ℹ️ Tidak ada tagihan!'); return; }
  konfirm(
    `Semua <strong>${total} tagihan</strong> dari semua bulan akan dihapus secara permanen dan tidak bisa dikembalikan.<br><br><span style="color:var(--red);font-weight:600">⚠️ Aksi ini tidak bisa dibatalkan!</span>`,
    async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    setLoading(true, _lBtn2);
    try {
      const {error}=await SB.from('tagihan_pondok').delete().neq('id',0);
      if(error){ toast('❌ Gagal: '+error.message); return; }
      toast('🗑 Semua tagihan dihapus!');
      await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable(); renderRekap();
    
    } finally { setLoading(false, _lBtn2); }}, 'hapus', 'HAPUS SEMUA');
}

// ===== HAPUS TAGIHAN MASSAL =====
function renderHapusPanel(){
  if(!isKangAdmin()) return;
  // Populate tahun
  const URUTAN_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tahunSet = new Set(ALL_TAGIHAN.map(t=>t.bulan).filter(Boolean).map(b=>b.split(' ')[1]).filter(Boolean));
  const tahunEl = document.getElementById('hapus-tahun');
  if(tahunEl){
    const cur = tahunEl.value;
    tahunEl.innerHTML = '<option value="">-- Pilih Tahun --</option>'
      + [...tahunSet].sort((a,b)=>parseInt(b)-parseInt(a)).map(t=>`<option value="${t}" ${cur===t?'selected':''}>${t}</option>`).join('');
  }
  // Populate asrama
  const asramaEl = document.getElementById('hapus-asrama-list');
  if(asramaEl){
    asramaEl.innerHTML = ALL_ASRAMA.map(a=>`
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;padding:4px 0">
        <input type="checkbox" name="hapus-asrama" value="${a.id}" onchange="updateHapusPreview()" style="accent-color:var(--red);width:16px;height:16px">
        <span style="display:inline-flex;align-items:center;gap:5px">${svgIcon('home',13)} ${a.nama}</span>
      </label>`).join('');
  }
  // Populate kelas
  const kelasSet = new Set(ALL_SANTRI.map(s=>s.kelas).filter(Boolean));
  const kelasSorted = [...kelasSet].sort((a,b)=>parseInt(a)-parseInt(b));
  const kelasEl = document.getElementById('hapus-kelas-list');
  if(kelasEl){
    kelasEl.innerHTML = kelasSorted.map(k=>`
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;background:#fff">
        <input type="checkbox" name="hapus-kelas" value="${k}" onchange="updateHapusPreview()" style="accent-color:var(--red);width:14px;height:14px">
        Kelas ${k}
      </label>`).join('');
  }
  updateHapusPreview();
}

function onHapusTahunChange(){
  const URUTAN_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function bulanOrder(b){ const [nm,thn]=b.split(' '); const bi=URUTAN_BULAN.indexOf(nm); return parseInt(thn||0)*12+(bi>=0?bi:99); }
  const tahun = document.getElementById('hapus-tahun')?.value||'';
  const bulanEl = document.getElementById('hapus-bulan');
  if(!bulanEl) return;
  const bulanSet = new Set(ALL_TAGIHAN.map(t=>t.bulan).filter(Boolean));
  let bulanList = [...bulanSet].sort((a,b)=>bulanOrder(a)-bulanOrder(b));
  if(tahun) bulanList = bulanList.filter(b=>b.endsWith(tahun));
  bulanEl.innerHTML = '<option value="">Semua Bulan</option>'
    + bulanList.map(b=>`<option value="${b}">${b}</option>`).join('');
  updateHapusPreview();
}

function toggleHapusSemuaAsrama(){
  const checks = document.querySelectorAll('input[name="hapus-asrama"]');
  const semuaTerpilih = [...checks].every(c=>c.checked);
  checks.forEach(c=>c.checked=!semuaTerpilih);
  const btn = document.getElementById('btn-hapus-pilih-asrama');
  if(btn) btn.textContent = semuaTerpilih ? '☐ Pilih Semua' : '✅ Batal Semua';
  updateHapusPreview();
}

function toggleHapusSemuaKelas(){
  const checks = document.querySelectorAll('input[name="hapus-kelas"]');
  const semuaTerpilih = [...checks].every(c=>c.checked);
  checks.forEach(c=>c.checked=!semuaTerpilih);
  const btn = document.getElementById('btn-hapus-pilih-kelas');
  if(btn) btn.textContent = semuaTerpilih ? '☐ Pilih Semua' : '✅ Batal Semua';
  updateHapusPreview();
}

function getHapusTargetIds(){
  const tahun = document.getElementById('hapus-tahun')?.value||'';
  const bulan = document.getElementById('hapus-bulan')?.value||'';
  const asramaIds = [...document.querySelectorAll('input[name="hapus-asrama"]:checked')].map(c=>c.value);
  const kelasList = [...document.querySelectorAll('input[name="hapus-kelas"]:checked')].map(c=>c.value);
  if(!tahun) return [];
  return ALL_TAGIHAN.filter(t=>{
    // Filter tahun
    if(!(t.bulan||'').endsWith(tahun)) return false;
    // Filter bulan
    if(bulan && (t.bulan||'')!==bulan) return false;
    // Filter asrama
    if(asramaIds.length){
      const s = getSantriById(t.santri_id)||{};
      if(!asramaIds.includes(String(s.kobong?.asrama_id||''))) return false;
    }
    // Filter kelas
    if(kelasList.length){
      const s = getSantriById(t.santri_id)||{};
      if(!kelasList.includes(s.kelas||'')) return false;
    }
    return true;
  }).map(t=>t.id);
}

function updateHapusPreview(){
  const tahun = document.getElementById('hapus-tahun')?.value||'';
  const prev = document.getElementById('hapus-preview');
  const btn = document.getElementById('btn-hapus-massal');
  if(!prev||!btn) return;
  if(!tahun){
    prev.style.display='none';
    btn.disabled=true; btn.style.opacity='.5';
    return;
  }
  const ids = getHapusTargetIds();
  const bulan = document.getElementById('hapus-bulan')?.value||'';
  const asramaIds = [...document.querySelectorAll('input[name="hapus-asrama"]:checked')].map(c=>c.value);
  const kelasList = [...document.querySelectorAll('input[name="hapus-kelas"]:checked')].map(c=>c.value);
  const asramaNama = asramaIds.length
    ? asramaIds.map(id=>ALL_ASRAMA.find(a=>String(a.id)===id)?.nama||id).join(', ')
    : 'Semua Asrama';
  const kelasNama = kelasList.length ? kelasList.map(k=>'Kelas '+k).join(', ') : 'Semua Kelas';
  // Breakdown status
  const tagihan = ALL_TAGIHAN.filter(t=>ids.includes(t.id));
  const lunas = tagihan.filter(t=>t.status==='lunas').length;
  const belum = tagihan.filter(t=>t.status==='belum').length;
  const cicil = tagihan.filter(t=>t.status==='cicil').length;
  if(ids.length===0){
    prev.style.display='block';
    prev.innerHTML=`<strong>Tidak ada tagihan</strong> yang cocok dengan filter ini.`;
    btn.disabled=true; btn.style.opacity='.5';
    return;
  }
  prev.style.display='block';
  prev.innerHTML=`
    <strong>${svgIcon('trash',13)} ${ids.length} tagihan</strong> akan dihapus:<br>
    ${svgIcon('calendar',12)} <strong>${bulan||'Semua bulan '+tahun}</strong> &nbsp;·&nbsp; ${svgIcon('home',12)} <strong>${asramaNama}</strong> &nbsp;·&nbsp; ${svgIcon('graduation-cap',12)} <strong>${kelasNama}</strong><br>
    <span style="font-size:12px;margin-top:4px;display:block">
      ✅ Lunas: ${lunas} &nbsp;|&nbsp; ❌ Belum: ${belum} &nbsp;|&nbsp; ⏳ Cicilan: ${cicil}
      ${lunas>0?`<br><span style="color:var(--red);font-weight:600">${svgIcon('alert-triangle',12)} Termasuk ${lunas} tagihan yang sudah lunas!</span>`:''}
    </span>`;
  btn.disabled=false; btn.style.opacity='1';
}

async function prosesHapusTagihanMassal(){
  if(_isLoading) return;
  if(!isKangAdmin()){ toast('⛔ Hanya Admin!'); return; }
  const ids = getHapusTargetIds();
  if(!ids.length){ toast('Tidak ada tagihan yang cocok!', false); return; }
  const tagihan = ALL_TAGIHAN.filter(t=>ids.includes(t.id));
  const lunas = tagihan.filter(t=>t.status==='lunas').length;
  const bulan = document.getElementById('hapus-bulan')?.value||'';
  const tahun = document.getElementById('hapus-tahun')?.value||'';
  konfirm(
    `Hapus <strong>${ids.length} tagihan</strong> (${bulan||'semua bulan '+tahun})?${lunas>0?`<br><span style="color:var(--red);font-weight:700">⚠️ Termasuk ${lunas} tagihan LUNAS!</span>`:''}<br><br>Aksi ini <strong>tidak bisa dibatalkan</strong>.`,
    async()=>{
      const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
      setLoading(true,_lBtn2);
      try{
        // Hapus per batch 100
        for(let i=0;i<ids.length;i+=100){
          const batch=ids.slice(i,i+100);
          const {error}=await SB.from('tagihan_pondok').delete().in('id',batch);
          if(error){ toast('❌ Gagal: '+error.message); return; }
        }
        toast(`🗑️ ${ids.length} tagihan berhasil dihapus!`);
        await loadAllData(); fillSelects(); renderDashboard(); renderTagihanTable();
        renderHapusPanel();
      }finally{ setLoading(false,_lBtn2); }
    }, 'hapus', 'HAPUS'
  );
}

function populateBulanMulai(selectedVal=''){
  const URUTAN_BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const el = document.getElementById('s-bulan-mulai');
  if(!el) return;
  const now = new Date();
  const thn = now.getFullYear();
  let opts = '<option value="">-- Dari awal / semua bulan --</option>';
  for(let y=thn;y>=thn-3;y--){
    URUTAN_BULAN.forEach(b=>{ opts+=`<option value="${b} ${y}" ${selectedVal===b+' '+y?'selected':''}>${b} ${y}</option>`; });
  }
  el.innerHTML = opts;
  if(selectedVal) el.value = selectedVal;
}

