// ===== DETAIL MODAL =====
async function openDetailModal(id){
  const s = ALL_SANTRI.find(x=>x.id===id);
  if(!s) return;

  // Tampilkan skeleton dulu
  document.getElementById('mo-detail-nama').textContent = s.nama;
  document.getElementById('mo-detail-body').innerHTML = `
    <div style="padding:4px 0">
      <div style="background:linear-gradient(145deg,#0f5c35,#0D4F2E);border-radius:16px;overflow:hidden;margin-bottom:14px">
        <div style="padding:18px 18px 14px 22px;display:flex;align-items:center;gap:14px">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.15);flex-shrink:0"></div>
          <div style="flex:1">
            <div style="height:14px;background:rgba(255,255,255,.2);border-radius:6px;width:60%;margin-bottom:8px"></div>
            <div style="height:10px;background:rgba(255,255,255,.12);border-radius:6px;width:40%"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;padding:10px 18px">
          <div style="height:28px;background:rgba(255,255,255,.1);border-radius:8px;width:100px"></div>
          <div style="height:28px;background:rgba(255,255,255,.1);border-radius:8px;width:110px"></div>
        </div>
        <div style="background:rgba(0,0,0,.22);border-top:1px solid rgba(255,255,255,.07);padding:14px 18px">
          <div style="height:10px;background:rgba(255,255,255,.15);border-radius:4px;width:70px;margin-bottom:8px"></div>
          <div style="height:26px;background:rgba(255,255,255,.2);border-radius:6px;width:130px"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:#fff;border:1.5px solid #D1FAE5;border-radius:12px;padding:14px 12px">
          <div style="width:34px;height:34px;background:#f0f0f0;border-radius:8px;margin-bottom:10px"></div>
          <div style="height:9px;background:#eee;border-radius:4px;width:80%;margin-bottom:6px"></div>
          <div style="height:18px;background:#e0e0e0;border-radius:4px;width:70%"></div>
        </div>
        <div style="background:#fff;border:1.5px solid #FECACA;border-radius:12px;padding:14px 12px">
          <div style="width:34px;height:34px;background:#f0f0f0;border-radius:8px;margin-bottom:10px"></div>
          <div style="height:9px;background:#eee;border-radius:4px;width:80%;margin-bottom:6px"></div>
          <div style="height:18px;background:#e0e0e0;border-radius:4px;width:70%"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;color:#9CA3AF;font-size:13px">
        <div style="width:16px;height:16px;border:2px solid #D1FAE5;border-top-color:#0D4F2E;border-radius:50%;animation:spin 0.7s linear infinite"></div>
        Memuat data...
      </div>
    </div>`;
  openMo('mo-detail');

  const {data:txs} = await SB.from('transaksi').select('*').eq('santri_id',id).order('tanggal',{ascending:false}).order('created_at',{ascending:false});
  const {data:tagihan} = await SB.from('tagihan_pondok').select('*').eq('santri_id',String(id)).order('created_at',{ascending:false});
  const kritis = parseInt(CONFIG.kritis_batas)||50000;
  const k = s.kobong?.nama||getKobongNama(s.kobong_id)||'Belum ditentukan';
  const _dapurMap={'dapur_bibi':'Dapur Bibi','dapur_ummi':'Dapur Ummi','dapur_buonih':'Dapur Bu Onih'};
  const dapurVal = _dapurMap[s.dapur_id] || s.dapur_id || '—';
  const _kbForAsrama = ALL_KOBONG.find(x=>x.id==s.kobong_id);
  const asramaVal = _kbForAsrama?.asrama?.nama || '—';
  const kelasVal = s.kelas || '—';

  // Build tagihan pondok HTML
  let tagihanHtml = '';
  if(!tagihan||!tagihan.length){
    tagihanHtml = '<div class="empty"><span class="ei">🧾</span><p>Belum ada tagihan pondok</p></div>';
  } else {
    const totalTagihan = tagihan.reduce((a,t)=>a+(t.nominal||0),0);
    const totalBelum = tagihan.filter(t=>t.status!=='lunas').reduce((a,t)=>a+(t.nominal||0),0);
    tagihanHtml = `
      <div style="margin-bottom:14px;border-radius:12px;overflow:hidden;border:1.5px solid #E5E7EB;box-shadow:0 4px 14px rgba(0,0,0,.08)">
        <!-- Baris 1: Sisa Tagihan full width -->
        <div style="background:${totalBelum>0?'linear-gradient(135deg,#7f1d1d,#991b1b)':'linear-gradient(135deg,#065f46,#047857)'};padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="color:rgba(255,255,255,.65);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">${totalBelum>0?'⚠️ Sisa Tagihan':'✅ Status'}</div>
            <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-.5px">${totalBelum>0?rp(totalBelum):'Lunas'}</div>
            <div style="color:rgba(255,255,255,.5);font-size:10px;margin-top:3px">${totalBelum>0?'Belum lunas':'Semua terbayar'}</div>
          </div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-size:26px;font-weight:900;color:rgba(255,255,255,.9)">${Math.round((totalTagihan-totalBelum)/totalTagihan*100)||0}%</div>
            <div style="font-size:9.5px;color:rgba(255,255,255,.5)">terbayar</div>
          </div>
        </div>
        <!-- Progress bar -->
        <div style="height:5px;background:rgba(0,0,0,.1)">
          <div style="height:100%;width:${Math.round((totalTagihan-totalBelum)/totalTagihan*100)||0}%;background:linear-gradient(90deg,#4ADE80,#2BAE68)"></div>
        </div>
        <!-- Baris 2: Total | Sudah Bayar -->
        <div style="display:grid;grid-template-columns:1fr 1fr">
          <div style="background:#fff;padding:12px 14px;border-right:1px solid #E5E7EB">
            <div style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Total Tagihan</div>
            <div style="font-size:14px;font-weight:800;color:#111827">${rp(totalTagihan)}</div>
          </div>
          <div style="background:#F0FDF4;padding:12px 14px">
            <div style="font-size:9px;font-weight:700;color:#065F46;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Sudah Bayar</div>
            <div style="font-size:14px;font-weight:800;color:#0D4F2E">${rp(totalTagihan-totalBelum)}</div>
          </div>
        </div>
      </div>
      ${tagihan.map(t => {
        const lunas = t.status === 'lunas';
        return `<div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;background:var(--bg)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="font-size:14px">${t.bulan||'—'}</strong>
            <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:${lunas?'#e8f5ee':'#fdecea'};color:${lunas?'var(--green)':'var(--red)'}">
              ${lunas?'✅ Lunas':'❌ Belum Bayar'}
            </span>
          </div>
          ${t.nominal_makan?`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:var(--text-l)">Uang Makan</span><span>${rp(t.nominal_makan)}</span></div>`:''}
          ${t.nominal_listrik?`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:var(--text-l)">Uang Listrik</span><span>${rp(t.nominal_listrik)}</span></div>`:''}
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
            <span style="color:${lunas?'var(--green)':'var(--red)'}">Sisa</span>
            <span style="color:${lunas?'var(--green)':'var(--red)'}">${lunas?'Rp 0':rp(t.nominal||0)}</span>
          </div>
        </div>`;
      }).join('')}
    `;
  }

  // Hitung saldo dari transaksi (SUMBER KEBENARAN — bukan kolom saldo DB)
  const totalMasuk  = (txs||[]).filter(t=>t.jenis==='masuk').reduce((a,t)=>a+t.nominal,0);
  const totalKeluar = (txs||[]).filter(t=>t.jenis==='keluar').reduce((a,t)=>a+t.nominal,0);
  const saldoReal   = totalMasuk - totalKeluar;
  const sc = saldoReal<0?'s-minus':saldoReal===0?'s-nol':saldoReal<kritis?'s-warn':'s-ok';

  let txHtml='';
  if(!txs||!txs.length){
    txHtml='<div class="empty"><span class="ei">📝</span><p>Belum ada transaksi</p><p style="font-size:12px;color:var(--text-l);margin-top:6px;max-width:280px;margin-left:auto;margin-right:auto;line-height:1.6">Data uang jajan santri akan muncul jika uang jajan santri dititipkan kepada pengurus kobong.</p></div>';
  } else {
    let running = 0;
    const withSaldo = [...txs].reverse().map(t=>{
      running += t.jenis==='masuk'?t.nominal:-t.nominal;
      return {...t, running};
    }).reverse();

    txHtml=`<div class="tw"><table>
      <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Masuk</th><th>Keluar</th><th>Saldo</th><th>Aksi</th></tr></thead>
      <tbody>`;
    withSaldo.forEach(t=>{
      const sc2 = t.running<0?'s-minus':t.running===0?'s-nol':t.running<kritis?'s-warn':'s-ok';
      txHtml+=`<tr>
        <td style="font-size:11.5px;color:var(--text-l);white-space:nowrap">${fmtTanggal(t.tanggal)}</td>
        <td style="font-weight:500">${t.keterangan||'—'}</td>
        <td class="s-ok dh-nominal">${t.jenis==='masuk'?rp(t.nominal):'—'}</td>
        <td class="dh-nominal" style="color:var(--red)">${t.jenis==='keluar'?rp(t.nominal):'—'}</td>
        <td><strong class="${sc2} dh-nominal">${t.running<0?'−':''} ${rp(t.running)}</strong></td>
        <td>${(SESSION.role!=='sekretaris'&&SESSION.role!=='sekretariat')?`<button class="btn btn-d btn-sm" onclick="hapusTx(${t.id},${id})">🗑</button>`:''}</td>
      </tr>`;
    });
    txHtml+=`</tbody></table></div>`;
  }

  document.getElementById('mo-detail-nama').textContent = s.nama;
  document.getElementById('mo-detail-body').innerHTML=`
    <div class="dh">
      
      <div class="dh-inner">
        <div class="dh-top">
          <div class="dh-av" style="overflow:hidden">${s.foto_url?'<img src="'+s.foto_url+'" style="width:100%;height:100%;object-fit:cover">':avLetter(s.nama)}<div class="dh-av-dot"></div></div>
          <div class="dh-name-wrap">
            <div class="dh-info"><h3>${s.nama}</h3><div class="dh-sub">Kelas ${kelasVal} · Asrama ${asramaVal}</div></div>
          </div>
        </div>
        <div class="dh-divider-thin"></div>
        <div class="dh-meta">
          <span class="dh-meta-row kantin">🍽️ ${dapurVal}</span>
          <span class="dh-meta-row kobong">🏠 ${k}</span>
        </div>
        <div class="dh-saldo">
          <div>
            <div class="lbl">Saldo Akhir</div>
            <div class="amt" id="dh-amt-1" style="${saldoReal<0?'color:#ff6b6b':saldoReal<kritis?'color:var(--gold-l)':'color:#a8f0c8'}">${saldoReal<0?'− ':''} ${rp(saldoReal)}</div>
          </div>
          <button class="dh-eye" onclick="dhToggle('dh-amt-1',this)">&#128065;</button>
        </div>
      </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#fff;border:1.5px solid #6EE7A0;border-radius:10px;padding:14px;box-shadow:0 4px 14px rgba(0,0,0,0.09)">
        <div style="font-size:10px;font-weight:700;color:var(--text-l);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Total Pemasukan</div>
        <div class="dh-nominal" style="font-size:16px;font-weight:800;color:var(--green);letter-spacing:-.2px">${rp(totalMasuk)}</div>
      </div>
      <div style="background:#fff;border:1.5px solid #FECACA;border-radius:10px;padding:14px;box-shadow:0 4px 14px rgba(0,0,0,0.09)">
        <div style="font-size:10px;font-weight:700;color:var(--text-l);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Total Pengeluaran</div>
        <div class="dh-nominal" style="font-size:16px;font-weight:800;color:var(--red);letter-spacing:-.2px">${rp(totalKeluar)}</div>
      </div>
    </div>
      ${(SESSION.role!=='sekretaris'&&SESSION.role!=='sekretariat')?`<button class="btn btn-p btn-sm" onclick="closeMo('mo-detail');openTxModal(${id})">➕ Tambah Transaksi</button>`:''}
      ${(SESSION.role!=='sekretaris'&&SESSION.role!=='sekretariat')?`<button class="btn btn-o btn-sm" onclick="closeMo('mo-detail');editSantri(${id})">✏️ Edit Santri</button>`:''}

      ${SESSION.role==='super'?'<button class="btn btn-d btn-sm" onclick="closeMo(\'mo-detail\');hapusSantri('+id+')">🗑 Hapus</button>':''}
    </div>
    <div style="display:flex;gap:6px;margin:18px 0 12px;background:var(--bg);border-radius:12px;padding:4px">
      <button id="tab-tx-btn" onclick="switchDetailTab('tx')" style="flex:1;padding:10px 6px;border:none;border-radius:9px;background:var(--green);color:#fff;font-weight:700;cursor:pointer;font-size:12.5px;letter-spacing:.3px;transition:.2s">📜 Riwayat Transaksi</button>
      <button id="tab-tagihan-btn" onclick="switchDetailTab('tagihan')" style="flex:1;padding:10px 6px;border:none;border-radius:9px;background:none;color:var(--text-m);font-weight:600;cursor:pointer;font-size:12.5px;letter-spacing:.3px;transition:.2s">🧾 Tagihan Pondok</button>
    </div>
    <div id="tab-tx-content">
      <div style="background:#fafdfb;border:1.5px solid var(--green-b);border-radius:14px;overflow:hidden">
        <div class="ph" style="background:var(--green-p);border-bottom:1.5px solid var(--green-b)"><h2>📜 Riwayat Transaksi</h2></div>
        <div class="pb">${txHtml}</div>
      </div>
    </div>
    <div id="tab-tagihan-content" style="display:none">
      <div style="background:#fffaf3;border:1.5px solid #f0dba8;border-radius:14px;overflow:hidden;padding:14px">
        ${tagihanHtml}
      </div>
    </div>`;
}

function dhToggle(id,btn){var el=document.getElementById(id);if(!el)return;var hide=!el.classList.contains('dh-hidden');el.classList.toggle('dh-hidden');var mo=el.closest('.mb')||el.closest('.modal')||el.closest('.sec')||document;if(mo)mo.querySelectorAll('.dh-nominal').forEach(function(n){hide?n.classList.add('dh-hidden'):n.classList.remove('dh-hidden')});btn.innerHTML=hide?'&#128584;':'&#128065;'}
function switchDetailTab(tab){
  const txContent = document.getElementById('tab-tx-content');
  const tagihanContent = document.getElementById('tab-tagihan-content');
  const txBtn = document.getElementById('tab-tx-btn');
  const tagihanBtn = document.getElementById('tab-tagihan-btn');
  if(!txContent||!tagihanContent) return;
  if(tab==='tx'){
    txContent.style.display='block';
    tagihanContent.style.display='none';
    txBtn.style.background='var(--green)';
    txBtn.style.color='#fff';
    txBtn.style.fontWeight='700';
    tagihanBtn.style.background='none';
    tagihanBtn.style.color='var(--text-m)';
    tagihanBtn.style.fontWeight='600';
  } else {
    txContent.style.display='none';
    tagihanContent.style.display='block';
    tagihanBtn.style.background='var(--gold)';
    tagihanBtn.style.color='#fff';
    tagihanBtn.style.fontWeight='700';
    txBtn.style.background='none';
    txBtn.style.color='var(--text-m)';
    txBtn.style.fontWeight='600';
  }
}

