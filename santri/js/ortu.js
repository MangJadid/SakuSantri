// ===== FILTER KELAS =====
function populateFilterKelas(){
  const sel = document.getElementById('santri-kelas');
  if(!sel) return;
  const kelasSet = new Set(ALL_SANTRI.map(s=>s.kelas).filter(Boolean));
  const sorted = [...kelasSet].sort((a,b)=>{
    const na=parseInt(a), nb=parseInt(b);
    if(!isNaN(na)&&!isNaN(nb)) return na-nb;
    return a.localeCompare(b,'id');
  });
  const cur = sel.value;
  sel.innerHTML='<option value="">Semua Kelas</option>'+sorted.map(k=>`<option value="${k}" ${cur===k?'selected':''}>${k}</option>`).join('');
}

// ===== DETAIL ORTU =====
async function updateBadgeSyahriyah(){
  if(SESSION.role!=='ortu') return;
  const santriId = SESSION.santri?.id;
  if(!santriId) return;
  try{
    const {data} = await SB.from('tagihan_pondok').select('id').eq('santri_id',String(santriId)).neq('status','lunas');
    const cnt = data?.length||0;
    ['badge-syahriyah','badge-syahriyah-sb'].forEach(elId=>{
      const badge = document.getElementById(elId);
      if(!badge) return;
      badge.style.display = cnt>0 ? 'flex' : 'none';
      badge.textContent = cnt;
    });
  } catch(e){}
}

async function renderDetailOrtu(){
  const s=SESSION.santri;
  const kritis=parseInt(CONFIG.kritis_batas)||50000;
  // Ambil transaksi via RPC (PIN diverifikasi server-side)
  let txs = [];
  const { data: txRpc } = await SB.rpc('get_transaksi_ortu', {
    p_santri_id: String(s.id), p_pin: SESSION.pin||''
  });
  if(txRpc?.data) txs = txRpc.data;
  const k=s.kobong?.nama||getKobongNama(s.kobong_id)||'Belum ditentukan';
  const _dapurMapO={'dapur_bibi':'Dapur Bibi','dapur_ummi':'Dapur Ummi','dapur_buonih':'Dapur Bu Onih'};
  const dapurValO = _dapurMapO[s.dapur_id] || s.dapur_id || '—';
  const _kbForAsramaO = ALL_KOBONG.find(x=>x.id==s.kobong_id);
  const asramaValO = _kbForAsramaO?.asrama?.nama || '—';
  const kelasValO = s.kelas || '—';
  // Hitung saldo dari transaksi (SUMBER KEBENARAN)
  const totalMasukO  = (txs||[]).filter(t=>t.jenis==='masuk').reduce((a,t)=>a+t.nominal,0);
  const totalKeluarO = (txs||[]).filter(t=>t.jenis==='keluar').reduce((a,t)=>a+t.nominal,0);
  const saldoRealO   = totalMasukO - totalKeluarO;
  const sc=saldoRealO<0?'s-minus':saldoRealO===0?'s-nol':saldoRealO<kritis?'s-warn':'s-ok';

  let txHtml=`<div class="empty"><span class="ei">📝</span><p>Belum ada transaksi</p><p style="font-size:12px;color:var(--text-l);margin-top:6px;max-width:280px;margin-left:auto;margin-right:auto;line-height:1.6">Data uang jajan santri akan muncul jika uang jajan santri dititipkan kepada pengurus kobong.</p></div>`;
  if(txs&&txs.length){
    let running=0;
    const ws=[...txs].reverse().map(t=>{ running+=t.jenis==='masuk'?t.nominal:-t.nominal; return {...t,running}; }).reverse();
    txHtml=`<div class="tw"><table>
      <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Masuk</th><th>Keluar</th><th>Saldo</th></tr></thead>
      <tbody>`;
    ws.forEach(t=>{
      const sc2=t.running<0?'s-minus':t.running===0?'s-nol':t.running<kritis?'s-warn':'s-ok';
      txHtml+=`<tr>
        <td style="font-size:11.5px;color:var(--text-l);white-space:nowrap">${fmtTanggal(t.tanggal)}</td>
        <td style="font-weight:500">${t.keterangan||'—'}</td>
        <td class="s-ok dh-nominal">${t.jenis==='masuk'?rp(t.nominal):'—'}</td>
        <td class="dh-nominal" style="color:var(--red)">${t.jenis==='keluar'?rp(t.nominal):'—'}</td>
        <td><strong class="${sc2} dh-nominal">${t.running<0?'−':''} ${rp(t.running)}</strong></td>
      </tr>`;
    });
    txHtml+=`</tbody></table></div>`;
  }

  document.getElementById('detail-content').innerHTML=`
    <div style="background:linear-gradient(160deg,var(--green-m),var(--green));border-radius:20px;overflow:hidden">
      <div style="padding:20px 20px 16px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:56px;height:56px;border-radius:50%;border:2px solid var(--gold-l);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.16);font-size:20px;font-weight:700;color:#fff">${s.foto_url?'<img src="'+s.foto_url+'" style="width:100%;height:100%;object-fit:cover">':avLetter(s.nama)}</div>
          <div>
            <div style="font-family:'Lora',serif;font-size:18px;font-weight:700;color:#fdf9ee">${s.nama}</div>
            <div style="font-size:12px;color:#bcd6c5;margin-top:2px">Kelas ${kelasValO} · Asrama ${asramaValO}</div>
          </div>
        </div>
        <div style="height:1px;background:rgba(255,255,255,.15);margin:16px 0 14px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:7px 13px">
            <span style="color:var(--gold-l);display:flex">${svgIcon('utensils',13)}</span>
            <span style="font-size:12px;font-weight:600;color:var(--gold-l)">${dapurValO}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:7px 13px">
            <span style="color:#bcd6c5;display:flex">${svgIcon('home',13)}</span>
            <span style="font-size:12px;font-weight:600;color:#bcd6c5">${k}</span>
          </div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,.18);padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
        <div style="flex:1;min-width:0">
          <div style="font-size:10.5px;font-weight:700;color:#a9c9b6;letter-spacing:1px">SALDO AKHIR</div>
          <div class="amt" id="dh-amt-2" style="font-family:'Lora',serif;font-size:26px;font-weight:700;margin-top:4px;white-space:nowrap;color:${saldoRealO<0?'#ff8a8a':'var(--gold-l)'}">${saldoRealO<0?'− ':''}${rp(saldoRealO)}</div>
        </div>
        <button class="dh-eye" onclick="dhToggle('dh-amt-2',this)" style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.1);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#bcd6c5;flex-shrink:0">${svgIcon('eye',18)}</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;margin-bottom:18px">
      <div style="background:var(--surface);border:1px solid var(--green-b);border-radius:14px;padding:14px">
        <div style="font-size:10.5px;font-weight:700;color:var(--text-l);letter-spacing:.6px">TOTAL PEMASUKAN</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);margin-top:6px">${rp(totalMasukO)}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--red-b);border-radius:14px;padding:14px">
        <div style="font-size:10.5px;font-weight:700;color:var(--text-l);letter-spacing:.6px">TOTAL PENGELUARAN</div>
        <div style="font-size:18px;font-weight:700;color:var(--red);margin-top:6px">${rp(totalKeluarO)}</div>
      </div>
    </div>
    <div class="panel">
      <div class="ph"><h2>${svgIcon('document',16)} Riwayat Transaksi</h2></div>
      <div class="pb">${txHtml}</div>
    </div>`;
}

// ===== UANG SYAHRIYAH ORTU =====
async function renderSyahriyahOrtu(){
  updateBadgeSyahriyah();
  const container = document.getElementById('syahriyah-content');
  if(!container) return;

  const santri = SESSION.santri;
  const santriId = santri?.id;
  const santriNama = santri?.nama || '';

  // Ambil foto & deposit dulu
  const fotoUrl = santri?.foto_url || '';
  const avHtml = fotoUrl
    ? `<img src="${fotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span style="font-size:22px;font-weight:700;color:#fff">${santriNama.charAt(0).toUpperCase()}</span>`;

  // Untuk role ortu, ALL_SANTRI & ALL_KOBONG kosong — pakai SESSION.santri langsung
  const _dapurMapSy={'dapur_bibi':'Dapur Bibi','dapur_ummi':'Dapur Ummi','dapur_buonih':'Dapur Bu Onih'};
  let _sObjSy = ALL_SANTRI.find(x=>x.id==santriId) || santri || {};
  let _kbSy = ALL_KOBONG.find(x=>x.id==_sObjSy.kobong_id);

  // Jika kobong belum ada (ortu), fetch langsung dari DB
  if(!_kbSy && (_sObjSy.kobong_id || santri?.kobong_id)){
    const kbId = _sObjSy.kobong_id || santri?.kobong_id;
    const {data:kbData} = await SB.from('kobong').select('id,nama,asrama(id,nama)').eq('id',kbId).maybeSingle();
    if(kbData) _kbSy = kbData;
  }

  const kamarSy = _kbSy?.nama || santri?.kobong?.nama || santri?.kobong_nama || 'Belum ditentukan';
  const kelasSy = (_sObjSy.kelas || santri?.kelas || '—');
  const dapurSy = _dapurMapSy[_sObjSy.dapur_id || santri?.dapur_id] || _sObjSy.dapur_id || santri?.dapur_id || '—';
  const asramaSy = _kbSy?.asrama?.nama || '—';

  container.innerHTML = `
    <div class="dh" style="margin-bottom:20px">
      
      <div class="dh-inner">
        <div class="dh-top">
          <div class="dh-av" style="overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--green)">${avHtml}</div>
          <div class="dh-name-wrap"><div class="dh-info"><h3>Uang Syahriyah</h3>
            <div style="font-size:11px;opacity:.72;margin-top:3px;word-break:break-word;overflow-wrap:anywhere">${santriNama} · ${CONFIG.pesantren_nama||'Pesantren'}</div>
          </div></div>
        </div>
        <div class="dh-meta">
          <div class="dh-meta-row"><span>${svgIcon('home',12)}</span><span>${kamarSy}</span><span class="sep">·</span><span style="display:inline-flex;align-items:center;gap:3px">${svgIcon('graduation-cap',12)} Kelas ${kelasSy}</span></div>
          <div class="dh-meta-row"><span>${svgIcon('utensils',12)}</span><span>${dapurSy}</span><span class="sep">·</span><span>${svgIcon('map-pin',12)}</span><span>${asramaSy}</span></div>
        </div>
      </div>
    </div>
    <div id="syahriyah-deposit-info" style="margin-bottom:14px"></div>
    <div class="panel">
      <div class="ph"><h2>${svgIcon('archive',16)} Tagihan Bulanan</h2></div>
      <div class="pb" id="syahriyah-list"><div style="text-align:center;padding:32px;color:var(--text-l)">⏳ Memuat...</div></div>
    </div>`;

  try {
    // Ambil tagihan dan deposit bersamaan
    const [tagihanRpc, depositRes] = await Promise.all([
      SB.rpc('get_tagihan_ortu', { p_santri_id: String(santriId), p_pin: SESSION.pin||'' }),
      SB.from('santri_deposit').select('*').eq('santri_id', santriId).maybeSingle()
    ]);
    const tagihan = tagihanRpc?.data?.data || null;
    const saldoDeposit = depositRes.data ? Number(depositRes.data.saldo||0) : 0;

    // Tampilkan info deposit jika ada
    const depEl = document.getElementById('syahriyah-deposit-info');
    if(depEl && saldoDeposit > 0){
      const nomBulan = 420000; // nominal per bulan
      const bulanLagi = Math.floor(saldoDeposit / nomBulan);
      depEl.innerHTML = `<div style="background:#fef9e7;border:1px solid #f9ca24;border-radius:12px;padding:14px 16px">
        <div style="font-size:12px;color:#7d6608;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:4px">${svgIcon('bank',12)} SALDO DEPOSIT</div>
        <div style="font-size:22px;font-weight:800;color:#b7770d;margin-bottom:6px">Rp ${saldoDeposit.toLocaleString('id-ID')}</div>
        <div style="font-size:12px;color:#7d6608">Uang ini sudah dititipkan ke pesantren dan akan <strong>otomatis dipotong</strong> untuk tagihan bulan berikutnya${bulanLagi>0?' (~'+bulanLagi+' bulan lagi)':''}.</div>
      </div>`;
    }

    const _bulanOrd=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; function _pbt(s){ const p=(s||'').split(' '); return (parseInt(p[1])||0)*100+_bulanOrd.indexOf(p[0]); } const list = (tagihan||[]).sort((a,b)=>_pbt(b.bulan)-_pbt(a.bulan));
    const listEl = document.getElementById('syahriyah-list');
    if(!listEl) return;

    if(list.length === 0){
      listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-l)">
        <div style="margin-bottom:12px;color:var(--green);display:flex;justify-content:center">${svgIcon('check-circle',40)}</div>
        <p>Belum ada tagihan syahriyah</p>
      </div>`;
      return;
    }

    const totalTagihan = list.reduce((a,t)=>a+Number(t.nominal||0),0);
    const totalBayar = list.reduce((a,t)=>a+Number(t.nominal_bayar||0),0);
    const sisaHutang = totalTagihan - totalBayar;

    const fmtRp = n => 'Rp '+Number(n).toLocaleString('id-ID');
    const statusBadge = s => {
      if(s==='lunas') return `<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('check-circle',11)} Lunas</span>`;
      if(s==='cicil') return `<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('clock',11)} Cicilan</span>`;
      return `<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">${svgIcon('x',11)} Belum Bayar</span>`;
    };

    listEl.innerHTML = `
      <div style="margin-bottom:16px;border-radius:12px;overflow:hidden;border:1.5px solid #E5E7EB;box-shadow:0 4px 14px rgba(0,0,0,.08)">
        <!-- Baris 1: Sisa Tagihan full width -->
        <div style="background:${sisaHutang>0?'linear-gradient(135deg,#7f1d1d,#991b1b)':'linear-gradient(135deg,#065f46,#047857)'};padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="color:rgba(255,255,255,.65);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;display:flex;align-items:center;gap:4px">${sisaHutang>0?svgIcon('alert-triangle',11)+' Sisa Tagihan':svgIcon('check-circle',11)+' Status'}</div>
            <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-.5px">${sisaHutang>0?fmtRp(sisaHutang):'Lunas'}</div>
            <div style="color:rgba(255,255,255,.5);font-size:10px;margin-top:3px">${sisaHutang>0?'Belum lunas':'Semua terbayar'}</div>
          </div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-size:26px;font-weight:900;color:rgba(255,255,255,.9)">${totalTagihan>0?Math.round(totalBayar/totalTagihan*100):100}%</div>
            <div style="font-size:9.5px;color:rgba(255,255,255,.5)">terbayar</div>
          </div>
        </div>
        <!-- Progress bar -->
        <div style="height:5px;background:rgba(0,0,0,.1)">
          <div style="height:100%;width:${totalTagihan>0?Math.round(totalBayar/totalTagihan*100):100}%;background:linear-gradient(90deg,#4ADE80,#2BAE68)"></div>
        </div>
        <!-- Baris 2: Total | Sudah Bayar -->
        <div style="display:grid;grid-template-columns:1fr 1fr">
          <div style="background:#fff;padding:12px 14px;border-right:1px solid #E5E7EB">
            <div style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Total Tagihan</div>
            <div style="font-size:14px;font-weight:800;color:#111827">${fmtRp(totalTagihan)}</div>
          </div>
          <div style="background:#F0FDF4;padding:12px 14px">
            <div style="font-size:9px;font-weight:700;color:#065F46;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Sudah Bayar</div>
            <div style="font-size:14px;font-weight:800;color:#0D4F2E">${fmtRp(totalBayar)}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${list.map(t => {
          const sisa = Number(t.nominal||0) - Number(t.nominal_bayar||0);
          return `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--card)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-weight:700;font-size:14px">${t.bulan||'—'}</div>
              ${statusBadge(t.status)}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--text-m)">
              ${t.nominal_makan>0?`<div style="display:flex;justify-content:space-between"><span>Uang Makan</span><span>${fmtRp(t.nominal_makan)}</span></div>`:''}
              ${t.nominal_listrik>0?`<div style="display:flex;justify-content:space-between"><span>Uang Listrik</span><span>${fmtRp(t.nominal_listrik)}</span></div>`:''}
              ${t.nominal_bayar>0?`<div style="display:flex;justify-content:space-between;color:var(--green)"><span>Sudah Dibayar</span><span>${fmtRp(t.nominal_bayar)}</span></div>`:''}
              ${sisa>0?`<div style="display:flex;justify-content:space-between;color:#dc2626;font-weight:700;border-top:1px solid var(--border);padding-top:6px;margin-top:4px"><span>Sisa</span><span>${fmtRp(sisa)}</span></div>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    const listEl = document.getElementById('syahriyah-list');
    if(listEl) listEl.innerHTML = `<div style="color:red;padding:16px">❌ Gagal memuat: ${e.message}</div>`;
  }
}

// ===== PROFIL SANTRI (ortu) -- data diambil dari input yang sudah ada, termasuk wali kobong =====
async function renderProfilOrtu(){
  const container = document.getElementById('profil-content');
  if(!container) return;
  const santri = SESSION.santri || {};
  const santriId = santri.id;

  const _dapurMapP={'dapur_bibi':'Dapur Bibi','dapur_ummi':'Dapur Ummi','dapur_buonih':'Dapur Bu Onih'};
  let _sObjP = ALL_SANTRI.find(x=>x.id==santriId) || santri;
  let _kbP = ALL_KOBONG.find(x=>x.id==_sObjP.kobong_id);
  if(!_kbP && (_sObjP.kobong_id || santri.kobong_id)){
    const kbId = _sObjP.kobong_id || santri.kobong_id;
    const {data:kbData} = await SB.from('kobong').select('id,nama,asrama(id,nama)').eq('id',kbId).maybeSingle();
    if(kbData) _kbP = kbData;
  }
  const kobongP = _kbP?.nama || santri.kobong?.nama || santri.kobong_nama || 'Belum ditentukan';
  const asramaP = _kbP?.asrama?.nama || '—';
  const kelasP = _sObjP.kelas || santri.kelas || '—';
  const dapurP = _dapurMapP[_sObjP.dapur_id || santri.dapur_id] || _sObjP.dapur_id || santri.dapur_id || '—';
  const tglMasukRaw = _sObjP.created_at || santri.created_at;
  const tglMasukP = tglMasukRaw ? (()=>{ const d=new Date(tglMasukRaw); return `${d.getDate()} ${bNames[d.getMonth()]} ${d.getFullYear()}`; })() : '—';
  const nisnP = _sObjP.nisn || santri.nisn || '—';

  // Wali kobong -- pengurus yang mengelola santri ini (santri.created_by)
  let waliNamaP = '—', waliHpP = '—';
  const createdBy = _sObjP.created_by || santri.created_by;
  if(createdBy){
    try{
      const {data:pgData} = await SB.from('pengurus').select('nama,no_wa').eq('username', createdBy).maybeSingle();
      if(pgData){ waliNamaP = pgData.nama || '—'; waliHpP = pgData.no_wa || '—'; }
    }catch(e){}
  }
  const alamatP = [santri.kecamatan||_sObjP.kecamatan, santri.kota||_sObjP.kota].filter(Boolean).join(', ') || '—';

  const fotoUrl = santri.foto_url || '';
  const avHtml = fotoUrl
    ? `<img src="${fotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span style="font-size:26px;font-weight:700;color:#fff">${(santri.nama||'?').charAt(0).toUpperCase()}</span>`;

  const infoRow = (label, val) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12.5px;color:var(--text-l)">${label}</span>
      <span style="font-size:13px;font-weight:600;color:var(--text)">${val}</span>
    </div>`;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <div style="width:3px;height:16px;background:var(--gold-l);border-radius:2px"></div>
      <div style="font-family:'Lora',serif;font-size:16px;font-weight:600;color:var(--text)">Profil Santri</div>
    </div>

    <div style="display:flex;flex-direction:column;align-items:center;background:linear-gradient(150deg,var(--green-m),var(--green));border-radius:20px;padding:26px 20px 22px">
      <div style="width:76px;height:76px;border-radius:50%;border:2px solid var(--gold-l);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.16)">${avHtml}</div>
      <div style="font-family:'Lora',serif;font-size:19px;font-weight:700;color:#fdf9ee;margin-top:12px">${santri.nama||'—'}</div>
      <div style="font-size:12.5px;color:rgba(255,255,255,.65);margin-top:3px">NISN ${nisnP}</div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;margin-top:14px;padding:0 18px">
      ${infoRow('Kelas', 'Kelas '+kelasP)}
      ${infoRow('Asrama', asramaP)}
      ${infoRow('Kobong', kobongP)}
      ${infoRow('Dapur', dapurP)}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 0">
        <span style="font-size:12.5px;color:var(--text-l)">Tanggal Masuk</span>
        <span style="font-size:13px;font-weight:600;color:var(--text)">${tglMasukP}</span>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-top:22px;margin-bottom:12px">
      <div style="width:3px;height:16px;background:var(--gold-l);border-radius:2px"></div>
      <div style="font-family:'Lora',serif;font-size:15px;font-weight:600;color:var(--text)">Wali Kobong</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:0 18px">
      ${infoRow('Nama Wali', waliNamaP)}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:12.5px;color:var(--text-l)">No. HP</span>
        ${waliHpP!=='—'?`<a href="https://wa.me/62${waliHpP.replace(/^0/,'')}" target="_blank" style="font-size:13px;font-weight:600;color:var(--green-l);text-decoration:none">${waliHpP}</a>`:`<span style="font-size:13px;font-weight:600;color:var(--text)">—</span>`}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 0">
        <span style="font-size:12.5px;color:var(--text-l)">Alamat</span>
        <span style="font-size:13px;font-weight:600;color:var(--text);text-align:right;max-width:60%">${alamatP}</span>
      </div>
    </div>`;
}

