// ===== PROFIL PENGURUS =====
let _profilFotoFile = null;
let _profilHapusFoto = false;

function updateHdrProfilAv(){
  const av = document.getElementById('hdr-profil-av');
  if(!av) return;
  const p = SESSION.user;
  if(p?.foto_url){
    const url = p._foto_cache || p.foto_url;
    av.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    av.textContent = avLetter(p?.nama||'P');
  }
}

function openProfilPengurus(){
  const p = SESSION.user;
  if(!p) return;
  document.getElementById('profil-nama').value = p.nama||'';
  document.getElementById('profil-no-wa').value = p.no_wa||'';
  _profilFotoFile = null;
  _profilHapusFoto = false;
  // Set preview foto
  const prev = document.getElementById('profil-foto-preview');
  const hapusBtn = document.getElementById('profil-hapus-foto-btn');
  if(p.foto_url){
    prev.innerHTML = `<img src="${p.foto_url}" style="width:100%;height:100%;object-fit:cover">`;
    hapusBtn.style.display='';
  } else {
    prev.innerHTML = avLetter(p.nama||'P');
    hapusBtn.style.display='none';
  }
  openMo('mo-profil');
}

function profilPreviewFoto(input){
  if(!input.files[0]) return;
  const file = input.files[0];
  _profilHapusFoto = false;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Kompres: max 400px, kualitas 72% — sama seperti foto santri
      const MAX = 400;
      let w = img.width, h = img.height;
      if(w > h){ if(w > MAX){ h = Math.round(h*MAX/w); w = MAX; } }
      else { if(h > MAX){ w = Math.round(w*MAX/h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        _profilFotoFile = blob;
        const prev = document.getElementById('profil-foto-preview');
        prev.innerHTML = `<img src="${canvas.toDataURL('image/jpeg',0.72)}" style="width:100%;height:100%;object-fit:cover">`;
        document.getElementById('profil-hapus-foto-btn').style.display='';
      }, 'image/jpeg', 0.72);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function profilHapusFoto(){
  _profilFotoFile = null;
  _profilHapusFoto = true;
  document.getElementById('profil-foto-preview').innerHTML = avLetter(SESSION.user?.nama||'P');
  document.getElementById('profil-hapus-foto-btn').style.display='none';
}

async function simpanProfilPengurus(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan profil...','Data profil sedang diperbarui.');
  setLoading(true, _lBtn);
  try {

  const nama = document.getElementById('profil-nama').value.trim();
  const noWa = document.getElementById('profil-no-wa').value.trim().replace(/\D/g,'');
  if(!nama){ toast('Nama tidak boleh kosong!',false); return; }

  const upd = { nama, no_wa: noWa||null };

  // Upload foto jika ada — pakai Cloudinary sama seperti foto santri
  if(_profilFotoFile){
    try{
      const CLOUD = 'dfj1eutgf'; const PRESET = 'santri_foto';
      const form = new FormData();
      form.append('file', _profilFotoFile);
      form.append('upload_preset', PRESET);
      form.append('folder', 'pengurus');
      form.append('public_id', `pengurus_${SESSION.user.id}_${Date.now()}`);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {method:'POST', body:form});
      if(!res.ok) throw new Error('Upload gagal');
      const r = await res.json();
      upd.foto_url = r.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_400/');
    }catch(e){
      console.error(e);
      toast('❌ Gagal upload foto, profil tidak disimpan: '+e.message, false);
      return;
    }
  } else if(_profilHapusFoto){
    upd.foto_url = null;
  }

  let saveError = null;
  const fotoVal = upd.foto_url !== undefined ? upd.foto_url : SESSION.user.foto_url;
  if(SESSION.role === 'super'){
    const profilJson = JSON.stringify({nama: upd.nama||SESSION.user.nama, foto_url: fotoVal, no_wa: upd.no_wa||SESSION.user.no_wa||''});
    const {error: e} = await SB.from('settings').upsert({key:'super_profil', value: profilJson}, {onConflict:'key'});
    saveError = e;
  } else {
    const {error: e} = await SB.from('pengurus').update(upd).eq('id', SESSION.user.id);
    saveError = e;
  }
  const error = saveError;
  if(error){ toast('Gagal simpan: '+error.message, false); return; }

  // Pakai langsung nilai yang baru kita simpan — jangan baca ulang dari DB,
  // supaya tidak ke-overwrite oleh data lama (mis. saat ada baris duplikat di settings)
  upd.foto_url = fotoVal;

  // Update SESSION lokal
  SESSION.user = {...SESSION.user, ...upd};
  // Update localStorage
  try{
    const keys = Object.keys(localStorage).filter(k=>k.startsWith('siujang_session'));
    keys.forEach(k=>{
      try{ const s=JSON.parse(localStorage.getItem(k)); if(s?.user?.id===SESSION.user.id){ s.user={...s.user,...upd}; localStorage.setItem(k,JSON.stringify(s)); } }catch(e){}
    });
  }catch(e){}

  // Update nama di header
  const roleLabels = {super:'👑 Kang Admin', pengurus:'👨\u200d💼 '+(SESSION.user?.nama||'Pengurus'), sekretaris:'📋 '+(SESSION.user?.nama||'Sekretaris'), sekretariat:'🏢 '+(SESSION.user?.nama||'Sekretariat')};
  document.getElementById('hdr-role').textContent = roleLabels[SESSION.role]||SESSION.role;
  // Update avatar foto di header dan greeting dashboard - bust cache dengan timestamp
  if(SESSION.user.foto_url){
    SESSION.user._foto_cache = SESSION.user.foto_url + '?t=' + Date.now();
  } else {
    SESSION.user._foto_cache = null;
  }
  updateHdrProfilAv();
  renderGreeting();

  toast('✅ Profil berhasil disimpan!');
  closeMo('mo-profil');

  } finally { setLoading(false, _lBtn); }
}

