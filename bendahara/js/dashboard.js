// ===== DASHBOARD =====
// ===== GREETING DASHBOARD BENDAHARA =====
function renderGreetingBendahara(){
  const now = new Date();
  const jam = now.getHours();
  const sapa = jam < 11 ? 'Selamat Pagi' : jam < 15 ? 'Selamat Siang' : jam < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const nama = isKangAdmin() ? 'Admin' : (SESSION?.nama || 'Bendahara');
  const inisial = nama.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  // Avatar
  const av = document.getElementById('dash-greeting-av');
  if(av){
    const foto = SESSION?.foto_url;
    av.innerHTML = foto ? `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : inisial;
  }

  // Kata-kata dari CONFIG (diatur di Kang Admin)
  const defaultPesan = [
    'Semangat mengelola keuangan pondok hari ini! 💪',
    'Jazakallah atas dedikasi Akang/Teteh 🌿',
    'Mari jaga amanah bersama-sama 🤝',
    'Bismillah, semoga hari ini berkah ✨',
  ];
  let pesanList = [];
  try {
    const fromConfig = CONFIG.greeting_pesan ? JSON.parse(CONFIG.greeting_pesan) : [];
    pesanList = fromConfig.length ? fromConfig : defaultPesan;
  } catch(e){ pesanList = defaultPesan; }

  let pesanIdx = sessionStorage.getItem('bend_greeting_idx');
  if(pesanIdx === null){
    pesanIdx = Math.floor(Math.random() * pesanList.length);
    sessionStorage.setItem('bend_greeting_idx', pesanIdx);
  }
  const pesan = pesanList[pesanIdx % pesanList.length];

  const hariList = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulanList = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  const elSub  = document.getElementById('dash-greeting-sub');
  const elName = document.getElementById('dash-greeting-name');
  const elMsg  = document.getElementById('dash-greeting-msg');
  const elDay  = document.getElementById('dash-greeting-day');
  const elDate = document.getElementById('dash-greeting-date');
  if(elSub)  elSub.textContent  = sapa + ',';
  if(elName) elName.textContent = nama;
  if(elMsg)  elMsg.textContent  = pesan;
  if(elDay)  elDay.textContent  = hariList[now.getDay()];
  if(elDate) elDate.textContent = `${now.getDate()} ${bulanList[now.getMonth()]} ${now.getFullYear()}`;
}

function renderDashboard(){
  renderGreetingBendahara();
  const bulan = bulanAktif();
  const nomMakan = getNominalMakan();
  const nomListrik = getNominalListrik();
  const tagihanBulan = getTagihanFiltered().filter(t=>(t.bulan||'').toLowerCase()===bulan.toLowerCase());
  const lunas = tagihanBulan.filter(t=>t.status==='lunas');
  const belum = tagihanBulan.filter(t=>t.status!=='lunas');
  const totalTagihan = tagihanBulan.reduce((a,t)=>a+Number(t.nominal),0);
  const totalLunas = lunas.reduce((a,t)=>a+Number(t.nominal),0);

  // Hitung pecahan makan & listrik
  const lunasCount = lunas.length;
  const belumCount = belum.length;
  const makanTerkumpul = lunasCount * nomMakan;
  const listrikTerkumpul = lunasCount * nomListrik;
  const makanTunggakan = belumCount * nomMakan;
  const listrikTunggakan = belumCount * nomListrik;

  const dapurLabel = ACTIVE_DAPUR?getDapurNama(ACTIVE_DAPUR):'Semua Dapur';
  document.getElementById('dash-tagihan-title').textContent=`📋 Tagihan Bulan Ini — ${dapurLabel}`;

  // Hitung total santri aktif (exclude alumni)
  const santriAktif = ALL_SANTRI.filter(s=>!s.is_arsip);
  const santriDapur = ACTIVE_DAPUR
    ? santriAktif.filter(s=>String(s.dapur_id)===String(ACTIVE_DAPUR))
    : santriAktif;

  // Hitung per dapur
  const santriPerDapur = DAPUR_LIST.map(d=>({
    ...d,
    jumlah: santriAktif.filter(s=>String(s.dapur_id)===String(d.id)).length
  }));

  // Kartu hero -- Total Terkumpul, di atas grid .stats
  document.getElementById('dash-stat-hero').innerHTML=`
    <div class="sc-hero">
      <div>
        <div class="sc-hero-label">Total Terkumpul</div>
        <div class="sc-hero-val">${fmtRp(totalLunas)}</div>
      </div>
      <div class="sc-hero-ic">${svgIcon('cash',22)}</div>
    </div>`;

  // Stat cards
  document.getElementById('dash-stats').innerHTML=`
    <div class="sc"><div class="sci g">${svgIcon('document',20)}</div><div class="sil"><label>Total Tagihan</label><div class="val">${tagihanBulan.length}</div><small>${bulan}</small></div></div>
    <div class="sc"><div class="sci g">${svgIcon('check-circle',20)}</div><div class="sil"><label>Sudah Lunas</label><div class="val" style="color:var(--green)">${lunas.length}</div><small>${fmtRp(totalLunas)}</small></div></div>
    <div class="sc sc-danger"><div class="sci r">${svgIcon('circle-minus',20)}</div><div class="sil"><label>Belum Bayar</label><div class="val" style="color:var(--red)">${belum.length}</div><small>${fmtRp(belum.reduce((a,t)=>a+Number(t.nominal),0))}</small></div></div>
    <div class="sc" style="grid-column:1/-1;background:linear-gradient(135deg,var(--green-p),#fff);border:1.5px solid var(--green-b)">
      <div class="sci g">${svgIcon('users',20)}</div>
      <div class="sil" style="flex:1">
        <label>Total Santri Aktif</label>
        <div class="val" style="color:var(--green)">${santriDapur.length}</div>
        <small>${ACTIVE_DAPUR?getDapurNama(ACTIVE_DAPUR):'Semua Dapur'} · tidak termasuk alumni</small>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          ${santriPerDapur.map(d=>`
            <div style="background:#fff;border:1.5px solid var(--green-b);border-radius:8px;padding:6px 12px;font-size:12px;display:flex;align-items:center;gap:6px">
              <span>${d.emoji}</span>
              <span style="font-weight:600;color:var(--text)">${d.nama}</span>
              <span style="font-weight:800;color:var(--green);font-size:14px">${d.jumlah}</span>
              <span style="color:var(--text-l)">santri</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div style="grid-column:1/-1;background:var(--white);border:1.5px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--sh)">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-m) 100%);padding:14px 18px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">📊</span>
          <span style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px">Rincian per Jenis Tagihan</span>
        </div>
        <span style="font-size:11px;color:rgba(255,255,255,.75);font-weight:600">${bulan}</span>
      </div>
      <!-- Tabel Header -->
      <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;border-bottom:2px solid var(--border);background:var(--bg)">
        <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--text-l);text-transform:uppercase;letter-spacing:.5px">Jenis</div>
        <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;text-align:center;border-left:1px solid var(--border)">✅ Terkumpul</div>
        <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;text-align:center;border-left:1px solid var(--border)">❌ Tunggakan</div>
      </div>
      <!-- Row Uang Makan -->
      <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;border-bottom:1px solid var(--border)">
        <div style="padding:12px 12px;display:flex;align-items:center;gap:8px">
          <div style="width:36px;height:36px;border-radius:10px;background:#fff7ed;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🍽️</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">Uang Makan</div>
            <div style="font-size:10px;color:var(--text-l);margin-top:1px">${fmtRp(nomMakan)}/santri → Dapur</div>
          </div>
        </div>
        <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#f0fdf4">
          <div style="font-size:12px;font-weight:800;color:var(--green)">${fmtRp(makanTerkumpul)}</div>
          <div style="font-size:10px;color:var(--green);margin-top:3px;font-weight:600">${lunasCount} santri</div>
        </div>
        <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#fff5f5">
          <div style="font-size:12px;font-weight:800;color:var(--red)">${fmtRp(makanTunggakan)}</div>
          <div style="font-size:10px;color:var(--red);margin-top:3px;font-weight:600">${belumCount} santri</div>
        </div>
      </div>
      <!-- Row Uang Listrik -->
      <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr">
        <div style="padding:12px 12px;display:flex;align-items:center;gap:8px">
          <div style="width:36px;height:36px;border-radius:10px;background:#fefce8;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⚡</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">Uang Listrik</div>
            <div style="font-size:10px;color:var(--text-l);margin-top:1px">${fmtRp(nomListrik)}/santri → Kas</div>
          </div>
        </div>
        <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#f0fdf4">
          <div style="font-size:12px;font-weight:800;color:var(--green)">${fmtRp(listrikTerkumpul)}</div>
          <div style="font-size:10px;color:var(--green);margin-top:3px;font-weight:600">${lunasCount} santri</div>
        </div>
        <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#fff5f5">
          <div style="font-size:12px;font-weight:800;color:var(--red)">${fmtRp(listrikTunggakan)}</div>
          <div style="font-size:10px;color:var(--red);margin-top:3px;font-weight:600">${belumCount} santri</div>
        </div>
      </div>
      <!-- Footer total -->
      <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;background:var(--bg);border-top:2px solid var(--border)">
        <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--text-l);text-transform:uppercase;display:flex;align-items:center">Total</div>
        <div style="padding:10px 10px;text-align:center;border-left:1px solid var(--border)">
          <div style="font-size:13px;font-weight:800;color:var(--green)">${fmtRp(makanTerkumpul+listrikTerkumpul)}</div>
        </div>
        <div style="padding:10px 10px;text-align:center;border-left:1px solid var(--border)">
          <div style="font-size:13px;font-weight:800;color:var(--red)">${fmtRp(makanTunggakan+listrikTunggakan)}</div>
        </div>
      </div>
    </div>
  `;

  // Dapur cards (admin + semua dapur)
  const dapurCardsEl = document.getElementById('dapur-cards');
  if(isKangAdmin() && !ACTIVE_DAPUR){
    let dc='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px">';
    DAPUR_LIST.forEach(d=>{
      const sIds=new Set(ALL_SANTRI.filter(s=>String(s.dapur_id)===String(d.id)).map(s=>String(s.id)));
      const tg=ALL_TAGIHAN.filter(t=>sIds.has(String(t.santri_id))&&(t.bulan||'').toLowerCase()===bulan.toLowerCase());
      const lunDapur=tg.filter(t=>t.status==='lunas');
      const belumDapur=tg.filter(t=>t.status!=='lunas');
      // Hitung santri UNIK yang lunas dan belum lunas di bulan ini
      const lunSantriIds=new Set(lunDapur.map(t=>String(t.santri_id)));
      const belumSantriIds=new Set(belumDapur.map(t=>String(t.santri_id)));
      const lunJml=lunSantriIds.size;
      const belumJml=belumSantriIds.size;
      const lun=lunDapur.reduce((a,t)=>a+Number(t.nominal),0);
      const tot=tg.reduce((a,t)=>a+Number(t.nominal),0);
      const pct=tot>0?Math.round(lun/tot*100):0;
      const makanD = lunJml * nomMakan;
      const listrikD = lunJml * nomListrik;
      const makanTunggD = belumJml * nomMakan;
      const listrikTunggD = belumJml * nomListrik;
      dc+=`<div style="background:var(--white);border:1.5px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--sh);cursor:pointer" onclick="setActiveDapur('${d.id}',document.getElementById('dtab-${d.id}'))">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-m) 100%);padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:15px">${d.emoji}</span>
            <span style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px">${d.nama}</span>
          </div>
          <span style="font-size:11px;color:rgba(255,255,255,.8);font-weight:600;background:rgba(255,255,255,.15);padding:2px 8px;border-radius:20px">${sIds.size} santri</span>
        </div>
        <!-- Tabel Header -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;border-bottom:2px solid var(--border);background:var(--bg)">
          <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--text-l);text-transform:uppercase;letter-spacing:.5px">Jenis</div>
          <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;text-align:center;border-left:1px solid var(--border)">✅ Terima</div>
          <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;text-align:center;border-left:1px solid var(--border)">❌ Tunggu</div>
        </div>
        <!-- Row Makan -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;border-bottom:1px solid var(--border)">
          <div style="padding:10px 12px;display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:8px;background:#fff7ed;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">🍽️</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--text)">Makan</div>
              <div style="font-size:10px;color:var(--text-l)">${fmtRp(nomMakan)}/santri</div>
            </div>
          </div>
          <div style="padding:10px 8px;text-align:center;border-left:1px solid var(--border);background:#f0fdf4">
            <div style="font-size:12px;font-weight:800;color:var(--green)">${fmtRp(makanD)}</div>
            <div style="font-size:10px;color:var(--green);margin-top:2px;font-weight:600">${lunJml} santri</div>
          </div>
          <div style="padding:10px 8px;text-align:center;border-left:1px solid var(--border);background:#fff5f5">
            <div style="font-size:12px;font-weight:800;color:var(--red)">${fmtRp(makanTunggD)}</div>
            <div style="font-size:10px;color:var(--red);margin-top:2px;font-weight:600">${belumJml} santri</div>
          </div>
        </div>
        <!-- Row Listrik -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr">
          <div style="padding:10px 12px;display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:8px;background:#fefce8;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">⚡</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--text)">Listrik</div>
              <div style="font-size:10px;color:var(--text-l)">${fmtRp(nomListrik)}/santri</div>
            </div>
          </div>
          <div style="padding:10px 8px;text-align:center;border-left:1px solid var(--border);background:#f0fdf4">
            <div style="font-size:12px;font-weight:800;color:var(--green)">${fmtRp(listrikD)}</div>
            <div style="font-size:10px;color:var(--green);margin-top:2px;font-weight:600">${lunJml} santri</div>
          </div>
          <div style="padding:10px 8px;text-align:center;border-left:1px solid var(--border);background:#fff5f5">
            <div style="font-size:12px;font-weight:800;color:var(--red)">${fmtRp(listrikTunggD)}</div>
            <div style="font-size:10px;color:var(--red);margin-top:2px;font-weight:600">${belumJml} santri</div>
          </div>
        </div>
        <!-- Footer -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;background:var(--bg);border-top:2px solid var(--border)">
          <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--text-l);text-transform:uppercase;display:flex;align-items:center">Total</div>
          <div style="padding:8px 8px;text-align:center;border-left:1px solid var(--border)">
            <div style="font-size:12px;font-weight:800;color:var(--green);white-space:nowrap">${fmtRp(makanD+listrikD)}</div>
          </div>
          <div style="padding:8px 8px;text-align:center;border-left:1px solid var(--border)">
            <div style="font-size:12px;font-weight:800;color:var(--red);white-space:nowrap">${fmtRp(makanTunggD+listrikTunggD)}</div>
          </div>
        </div>
        <!-- Progress -->
        <div style="padding:8px 12px;background:var(--bg);border-top:1px solid var(--border)">
          <div class="prog-wrap" style="margin-bottom:4px"><div class="prog-fill" style="width:${pct}%"></div></div>
          <div style="font-size:10px;color:var(--text-l);text-align:center">${pct}% terkumpul</div>
        </div>
      </div>`;
    });
    dc+='</div>';
    dapurCardsEl.innerHTML=dc;
  } else if(ACTIVE_DAPUR){
    const sIds=new Set(ALL_SANTRI.filter(s=>String(s.dapur_id)===String(ACTIVE_DAPUR)).map(s=>String(s.id)));
    const tg=tagihanBulan.filter(t=>sIds.has(String(t.santri_id)));
    const lunDapur=tg.filter(t=>t.status==='lunas');
    const belumDapur=tg.filter(t=>t.status!=='lunas');
    const lunJml=lunDapur.length;
    const belumJml=belumDapur.length;
    const makanD=lunJml*nomMakan, listrikD=lunJml*nomListrik;
    const makanTunggD=belumJml*nomMakan, listrikTunggD=belumJml*nomListrik;
    dapurCardsEl.innerHTML=`
      <div style="background:var(--white);border:1.5px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--sh);margin-bottom:16px">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-m) 100%);padding:14px 18px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">📊</span>
            <span style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px">Rincian ${getDapurNama(ACTIVE_DAPUR)}</span>
          </div>
          <span style="font-size:11px;color:rgba(255,255,255,.75);font-weight:600">${bulan}</span>
        </div>
        <!-- Tabel Header -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;border-bottom:2px solid var(--border);background:var(--bg)">
          <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--text-l);text-transform:uppercase;letter-spacing:.5px">Jenis</div>
          <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;text-align:center;border-left:1px solid var(--border)">✅ Terkumpul</div>
          <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;text-align:center;border-left:1px solid var(--border)">❌ Tunggakan</div>
        </div>
        <!-- Row Uang Makan -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;border-bottom:1px solid var(--border)">
          <div style="padding:12px 12px;display:flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;border-radius:10px;background:#fff7ed;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🍽️</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">Uang Makan</div>
              <div style="font-size:10px;color:var(--text-l);margin-top:1px">${fmtRp(nomMakan)}/santri → Dapur</div>
            </div>
          </div>
          <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#f0fdf4">
            <div style="font-size:12px;font-weight:800;color:var(--green)">${fmtRp(makanD)}</div>
            <div style="font-size:10px;color:var(--green);margin-top:3px;font-weight:600">${lunJml} santri</div>
          </div>
          <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#fff5f5">
            <div style="font-size:12px;font-weight:800;color:var(--red)">${fmtRp(makanTunggD)}</div>
            <div style="font-size:10px;color:var(--red);margin-top:3px;font-weight:600">${belumJml} santri</div>
          </div>
        </div>
        <!-- Row Uang Listrik -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr">
          <div style="padding:12px 12px;display:flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;border-radius:10px;background:#fefce8;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⚡</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">Uang Listrik</div>
              <div style="font-size:10px;color:var(--text-l);margin-top:1px">${fmtRp(nomListrik)}/santri → Kas</div>
            </div>
          </div>
          <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#f0fdf4">
            <div style="font-size:12px;font-weight:800;color:var(--green)">${fmtRp(listrikD)}</div>
            <div style="font-size:10px;color:var(--green);margin-top:3px;font-weight:600">${lunJml} santri</div>
          </div>
          <div style="padding:12px 8px;text-align:center;border-left:1px solid var(--border);background:#fff5f5">
            <div style="font-size:12px;font-weight:800;color:var(--red)">${fmtRp(listrikTunggD)}</div>
            <div style="font-size:10px;color:var(--red);margin-top:3px;font-weight:600">${belumJml} santri</div>
          </div>
        </div>
        <!-- Footer total -->
        <div style="display:grid;grid-template-columns:1.8fr 1fr 1fr;background:var(--bg);border-top:2px solid var(--border)">
          <div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--text-l);text-transform:uppercase;display:flex;align-items:center">Total</div>
          <div style="padding:10px 10px;text-align:center;border-left:1px solid var(--border)">
            <div style="font-size:13px;font-weight:800;color:var(--green)">${fmtRp(makanD+listrikD)}</div>
          </div>
          <div style="padding:10px 10px;text-align:center;border-left:1px solid var(--border)">
            <div style="font-size:13px;font-weight:800;color:var(--red)">${fmtRp(makanTunggD+listrikTunggD)}</div>
          </div>
        </div>
      </div>`;
  } else {
    dapurCardsEl.innerHTML='';
  }

  // WA Massal button
  const hasBelum = belum.some(t=>{ const s=getSantriById(t.santri_id); return s?.no_wa; });
  const wabtn=document.getElementById('btn-wa-massal');
  if(wabtn) wabtn.style.display=hasBelum?'inline-flex':'none';

  // Tabel tagihan bulan ini
  const rows = tagihanBulan.map((t,i)=>{
    const s=getSantriById(t.santri_id)||{};
    const kobongNama=s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const statusBadge = t.status==='lunas'?`<span class="badge badge-lunas">✅ Lunas</span>`:t.status==='cicil'?`<span class="badge badge-cicil">⏳ Cicilan</span>`:`<span class="badge badge-belum">❌ Belum</span>`;
    return `<tr>
      <td style="color:var(--text-l)">${i+1}</td>
      <td class="col-nama"><div style="display:flex;align-items:center;gap:8px">
        <div class="av" style="background:${avColor(s.nama||'')}22;color:${avColor(s.nama||'')}">${s.foto_url?`<img src="${s.foto_url}" style="width:100%;height:100%;object-fit:cover">`:avLetter(s.nama||'?')}</div>
        <button onclick="openDetailModal('${t.santri_id}')" style="background:none;border:none;cursor:pointer;font-weight:600;text-align:left;color:var(--text);padding:0">${s.nama||t.santri_nama||'—'}</button>
      </div></td>
      <td>${s.kelas||'—'}</td>
      <td><span class="badge badge-bg">${kobongNama}</span></td>
      <td><span class="badge badge-dapur">${getDapurEmoji(t.dapur_id)} ${getDapurNama(t.dapur_id)}</span></td>
      <td>${t.bulan||'—'}</td>
      <td>${fmtRp(t.nominal_makan||0)}</td>
      <td>${fmtRp(t.nominal_listrik||0)}</td>
      <td><strong>${fmtRp(t.nominal)}</strong></td>
      <td>${statusBadge}</td>
      <td>
        ${t.status!=='lunas'?`<button class="btn btn-p btn-xs" onclick="bukaMoBayar('${t.id}')">💰 Bayar</button>`:''}
        ${s.no_wa&&t.status!=='lunas'?`<button class="btn btn-wa btn-xs" style="margin-left:4px" onclick="kirimWASantri('${t.santri_id}','${t.bulan||bulan}')">📱</button>`:''}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('dash-tagihan-summary').innerHTML = rows.length
    ? `<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="col-nama">Santri</th><th>Kelas</th><th>Kobong</th><th>Dapur</th><th>Bulan</th><th>Uang Makan</th><th>Uang Listrik</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : `<div class="empty"><span class="ei">📋</span><p>Belum ada tagihan bulan ini.</p></div>`;
}

