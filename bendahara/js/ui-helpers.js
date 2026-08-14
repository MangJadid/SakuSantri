// ===== MODAL HELPERS =====
function openMo(id){ document.getElementById(id)?.classList.add('open'); }
function closeMo(id){ document.getElementById(id)?.classList.remove('open'); }

// ===== KONFIRM MODAL KUSTOM =====
let _konfirmFn = null;
function konfirm(msg, fn, tipe='hapus', inputKonfirm=null){
  const judul = document.getElementById('konfirm-judul');
  const wrap = document.getElementById('konfirm-msg-wrap');
  const ok = document.getElementById('konfirm-ok');
  const inputWrap = document.getElementById('konfirm-input-wrap');
  const inputEl = document.getElementById('konfirm-input');
  const inputLabel = document.getElementById('konfirm-input-label');

  if(tipe==='hapus'){
    judul.innerHTML=`${svgIcon('trash',18)} Konfirmasi Hapus`;
    ok.className='btn btn-d'; ok.textContent='Ya, Hapus';
    wrap.className='warn-box';
  } else if(tipe==='wa'){
    judul.innerHTML=`${svgIcon('smartphone',18)} Konfirmasi Kirim WA`;
    ok.className='btn btn-wa'; ok.textContent='Ya, Kirim';
    wrap.className='info-box';
  } else if(tipe==='generate'){
    judul.innerHTML=`${svgIcon('zap',18)} Konfirmasi Generate`;
    ok.className='btn btn-g'; ok.textContent='Ya, Generate';
    wrap.className='warn-box';
  } else if(tipe==='duplikat'){
    judul.innerHTML=`${svgIcon('alert-triangle',18)} Nama Serupa Ditemukan`;
    ok.className='btn btn-p'; ok.textContent='Tetap Tambahkan';
    wrap.className='warn-box';
  } else {
    judul.innerHTML=`${svgIcon('alert-triangle',18)} Konfirmasi`;
    ok.className='btn btn-g'; ok.textContent='Ya, Lanjutkan';
    wrap.className='warn-box';
  }
  judul.style.display='flex'; judul.style.alignItems='center'; judul.style.gap='8px';

  wrap.innerHTML = msg;

  if(inputKonfirm){
    inputWrap.style.display='block';
    inputLabel.textContent = `Ketik "${inputKonfirm}" untuk konfirmasi`;
    inputEl.value='';
    inputEl.dataset.required = inputKonfirm;
    ok.disabled=true; ok.style.opacity='.4';
  } else {
    inputWrap.style.display='none';
    ok.disabled=false; ok.style.opacity='';
  }

  _konfirmFn = fn;
  ok.onclick = async ()=>{
    closeMo('mo-konfirm');
    // Tampilkan loading overlay
    const overlay = document.getElementById('loading-overlay');
    if(overlay){ overlay.style.display='flex'; }
    const lt=document.getElementById('loading-title');
    if(lt) lt.textContent='Memproses...';
    const ls=document.getElementById('loading-subtitle');
    if(ls) ls.textContent='';
    try{
      await fn();
    } finally {
      if(overlay){ overlay.style.display='none'; }
    }
  };
  openMo('mo-konfirm');
}

function cekKonfirmInput(){
  const inputEl = document.getElementById('konfirm-input');
  const ok = document.getElementById('konfirm-ok');
  const match = inputEl.value === inputEl.dataset.required;
  ok.disabled = !match;
  ok.style.opacity = match ? '' : '.4';
}
document.querySelectorAll('.mo').forEach(m=>{ m.addEventListener('click',function(e){ if(e.target===this) this.classList.remove('open'); }); });

// ===== PROFIL PENGURUS =====
let _profilFotoFile = null;
let _profilFotoBase64 = null;
let _profilHapusFoto = false; // flag: user minta hapus foto

function bukaModalProfil(){
  const nama = SESSION?.nama || '';
  document.getElementById('profil-nama').value = nama;
  document.getElementById('profil-no-wa').value = SESSION?.no_wa||'';
  document.getElementById('profil-err').style.display = 'none';
  document.getElementById('profil-simpan-btn').disabled = false;
  _profilFotoFile = null; _profilFotoBase64 = null; _profilHapusFoto = false;

  // Tampilkan foto/inisial
  const foto = SESSION?.foto_url;
  const letter = (nama||'?')[0].toUpperCase();
  document.getElementById('profil-av-letter').textContent = letter;
  const imgEl = document.getElementById('profil-av-img');
  const hapusBtn = document.getElementById('profil-hapus-foto-btn');
  if(foto){
    imgEl.src = foto; imgEl.style.display = 'block';
    document.getElementById('profil-av-letter').style.display = 'none';
    hapusBtn.style.display = 'inline-flex';
  } else {
    imgEl.style.display = 'none'; imgEl.src = '';
    document.getElementById('profil-av-letter').style.display = '';
    hapusBtn.style.display = 'none';
  }
  openMo('mo-profil-pengurus');
}

function profilPreviewFoto(input){
  const file = input.files[0]; if(!file) return;
  _profilHapusFoto = false;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 400; let w = img.width, h = img.height;
      if(w > h){ if(w > MAX){ h = Math.round(h * MAX / w); w = MAX; } }
      else { if(h > MAX){ w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        _profilFotoFile = blob;
        _profilFotoBase64 = canvas.toDataURL('image/jpeg', .72);
        const imgEl = document.getElementById('profil-av-img');
        imgEl.src = _profilFotoBase64; imgEl.style.display = 'block';
        document.getElementById('profil-av-letter').style.display = 'none';
        document.getElementById('profil-hapus-foto-btn').style.display = 'inline-flex';
      }, 'image/jpeg', .72);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function profilHapusFoto(){
  _profilFotoFile = null; _profilFotoBase64 = null; _profilHapusFoto = true;
  document.getElementById('profil-av-img').style.display = 'none';
  document.getElementById('profil-av-img').src = '';
  document.getElementById('profil-av-letter').style.display = '';
  document.getElementById('profil-hapus-foto-btn').style.display = 'none';
  document.getElementById('profil-foto-input').value = '';
}

async function uploadFotoPengurus(penggunaId){
  if(!_profilFotoFile) return null;
  // Upload ke Cloudinary — tidak ada fallback, error langsung dilempar ke caller
  const CLOUD = 'dfj1eutgf'; const PRESET = 'santri_foto';
  const form = new FormData();
  form.append('file', _profilFotoFile);
  form.append('upload_preset', PRESET);
  form.append('folder', 'pengurus');
  form.append('public_id', `pengurus_${penggunaId}_${Date.now()}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method:'POST', body:form });
  if(!res.ok){
    const errBody = await res.text().catch(()=>'');
    throw new Error('Upload foto gagal (' + res.status + '): ' + errBody);
  }
  const r = await res.json();
  if(!r.secure_url) throw new Error('Upload foto gagal: URL tidak diterima dari Cloudinary');
  return r.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_400/');
}

async function simpanProfilPengurus(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  const errEl = document.getElementById('profil-err');
  errEl.style.display = 'none';
  const nama = document.getElementById('profil-nama').value.trim();
  const noWa = document.getElementById('profil-no-wa').value.trim().replace(/\D/g,'')||null;
  if(!nama){ errEl.textContent = '⚠️ Nama tidak boleh kosong!'; errEl.style.display = 'block'; return; }

  setLoading(true, _lBtn);
  const btn = document.getElementById('profil-simpan-btn');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';

  try {
    let fotoUrl = SESSION.foto_url || null;
    if(_profilHapusFoto) fotoUrl = null;
    else if(_profilFotoFile){
      const uploaded = await uploadFotoPengurus(SESSION.id || SESSION.username);
      if(uploaded) fotoUrl = uploaded;
    }

    if(SESSION.role === 'kangadmin'){
      await SB.from('settings').upsert([
        { key: 'super_nama', value: nama },
        { key: 'super_foto', value: fotoUrl || '' },
        { key: 'super_no_wa', value: noWa || '' }
      ]);
    } else {
      const upd = { nama_tampilan: nama, foto_url: fotoUrl, no_wa: noWa };
      const { error } = await SB.from('bendahara_users').update(upd).eq('id', SESSION.id);
      if(error){ errEl.textContent = '❌ Gagal menyimpan: ' + error.message; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = '✅ Simpan'; return; }
    }

    SESSION.nama = nama;
    SESSION.foto_url = fotoUrl;
    SESSION.no_wa = noWa;
    saveSession();

    updateHeaderProfilAv();
    renderGreetingBendahara();
    toast('✅ Profil berhasil diperbarui!');
    closeMo('mo-profil-pengurus');
  } catch(e){
    errEl.textContent = '❌ Terjadi kesalahan: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = '✅ Simpan';
    setLoading(false, _lBtn);
  }
}

function updateHeaderProfilAv(){
  const btn = document.getElementById('hbtn-profil');
  const avEl = document.getElementById('hdr-profil-av');
  if(!btn || !avEl) return;
  // Tampilkan hanya untuk pengelola (bukan kangadmin) atau semua, tergantung kebutuhan
  btn.style.display = 'inline-flex';
  const foto = SESSION?.foto_url;
  const nama = SESSION?.nama || SESSION?.username || '?';
  const inisial = nama.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  if(foto){
    avEl.innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    avEl.textContent = inisial;
  }
}

// ===== LOGOUT =====
function resetFiltersBendahara(){
  // Reset semua input filter
  [
    'cari-santri','cari-tagihan','cari-rekap','cari-riwayat','cari-tf',
    'filter-tgl-dari-tf','filter-tgl-sampai-tf'
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

  // Reset semua select filter
  [
    'filter-asrama-tagihan','filter-kobong-tagihan','filter-kelas-tagihan',
    'filter-bulan-tagihan','filter-tahun-tagihan','filter-status-tagihan',
    'filter-asrama-rekap','filter-kobong-rekap','filter-kelas-rekap',
    'filter-bulan-rekap','filter-tahun-rekap',
    'filter-asrama-santri','filter-kobong-santri','filter-kelas-santri',
    'filter-tahun-riwayat','filter-bulan-riwayat',
    'filter-tahun-tf','filter-bulan-tf','filter-piutang-status'
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}

function doLogout(){
  resetFiltersBendahara();
  if(SB && SB.auth) SB.auth.signOut().catch(()=>{});
  teardownRealtimeSync();
  clearSession(); SESSION=null;
  document.body.classList.remove('role-pengawas');
  if(MONITOR_INTERVAL){ clearInterval(MONITOR_INTERVAL); MONITOR_INTERVAL=null; }
  if(monitorRefreshInterval){ clearInterval(monitorRefreshInterval); monitorRefreshInterval=null; }
  document.getElementById('pg-app').style.display='none';
  document.getElementById('pg-login').style.display='flex';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('admin-user').value='';
  document.getElementById('admin-pass').value='';
  switchLoginTab('bend');
}

// ===== TOAST =====
let _pendingToast = null;
function toast(msg, show=true){
  // Jika overlay masih aktif, tunda toast sampai overlay hilang
  if(_isLoading){
    _pendingToast = msg;
    return;
  }
  _showToast(msg);
}
function _showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}
