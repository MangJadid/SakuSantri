// ===== POSTER & INFO: slider beranda + galeri per kategori -- dipakai Saku Santri & Bendahara =====
// Data dari tabel `poster` & `poster_kategori` (diatur di Saku Santri: menu Poster).
// Taruh <div data-poster-slider></div> di halaman, lalu panggil renderSemuaSliderPoster().
// Poster yang lewat `tampil_sampai` otomatis tidak tampil.

let POSTER_CACHE = null, _posterJanji = null;

function escPoster(s){
  return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function hariIniPoster(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Tiap poster disimpan 2 ukuran (_besar.jpg 1280px & _kecil.jpg 640px, lihat poster-admin.js) --
// slider/galeri pakai yang kecil biar hemat kuota HP & Supabase
function posterImg(url, w){
  url = alamatServerAktif(url); // gambar lama tersimpan lewat proxy -- ikut jalur yang sedang terbuka
  return w <= 640 ? url.replace(/_besar\.jpg$/, '_kecil.jpg') : url;
}

// shortcut: ambil 300 poster terbaru saja, cukup buat mading; kalau sudah ribuan baru perlu paging
async function muatPoster(paksa){
  if(POSTER_CACHE && !paksa && Date.now()-POSTER_CACHE.waktu < 5*60*1000) return POSTER_CACHE;
  if(_posterJanji) return _posterJanji;
  _posterJanji = (async()=>{
    const [p, k] = await Promise.all([
      SB.from('poster').select('*').order('created_at',{ascending:false}).limit(300),
      SB.from('poster_kategori').select('*').order('id'),
    ]);
    if(p.error || k.error) console.warn('Poster belum bisa dimuat:', (p.error||k.error).message);
    POSTER_CACHE = {semua:p.data||[], kategori:k.data||[], waktu:Date.now()};
    return POSTER_CACHE;
  })().finally(()=>{ _posterJanji = null; });
  return _posterJanji;
}

function posterAktif(){
  const t = hariIniPoster();
  return (POSTER_CACHE?.semua||[]).filter(p=>!p.tampil_sampai || String(p.tampil_sampai).slice(0,10) >= t);
}

function namaKategoriPoster(id){
  return (POSTER_CACHE?.kategori||[]).find(k=>String(k.id)===String(id))?.nama || 'Lainnya';
}

function fmtTglPoster(s){
  if(!s) return '';
  const d = new Date(String(s).slice(0,10)+'T00:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}

function pasangCssPoster(){
  if(document.getElementById('poster-css')) return;
  const st = document.createElement('style');
  st.id = 'poster-css';
  st.textContent = `
    .pst-wrap{margin:6px 0 22px}
    .pst-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .pst-head h3{display:flex;align-items:center;gap:8px;margin:0;font-size:15px;font-weight:700;color:var(--text,#1d2b24)}
    .pst-head h3 i{width:4px;height:16px;border-radius:2px;background:var(--gold-l,#c9a227)}
    .pst-semua{border:0;background:none;padding:8px 4px;font:inherit;font-size:13px;font-weight:700;color:var(--green-l,#2f6f4f);cursor:pointer}
    .pst-track{--pst-w:min(56vw,220px);position:relative;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;
      -webkit-overflow-scrolling:touch;padding:8px calc(50% - var(--pst-w)/2) 18px}
    .pst-track::-webkit-scrollbar{display:none}
    .pst-kartu{position:relative;flex:0 0 var(--pst-w);scroll-snap-align:center;aspect-ratio:4/5;border:0;padding:0;border-radius:16px;overflow:hidden;
      background:#e7ece8;cursor:pointer;box-shadow:0 8px 22px rgba(18,53,40,.2);will-change:transform,opacity}
    .pst-kartu:focus-visible{outline:3px solid var(--gold-l,#c9a227);outline-offset:2px}
    .pst-kartu img{width:100%;height:100%;object-fit:cover;display:block}
    .pst-dots{display:flex;justify-content:center;gap:6px;margin-top:4px}
    .pst-dots span{width:6px;height:6px;border-radius:3px;background:#c8d3cc;transition:width .25s,background .25s}
    .pst-dots span.on{width:18px;background:var(--green,#123528)}
    .pst-ov{position:fixed;inset:0;z-index:99980;overflow-y:auto;background:var(--bg,#f6f4ee);animation:pst-masuk .22s ease-out}
    .pst-ov-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:10px 12px;
      background:var(--green,#123528);color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.15)}
    .pst-ov-head h2{flex:1;margin:0;font-family:'Lora',serif;font-size:19px;font-weight:700}
    .pst-btn-ikon{width:44px;height:44px;flex-shrink:0;border:0;border-radius:12px;background:rgba(255,255,255,.12);color:inherit;
      font-size:22px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .pst-ov-isi{max-width:1100px;margin:0 auto;padding:8px 0 40px}
    .pst-sek{margin-top:18px}
    .pst-sek h3{display:flex;align-items:center;gap:8px;margin:0 16px 10px;font-size:16px;font-weight:700;color:var(--text,#1d2b24)}
    .pst-sek h3 i{width:4px;height:17px;border-radius:2px;background:var(--gold-l,#c9a227)}
    .pst-sek h3 small{font-size:12px;font-weight:600;color:#7b8a81}
    .pst-baris{display:flex;align-items:flex-start;gap:12px;overflow-x:auto;scroll-snap-type:x proximity;scroll-padding:0 16px;scrollbar-width:none;padding:0 16px 6px}
    .pst-baris::-webkit-scrollbar{display:none}
    .pst-item{flex:0 0 148px;scroll-snap-align:start;border:0;padding:0;background:none;text-align:left;font:inherit;cursor:pointer}
    .pst-item:focus-visible{outline:3px solid var(--gold-l,#c9a227);outline-offset:2px;border-radius:12px}
    .pst-item span:first-child{display:block;aspect-ratio:4/5;border-radius:12px;overflow:hidden;background:#e7ece8;box-shadow:0 3px 10px rgba(0,0,0,.1)}
    .pst-item img{width:100%;height:100%;object-fit:cover;display:block}
    .pst-item b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:7px;font-size:13.5px;line-height:1.35;color:var(--text,#1d2b24)}
    .pst-kosong{padding:60px 20px;text-align:center;color:#7b8a81}
    .pst-lihat{position:fixed;inset:0;z-index:99985;background:#0a120e;color:#fff;display:flex;flex-direction:column;animation:pst-fade .2s ease-out}
    .pst-lihat-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px}
    .pst-lihat-head span{font-size:13px;color:#b9c7bf}
    .pst-slides{flex:1;min-height:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
    .pst-slides::-webkit-scrollbar{display:none}
    .pst-slide{flex:0 0 100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:0 12px}
    .pst-slide img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}
    .pst-info{padding:14px 18px calc(18px + env(safe-area-inset-bottom,0px));max-width:720px;margin:0 auto;width:100%;box-sizing:border-box}
    .pst-info b{display:block;font-size:16px;line-height:1.4}
    .pst-info small{display:block;margin-top:4px;font-size:12.5px;color:#b9c7bf}
    .pst-nav{position:absolute;top:50%;width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:24px;cursor:pointer}
    .pst-nav.kiri{left:10px}.pst-nav.kanan{right:10px}
    @media(max-width:640px){ .pst-nav{display:none} }
    @keyframes pst-masuk{from{opacity:0;transform:translateY(16px)}}
    @keyframes pst-fade{from{opacity:0}}
    @media(prefers-reduced-motion:reduce){ .pst-ov,.pst-lihat{animation:none} .pst-kartu,.pst-dots span{transition:none} }`;
  document.head.appendChild(st);
}

// ----- SLIDER BERANDA -----
async function renderSliderPoster(el){
  if(!el) return;
  await muatPoster();
  const list = posterAktif().slice(0, 10);
  const kunci = list.map(p=>p.id+':'+p.gambar_url).join('|');
  if(el.dataset.kunci === kunci && el.isConnected) return; // data sama -- jangan reset slider yang lagi jalan
  el.dataset.kunci = kunci;
  clearInterval(el._pstTimer);
  if(!list.length){ el.innerHTML = ''; return; }
  pasangCssPoster();
  el.innerHTML = `<div class="pst-wrap">
    <div class="pst-head"><h3><i></i>Poster &amp; Info</h3><button type="button" class="pst-semua" onclick="bukaGaleriPoster()">Lihat semua ›</button></div>
    <div class="pst-track" aria-label="Poster dan info pondok">
      ${list.map((p,i)=>`<button type="button" class="pst-kartu" onclick="bukaGaleriPoster()" aria-label="${escPoster(p.judul)} — lihat semua poster">
        <img src="${escPoster(posterImg(p.gambar_url, 600))}" alt="" ${i?'loading="lazy"':''}></button>`).join('')}
    </div>
    ${list.length>1 ? `<div class="pst-dots" aria-hidden="true">${list.map((_,i)=>`<span class="${i?'':'on'}"></span>`).join('')}</div>` : ''}
  </div>`;
  if(list.length < 2) return;

  const track = el.querySelector('.pst-track');
  const kartu = [...track.children], dots = [...el.querySelectorAll('.pst-dots span')];
  let idx = 0, jedaSampai = 0, raf = 0;
  const keKartu = i => track.scrollTo({left: kartu[i].offsetLeft - (track.clientWidth - kartu[i].clientWidth)/2, behavior:'smooth'});
  // Efek galeri: kartu tengah besar & terang, kiri-kanan mengecil & redup -- ikut jari saat digeser
  const aturEfek = ()=>{
    const tengah = track.scrollLeft + track.clientWidth/2;
    let terdekat = 0, jarak = Infinity;
    kartu.forEach((k,i)=>{
      const d = Math.abs(k.offsetLeft + k.clientWidth/2 - tengah);
      if(d<jarak){ jarak=d; terdekat=i; }
      const r = Math.min(1, d/k.clientWidth); // 0 = pas di tengah, 1 = tetangga
      k.style.transform = `scale(${1 - .18*r})`;
      k.style.opacity = 1 - .45*r;
      k.style.zIndex = r < .5 ? 2 : 1;
    });
    idx = terdekat;
    dots.forEach((d,i)=>d.classList.toggle('on', i===idx));
  };
  track.addEventListener('scroll', ()=>{ cancelAnimationFrame(raf); raf = requestAnimationFrame(aturEfek); }, {passive:true});
  requestAnimationFrame(aturEfek);
  // Digeser manual -> auto-slide berhenti dulu 8 detik biar gak rebutan sama jari
  ['pointerdown','touchstart','wheel','focusin'].forEach(ev=>track.addEventListener(ev, ()=>{ jedaSampai = Date.now()+8000; }, {passive:true}));
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el._pstTimer = setInterval(()=>{
    if(!el.isConnected){ clearInterval(el._pstTimer); return; }
    if(document.hidden || !el.offsetParent || Date.now() < jedaSampai || document.querySelector('.pst-ov')) return; // tab lain/tersembunyi: diam
    keKartu((idx+1) % kartu.length);
  }, 4500);
}

function renderSemuaSliderPoster(){
  document.querySelectorAll('[data-poster-slider]').forEach(el=>renderSliderPoster(el));
}

// ----- OVERLAY (galeri & penampil) -- tombol Back HP menutup overlay paling atas -----
function bukaOverlayPoster(ov){
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  history.pushState({poster:true}, '');
}
function hapusOverlayPosterTeratas(){
  const semua = document.querySelectorAll('.pst-ov, .pst-lihat');
  semua[semua.length-1]?.remove();
  if(semua.length <= 1) document.body.style.overflow = '';
}
function tutupOverlayPoster(){
  if(history.state?.poster) history.back(); // popstate di bawah yang hapus overlay-nya
  else hapusOverlayPosterTeratas();
}
window.addEventListener('popstate', ()=>{ if(document.querySelector('.pst-ov, .pst-lihat')) hapusOverlayPosterTeratas(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && document.querySelector('.pst-ov, .pst-lihat')) tutupOverlayPoster(); });

function itemGaleriPoster(p, grup){
  return `<button type="button" class="pst-item" onclick="lihatPoster(${Number(p.id)},'${grup}')">
    <span><img src="${escPoster(posterImg(p.gambar_url, 320))}" alt="" loading="lazy"></span><b>${escPoster(p.judul)}</b></button>`;
}

let _pstGrup = {};
async function bukaGaleriPoster(){
  if(document.querySelector('.pst-ov')) return;
  pasangCssPoster();
  await muatPoster();
  const aktif = posterAktif();
  // Grup: Terbaru dulu, lalu tiap kategori (urut dibuat), lalu yang tanpa kategori
  const grup = [{kunci:'baru', nama:'Terbaru', isi:aktif.slice(0,10)}];
  (POSTER_CACHE.kategori||[]).forEach(k=>grup.push({kunci:'k'+k.id, nama:k.nama, isi:aktif.filter(p=>String(p.kategori_id)===String(k.id))}));
  const idKat = new Set((POSTER_CACHE.kategori||[]).map(k=>String(k.id)));
  grup.push({kunci:'lain', nama:'Lainnya', isi:aktif.filter(p=>!p.kategori_id || !idKat.has(String(p.kategori_id)))});
  _pstGrup = {};
  grup.forEach(g=>{ _pstGrup[g.kunci] = g.isi; });

  const ov = document.createElement('div');
  ov.className = 'pst-ov';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.setAttribute('aria-label','Poster & Info');
  ov.innerHTML = `<div class="pst-ov-head">
      <button type="button" class="pst-btn-ikon" onclick="tutupOverlayPoster()" aria-label="Kembali">←</button>
      <h2>Poster &amp; Info</h2>
    </div>
    <div class="pst-ov-isi">${aktif.length ? grup.filter(g=>g.isi.length).map(g=>`<section class="pst-sek">
        <h3><i></i>${escPoster(g.nama)} <small>${g.isi.length}</small></h3>
        <div class="pst-baris">${g.isi.map(p=>itemGaleriPoster(p, g.kunci)).join('')}</div>
      </section>`).join('') : '<div class="pst-kosong">Belum ada poster.</div>'}</div>`;
  bukaOverlayPoster(ov);
  ov.querySelector('.pst-btn-ikon').focus();
}

// Penampil layar penuh -- bisa digeser kiri/kanan antar poster di grup yang sama
function lihatPoster(id, grupKunci){
  const list = _pstGrup[grupKunci] || posterAktif();
  const mulai = Math.max(0, list.findIndex(p=>String(p.id)===String(id)));
  const ov = document.createElement('div');
  ov.className = 'pst-lihat';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.setAttribute('aria-label','Lihat poster');
  ov.innerHTML = `<div class="pst-lihat-head">
      <span class="pst-hitung"></span>
      <button type="button" class="pst-btn-ikon" onclick="tutupOverlayPoster()" aria-label="Tutup">×</button>
    </div>
    <div class="pst-slides">${list.map(p=>`<div class="pst-slide"><img src="${escPoster(posterImg(p.gambar_url, 1200))}" alt="${escPoster(p.judul)}" loading="lazy"></div>`).join('')}</div>
    ${list.length>1 ? `<button type="button" class="pst-nav kiri" aria-label="Sebelumnya">‹</button><button type="button" class="pst-nav kanan" aria-label="Berikutnya">›</button>` : ''}
    <div class="pst-info"><b></b><small></small></div>`;
  const slides = ov.querySelector('.pst-slides');
  let idx = mulai;
  const tampilInfo = ()=>{
    const p = list[idx]; if(!p) return;
    ov.querySelector('.pst-hitung').textContent = `${idx+1} / ${list.length}`;
    ov.querySelector('.pst-info b').textContent = p.judul;
    ov.querySelector('.pst-info small').textContent = [namaKategoriPoster(p.kategori_id), fmtTglPoster(p.created_at), p.dibuat_oleh_nama].filter(Boolean).join(' · ');
  };
  const keSlide = (i, halus)=>{ idx = (i+list.length)%list.length; slides.scrollTo({left: idx*slides.clientWidth, behavior: halus?'smooth':'auto'}); tampilInfo(); };
  slides.addEventListener('scroll', ()=>{ const i = Math.round(slides.scrollLeft/slides.clientWidth); if(i!==idx && list[i]){ idx=i; tampilInfo(); } }, {passive:true});
  ov.querySelector('.kiri')?.addEventListener('click', ()=>keSlide(idx-1, true));
  ov.querySelector('.kanan')?.addEventListener('click', ()=>keSlide(idx+1, true));
  ov.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') keSlide(idx-1, true); if(e.key==='ArrowRight') keSlide(idx+1, true); });
  bukaOverlayPoster(ov);
  keSlide(mulai, false);
  ov.querySelector('.pst-btn-ikon').focus();
}
