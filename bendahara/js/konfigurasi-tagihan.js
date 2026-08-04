// ===== KONFIGURASI TAGIHAN PER ASRAMA =====
// Admin bisa tentukan jenis tagihan + nominal custom per asrama. Asrama yang
// tidak dikonfigurasi tetap pakai nominal Makan/Listrik global seperti biasa.

function getKonfigTagihanAsrama(asramaId){
  return ALL_KONFIG_TAGIHAN
    .filter(k=>String(k.asrama_id)===String(asramaId))
    .sort((a,b)=>(a.urutan||0)-(b.urutan||0));
}

function renderKonfigurasiTagihanPanel(){
  if(!isKangAdmin()) return;
  const sel=document.getElementById('konfig-asrama-select');
  if(!sel) return;
  const cur=sel.value;
  sel.innerHTML = ALL_ASRAMA.map(a=>`<option value="${a.id}" ${cur===String(a.id)?'selected':''}>🏛️ ${a.nama}</option>`).join('');
  if(!sel.value && ALL_ASRAMA.length) sel.value=String(ALL_ASRAMA[0].id);
  onKonfigAsramaChange();
}

function onKonfigAsramaChange(){
  const asramaId = document.getElementById('konfig-asrama-select')?.value;
  const rows = getKonfigTagihanAsrama(asramaId);
  const list = document.getElementById('konfig-rows-list');
  list.innerHTML='';
  const badge = document.getElementById('konfig-status-badge');
  if(rows.length){
    badge.innerHTML = `<span class="badge badge-lunas">✅ Konfigurasi khusus aktif (${rows.length} jenis)</span>`;
    rows.forEach(r=>konfigTambahBaris(r.jenis, r.nominal));
  } else {
    badge.innerHTML = `<span class="badge badge-belum">ℹ️ Belum ada konfigurasi — asrama ini pakai nominal Makan/Listrik global</span>`;
  }
}

function konfigTambahBaris(jenis='', nominal=''){
  const list=document.getElementById('konfig-rows-list');
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center';
  div.innerHTML=`
    <input type="text" placeholder="Jenis tagihan (mis. Uang Makan)" value="${jenis}"
      style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px"
      class="konfig-jenis">
    <input type="number" placeholder="Nominal" value="${nominal}"
      style="width:130px;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px"
      class="konfig-nominal">
    <button type="button" onclick="this.parentElement.remove()"
      style="background:#fee2e2;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;color:var(--red);font-size:14px">✕</button>
  `;
  list.appendChild(div);
}

function konfigIsiDariDefault(){
  konfigTambahBaris('Uang Makan', getNominalMakan()||380000);
  konfigTambahBaris('Uang Listrik', getNominalListrik()||40000);
}

function konfigBacaRowsDariForm(){
  return [...document.querySelectorAll('#konfig-rows-list > div')].map((div,i)=>({
    jenis: div.querySelector('.konfig-jenis')?.value?.trim()||'',
    nominal: parseInt(div.querySelector('.konfig-nominal')?.value)||0,
    urutan: i,
  })).filter(r=>r.jenis && r.nominal>0);
}

async function simpanKonfigurasiAsrama(){
  if(_isLoading) return;
  const asramaId=document.getElementById('konfig-asrama-select')?.value;
  if(!asramaId){ toast('⚠️ Pilih asrama dulu!'); return; }
  const rows=konfigBacaRowsDariForm();
  if(!rows.length){ toast('⚠️ Isi minimal satu jenis + nominal (atau pakai tombol Hapus Konfigurasi untuk kembali ke default)!'); return; }
  const _lBtn=document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true,_lBtn);
  try{
    const {error:delErr}=await SB.from('konfigurasi_tagihan_asrama').delete().eq('asrama_id',asramaId);
    if(delErr){ toast('❌ Gagal: '+delErr.message); return; }
    const toInsert=rows.map(r=>({asrama_id:Number(asramaId), jenis:r.jenis, nominal:r.nominal, urutan:r.urutan}));
    const {error:insErr}=await SB.from('konfigurasi_tagihan_asrama').insert(toInsert);
    if(insErr){ toast('❌ Gagal: '+insErr.message); return; }
    toast('✅ Konfigurasi tagihan asrama disimpan!');
    await loadAllData();
    renderKonfigurasiTagihanPanel();
  } finally { setLoading(false,_lBtn); }
}

function hapusKonfigurasiAsrama(){
  const asramaId=document.getElementById('konfig-asrama-select')?.value;
  if(!asramaId) return;
  konfirm('Hapus konfigurasi khusus asrama ini? Asrama akan kembali pakai nominal Makan/Listrik global.', async()=>{
    const {error}=await SB.from('konfigurasi_tagihan_asrama').delete().eq('asrama_id',asramaId);
    if(error){ toast('❌ Gagal: '+error.message); return; }
    toast('🗑 Konfigurasi dihapus, kembali ke default global.');
    await loadAllData();
    renderKonfigurasiTagihanPanel();
  }, 'hapus');
}

// ===== SHARED HELPER: dipakai oleh prosesGenerateTagihan() & _lanjutGenerate() =====
// Kalau asrama punya konfigurasi custom, pakai itu (rincian penuh). Kalau tidak,
// fallback ke nominal makan/listrik global persis seperti perilaku lama.
function buildTagihanBreakdown(asramaId, fallbackMakan, fallbackListrik){
  const konfig=getKonfigTagihanAsrama(asramaId);
  if(konfig.length){
    const rincian=konfig.map(k=>({jenis:k.jenis, nominal:Number(k.nominal)||0}));
    const nominal=rincian.reduce((s,r)=>s+r.nominal,0);
    const makanItem=rincian.find(r=>/makan/i.test(r.jenis));
    const listrikItem=rincian.find(r=>/listrik/i.test(r.jenis));
    return {
      rincian, nominal,
      nominal_makan: makanItem?makanItem.nominal:0,
      nominal_listrik: listrikItem?listrikItem.nominal:0,
    };
  }
  return {
    rincian:null,
    nominal:(fallbackMakan||0)+(fallbackListrik||0),
    nominal_makan:fallbackMakan||0,
    nominal_listrik:fallbackListrik||0,
  };
}
