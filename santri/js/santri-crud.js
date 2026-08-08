// ===== FOTO SANTRI =====
let fotoBase64 = null;

// fotoFile menyimpan File object yang sudah dikompres (blob), untuk upload ke Storage
let fotoFile = null;

function previewFoto(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Kompres: max 400px, kualitas 72%
      const MAX = 400;
      let w = img.width, h = img.height;
      if(w > h){ if(w > MAX){ h = Math.round(h*MAX/w); w = MAX; } }
      else { if(h > MAX){ w = Math.round(w*MAX/h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      // Simpan sebagai Blob untuk upload ke Storage
      canvas.toBlob(blob => {
        fotoFile = blob;
        fotoBase64 = canvas.toDataURL('image/jpeg', 0.72); // hanya untuk preview
        const prev = document.getElementById('foto-preview');
        prev.innerHTML = `<img src="${fotoBase64}" style="width:100%;height:100%;object-fit:cover">`;
        document.getElementById('hapus-foto-btn').style.display='inline-flex';
        const kb = Math.round(blob.size/1024);
        console.log('Foto dikompres: ~'+kb+' KB');
      }, 'image/jpeg', 0.72);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function hapusFoto(){
  fotoBase64 = null;
  fotoFile = null;
  document.getElementById('foto-preview').innerHTML = svgIcon('person',24);
  document.getElementById('s-foto').value = '';
  document.getElementById('hapus-foto-btn').style.display='none';
}

function setFotoPreview(url){
  fotoBase64 = url||null;
  const prev = document.getElementById('foto-preview');
  if(url){
    prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
    document.getElementById('hapus-foto-btn').style.display='inline-flex';
  } else {
    prev.innerHTML = svgIcon('person',24);
    document.getElementById('hapus-foto-btn').style.display='none';
  }
}

// ===== UPLOAD FOTO KE SUPABASE STORAGE =====
async function uploadFotoStorage(santriId){
  if(!fotoFile) return null;
  // Upload ke Cloudinary — tidak ada fallback, error langsung dilempar ke caller
  const CLOUD_NAME = 'dfj1eutgf';
  const UPLOAD_PRESET = 'santri_foto';
  const formData = new FormData();
  formData.append('file', fotoFile);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'santri');
  formData.append('public_id', `santri_${santriId}_${Date.now()}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if(!res.ok){
    const errBody = await res.text().catch(()=>'');
    throw new Error('Upload foto gagal (' + res.status + '): ' + errBody);
  }
  const result = await res.json();
  if(!result.secure_url) throw new Error('Upload foto gagal: URL tidak diterima dari Cloudinary');

  // f_auto = format otomatis, q_auto = kualitas otomatis, w_400 = max width 400px
  return result.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_400/');
}

// ===== TAMBAH/EDIT SANTRI =====
function populateAsramaSantri(){
  const sAsrama = document.getElementById('s-asrama');
  if(!sAsrama) return;
  const cur = sAsrama.value;
  sAsrama.innerHTML='<option value="">-- Pilih Asrama --</option>';
  let allowed = (SESSION.role==='sekretariat'||SESSION.role==='sekretaris')
    ? ALL_ASRAMA.filter(a=>JSON.parse(SESSION.user?.asrama_ids||'[]').map(String).includes(String(a.id)))
    : ALL_ASRAMA;
  allowed.forEach(a=>{
    const jk = a.jenis_kelamin;
    const badge = jk==='puteri'?'👧':jk==='putera'?'🧒':'⚠️';
    const warn = !jk ? ' (belum diset)' : '';
    sAsrama.innerHTML+=`<option value="${a.id}">${badge} ${a.nama}${warn}</option>`;
  });
  if(cur) sAsrama.value = cur;
}

function openModalTambahSantri(){
  document.getElementById('mo-santri-title').textContent='Tambah Santri Baru';
  _waliManualDipilih = false;
  const infoPersetujuan = document.getElementById('s-info-persetujuan');
  if(infoPersetujuan) infoPersetujuan.style.display = 'none';
  document.getElementById('edit-santri-id').value='';
  document.getElementById('s-nama').value='';
  document.getElementById('s-pin').value='1234';
  document.getElementById('s-kelas').value='';
  document.getElementById('s-nisn').value='';
  document.getElementById('s-no-wa').value='';
  document.getElementById('s-kecamatan').value='';
  document.getElementById('s-kota').value='';
  document.getElementById('s-dapur').innerHTML='<option value="">-- Pilih Dapur --</option>';
  document.getElementById('s-jenis-kelamin').value='';
  document.getElementById('jk-display-text').textContent='— otomatis dari asrama —';
  document.getElementById('jk-display-text').style.color='var(--text-l)';
  document.getElementById('jk-display-text').style.fontStyle='italic';
  hapusFoto();
  refreshWaliKobongDropdown();
  populateAsramaSantri();
  // Reset asrama ke kosong — pastikan tidak ada sisa pilihan sebelumnya
  document.getElementById('s-asrama').value='';
  document.getElementById('s-kobong').innerHTML='<option value="">-- Pilih Kobong (opsional) --</option>';
  // Reset jk display
  const jkDisplay = document.getElementById('jk-display');
  if(jkDisplay){ jkDisplay.style.background='#f8f8f8'; jkDisplay.style.borderColor='var(--border)'; }
  openMo('mo-santri');
}

function editSantri(id){
  const s=ALL_SANTRI.find(x=>x.id===id);
  if(!s) return;
  document.getElementById('mo-santri-title').textContent='Edit Santri';
  const infoPersetujuan = document.getElementById('s-info-persetujuan');
  if(infoPersetujuan) infoPersetujuan.style.display = SESSION.role==='pengurus' ? 'block' : 'none';
  document.getElementById('edit-santri-id').value=id;
  document.getElementById('s-nama').value=s.nama;
  document.getElementById('s-pin').value=s.pin;
  document.getElementById('s-kelas').value=s.kelas||'';
  document.getElementById('s-nisn').value=s.nisn||'';
  document.getElementById('s-no-wa').value=s.no_wa||'';
  document.getElementById('s-kecamatan').value=s.kecamatan||'';
  document.getElementById('s-kota').value=s.kota||'';
  setFotoPreview(s.foto_url||null);

  // Populate asrama, then set kobong cascade
  populateAsramaSantri();
  // Find asrama for this santri's kobong
  const kobong = ALL_KOBONG.find(k=>k.id===s.kobong_id);
  const asramaId = kobong?.asrama_id || s.asrama_id || null;
  if(asramaId){
    document.getElementById('s-asrama').value = asramaId;
  } else {
    document.getElementById('s-asrama').value = '';
  }
  onAsramaChange();
  // Set kobong value setelah cascade
  if(s.kobong_id) document.getElementById('s-kobong').value = s.kobong_id;
  else document.getElementById('s-kobong').value = '__belum__';
  // Set gender display dari asrama
  const asrId = document.getElementById('s-asrama').value;
  const asrObj = ALL_ASRAMA.find(a=>String(a.id)===String(asrId));
  document.getElementById('s-jenis-kelamin').value = asrObj?.jenis_kelamin||s.jenis_kelamin||'';
  // Set dapur after asrama change populates the dropdown
  if(s.dapur_id) document.getElementById('s-dapur').value=s.dapur_id||'';

  // Tampilkan & isi field Wali Santri/Pengurus (super + sekretaris/sekretariat)
  _waliManualDipilih = true; // di mode edit, jangan auto-override — tampilkan wali yang sudah ada
  refreshWaliKobongDropdown();
  const selWali = document.getElementById('s-created-by');
  if(selWali){
    // Pastikan wali existing tetap muncul di list meski di luar filter asrama kobong saat ini
    if(s.created_by && !selWali.querySelector(`option[value="${s.created_by}"]`)){
      const p = ALL_PENGURUS.find(x=>x.username===s.created_by);
      selWali.innerHTML += `<option value="${s.created_by}">${p?.nama||s.created_by} (@${s.created_by})</option>`;
    }
    selWali.value = s.created_by||'';
  }
  openMo('mo-santri');
}

async function simpanSantri(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan data santri...','Data santri sedang disimpan ke server.');
  setLoading(true, _lBtn);
  try {

  const id=document.getElementById('edit-santri-id').value;
  const nama=document.getElementById('s-nama').value.trim();
  const asrama_id = document.getElementById('s-asrama').value;
  const kobongVal = document.getElementById('s-kobong').value;
  const jenis_kelamin = document.getElementById('s-jenis-kelamin').value || 'putera';

  // Resolve kobong_id: jika belum ditentukan atau kosong, cari kobong "Belum Ditentukan" di asrama
  let kobong_id = null;
  if(kobongVal && kobongVal !== '__belum__'){
    kobong_id = parseInt(kobongVal)||null;
  } else if(asrama_id){
    // Cari kobong bernama "Belum Ditentukan" di asrama ini
    const belum = ALL_KOBONG.find(k=>String(k.asrama_id)===String(asrama_id)&&k.nama.toLowerCase().includes('belum'));
    if(belum) kobong_id = belum.id;
    else {
      // Buat otomatis jika belum ada — simpan dulu tanpa kobong, lalu update
      // Untuk sekarang tolak dan minta user set kobong atau buat kobong Belum Ditentukan
      toast('Pilih kobong, atau buat kobong "Belum Ditentukan" di asrama ini dulu!',false);
      setLoading(false,_lBtn); return;
    }
  }

  const pin=document.getElementById('s-pin').value.trim()||'1234';
  const kelas=document.getElementById('s-kelas').value.trim();
  const nisn=document.getElementById('s-nisn').value.trim();
  const dapur_id=document.getElementById('s-dapur').value||null;
  const no_wa=document.getElementById('s-no-wa').value.trim().replace(/\D/g,'');
  const kecamatan=document.getElementById('s-kecamatan').value.trim();
  const kota=document.getElementById('s-kota').value.trim();
  if(!nama){ toast('Nama santri wajib diisi!',false); return; }
  if(!asrama_id){ toast('Pilih asrama dulu!',false); return; }

  if(id){
    // === MODE EDIT ===
    const sLama = ALL_SANTRI.find(x=>String(x.id)===String(id));
    // Hitung saldo aktual dari semua transaksi (tidak boleh diubah lewat form)
    const {data:semuaTx} = await SB.from('transaksi').select('jenis,nominal').eq('santri_id', id);
    const saldoBenar = (semuaTx||[]).reduce((tot,t) => tot + (t.jenis==='masuk'?t.nominal:-t.nominal), 0);

    const newVals = {nama,kelas,kobong_id,dapur_id,no_wa:no_wa||null,kecamatan:kecamatan||null,kota:kota||null,pin,nisn:nisn||null};
    const isPengurus = SESSION.role==='pengurus';
    const diffApproval = sLama ? _diffFields(SANTRI_FIELD_APPROVAL, sLama, newVals) : {};
    const butuhPersetujuan = isPengurus && Object.keys(diffApproval).length>0;

    // Upload/hapus foto (dipakai baik jalur langsung maupun field bebas saat ada permintaan)
    let fotoUrlBaru; // undefined = tidak berubah
    if(fotoFile){
      try{
        fotoUrlBaru = await uploadFotoStorage(parseInt(id));
      } catch(e){
        toast('❌ Gagal upload foto: ' + e.message, false);
        return;
      }
    } else if(fotoBase64 === null){
      fotoUrlBaru = null; // foto dihapus
    }

    if(butuhPersetujuan){
      // Field terkunci (nama/kelas/kobong/dapur) TIDAK langsung tersimpan — diajukan dulu ke sekretaris asrama terkait
      const updBebas = {saldo:saldoBenar, pin, no_wa:no_wa||null, kecamatan:kecamatan||null, kota:kota||null, nisn:nisn||null};
      if(fotoUrlBaru!==undefined) updBebas.foto_url = fotoUrlBaru;
      const {error:errBebas} = await SB.from('santri').update(updBebas).eq('id',id);
      if(errBebas){ toast('Gagal: '+errBebas.message,false); return; }
      const diffBebas = _diffFields(SANTRI_FIELD_BEBAS, sLama, newVals);
      if(Object.keys(diffBebas).length){
        await catatRiwayatSantri({santri_id:id, santri_nama:sLama.nama, asrama_id:getAsramaIdBySantri(sLama), jenis:'edit', diffObj:diffBebas, sumber:'langsung'});
      }
      const {error:errReq} = await SB.from('permintaan_perubahan_santri').insert({
        santri_id: parseInt(String(id),10),
        santri_nama: sLama.nama,
        asrama_id: getAsramaIdBySantri(sLama),
        jenis: 'edit',
        data_lama: Object.fromEntries(Object.entries(diffApproval).map(([k,v])=>[k,v.lama])),
        data_baru: Object.fromEntries(Object.entries(diffApproval).map(([k,v])=>[k,v.baru])),
        diajukan_oleh: SESSION.user?.username||'',
        diajukan_nama: SESSION.user?.nama||'',
        status: 'pending'
      });
      if(errReq){ toast('Gagal ajukan perubahan: '+errReq.message,false); return; }
      toast('📝 Perubahan '+Object.values(diffApproval).map(v=>v.label).join(', ')+' diajukan, menunggu persetujuan sekretaris!');
      await updateBadgePersetujuan();
    } else {
      const upd={nama,kobong_id,saldo:saldoBenar,pin,kelas,catatan:kelas,dapur_id,no_wa:no_wa||null,kecamatan:kecamatan||null,kota:kota||null,jenis_kelamin,nisn:nisn||null};
      if(fotoUrlBaru!==undefined) upd.foto_url = fotoUrlBaru;
      // Super/sekretaris/sekretariat bisa ubah wali kobong (created_by)
      let waliBaru = null, waliBerubah = false;
      if(SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat'){
        const cb = document.getElementById('s-created-by')?.value||'';
        waliBaru = cb || 'kangadmin';
        upd.created_by = waliBaru;
        waliBerubah = (sLama?.created_by||'kangadmin') !== waliBaru;
      }
      const {error}=await SB.from('santri').update(upd).eq('id',id);
      if(error){ toast('Gagal: '+error.message,false); return; }
      toast('Data santri diperbarui!');
      if(sLama){
        const diffSemua = {..._diffFields(SANTRI_FIELD_APPROVAL, sLama, newVals), ..._diffFields(SANTRI_FIELD_BEBAS, sLama, newVals)};
        if(waliBerubah){
          const namaLabel = (u)=> u==='kangadmin' || !u ? 'Kang Admin' : (ALL_PENGURUS.find(p=>p.username===u)?.nama || u);
          diffSemua.created_by = { label:'Wali Santri/Pengurus', lama:namaLabel(sLama?.created_by), baru:namaLabel(waliBaru) };
        }
        await catatRiwayatSantri({santri_id:id, santri_nama:nama, asrama_id:getAsramaIdBySantri({kobong_id})||getAsramaIdBySantri(sLama), jenis:'edit', diffObj:diffSemua, sumber:'langsung'});
      }
    }
  } else {
    // Wali: kalau super/sekretaris/sekretariat pilih dari dropdown, kalau pengurus selalu kangadmin
    const bisaPilihWali = SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat';
    const created_by = bisaPilihWali ? (document.getElementById('s-created-by')?.value || 'kangadmin') : 'kangadmin';

    // ===== CEK DUPLIKAT NAMA (SEMUA DATABASE) =====
    function normalize(s){ return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim(); }
    function levenshtein(a,b){
      const m=a.length,n=b.length;
      const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
      for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
        dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
      return dp[m][n];
    }
    const namaInput = normalize(nama);
    const mirip = ALL_SANTRI.filter(s=>{
      const namaDb = normalize(s.nama);
      if(namaDb===namaInput) return true;
      if(namaInput.length>=4 && levenshtein(namaInput,namaDb)<=2) return true;
      const wi=namaInput.split(' '), wd=namaDb.split(' ');
      let cocok=0;
      wi.forEach(a=>{ if(a.length<=2) return; wd.forEach(b=>{ if(b.length<=2) return; if(a===b||levenshtein(a,b)<=1) cocok++; }); });
      return cocok>=2;
    });

    if(mirip.length>0){
      const isSuperOrSekretaris = SESSION.role==='super'||SESSION.role==='sekretaris'||SESSION.role==='sekretariat';
      const isPengurus = SESSION.role==='pengurus';

      // Cek apakah ada yang PERSIS sama (bukan sekedar mirip)
      const adaPersis = mirip.some(s=>normalize(s.nama)===namaInput);

      const daftarHtml = mirip.map(s=>{
        const kn = s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
        const wali = isSuperOrSekretaris ? `· Wali: ${s.created_by||'—'}` : '';
        const isPersis = normalize(s.nama)===namaInput;
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:${isPersis?'#fff1f1':'var(--gold-p)'};border:1.5px solid ${isPersis?'#fca5a5':'var(--gold-b)'};border-radius:9px;margin-bottom:7px">
          <div style="width:36px;height:36px;border-radius:50%;background:${isPersis?'#ef4444':'var(--gold)'};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:15px;flex-shrink:0">${(s.nama||'?')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px;color:var(--text)">${s.nama} ${isPersis?'<span style="font-size:10px;background:#ef4444;color:#fff;border-radius:4px;padding:1px 5px">SAMA PERSIS</span>':''}</div>
            <div style="font-size:11px;color:var(--text-m)">🏠 ${kn} ${s.kelas?'· Kelas '+s.kelas:''} ${wali}</div>
          </div>
        </div>`;
      }).join('');

      const pesanPengurus = `<div style="margin-bottom:10px;font-size:13px;color:var(--text)">Ditemukan santri dengan nama serupa di database:</div>
        ${daftarHtml}
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;margin-top:8px">
          ⚠️ Santri di atas mungkin adalah santri yang sama.<br>
          Jika yakin berbeda, silakan lanjutkan — atau <strong>hubungi Admin/Kang Admin</strong> untuk mengonfirmasi data terlebih dahulu.
        </div>`;

      const pesanAdmin = `<div style="margin-bottom:10px;font-size:13px;color:var(--text)">Ditemukan santri dengan nama serupa di database:</div>
        ${daftarHtml}
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;margin-top:8px">
          ${adaPersis ? '🔴 Ada nama yang <strong>sama persis</strong>! Pastikan ini bukan data duplikat.' : '⚠️ Nama mirip ditemukan. Pastikan bukan data duplikat sebelum melanjutkan.'}
        </div>`;

      const pesan = isPengurus ? pesanPengurus : pesanAdmin;

      setLoading(false, _lBtn);
      konfirm(pesan, async()=>{
        setLoading(true, _lBtn);
        try {
          const {data:newSantri,error}=await SB.from('santri').insert({nama,kobong_id,saldo:0,pin,kelas,catatan:kelas,dapur_id,no_wa:no_wa||null,kecamatan:kecamatan||null,kota:kota||null,created_by,jenis_kelamin,nisn:nisn||null}).select().single();
          if(error){ toast('Gagal: '+error.message,false); return; }
          await _catatRiwayatTambah(newSantri);
          if(fotoFile){
            try{
              const url=await uploadFotoStorage(newSantri.id);
              await SB.from('santri').update({foto_url:url}).eq('id',newSantri.id);
            } catch(e){
              toast('⚠️ Santri tersimpan tapi foto gagal diupload: '+e.message, false);
            }
          }
          toast('Santri berhasil ditambahkan!');
          closeMo('mo-santri'); hapusFoto(); fotoFile=null;
          await loadAllData(); await loadSantriNames();
          renderTabelSantri(); renderDashboard(); updateNotif();
        } finally { setLoading(false, _lBtn); }
      }, 'duplikat');
      return;
    }
    // ===== END CEK DUPLIKAT =====

    // Saldo selalu mulai dari 0, diisi lewat transaksi
    const {data:newSantri, error}=await SB.from('santri').insert({nama,kobong_id,saldo:0,pin,kelas,catatan:kelas,dapur_id,no_wa:no_wa||null,kecamatan:kecamatan||null,kota:kota||null,created_by,jenis_kelamin,nisn:nisn||null}).select().single();
    if(error){ toast('Gagal: '+error.message,false); return; }
    await _catatRiwayatTambah(newSantri);

    // Upload foto jika ada
    if(fotoFile){
      try{
        const url = await uploadFotoStorage(newSantri.id);
        await SB.from('santri').update({foto_url:url}).eq('id',newSantri.id);
      } catch(e){
        toast('⚠️ Santri tersimpan tapi foto gagal diupload: '+e.message, false);
      }
    }
    toast('Santri berhasil ditambahkan!');
  }
  closeMo('mo-santri');
  hapusFoto();
  fotoFile = null;
  try {
    await loadAllData();
  } catch(errLoad) {
    toast('Santri tersimpan, tapi gagal muat ulang data terbaru: '+(errLoad?.message||errLoad), false);
  }
  await loadSantriNames();
  renderTabelSantri();
  renderDashboard();
  updateNotif();

  } finally { setLoading(false, _lBtn); }
}

async function hapusSantri(id){
  if(_isLoading) return;
  const s = ALL_SANTRI.find(x=>x.id===id);
  if(!s) return;

  // Pengurus: ajukan permintaan hapus ke sekretaris asrama terkait
  if(SESSION.role==='pengurus'){
    document.getElementById('req-hapus-santri-id').value = id;
    const k = s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    document.getElementById('req-hapus-santri-info').innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av" style="background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
        <div><strong>${s.nama}</strong><div style="font-size:12px;color:var(--text-m)">🏠 ${k}${s.kelas?' · Kelas '+s.kelas:''}</div></div>
      </div>`;
    document.getElementById('req-hapus-alasan').value = '';
    openMo('mo-req-hapus');
    return;
  }

  // Super/sekretariat/sekretaris: hapus langsung
  try {
  konfirm(`Hapus santri <strong>${s?.nama}</strong>? Semua transaksinya juga akan dihapus!`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menghapus santri...','Data santri sedang dihapus dari server.');
    setLoading(true, _lBtn2);
    try {
    const {error: errDel} = await SB.from('santri').delete().eq('id', parseInt(String(id), 10));
    if(errDel){ toast('Gagal hapus santri: '+errDel.message, false); return; }
    await catatRiwayatSantri({santri_id:id, santri_nama:s.nama, asrama_id:getAsramaIdBySantri(s), jenis:'hapus', diffObj:null, sumber:'langsung'});
    toast('Santri dihapus');
    await loadAllData();
    renderTabelSantri();
    renderDashboard();
    } finally { setLoading(false, _lBtn2); }});
  } finally { setLoading(false, null); }
}

