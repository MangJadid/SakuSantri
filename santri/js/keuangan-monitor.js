// ===== KEUANGAN (PENGAWAS) =====
async function renderKeuangan(){
  const bulanF = document.getElementById('filter-bulan-keuangan')?.value||'';
  let query = SB.from('tagihan_pondok').select('*');
  if(bulanF) query = query.eq('bulan', bulanF);
  const {data: tagihan} = await query;
  if(!tagihan) return;

  const bulanSel = document.getElementById('filter-bulan-keuangan');
  if(bulanSel && bulanSel.options.length <= 1){
    const {data: allT} = await SB.from('tagihan_pondok').select('bulan').order('bulan',{ascending:false});
    const bulanList = [...new Set((allT||[]).map(t=>t.bulan).filter(Boolean))];
    bulanList.forEach(b=>{ bulanSel.innerHTML += `<option value="${b}">${b}</option>`; });
  }

  const totalTagihan = tagihan.reduce((s,t)=>s+Number(t.nominal||0),0);
  const totalBayar = tagihan.reduce((s,t)=>s+Number(t.nominal_bayar||0),0);
  const totalTunggakan = totalTagihan - totalBayar;
  const totalLunas = tagihan.filter(t=>t.status==='lunas').length;
  const persen = totalTagihan>0 ? Math.round(totalBayar/totalTagihan*100) : 0;

  const rekapEl = document.getElementById('keuangan-rekap');
  if(rekapEl) rekapEl.innerHTML = `
    <div style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:11px;color:var(--text-m);font-weight:700;text-transform:uppercase">Total Tagihan</div>
      <div style="font-size:18px;font-weight:700;color:var(--green)">${fmtRp(totalTagihan)}</div>
      <div style="font-size:11px;color:var(--text-l)">${tagihan.length} tagihan</div>
    </div>
    <div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:11px;color:var(--text-m);font-weight:700;text-transform:uppercase">Terbayar</div>
      <div style="font-size:18px;font-weight:700;color:#0369a1">${fmtRp(totalBayar)}</div>
      <div style="font-size:11px;color:var(--text-l)">${totalLunas} lunas</div>
    </div>
    <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:11px;color:var(--text-m);font-weight:700;text-transform:uppercase">Tunggakan</div>
      <div style="font-size:18px;font-weight:700;color:var(--red)">${fmtRp(totalTunggakan)}</div>
      <div style="font-size:11px;color:var(--text-l)">${tagihan.filter(t=>t.status!=='lunas').length} belum lunas</div>
    </div>
  `;

  const progressEl = document.getElementById('keuangan-progress');
  if(progressEl) progressEl.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid var(--border);border-radius:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:700">📈 Progress Pembayaran</span>
        <span style="font-size:13px;font-weight:700;color:var(--green)">${persen}%</span>
      </div>
      <div style="background:#e5e7eb;border-radius:99px;height:12px;overflow:hidden">
        <div style="background:linear-gradient(90deg,var(--green),#22c55e);height:100%;border-radius:99px;width:${persen}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-l)">
        <span>${fmtRp(totalBayar)} terbayar</span>
        <span>${fmtRp(totalTunggakan)} sisa</span>
      </div>
    </div>
  `;

  const dapurMap = {};
  tagihan.forEach(t=>{
    const d = String(t.dapur_id||'lainnya');
    if(!dapurMap[d]) dapurMap[d]={total:0,bayar:0,count:0};
    dapurMap[d].total += Number(t.nominal||0);
    dapurMap[d].bayar += Number(t.nominal_bayar||0);
    dapurMap[d].count++;
  });
  const {data:dapurList} = await SB.from('asrama').select('id,nama,emoji');
  const dapurNamaMap = {};
  (dapurList||[]).forEach(d=>{ dapurNamaMap[String(d.id)]=`${d.emoji||'🍽️'} ${d.nama}`; });

  const dapurEl = document.getElementById('keuangan-dapur');
  if(dapurEl) dapurEl.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:var(--text-m);margin-bottom:10px">🍽️ Rekap Per Dapur</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
      ${Object.entries(dapurMap).map(([id,d])=>{
        const nama = dapurNamaMap[id]||`Dapur ${id}`;
        const tunggak = d.total-d.bayar;
        const pct = d.total>0?Math.round(d.bayar/d.total*100):0;
        return `<div style="border:1.5px solid var(--border);border-radius:10px;padding:12px">
          <div style="font-size:12px;font-weight:700;margin-bottom:6px">${nama}</div>
          <div style="font-size:13px;color:var(--green);font-weight:700">${fmtRp(d.bayar)}</div>
          <div style="font-size:11px;color:var(--red)">Tunggakan: ${fmtRp(tunggak)}</div>
          <div style="background:#e5e7eb;border-radius:99px;height:6px;margin-top:6px">
            <div style="background:var(--green);height:100%;border-radius:99px;width:${pct}%"></div>
          </div>
          <div style="font-size:10px;color:var(--text-l);margin-top:3px">${pct}% lunas</div>
        </div>`;
      }).join('')}
    </div>`;

  const santriTunggak = {};
  tagihan.filter(t=>t.status!=='lunas').forEach(t=>{
    if(!santriTunggak[t.santri_id]) santriTunggak[t.santri_id]={nama:t.santri_nama||t.santri_id,tunggak:0};
    santriTunggak[t.santri_id].tunggak += Number(t.nominal||0)-Number(t.nominal_bayar||0);
  });
  const top5 = Object.values(santriTunggak).sort((a,b)=>b.tunggak-a.tunggak).slice(0,5);
  const tunggakanEl = document.getElementById('keuangan-tunggakan');
  if(tunggakanEl){
    if(!top5.length){ tunggakanEl.innerHTML='<div style="color:var(--text-l);text-align:center;padding:16px">✅ Tidak ada tunggakan!</div>'; return; }
    tunggakanEl.innerHTML = top5.map((s,i)=>`
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:24px;height:24px;background:${i===0?'#fef3c7':i===1?'#f1f5f9':'var(--bg2)'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i+1}</div>
        <div style="flex:1;font-size:13px;font-weight:600">${s.nama}</div>
        <div style="font-size:13px;font-weight:700;color:var(--red)">${fmtRp(s.tunggak)}</div>
      </div>`).join('');
  }
}

async function renderMonitor(){
  const sec = document.getElementById('sec-monitor');
  const now = Date.now();
  const updateTime = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  // Jaring pengaman: sapu bersih baris revoked yang sudah >1 hari & belum sempat
  // bersihin dirinya sendiri (misal HP-nya hilang/rusak, jadi tidak pernah dibuka lagi)
  SB.from('login_sessions').delete().eq('revoked', true).lt('last_seen', new Date(now - 24*60*60*1000).toISOString()).then(()=>{}).catch(()=>{});

  sec.innerHTML = `
  <div class="panel" style="margin-bottom:16px">
    <div class="ph" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2>👁️ Monitor Aktivitas & Device Pengurus</h2>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--text-l)">Update: ${updateTime}</span>
        <button class="btn btn-b btn-sm" onclick="renderMonitor()">🔄 Refresh</button>
      </div>
    </div>
    <div class="pb">
      <div id="monitor-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px"></div>
      <div id="monitor-content" style="text-align:center;padding:20px;color:var(--text-m)">Memuat...</div>
      <div style="margin-top:10px;text-align:center;font-size:12px;color:var(--text-l)">🔄 Auto refresh setiap 30 detik &nbsp;•&nbsp; Setiap perangkat/browser dihitung sebagai 1 sesi login terpisah</div>
    </div>
  </div>`;

  // Auto refresh
  if(window._monitorTimer) clearInterval(window._monitorTimer);
  window._monitorTimer = setInterval(()=>{ if(document.getElementById('sec-monitor')?.style.display!=='none') renderMonitor(); }, 30000);

  try{
    const {data:logs, error:logsErr} = await SB.from('login_sessions')
      .select('*')
      .eq('revoked', false)
      .order('last_seen', {ascending:false});
    if(logsErr) throw logsErr;

    const entries = (logs||[]).map(log=>{
      const lastSeen = new Date(log.last_seen);
      const diffMs = now - lastSeen.getTime();
      const diffMin = Math.floor(diffMs/60000);
      const diffJam = Math.floor(diffMin/60);
      let statusKey;
      if(log.is_online && diffMin < 2) statusKey='online';
      else if(diffMin < 10) statusKey='idle';
      else statusKey='offline';
      const waktu = diffMin < 1 ? 'Baru saja' :
                    diffMin < 60 ? diffMin+' mnt lalu' :
                    diffJam < 24 ? diffJam+' jam lalu' :
                    lastSeen.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+', '+lastSeen.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      const createdAt = log.created_at ? new Date(log.created_at) : null;
      const loginFirst = createdAt ? createdAt.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+', '+createdAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '—';
      const isBaru = createdAt ? (now - createdAt.getTime()) < 60*60*1000 : false; // login < 1 jam lalu
      return {...log, statusKey, waktu, loginFirst, diffMin, isBaru};
    });

    // Stats cards (dihitung per device/sesi)
    const activeEntries = entries.filter(e=>!e.revoked);
    const onlineCount = activeEntries.filter(e=>e.statusKey==='online').length;
    const idleCount = activeEntries.filter(e=>e.statusKey==='idle').length;
    const offlineCount = activeEntries.filter(e=>e.statusKey==='offline').length;
    const totalCount = activeEntries.length;
    const totalPengurus = new Set(activeEntries.map(e=>e.pengurus_id)).size;

    document.getElementById('monitor-stats').innerHTML = `
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#dcfce7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">🟢</div>
        <div><div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.5px">Online</div>
        <div style="font-size:26px;font-weight:800;color:#15803d;line-height:1.1">${onlineCount}</div>
        <div style="font-size:11px;color:#16a34a">< 2 menit</div></div>
      </div>
      <div style="background:#fefce8;border:1.5px solid #fef08a;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#fef9c3;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">🟡</div>
        <div><div style="font-size:11px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:.5px">Idle</div>
        <div style="font-size:26px;font-weight:800;color:#a16207;line-height:1.1">${idleCount}</div>
        <div style="font-size:11px;color:#ca8a04">2–10 menit</div></div>
      </div>
      <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#fee2e2;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">⚫</div>
        <div><div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:.5px">Offline</div>
        <div style="font-size:26px;font-weight:800;color:#b91c1c;line-height:1.1">${offlineCount}</div>
        <div style="font-size:11px;color:#dc2626">> 10 menit</div></div>
      </div>
      <div style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#d1fae5;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">📱</div>
        <div><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px">Total Device</div>
        <div style="font-size:26px;font-weight:800;color:var(--green);line-height:1.1">${totalCount}</div>
        <div style="font-size:11px;color:var(--green)">dari ${totalPengurus} pengurus</div></div>
      </div>`;

    // Kelompokkan sesi per pengurus (biar seperti riwayat login IG: 1 akun bisa banyak device)
    const groups = [];
    const groupIndex = {};
    entries.forEach(e=>{
      const key = e.pengurus_id||e.pengurus_username||'—';
      if(!(key in groupIndex)){
        groupIndex[key] = groups.length;
        groups.push({ pengurus_id:e.pengurus_id, nama:e.pengurus_nama||e.pengurus_username||'—', role:e.pengurus_role, sesi:[] });
      }
      groups[groupIndex[key]].sesi.push(e);
    });

    const cards = groups.map(g=>{
      const roleBadge = (g.role==='sekretariat'||g.role==='sekretaris')?
        '<span style="background:#ede9fe;color:#7c3aed;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">Sekretariat</span>':
        g.role==='super'?'<span style="background:#fef3c7;color:#92400e;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">Admin</span>':
        g.role==='pengawas'?'<span style="background:#f0f9ff;color:#0369a1;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">👁️ Pengawas</span>':
        '<span style="background:var(--green-p);color:var(--green);border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">Pengurus</span>';
      const anyAktif = g.sesi.length > 0;

      const sesiRows = g.sesi.map(s=>{
        const statusDot = s.statusKey==='online'?'🟢':s.statusKey==='idle'?'🟡':'⚫';
        const statusColor = s.statusKey==='online'?'#15803d':s.statusKey==='idle'?'#a16207':'#6b7280';
        const namaEsc = (g.nama||'').replace(/'/g,"\\'");
        const deviceEsc = (s.device_name||'Perangkat').replace(/'/g,"\\'");
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px dashed var(--border)">
          <div style="min-width:0;flex:1">
            <div style="font-size:13px;font-weight:600">${s.device_name||'—'} ${s.isBaru?'<span style="background:#fee2e2;color:#b91c1c;border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:4px">🆕 Baru login</span>':''}</div>
            <div style="font-size:12px;color:${statusColor};font-weight:600;margin-top:2px">${statusDot} ${s.waktu}${s.statusKey==='offline'?' (app tertutup, tapi masih login)':''}</div>
            <div style="font-size:11px;color:var(--text-l);margin-top:2px">Login pertama: ${s.loginFirst}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0">
            <button class="btn btn-d btn-xs" onclick="monitorLogoutDevice('${s.session_id}','${namaEsc}','${deviceEsc}')">⬅️ Logout</button>
          </div>
        </div>`;
      }).join('');

      return `<div class="panel" style="margin-bottom:12px">
        <div class="pb" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:34px;height:34px;border-radius:50%;background:var(--green-p);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--green);font-size:14px;flex-shrink:0">${(g.nama||'?')[0].toUpperCase()}</div>
              <div>
                <div style="font-weight:600;font-size:13px">${g.nama||'—'}</div>
                <div>${roleBadge} <span style="font-size:11px;color:var(--text-l)">${g.sesi.filter(s=>!s.revoked).length} device aktif</span></div>
              </div>
            </div>
            ${g.role!=='super'?`<div style="display:flex;gap:5px;flex-wrap:wrap">
              ${anyAktif?`<button class="btn btn-d btn-xs" onclick="monitorLogout('${g.pengurus_id}','${(g.nama||'').replace(/'/g,"\\'")}')">⬅️ Logout Semua Device</button>`:''}
              <button class="btn btn-d btn-xs" style="background:#dc2626;border-color:#dc2626" onclick="monitorBlokir('${g.pengurus_id}','${(g.nama||'').replace(/'/g,"\\'")}')">🚫 Blokir</button>
            </div>`:''}
          </div>
          ${sesiRows}
        </div>
      </div>`;
    }).join('');

    document.getElementById('monitor-content').innerHTML = logs?.length ? cards :
      `<div style="padding:30px;text-align:center;color:var(--text-l)">Belum ada data aktivitas pengurus.</div>`;

  } catch(e){
    const hint = /login_sessions/i.test(e.message||'') || e.code==='42P01' ?
      '<br><br><span style="font-size:12px">Sepertinya tabel <strong>login_sessions</strong> belum ada. Buka <strong>Pengaturan → Koneksi Supabase</strong> lalu jalankan SQL migrasi "Riwayat Login & Monitor Device".</span>' : '';
    document.getElementById('monitor-content').innerHTML = `<div style="color:var(--red);padding:16px">Gagal memuat data: ${e.message}${hint}</div>`;
  }
}

// Logout SATU device/sesi saja — device lain milik pengurus yang sama tetap login
async function monitorLogoutDevice(sessionId, nama, deviceNama){
  konfirm(`Logout <strong>${nama}</strong> dari perangkat <strong>${deviceNama}</strong>? Device lain milik ${nama} tidak terpengaruh.`, async()=>{
    await SB.from('login_sessions').update({revoked:true, is_online:false}).eq('session_id', sessionId);
    toast(`✅ Perangkat "${deviceNama}" berhasil di-logout`);
    renderMonitor();
  });
}

// Logout SEMUA device milik satu pengurus
async function monitorLogout(pengurusId, nama){
  konfirm(`Logout paksa <strong>${nama}</strong>? Mereka akan keluar dari semua device.`, async()=>{
    await SB.from('login_sessions').update({revoked:true, is_online:false}).eq('pengurus_id', String(pengurusId));
    // Tandai force_logout agar client otomatis logout
    await SB.from('pengurus').update({force_logout: true}).eq('id', pengurusId);
    toast(`✅ ${nama} berhasil di-logout dari semua device`);
    renderMonitor();
  });
}

async function monitorBlokir(pengurusId, nama){
  konfirm(`🚫 Blokir <strong>${nama}</strong>? Mereka tidak bisa login sampai dibuka blokirnya.`, async()=>{
    await SB.from('pengurus').update({is_blocked: true, force_logout: true}).eq('id', pengurusId);
    await SB.from('login_sessions').update({revoked:true, is_online:false}).eq('pengurus_id', String(pengurusId));
    toast(`🚫 ${nama} berhasil diblokir`);
    renderMonitor();
  }, 'hapus');
}
