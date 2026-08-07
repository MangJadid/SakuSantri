// ===== GREETING DASHBOARD =====
function renderGreeting(){
  const greet = document.getElementById('dash-greeting');
  if(!greet || SESSION.role==='ortu') return;
  greet.style.display='block';

  // Nama pengurus
  let nama = '';
  if(SESSION.role==='super') nama = 'Kang Admin';
  else nama = SESSION.user?.nama || 'Pengurus';

  // Avatar — foto jika ada, inisial jika tidak
  const av = document.getElementById('dash-greeting-av');
  const inisial = nama.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const fotoUrl = SESSION.user?.foto_url;
  if(fotoUrl){
    av.innerHTML = '<img src="'+fotoUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  } else {
    av.textContent = inisial;
  }

  // Waktu greeting
  const now = new Date();
  const jam = now.getHours();
  let sapa = jam < 11 ? 'Selamat Pagi' : jam < 15 ? 'Selamat Siang' : jam < 18 ? 'Selamat Sore' : 'Selamat Malam';

  // Ambil pesan dari CONFIG (diinput Kang Admin), fallback ke default
  const defaultPesan = [
    'Semangat mengelola keuangan santri hari ini! 💪',
    'Jazakallah atas dedikasi Akang/Teteh 🌿',
    'Mari jaga amanah bersama-sama 🤝',
    'Bismillah, semoga hari ini berkah ✨',
  ];
  let pesanList = [];
  try {
    const fromConfig = CONFIG.greeting_pesan ? JSON.parse(CONFIG.greeting_pesan) : [];
    pesanList = fromConfig.length ? fromConfig : defaultPesan;
  } catch(e){ pesanList = defaultPesan; }

  // Ambil pesan sesuai sesi login (disimpan di sessionStorage)
  let pesanIdx = sessionStorage.getItem('greeting_idx');
  if(pesanIdx === null){
    pesanIdx = Math.floor(Math.random() * pesanList.length);
    sessionStorage.setItem('greeting_idx', pesanIdx);
  }
  const pesan = pesanList[pesanIdx % pesanList.length];

  // Hari & tanggal
  const hariList = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulanList = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const hari = hariList[now.getDay()];
  const tgl = `${now.getDate()} ${bulanList[now.getMonth()]} ${now.getFullYear()}`;

  document.getElementById('dash-greeting-sub').textContent = sapa + ',';
  document.getElementById('dash-greeting-name').textContent = nama;
  document.getElementById('dash-greeting-msg').textContent = pesan;
  document.getElementById('dash-greeting-day').textContent = hari;
  document.getElementById('dash-greeting-date').textContent = tgl;
}

// ===== MANAJEMEN GREETING (Kang Admin) =====
async function loadGreetingList(){
  const wrap = document.getElementById('greeting-list');
  if(!wrap) return;
  let pesanList = [];
  try {
    const fromConfig = CONFIG.greeting_pesan ? JSON.parse(CONFIG.greeting_pesan) : [];
    pesanList = fromConfig.length ? fromConfig : [
      'Semangat mengelola keuangan santri hari ini! 💪',
      'Jazakallah atas dedikasi Akang/Teteh 🌿',
      'Mari jaga amanah bersama-sama 🤝',
      'Bismillah, semoga hari ini berkah ✨',
    ];
  } catch(e){}

  if(!pesanList.length){
    wrap.innerHTML='<div style="font-size:13px;color:var(--text-l);padding:8px 0">Belum ada kata-kata. Tambahkan di bawah.</div>';
    return;
  }
  wrap.innerHTML = pesanList.map((p,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--green-p);border:1px solid var(--green-b);border-radius:9px;margin-bottom:8px">
      <span style="font-size:13px;flex:1;color:var(--text)">${p}</span>
      <button onclick="hapusGreeting(${i})" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-l);padding:2px 6px;border-radius:5px;transition:.2s" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-l)'">🗑</button>
    </div>`).join('');
}

async function tambahGreeting(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan greeting...','Harap tunggu, data sedang disimpan.');
  setLoading(true, _lBtn);
  try {

  const input = document.getElementById('greeting-input');
  const teks = input.value.trim();
  if(!teks){ toast('Tulis kata-katanya dulu!', false); return; }

  let pesanList = [];
  try { pesanList = CONFIG.greeting_pesan ? JSON.parse(CONFIG.greeting_pesan) : []; } catch(e){}
  pesanList.push(teks);

  await SB.from('settings').upsert({key:'greeting_pesan', value:JSON.stringify(pesanList)});
  CONFIG.greeting_pesan = JSON.stringify(pesanList);
  input.value = '';
  toast('✅ Kata-kata berhasil ditambahkan!');
  loadGreetingList();

  } finally { setLoading(false, _lBtn); }
}

async function hapusGreeting(idx){
  if(_isLoading) return;
  try {

  let pesanList = [];
  try { pesanList = CONFIG.greeting_pesan ? JSON.parse(CONFIG.greeting_pesan) : []; } catch(e){}
  pesanList.splice(idx, 1);

  await SB.from('settings').upsert({key:'greeting_pesan', value:JSON.stringify(pesanList)});
  CONFIG.greeting_pesan = JSON.stringify(pesanList);
  toast('Kata-kata dihapus');
  loadGreetingList();

  } finally { setLoading(false, _lBtn); }
}

// ===== COLLAPSIBLE FILTER PANEL (generic, dipakai di semua tab) =====
const DASH_FILTER_IDS = ['dash-asrama','dash-kobong','dash-wali','dash-status'];
const SANTRI_FILTER_IDS = ['santri-asrama','santri-kobong','santri-kelas','santri-gender','santri-wali'];
const RIW_FILTER_IDS = ['riw-asrama','riw-kobong','riw-bulan','riw-jenis'];

// Reset semua filter di semua tab sekaligus
function resetAllFilters(){
  resetFPanel('dash', DASH_FILTER_IDS, ()=>{});
  const dashCari = document.getElementById('dash-cari'); if(dashCari) dashCari.value='';
  resetFPanel('santri', SANTRI_FILTER_IDS, ()=>{});
  const santriCari = document.getElementById('santri-cari'); if(santriCari) santriCari.value='';
  resetFPanel('riw', RIW_FILTER_IDS, ()=>{});
  const riwCari = document.getElementById('riw-cari'); if(riwCari) riwCari.value='';
}
function toggleFPanel(ctx){
  const panel = document.getElementById('fpanel-'+ctx);
  const btn = document.getElementById('ftog-'+ctx);
  if(!panel||!btn) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  btn.classList.toggle('active', !isOpen);
}
function updateFBadge(ctx, selectIds){
  const btn = document.getElementById('ftog-'+ctx);
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
  const panelOpen = document.getElementById('fpanel-'+ctx)?.classList.contains('open');
  btn.classList.toggle('active', count>0 || !!panelOpen);
}
function resetFPanel(ctx, selectIds, callback){
  selectIds.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  updateFBadge(ctx, selectIds);
  if(typeof callback==='function') callback();
}

// ===== DASHBOARD =====
function renderDashboard(){
  renderGreeting();
  const q = document.getElementById('dash-cari')?.value.toLowerCase()||'';
  const af = document.getElementById('dash-asrama')?.value||'';
  const kf = document.getElementById('dash-kobong')?.value||'';
  const wf = document.getElementById('dash-wali')?.value||'';
  const sf = document.getElementById('dash-status')?.value||'';
  const kritis = parseInt(CONFIG.kritis_batas)||50000;

  // Cakupan data sesuai asrama yang dipilih (kosong = semua asrama)
  const scopeSantri = af ? ALL_SANTRI.filter(s=>String(getAsramaIdBySantri(s))===af) : ALL_SANTRI;
  const scopeKobong = af ? ALL_KOBONG.filter(k=>String(k.asrama_id)===af) : ALL_KOBONG;

  let filtered = scopeSantri.filter(s=>{
    if(q && !s.nama.toLowerCase().includes(q)) return false;
    if(kf && String(s.kobong_id)!==kf) return false;
    if(wf && s.created_by!==wf) return false;
    if(sf==='kritis' && (s.saldo<0||s.saldo>=kritis)) return false;
    if(sf==='nol' && s.saldo>0) return false;
    return true;
  });

  // Stats (mengikuti cakupan asrama yang dipilih)
  const total = scopeSantri.length;
  const totalSaldo = scopeSantri.reduce((a,s)=>a+s.saldo,0);
  const kritis_count = scopeSantri.filter(s=>s.saldo>=0&&s.saldo<kritis).length;
  const minus_count = scopeSantri.filter(s=>s.saldo<0).length;

  document.getElementById('dash-stat-hero').innerHTML = `
    <div class="sc-hero">
      <div>
        <div class="sc-hero-label">Total Saldo Seluruh Santri</div>
        <div class="sc-hero-val" style="${totalSaldo<0?'color:#f5b8b8':''}">${totalSaldo<0?'− ':''}${rp(Math.abs(totalSaldo))}</div>
      </div>
      <div class="sc-hero-ic">${svgIcon('wallet',22)}</div>
    </div>
  `;

  if(SESSION.role==='pengurus'){
    // Pengurus: tanpa kotak Kobong & Saldo Minus, tambah Rekening & Cash
    const pgKey = 'pg_rekening_'+(SESSION.user?.id||'0');
    const uangRekening = parseInt(localStorage.getItem(pgKey)||'0');
    const uangCash = totalSaldo - uangRekening;
    document.getElementById('dash-stats').innerHTML=`
      <div class="sc"><div class="sci g">${svgIcon('users')}</div><div class="sil"><label>Total Santri</label><strong>${total}</strong><small>santri binaan</small></div></div>
      <div class="sc" style="cursor:pointer;border-left:1.5px solid var(--blue-p);border-right:1.5px solid var(--blue-p);border-bottom:1.5px solid var(--blue-p)" onclick="openRekeningModal()" title="Klik untuk ubah jumlah rekening">
        <div class="sci b">${svgIcon('bank')}</div>
        <div class="sil">
          <label>Uang Rekening <span style="font-size:9px;background:var(--blue-p);color:var(--blue);padding:1px 5px;border-radius:4px;margin-left:3px">Edit</span></label>
          <strong style="font-size:15px" id="stat-rekening">${rp(uangRekening)}</strong>
          <small>klik untuk ubah</small>
        </div>
      </div>
      <div class="sc"><div class="sci p">${svgIcon('cash')}</div><div class="sil"><label>Uang Cash</label><strong style="font-size:15px;${uangCash<0?'color:var(--red)':''}" id="stat-cash">${uangCash<0?'− ':''} ${rp(Math.abs(uangCash))}</strong><small>Total Saldo − Rekening</small></div></div>
      <div class="sc sc-warn"><div class="sci r">${svgIcon('alert-triangle')}</div><div class="sil"><label>Saldo Kritis</label><strong class="s-warn">${kritis_count}</strong><small>di bawah ${rp(kritis)}</small></div></div>
    `;
  } else {
    // Super admin: tampil semua termasuk kobong & saldo minus
    document.getElementById('dash-stats').innerHTML=`
      <div class="sc"><div class="sci g">${svgIcon('users')}</div><div class="sil"><label>Total Santri</label><strong>${total}</strong><small>${scopeKobong.length} kobong</small></div></div>
      <div class="sc" style="cursor:pointer" onclick="showTab('kobong')" title="Klik untuk kelola kobong"><div class="sci b">${svgIcon('home')}</div><div class="sil"><label>Kobong</label><strong>${scopeKobong.length}</strong><small>aktif</small></div></div>
      <div class="sc sc-warn"><div class="sci r">${svgIcon('alert-triangle')}</div><div class="sil"><label>Saldo Kritis</label><strong class="s-warn">${kritis_count}</strong><small>di bawah ${rp(kritis)}</small></div></div>
      <div class="sc sc-danger"><div class="sci r">${svgIcon('circle-minus')}</div><div class="sil"><label>Saldo Minus</label><strong class="s-minus">${minus_count}</strong><small>santri</small></div></div>
    `;
  }

  let html='';
  filtered.forEach((s,i)=>{
    const k = s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const sc = s.saldo<0?'s-minus':s.saldo===0?'s-nol':s.saldo<kritis?'s-warn':'s-ok';
    const isKritis = s.saldo>=0 && s.saldo<kritis || s.saldo<0;
    const waBtn = s.no_wa
      ? `<button class="btn btn-wa btn-sm" onclick="kirimWASantri(${s.id})" title="Kirim WA ke ${s.no_wa}">📲</button>`
      : `<button class="btn btn-o btn-sm" style="opacity:.4;cursor:not-allowed" title="No WA tidak ada">📵</button>`;
    html+=`<tr class="row-reveal">
      <td style="color:var(--text-l);font-size:12px">${i+1}</td>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="av" style="background:${avColor(s.nama)}22;color:${avColor(s.nama)};overflow:hidden">${s.foto_url?'<img data-src="'+s.foto_url+'" class="lazy-img" style="width:100%;height:100%;object-fit:cover">':avLetter(s.nama)}</div>
        <div><div style="font-weight:600">${s.nama}</div><div style="font-size:11px;color:var(--text-l)">${s.catatan||''}</div></div>
      </div></td>
      <td><span class="badge bg">${k}</span></td>
      <td class="s-ok">${rp(ALL_TX.filter(t=>t.santri_id===s.id&&t.jenis==='masuk').reduce((a,t)=>a+t.nominal,0))}</td>
      <td style="color:var(--red)">${rp(ALL_TX.filter(t=>t.santri_id===s.id&&t.jenis==='keluar').reduce((a,t)=>a+t.nominal,0))}</td>
      <td><strong class="${sc}">${s.saldo<0?'− ':''} ${rp(s.saldo)}</strong></td>
      <td><div style="display:flex;gap:5px;flex-wrap:wrap">${waBtn}<button class="btn btn-o btn-sm" onclick="openDetailModal(${s.id})">📋 Detail</button></div></td>
    </tr>`;
  });
  document.getElementById('dash-tbl').innerHTML = html||`<tr><td colspan="7"><div class="empty"><span class="ei">🔍</span><p>Tidak ada data</p></div></td></tr>`;

  const kritisAdaWA = filtered.filter(s=>(s.saldo<kritis)&&s.no_wa).length;
  const btnWaSemuaDash = document.getElementById('btn-wa-semua');
  if(btnWaSemuaDash) btnWaSemuaDash.style.display = kritisAdaWA>0 ? 'inline-flex' : 'none';

  setTimeout(activateLazyLoad, 50);
  setTimeout(activateRowReveal, 50);
}

function getKobongNama(id){ const k=ALL_KOBONG.find(k=>k.id===id); return k?.nama||''; }

