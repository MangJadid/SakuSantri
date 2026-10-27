// ===== BANNER "FOLLOW MEDIA SOSIAL" -- dipakai Saku Santri & Bendahara =====
// Link diatur Kang Admin di Saku Santri (menu Admin), disimpan di tabel settings
// key 'sosmed_pondok' sebagai JSON {instagram, facebook, youtube, tiktok, x}.
// Banner ditaruh di paling bawah <main>, jadi muncul di semua tab & semua role.
// Disembunyikan kalau belum ada link sama sekali.

const SOSMED_PLATFORM = [
  {key:'instagram', label:'Instagram', base:'https://instagram.com/',
    svg:'<defs><linearGradient id="sosmed-ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".35" stop-color="#FA7E1E"/><stop offset=".65" stop-color="#D62976"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#sosmed-ig)"/><rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16.2" cy="7.8" r="1" fill="#fff"/>'},
  {key:'facebook', label:'Facebook', base:'https://facebook.com/',
    svg:'<circle cx="12" cy="12" r="11" fill="#1877F2"/><path fill="#fff" d="M13.4 19.5V13.5H15.4L15.7 11.1H13.4V9.6C13.4 8.9 13.6 8.4 14.6 8.4H15.8V6.3C15.6 6.3 14.8 6.2 14 6.2C12.2 6.2 11 7.3 11 9.3V11.1H9V13.5H11V19.5Z"/>'},
  {key:'youtube', label:'YouTube', base:'https://youtube.com/@',
    svg:'<rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000"/><path fill="#fff" d="M10 8.8v6.4l5.5-3.2z"/>'},
  {key:'tiktok', label:'TikTok', base:'https://tiktok.com/@',
    svg:'<circle cx="12" cy="12" r="11" fill="#000"/><path fill="#25F4EE" transform="translate(-.6 -.5)" d="M15.6 5.5c.3 1.6 1.4 2.8 3 3v2.2c-1.1 0-2.1-.3-3-.9v4.6a4.3 4.3 0 1 1-4.3-4.3v2.3a2 2 0 1 0 2 2V5.5z"/><path fill="#FE2C55" transform="translate(.6 .5)" d="M15.6 5.5c.3 1.6 1.4 2.8 3 3v2.2c-1.1 0-2.1-.3-3-.9v4.6a4.3 4.3 0 1 1-4.3-4.3v2.3a2 2 0 1 0 2 2V5.5z"/><path fill="#fff" d="M15.6 5.5c.3 1.6 1.4 2.8 3 3v2.2c-1.1 0-2.1-.3-3-.9v4.6a4.3 4.3 0 1 1-4.3-4.3v2.3a2 2 0 1 0 2 2V5.5z"/>'},
  {key:'x', label:'X (Twitter)', base:'https://x.com/',
    svg:'<circle cx="12" cy="12" r="11" fill="#000"/><path fill="#fff" d="M7 6.5h3l7 11h-3z"/><path stroke="#fff" stroke-width="1.4" d="M16.6 6.5l-9 11"/>'},
];

function escSosmed(s){
  return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function getSosmedPondok(){
  try{ const v = JSON.parse(CONFIG.sosmed_pondok||'{}'); return (v && typeof v==='object') ? v : {}; }
  catch(e){ return {}; }
}

// "@annur" -> link profil platform itu; "instagram.com/annur" -> https://...
// Cuma http/https yang lolos (cegah link javascript: dll). '' = kosong, null = tidak valid.
function normUrlSosmed(key, input){
  let v = String(input||'').trim();
  if(!v) return '';
  const p = SOSMED_PLATFORM.find(x=>x.key===key);
  if(v.startsWith('@')) v = p.base + v.slice(1).replace(/^@/,'');
  else if(!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try{ const u = new URL(v); return (u.protocol==='https:'||u.protocol==='http:') && u.hostname.includes('.') ? u.href : null; }
  catch(e){ return null; }
}

// Kata bertanda hubung (An-Nur) jangan dipotong di tengah baris
function namaPondokSosmed(){
  return String(CONFIG.pesantren_nama||'Pondok Pesantren An-Nur').split(' ')
    .map(w=>w.includes('-') ? `<span style="white-space:nowrap">${escSosmed(w)}</span>` : escSosmed(w)).join(' ');
}

// "https://instagram.com/annur.official/" -> "@annur.official"; selain itu domain+path
function namaAkunSosmed(url){
  try{
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean);
    if(seg.length===1 && !/\.(php|html?)$/i.test(seg[0])) return '@'+decodeURIComponent(seg[0]).replace(/^@/,'');
    return u.hostname.replace(/^www\./,'') + u.pathname.replace(/\/$/,'') + u.search;
  }catch(e){ return url; }
}

function logoSosmed(p){ return `<svg viewBox="0 0 24 24" aria-hidden="true">${p.svg}</svg>`; }

function pasangCssSosmed(){
  if(document.getElementById('sosmed-banner-css')) return;
  const st = document.createElement('style');
  st.id = 'sosmed-banner-css';
  st.textContent = `
    .sosmed-banner{display:flex;align-items:stretch;width:100%;margin:24px 0 8px;padding:0;border:0;border-radius:16px;overflow:hidden;
      font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;
      background:linear-gradient(135deg,var(--green-m,#1c4d3d),var(--green,#123528));box-shadow:0 4px 14px rgba(18,53,40,.18);
      transition:transform .15s ease-out}
    .sosmed-banner:active{transform:scale(.98)}
    .sosmed-banner:focus-visible{outline:3px solid var(--gold-l,#c9a227);outline-offset:2px}
    .sosmed-teks{flex:1;min-width:0;padding:14px 22px 14px 18px;display:flex;flex-direction:column;justify-content:center;gap:3px}
    .sosmed-teks > span{font-size:12.5px;font-weight:600;color:#e8f1ec}
    .sosmed-teks strong{font-size:14px;font-weight:800;letter-spacing:.5px;color:var(--gold-l,#c9a227);text-transform:uppercase;
      line-height:1.25;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .sosmed-teks em{font-style:normal;font-size:11.5px;font-weight:600;color:#a9c9b6;margin-top:3px}
    .sosmed-ikon{position:relative;flex-shrink:0;max-width:46%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;
      gap:4px 10px;padding:12px 12px 12px 18px}
    .sosmed-ikon::before{content:'';position:absolute;top:0;bottom:0;left:-16px;right:-60px;background:#fdf9ee;
      border-left:4px solid var(--gold-l,#c9a227);transform:skewX(12deg);transform-origin:top}
    .sosmed-ikon svg{position:relative;width:28px;height:28px;display:block}
    .sosmed-overlay{position:fixed;inset:0;z-index:99990;background:rgba(10,25,18,.5);display:flex;align-items:flex-end;justify-content:center;
      animation:sosmed-fade .2s ease-out}
    .sosmed-sheet{width:100%;max-width:440px;max-height:85vh;overflow-y:auto;background:#fff;border-radius:20px 20px 0 0;
      padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.18);
      animation:sosmed-naik .25s cubic-bezier(.2,.8,.2,1)}
    .sosmed-sheet-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
    .sosmed-sheet-head div{flex:1;min-width:0}
    .sosmed-sheet-head h3{margin:0;font-family:'Lora',serif;font-size:18px;color:var(--green,#123528)}
    .sosmed-sheet-head p{margin:2px 0 0;font-size:12.5px;color:#6b7c72}
    .sosmed-tutup{width:40px;height:40px;flex-shrink:0;border:0;border-radius:12px;background:#f1f4f2;color:#33463c;font-size:22px;line-height:1;cursor:pointer}
    .sosmed-row{display:flex;align-items:center;gap:14px;padding:12px;border-radius:14px;text-decoration:none;color:inherit;
      border:1px solid #e6ece8;margin-bottom:8px;transition:background .15s}
    .sosmed-row:hover,.sosmed-row:focus-visible{background:#f4f8f5}
    .sosmed-row:focus-visible{outline:2px solid var(--green,#123528);outline-offset:1px}
    .sosmed-row svg{width:36px;height:36px;flex-shrink:0}
    .sosmed-row-teks{flex:1;min-width:0}
    .sosmed-row-teks b{display:block;font-size:14.5px;color:#1d2b24}
    .sosmed-row-teks small{display:block;font-size:12.5px;color:#6b7c72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .sosmed-row-buka{font-size:12px;font-weight:700;color:var(--green-l,#2f6f4f);flex-shrink:0}
    @media(min-width:641px){ .sosmed-overlay{align-items:center} .sosmed-sheet{border-radius:20px} }
    @keyframes sosmed-fade{from{opacity:0}}
    @keyframes sosmed-naik{from{transform:translateY(40px);opacity:0}}
    @media(prefers-reduced-motion:reduce){ .sosmed-overlay,.sosmed-sheet{animation:none} .sosmed-banner{transition:none} }`;
  document.head.appendChild(st);
}

function renderSosmedBanner(){
  const main = document.querySelector('#pg-app main');
  if(!main) return;
  const aktif = SOSMED_PLATFORM.filter(p=>getSosmedPondok()[p.key]);
  let el = document.getElementById('sosmed-banner');
  if(!aktif.length){ el?.remove(); return; }
  pasangCssSosmed();
  if(!el){ el = document.createElement('div'); el.id = 'sosmed-banner'; }
  main.appendChild(el); // selalu jadi elemen paling bawah
  // Satu tombol besar (bukan logo kecil satu-satu) -- diketuk buka daftar akun lengkap
  el.innerHTML = `<button type="button" class="sosmed-banner" onclick="bukaSosmedSheet()" aria-haspopup="dialog">
    <span class="sosmed-teks"><span>Follow Media Sosial</span><strong>${namaPondokSosmed()}</strong><em>Ketuk untuk lihat akun ›</em></span>
    <span class="sosmed-ikon">${aktif.map(logoSosmed).join('')}</span>
  </button>`;
}

function bukaSosmedSheet(){
  const links = getSosmedPondok();
  const aktif = SOSMED_PLATFORM.filter(p=>links[p.key]);
  if(!aktif.length || document.getElementById('sosmed-overlay')) return;
  pasangCssSosmed();
  const asal = document.activeElement;
  const ov = document.createElement('div');
  ov.id = 'sosmed-overlay';
  ov.className = 'sosmed-overlay';
  ov.innerHTML = `<div class="sosmed-sheet" role="dialog" aria-modal="true" aria-labelledby="sosmed-judul">
    <div class="sosmed-sheet-head">
      <div><h3 id="sosmed-judul">Media Sosial</h3><p>${escSosmed(CONFIG.pesantren_nama||'Pondok Pesantren An-Nur')}</p></div>
      <button type="button" class="sosmed-tutup" aria-label="Tutup">×</button>
    </div>
    ${aktif.map(p=>`<a class="sosmed-row" href="${escSosmed(links[p.key])}" target="_blank" rel="noopener">
      ${logoSosmed(p)}
      <span class="sosmed-row-teks"><b>${p.label}</b><small>${escSosmed(namaAkunSosmed(links[p.key]))}</small></span>
      <span class="sosmed-row-buka">Buka ›</span>
    </a>`).join('')}
  </div>`;
  const tutup = ()=>{ ov.remove(); document.removeEventListener('keydown', onKey); asal?.focus?.(); };
  const onKey = e=>{ if(e.key==='Escape') tutup(); };
  ov.addEventListener('click', e=>{
    if(e.target===ov || e.target.closest('.sosmed-tutup')) tutup();
    else if(e.target.closest('.sosmed-row')) setTimeout(tutup); // biar link sempat kebuka dulu
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  ov.querySelector('.sosmed-tutup').focus();
}
