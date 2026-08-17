let monitorRefreshInterval=null;

// ===== MONITOR (per-device, diporting dari Saku Santri) =====
// Sebelumnya Bendahara nge-track 1 baris per USERNAME (bendahara_activity,
// ketimpa tiap login baru dari device manapun -- gak kelihatan kalau ada 2
// device login bersamaan). Sekarang pola-nya disamain persis kayak Saku
// Santri: 1 baris per DEVICE/SESI (bendahara_login_sessions, dari
// session-tracking-bd.js), dikelompokkan per akun, bisa logout satu device
// doang tanpa ganggu device lain punya orang yang sama.
async function renderMonitor(){
  const sec = document.getElementById('sec-monitor');
  const now = Date.now();
  const updateTime = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  // Jaring pengaman: sapu bersih baris revoked yang udah >1 hari & belum sempat
  // bersihin dirinya sendiri (misal device-nya ilang/rusak, gak pernah dibuka lagi)
  SB.from('bendahara_login_sessions').delete().eq('revoked', true).lt('last_seen', new Date(now - 24*60*60*1000).toISOString()).then(()=>{}).catch(()=>{});

  sec.innerHTML = `
  <div class="panel" style="margin-bottom:16px">
    <div class="ph" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2>${svgIcon('eye',16)} Monitor Aktivitas &amp; Device Bendahara</h2>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--text-l)">Update: ${updateTime}</span>
        <button class="filter-toggle-btn freeze-toggle-btn${document.body.classList.contains('freeze-nama')?' active':''}" onclick="toggleFreezeNama()" title="Kunci kolom nama saat scroll tabel ke samping">${svgIcon('lock',13)} Kunci Nama</button>
        <button class="btn btn-b btn-sm" onclick="renderMonitor()">${svgIcon('refresh',14)} Refresh</button>
      </div>
    </div>
    <div class="pb">
      <div id="monitor-stats-bd" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px"></div>
      <div id="monitor-content-bd" style="text-align:center;padding:20px;color:var(--text-m)">Memuat...</div>
      <div style="margin-top:10px;text-align:center;font-size:12px;color:var(--text-l)">🔄 Auto refresh setiap 30 detik &nbsp;•&nbsp; Setiap perangkat/browser dihitung sebagai 1 sesi login terpisah</div>
    </div>
  </div>`;

  // Auto refresh
  if(monitorRefreshInterval) clearInterval(monitorRefreshInterval);
  monitorRefreshInterval = setInterval(()=>{ if(document.getElementById('sec-monitor')?.classList.contains('act')) renderMonitor(); }, 30000);

  try{
    const {data:logs, error:logsErr} = await SB.from('bendahara_login_sessions')
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
    const onlineCount = entries.filter(e=>e.statusKey==='online').length;
    const idleCount = entries.filter(e=>e.statusKey==='idle').length;
    const offlineCount = entries.filter(e=>e.statusKey==='offline').length;
    const totalCount = entries.length;
    const totalAkun = new Set(entries.map(e=>e.bendahara_username)).size;

    document.getElementById('monitor-stats-bd').innerHTML = `
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#dcfce7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">🟢</div>
        <div><div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.5px">Online</div>
        <div style="font-size:26px;font-weight:800;color:#15803d;line-height:1.1">${onlineCount}</div>
        <div style="font-size:11px;color:#16a34a">&lt; 2 menit</div></div>
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
        <div style="font-size:11px;color:#dc2626">&gt; 10 menit</div></div>
      </div>
      <div style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#d1fae5;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">📱</div>
        <div><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px">Total Device</div>
        <div style="font-size:26px;font-weight:800;color:var(--green);line-height:1.1">${totalCount}</div>
        <div style="font-size:11px;color:var(--green)">dari ${totalAkun} akun</div></div>
      </div>`;

    // Kelompokkan sesi per akun bendahara (1 akun bisa banyak device, kayak riwayat login IG)
    const groups = [];
    const groupIndex = {};
    entries.forEach(e=>{
      const key = e.bendahara_username || '—';
      if(!(key in groupIndex)){
        groupIndex[key] = groups.length;
        groups.push({ bendahara_id:e.bendahara_id, username:e.bendahara_username, nama:e.bendahara_nama||e.bendahara_username||'—', role:e.bendahara_role, sesi:[] });
      }
      groups[groupIndex[key]].sesi.push(e);
    });

    const isSelfUsername = (u) => u && SESSION?.username && u===SESSION.username;
    const thisDeviceSid = (typeof getDeviceSessionIdBD==='function') ? getDeviceSessionIdBD() : null;

    const cards = groups.map(g=>{
      const roleBadge = (g.role==='kangadmin'||g.role==='super')?
        '<span style="background:#fef3c7;color:#92400e;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">👑 Admin</span>':
        g.role==='pengawas'?'<span style="background:#f0f9ff;color:#0369a1;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">👁️ Pengawas</span>':
        g.role==='bendahara_asrama'?'<span style="background:#ede9fe;color:#7c3aed;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">Bendahara Asrama</span>':
        '<span style="background:var(--green-p);color:var(--green);border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">Pengelola Dapur</span>';
      const isSelf = isSelfUsername(g.username);
      const anyAktif = g.sesi.length > 0;

      const sesiRows = g.sesi.map(s=>{
        const statusDot = s.statusKey==='online'?'🟢':s.statusKey==='idle'?'🟡':'⚫';
        const statusColor = s.statusKey==='online'?'#15803d':s.statusKey==='idle'?'#a16207':'#6b7280';
        const namaEsc = (g.nama||'').replace(/'/g,"\\'");
        const deviceEsc = (s.device_name||'Perangkat').replace(/'/g,"\\'");
        const isThisDevice = isSelf && thisDeviceSid && s.session_id===thisDeviceSid;
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px dashed var(--border)">
          <div style="min-width:0;flex:1">
            <div style="font-size:13px;font-weight:600">${s.device_name||'—'} ${isThisDevice?'<span style="background:var(--green-p);color:var(--green);border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:4px">Perangkat ini</span>':''} ${s.isBaru?'<span style="background:#fee2e2;color:#b91c1c;border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:4px">🆕 Baru login</span>':''}</div>
            <div style="font-size:12px;color:${statusColor};font-weight:600;margin-top:2px">${statusDot} ${s.waktu}${s.statusKey==='offline'?' (app tertutup, tapi masih login)':''}</div>
            <div style="font-size:11px;color:var(--text-l);margin-top:2px">Login pertama: ${s.loginFirst}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0">
            ${isThisDevice?'':`<button class="btn btn-d btn-xs mutating-only" onclick="monitorLogoutDeviceBD('${s.session_id}','${namaEsc}','${deviceEsc}')">${svgIcon('log-out',12)} Logout</button>`}
          </div>
        </div>`;
      }).join('');

      return `<div class="panel" style="margin-bottom:12px">
        <div class="pb" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:34px;height:34px;border-radius:50%;background:var(--green-p);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--green);font-size:14px;flex-shrink:0">${(g.nama||'?')[0].toUpperCase()}</div>
              <div>
                <div style="font-weight:600;font-size:13px">${g.nama||'—'} ${isSelf?'<span style="font-size:11px;color:var(--text-l)">(Anda)</span>':''}</div>
                <div>${roleBadge} <span style="font-size:11px;color:var(--text-l)">${g.sesi.length} device aktif</span></div>
              </div>
            </div>
            ${isSelf?'':`<div style="display:flex;gap:5px;flex-wrap:wrap">
              ${anyAktif?`<button class="btn btn-d btn-xs mutating-only" onclick="monitorLogoutBD('${g.username}','${(g.nama||'').replace(/'/g,"\\'")}')">${svgIcon('log-out',12)} Logout Semua Device</button>`:''}
              <button class="btn btn-d btn-xs mutating-only" style="background:#dc2626;border-color:#dc2626" onclick="monitorBlokirBD('${g.bendahara_id||''}','${g.username}','${(g.nama||'').replace(/'/g,"\\'")}')">${svgIcon('ban',12)} Blokir</button>
            </div>`}
          </div>
          ${sesiRows}
        </div>
      </div>`;
    }).join('');

    document.getElementById('monitor-content-bd').innerHTML = logs?.length ? cards :
      `<div style="padding:30px;text-align:center;color:var(--text-l)">Belum ada data aktivitas bendahara.</div>`;

  } catch(e){
    const hint = /bendahara_login_sessions/i.test(e.message||'') || e.code==='42P01' ?
      '<br><br><span style="font-size:12px">Sepertinya tabel <strong>bendahara_login_sessions</strong> belum ada. Buka <strong>Pengaturan → SQL Migrasi</strong> lalu jalankan migrasinya di Supabase SQL Editor.</span>' : '';
    document.getElementById('monitor-content-bd').innerHTML = `<div style="color:var(--red);padding:16px">Gagal memuat data: ${e.message}${hint}</div>`;
  }
}

// Logout SATU device/sesi aja -- device lain punya bendahara yang sama tetap login
async function monitorLogoutDeviceBD(sessionId, nama, deviceNama){
  konfirm(`Logout <strong>${nama}</strong> dari perangkat <strong>${deviceNama}</strong>? Device lain milik ${nama} gak kepengaruh.`, async()=>{
    await SB.from('bendahara_login_sessions').update({revoked:true, is_online:false}).eq('session_id', sessionId);
    toast(`✅ Perangkat "${deviceNama}" berhasil di-logout`);
    renderMonitor();
  });
}

// Logout SEMUA device milik satu akun bendahara
async function monitorLogoutBD(username, nama){
  konfirm(`Logout paksa <strong>${nama}</strong>? Mereka bakal keluar dari semua device.`, async()=>{
    await SB.from('bendahara_login_sessions').update({revoked:true, is_online:false}).eq('bendahara_username', username);
    await SB.from('bendahara_users').update({force_logout:true}).eq('username', username);
    toast(`✅ ${nama} berhasil di-logout dari semua device`);
    renderMonitor();
  });
}

async function monitorBlokirBD(bendaharaId, username, nama){
  konfirm(`🚫 Blokir <strong>${nama}</strong>? Gak bisa login sampai dibuka blokirnya.`, async()=>{
    if(bendaharaId) await SB.from('bendahara_users').update({is_blocked:true, force_logout:true}).eq('id', bendaharaId);
    await SB.from('bendahara_login_sessions').update({revoked:true, is_online:false}).eq('bendahara_username', username);
    toast(`🚫 ${nama} berhasil diblokir`);
    renderMonitor();
  }, 'hapus');
}
