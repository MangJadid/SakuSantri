// ===== POSTER: upload & atur poster (Kang Admin + sekretaris), kategori khusus Kang Admin =====
// Tampilannya (slider beranda & galeri) ada di shared/poster.js -- file ini cuma pengelolaannya.
// Sekretaris cuma lihat/ubah poster miliknya sendiri; Kang Admin bisa semua.

let _posterBlob = null, _posterKecil = null, _posterEditId = null;

// Gambar disimpan di Supabase Storage (bucket `fotos` yang sudah ada, folder poster/)
// dalam 2 ukuran: _besar.jpg (layar penuh) & _kecil.jpg (slider/galeri) -- Supabase gratis
// gak bisa resize otomatis kayak Cloudinary, jadi diperkecil di HP sebelum upload.
const BUCKET_POSTER = 'fotos';

async function uploadGambarPoster(){
  const nama = `poster/${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const st = SB.storage.from(BUCKET_POSTER);
  const opsi = {contentType:'image/jpeg', cacheControl:'31536000', upsert:false}; // nama file unik -> aman di-cache lama
  const [a, b] = await Promise.all([st.upload(nama+'_besar.jpg', _posterBlob, opsi), st.upload(nama+'_kecil.jpg', _posterKecil, opsi)]);
  if(a.error || b.error){
    st.remove([nama+'_besar.jpg', nama+'_kecil.jpg']).catch(()=>{});
    throw a.error || b.error;
  }
  return st.getPublicUrl(nama+'_besar.jpg').data.publicUrl;
}

// Hapus kedua ukuran file dari storage -- gagal pun gak apa-apa (posternya sudah hilang dari DB)
function hapusFilePoster(url){
  const m = String(url||'').match(/(poster\/[A-Za-z0-9_-]+)_besar\.jpg/);
  if(m) SB.storage.from(BUCKET_POSTER).remove([m[1]+'_besar.jpg', m[1]+'_kecil.jpg']).catch(()=>{});
}

function kompresGambarPoster(img, max, kualitas){
  const skala = Math.min(1, max/Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width*skala); canvas.height = Math.round(img.height*skala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); // PNG transparan jangan jadi hitam
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, gagal)=>canvas.toBlob(b=>b ? ok(b) : gagal(new Error('Gagal memproses gambar')), 'image/jpeg', kualitas));
}

function bolehKelolaPoster(){ return ['super','sekretaris','sekretariat'].includes(SESSION?.role); }
function usernamePoster(){ return SESSION?.user?.username || SESSION?.role || ''; }

function statusPosterHtml(p){
  if(!p.tampil_sampai) return '<span style="color:var(--green-l)">Tampil terus</span>';
  const habis = String(p.tampil_sampai).slice(0,10) < hariIniPoster();
  return habis
    ? `<span style="color:var(--red)">Berakhir ${fmtTglPoster(p.tampil_sampai)}</span>`
    : `<span style="color:var(--green-l)">Sampai ${fmtTglPoster(p.tampil_sampai)}</span>`;
}

async function renderPosterAdmin(){
  const sec = document.getElementById('sec-poster');
  if(!sec || !bolehKelolaPoster()) return;
  if(!sec.innerHTML) sec.innerHTML = '<div class="empty"><p>Memuat poster...</p></div>';
  const data = await muatPoster(true);
  const isSuper = SESSION.role==='super';
  const daftar = isSuper ? data.semua : data.semua.filter(p=>p.dibuat_oleh===usernamePoster());
  const opsiKat = data.kategori.map(k=>`<option value="${k.id}">${escPoster(k.nama)}</option>`).join('');

  sec.innerHTML = `
    <div class="panel"><div class="ph"><h2>${svgIcon('upload',16)} <span id="pst-form-judul">Upload Poster</span></h2></div><div class="pb">
      <div class="info-box" style="margin-bottom:14px">Poster tampil di slider <strong>Poster &amp; Info</strong> di beranda Saku Santri &amp; Bendahara, untuk semua pengguna. Ukuran terbaik: tegak 4:5 (mis. 1080×1350), seperti poster Instagram.</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
        <label for="pst-file" id="pst-preview" style="width:132px;aspect-ratio:4/5;border:1.5px dashed var(--green-b);border-radius:12px;background:var(--green-p);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;overflow:hidden;flex-shrink:0;font-size:12px;color:var(--text-m);text-align:center">${svgIcon('image',22)}<span>Pilih gambar</span></label>
        <input type="file" id="pst-file" accept="image/*" onchange="pilihGambarPoster(this)" style="position:absolute;width:1px;height:1px;opacity:0">
        <div style="flex:1 1 220px;min-width:0">
          <div class="fg" style="margin-bottom:12px"><label for="pst-judul">Judul</label><input type="text" id="pst-judul" maxlength="80" placeholder="mis. Jadwal Libur Maulid"></div>
          <div class="fg" style="margin-bottom:12px"><label for="pst-kategori">Kategori</label><select id="pst-kategori"><option value="">Lainnya (tanpa kategori)</option>${opsiKat}</select></div>
          <div class="fg" style="margin-bottom:6px"><label for="pst-sampai">Tampil sampai <span style="font-weight:400;text-transform:none">(opsional)</span></label><input type="date" id="pst-sampai" min="${hariIniPoster()}"></div>
          <div style="font-size:12px;color:var(--text-l);margin-bottom:14px">Kosongkan kalau poster tampil terus sampai dihapus.</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-p" onclick="simpanPoster()">${svgIcon('save',14)} <span id="pst-btn-simpan">Upload Poster</span></button>
            <button class="btn btn-o" id="pst-btn-batal" onclick="batalEditPoster()" style="display:none">Batal</button>
          </div>
        </div>
      </div>
    </div></div>

    ${isSuper ? `<div class="panel"><div class="ph"><h2>${svgIcon('sliders',16)} Kategori</h2></div><div class="pb">
      <div style="font-size:12.5px;color:var(--text-m);margin-bottom:12px">Hanya Kang Admin yang bisa mengatur kategori. Poster di kategori yang dihapus pindah ke <strong>Lainnya</strong>.</div>
      ${data.kategori.map(k=>`<div style="display:flex;gap:8px;margin-bottom:8px">
        <input type="text" id="pst-kat-${k.id}" value="${escPoster(k.nama)}" maxlength="40" aria-label="Nama kategori" style="flex:1;min-width:0">
        <button class="btn btn-b btn-sm" onclick="ubahKategoriPoster('${k.id}')" aria-label="Simpan nama kategori">${svgIcon('save',14)}</button>
        <button class="btn btn-d btn-sm" onclick="hapusKategoriPoster('${k.id}')" aria-label="Hapus kategori">${svgIcon('trash',14)}</button>
      </div>`).join('') || '<div style="font-size:13px;color:var(--text-l);margin-bottom:10px">Belum ada kategori.</div>'}
      <div style="display:flex;gap:8px;margin-top:12px">
        <input type="text" id="pst-kat-baru" maxlength="40" placeholder="Kategori baru, mis. Pengumuman" aria-label="Nama kategori baru" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter')tambahKategoriPoster()">
        <button class="btn btn-p btn-sm" onclick="tambahKategoriPoster()">${svgIcon('plus',14)} Tambah</button>
      </div>
    </div></div>` : ''}

    <div class="panel"><div class="ph"><h2>${svgIcon('image',16)} ${isSuper?'Semua Poster':'Poster Saya'} <span style="font-weight:500;color:var(--text-l)">(${daftar.length})</span></h2></div><div class="pb">
      ${daftar.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px">${daftar.map(p=>`
        <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--surface)">
          <img src="${escPoster(posterImg(p.gambar_url,320))}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block">
          <div style="padding:10px">
            <div style="font-weight:700;font-size:13px;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escPoster(p.judul)}</div>
            <div style="font-size:11.5px;color:var(--text-l);margin-top:4px">${escPoster(namaKategoriPoster(p.kategori_id))}${isSuper&&p.dibuat_oleh_nama?' · '+escPoster(p.dibuat_oleh_nama):''}</div>
            <div style="font-size:11.5px;font-weight:600;margin-top:2px">${statusPosterHtml(p)}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button class="btn btn-b btn-xs" style="flex:1;justify-content:center" onclick="editPoster('${p.id}')">${svgIcon('edit',12)} Edit</button>
              <button class="btn btn-d btn-xs" onclick="hapusPoster('${p.id}')" aria-label="Hapus poster">${svgIcon('trash',12)}</button>
            </div>
          </div>
        </div>`).join('')}</div>` : `<div class="empty"><span class="ei">🖼️</span><p>Belum ada poster.</p></div>`}
    </div></div>`;
  _posterBlob = _posterKecil = null; _posterEditId = null;
}

// Kompres: besar maks 1280px JPEG 82% (~200 KB), kecil maks 640px JPEG 78% (~60 KB)
function pilihGambarPoster(input){
  const file = input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ toast('File harus berupa gambar!', false); input.value=''; return; }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = async ()=>{
    URL.revokeObjectURL(url);
    try{
      [_posterBlob, _posterKecil] = await Promise.all([kompresGambarPoster(img, 1280, 0.82), kompresGambarPoster(img, 640, 0.78)]);
      const pratinjau = URL.createObjectURL(_posterKecil);
      document.getElementById('pst-preview').innerHTML = `<img src="${pratinjau}" alt="Pratinjau poster" style="width:100%;height:100%;object-fit:cover">`;
    }catch(e){ _posterBlob = _posterKecil = null; toast(e.message, false); }
  };
  img.onerror = ()=>{ URL.revokeObjectURL(url); toast('Gambar tidak bisa dibaca, coba file lain.', false); };
  img.src = url;
}

function editPoster(id){
  const p = POSTER_CACHE?.semua.find(x=>String(x.id)===String(id));
  if(!p) return;
  _posterEditId = p.id; _posterBlob = _posterKecil = null;
  document.getElementById('pst-judul').value = p.judul||'';
  document.getElementById('pst-kategori').value = p.kategori_id ? String(p.kategori_id) : '';
  const sampai = document.getElementById('pst-sampai');
  sampai.removeAttribute('min'); // poster lama yang sudah berakhir tetap bisa diedit
  sampai.value = p.tampil_sampai ? String(p.tampil_sampai).slice(0,10) : '';
  document.getElementById('pst-preview').innerHTML = `<img src="${escPoster(posterImg(p.gambar_url,320))}" alt="Gambar poster saat ini" style="width:100%;height:100%;object-fit:cover">`;
  document.getElementById('pst-form-judul').textContent = 'Edit Poster';
  document.getElementById('pst-btn-simpan').textContent = 'Simpan Perubahan';
  document.getElementById('pst-btn-batal').style.display = '';
  document.getElementById('sec-poster').scrollIntoView({behavior:'smooth', block:'start'});
}

function batalEditPoster(){ renderPosterAdmin(); }

async function simpanPoster(){
  if(_isLoading || !bolehKelolaPoster()) return;
  const judul = document.getElementById('pst-judul').value.trim();
  const kategori_id = document.getElementById('pst-kategori').value || null;
  const tampil_sampai = document.getElementById('pst-sampai').value || null;
  if(!_posterEditId && !_posterBlob){ toast('Pilih gambar poster dulu!', false); return; }
  if(!judul){ document.getElementById('pst-judul').focus(); toast('Judul wajib diisi!', false); return; }
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay(_posterEditId?'Menyimpan poster...':'Mengunggah poster...','Gambar sedang dikirim ke server.');
  setLoading(true, _lBtn);
  let urlBaru = null;
  try{
    const data = {judul, kategori_id, tampil_sampai};
    const lama = _posterEditId ? POSTER_CACHE?.semua.find(x=>String(x.id)===String(_posterEditId)) : null;
    if(_posterBlob) data.gambar_url = urlBaru = await uploadGambarPoster();
    const {error} = _posterEditId
      ? await SB.from('poster').update(data).eq('id', _posterEditId)
      : await SB.from('poster').insert({...data, dibuat_oleh: usernamePoster(), dibuat_oleh_nama: SESSION.user?.nama || 'Kang Admin'});
    if(error) throw error;
    if(urlBaru && lama) hapusFilePoster(lama.gambar_url); // gambar diganti -> file lama dibuang
    urlBaru = null;
    toast(_posterEditId ? '✅ Poster diperbarui!' : '✅ Poster diunggah!');
    await renderPosterAdmin();
    renderSemuaSliderPoster();
  }catch(e){
    if(urlBaru) hapusFilePoster(urlBaru); // gambar sudah terunggah tapi DB gagal -> jangan jadi file yatim
    toast('Gagal menyimpan poster: '+(e.message||e), false);
  }finally{ setLoading(false, _lBtn); }
}

function hapusPoster(id){
  const p = POSTER_CACHE?.semua.find(x=>String(x.id)===String(id));
  if(!p) return;
  konfirm(`Hapus poster <strong>${escPoster(p.judul)}</strong>? Poster langsung hilang dari beranda semua pengguna.`, async()=>{
    const {error} = await SB.from('poster').delete().eq('id', p.id);
    if(error){ toast('Gagal menghapus: '+error.message, false); return; }
    hapusFilePoster(p.gambar_url);
    toast('Poster dihapus');
    await renderPosterAdmin();
    renderSemuaSliderPoster();
  });
}

async function tambahKategoriPoster(){
  if(SESSION?.role!=='super') return;
  const inp = document.getElementById('pst-kat-baru');
  const nama = inp.value.trim();
  if(!nama){ inp.focus(); toast('Isi nama kategori dulu!', false); return; }
  if(POSTER_CACHE?.kategori.some(k=>k.nama.toLowerCase()===nama.toLowerCase())){ toast('Kategori itu sudah ada!', false); return; }
  const {error} = await SB.from('poster_kategori').insert({nama});
  if(error){ toast('Gagal menambah kategori: '+error.message, false); return; }
  toast('✅ Kategori ditambahkan!');
  renderPosterAdmin();
}

async function ubahKategoriPoster(id){
  if(SESSION?.role!=='super') return;
  const nama = document.getElementById('pst-kat-'+id).value.trim();
  if(!nama){ toast('Nama kategori tidak boleh kosong!', false); return; }
  const {error} = await SB.from('poster_kategori').update({nama}).eq('id', id);
  if(error){ toast('Gagal menyimpan: '+error.message, false); return; }
  toast('✅ Nama kategori disimpan!');
  renderPosterAdmin();
}

function hapusKategoriPoster(id){
  if(SESSION?.role!=='super') return;
  const k = POSTER_CACHE?.kategori.find(x=>String(x.id)===String(id));
  const jml = (POSTER_CACHE?.semua||[]).filter(p=>String(p.kategori_id)===String(id)).length;
  konfirm(`Hapus kategori <strong>${escPoster(k?.nama)}</strong>?${jml?` ${jml} poster di dalamnya pindah ke <strong>Lainnya</strong>.`:''}`, async()=>{
    // Lepas dulu posternya -- jangan andalkan ON DELETE SET NULL di database
    if(jml){
      const {error:e1} = await SB.from('poster').update({kategori_id:null}).eq('kategori_id', id);
      if(e1){ toast('Gagal memindah poster: '+e1.message, false); return; }
    }
    const {error} = await SB.from('poster_kategori').delete().eq('id', id);
    if(error){ toast('Gagal menghapus: '+error.message, false); return; }
    toast('Kategori dihapus');
    renderPosterAdmin();
    renderSemuaSliderPoster();
  });
}
