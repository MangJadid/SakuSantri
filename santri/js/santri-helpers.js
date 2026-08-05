// ===== HELPER: PERSETUJUAN & RIWAYAT PERUBAHAN SANTRI =====
function _labelDapur(id){
  const map = {dapur_ummi:'Dapur Ummi', dapur_bibi:'Dapur Bibi', dapur_buonih:'Dapur Bu Onih'};
  return id ? (map[id]||id) : '—';
}
function _labelKobongAsrama(kobongId){
  const k = ALL_KOBONG.find(x=>x.id===kobongId);
  if(!k) return '—';
  const a = ALL_ASRAMA.find(x=>x.id===k.asrama_id);
  return `${k.nama}${a?.nama?' ('+a.nama+')':''}`;
}
function getAsramaIdBySantri(s){
  const k = ALL_KOBONG.find(x=>x.id===s.kobong_id);
  return k?.asrama_id || null;
}
// Field santri yang WAJIB persetujuan sekretaris jika diubah oleh pengurus
const SANTRI_FIELD_APPROVAL = {
  nama:      { label:'Nama',        get:v=>v||'—' },
  kelas:     { label:'Kelas',       get:v=>v||'—' },
  kobong_id: { label:'Kobong/Asrama', get:v=>_labelKobongAsrama(v) },
  dapur_id:  { label:'Dapur',       get:v=>_labelDapur(v) },
};
// Field santri lain yang boleh diubah langsung tapi tetap dicatat di riwayat
const SANTRI_FIELD_BEBAS = {
  no_wa:     { label:'No. WA',   get:v=>v||'—' },
  kecamatan: { label:'Kecamatan',get:v=>v||'—' },
  kota:      { label:'Kota',     get:v=>v||'—' },
  pin:       { label:'PIN',      get:v=>v||'—' },
  nisn:      { label:'NISN',     get:v=>v||'—' },
};
function getAllowedAsramaIdsApproval(){
  if(SESSION.role==='super') return null; // null = tidak difilter, lihat semua asrama
  const ids = JSON.parse(SESSION.user?.asrama_ids||'[]').map(x=>parseInt(x,10)).filter(x=>!isNaN(x));
  return ids;
}
// Bangun objek {field: {lama, baru, label}} dari dua snapshot santri untuk sekumpulan field
function _diffFields(fieldMap, lamaObj, baruObj){
  const out = {};
  Object.keys(fieldMap).forEach(f=>{
    const vl = lamaObj ? lamaObj[f] : undefined;
    const vb = baruObj ? baruObj[f] : undefined;
    if(String(vl??'') !== String(vb??'')){
      out[f] = { label:fieldMap[f].label, lama:fieldMap[f].get(vl), baru:fieldMap[f].get(vb) };
    }
  });
  return out;
}
// Catat satu baris riwayat perubahan santri (dipanggil setiap kali data santri benar-benar berubah di DB)
async function catatRiwayatSantri({santri_id, santri_nama, asrama_id, jenis, diffObj, sumber, permintaan_id, diajukan_oleh, diajukan_nama, alasan}){
  try{
    if(jenis==='edit' && (!diffObj || Object.keys(diffObj).length===0)) return; // tidak ada perubahan nyata
    await SB.from('riwayat_perubahan_santri').insert({
      santri_id: parseInt(String(santri_id),10),
      santri_nama,
      asrama_id: asrama_id||null,
      jenis,
      data_lama: diffObj ? Object.fromEntries(Object.entries(diffObj).map(([k,v])=>[k,v.lama])) : null,
      data_baru: diffObj ? Object.fromEntries(Object.entries(diffObj).map(([k,v])=>[k,v.baru])) : null,
      diubah_oleh: SESSION.user?.username||'',
      diubah_nama: SESSION.user?.nama||(SESSION.role==='super'?'Kang Admin':''),
      sumber: sumber||'langsung',
      permintaan_id: permintaan_id||null,
      diajukan_oleh: diajukan_oleh||null,
      diajukan_nama: diajukan_nama||null,
      alasan: alasan||null
    });
  } catch(e){ console.warn('Gagal catat riwayat:', e.message); }
}

// ===== TABEL SANTRI =====
// ===== BULK SELECT STATE =====
let _bulkSelected = new Set();
let _massalBusy = false; // lock double-click massal


// Cascading: Asrama → Kobong di filter santri
// ===== AKSES KOBONG BERDASARKAN ASRAMA (helper global) =====
// Mengembalikan daftar kobong yang boleh diakses user saat ini.
// Jika asramaId diisi, kobong difilter ke asrama tersebut juga.
function getKobongAccessible(asramaId){
  const isLimited = SESSION && (SESSION.role==='sekretariat' || SESSION.role==='sekretaris');
  const allowedAsramaIds = isLimited ? JSON.parse(SESSION.user?.asrama_ids||'[]').map(String) : null;
  let kobongs = asramaId
    ? ALL_KOBONG.filter(k=>String(k.asrama_id)===String(asramaId))
    : ALL_KOBONG;
  if(isLimited && allowedAsramaIds){
    kobongs = kobongs.filter(k=>allowedAsramaIds.includes(String(k.asrama_id)));
  }
  return kobongs;
}
function getAsramaAccessible(){
  const isLimited = SESSION && (SESSION.role==='sekretariat' || SESSION.role==='sekretaris');
  if(!isLimited) return ALL_ASRAMA;
  const allowedAsramaIds = JSON.parse(SESSION.user?.asrama_ids||'[]').map(String);
  return ALL_ASRAMA.filter(a=>allowedAsramaIds.includes(String(a.id)));
}

function onSantriAsramaChange(){
  const asramaId = document.getElementById('santri-asrama').value;
  const kobongSel = document.getElementById('santri-kobong');
  kobongSel.innerHTML = '<option value="">Semua Kobong</option>';
  getKobongAccessible(asramaId).forEach(k=>{ kobongSel.innerHTML+=`<option value="${k.id}">${k.nama}</option>`; });
  renderTabelSantri();
}

function onDashAsramaChange(){
  const asramaId = document.getElementById('dash-asrama').value;
  const kobongSel = document.getElementById('dash-kobong');
  if(kobongSel){
    kobongSel.innerHTML = '<option value="">Semua Kobong</option>';
    getKobongAccessible(asramaId).forEach(k=>{ kobongSel.innerHTML+=`<option value="${k.id}">${k.nama}</option>`; });
  }
  updateFBadge('dash',DASH_FILTER_IDS);
  renderDashboard();
}

function onRiwAsramaChange(){
  const asramaId = document.getElementById('riw-asrama').value;
  const kobongSel = document.getElementById('riw-kobong');
  if(kobongSel){
    kobongSel.innerHTML = '<option value="">Semua Kobong</option>';
    getKobongAccessible(asramaId).forEach(k=>{ kobongSel.innerHTML+=`<option value="${k.id}">${k.nama}</option>`; });
  }
  updateFBadge('riw',RIW_FILTER_IDS);
  renderRiwayat();
}

