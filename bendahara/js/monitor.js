// ===== MONITOR =====
let monitorRefreshInterval=null;
async function renderMonitor(){
  const sec=document.getElementById('sec-monitor');
  sec.innerHTML=`<div class="panel">
    <div class="ph">
      <h2>${svgIcon('eye',18)} Monitor Aktivitas Bendahara</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-l)" id="monitor-last-update">—</span>
        <button class="filter-toggle-btn freeze-toggle-btn${document.body.classList.contains('freeze-nama')?' active':''}" onclick="toggleFreezeNama()" title="Kunci kolom nama saat scroll tabel ke samping">${svgIcon('lock',13)} Kunci Nama</button>
        <button class="btn btn-b btn-sm" onclick="renderMonitor()">${svgIcon('refresh',13)} Refresh</button>
      </div>
    </div>
    <div class="pb" id="monitor-body"><div class="empty"><span class="ei">⏳</span><p>Memuat...</p></div></div>
  </div>`;

  await loadMonitorData();

  // Auto refresh setiap 30 detik
  if(monitorRefreshInterval) clearInterval(monitorRefreshInterval);
  monitorRefreshInterval = setInterval(loadMonitorData, 30000);
}

async function loadMonitorData(){
  const body=document.getElementById('monitor-body'); if(!body) return;
  const {data:logs,error}=await SB.from('bendahara_activity').select('*').order('last_seen',{ascending:false}).limit(50);

  const lastUpEl=document.getElementById('monitor-last-update');
  if(lastUpEl) lastUpEl.textContent='Update: '+new Date().toLocaleTimeString('id-ID');

  if(error||!logs||!logs.length){
    body.innerHTML=`<div class="info-box">
      <strong>Belum ada data aktivitas.</strong><br>
      Data akan muncul setelah bendahara login. Pastikan tabel <code>bendahara_activity</code> sudah dibuat.
    </div>`;
    return;
  }

  const nowMs=Date.now();
  const getStatus=(l)=>{
    const diff=nowMs-new Date(l.last_seen).getTime();
    const diffMin=diff/60000;
    if(diffMin<1) return 'online';
    if(diffMin<10) return 'idle';
    return 'offline';
  };

  const online=logs.filter(l=>getStatus(l)==='online');
  const idle=logs.filter(l=>getStatus(l)==='idle');
  const offline=logs.filter(l=>getStatus(l)==='offline');

  const renderRow=(l)=>{
    const diff=nowMs-new Date(l.last_seen).getTime();
    const diffMin=Math.floor(diff/60000);
    const status=getStatus(l);
    const statusMap={
      online:{dot:'dot-green', label:'🟢 Online',  bg:'#f0faf5', text:'Baru saja'},
      idle:  {dot:'',          label:'🟡 Idle',    bg:'#fffbea', text:`${diffMin} mnt lalu`},
      offline:{dot:'dot-red',  label:'⚫ Offline', bg:'',        text:diffMin<60?`${diffMin} mnt lalu`:diffMin<1440?`${Math.floor(diffMin/60)} jam lalu`:new Date(l.last_seen).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})},
    };
    const st=statusMap[status];
    const loginAt=l.login_at?new Date(l.login_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
    const aksiBtn = l.username !== (SESSION.username||'kangadmin') ? `
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${status!=='offline'?`<button class="btn btn-d btn-xs mutating-only" onclick="monitorLogoutBendahara('${l.username}','${(l.nama||'').replace(/'/g,"\'")}')">${svgIcon('log-out',12)} Logout</button>`:''}
        <button class="btn btn-xs mutating-only" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:4px" onclick="monitorBlokirBendahara('${l.username}','${(l.nama||'').replace(/'/g,"\'")}')">${svgIcon('ban',12)} Blokir</button>
      </div>` : '<span style="font-size:11px;color:var(--text-l)">— Anda</span>';
    return `<tr style="background:${st.bg}">
      <td><span style="font-size:12px;font-weight:700">${st.label}</span></td>
      <td class="col-nama"><strong>${l.nama||l.username||'—'}</strong><br><span style="font-size:11px;color:var(--text-l)">@${l.username||'—'}</span></td>
      <td><span class="badge ${l.role?.includes('Admin')?'badge-super':'badge-saku'}">${l.role||'—'}</span></td>
      <td style="font-size:12px">${l.device||'—'}</td>
      <td style="font-size:12px;color:var(--text-m)">${st.text}</td>
      <td style="font-size:11px;color:var(--text-l)">${loginAt}</td>
      <td>${aksiBtn}</td>
    </tr>`;
  };

  body.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px">
      <div class="sc"><div class="sci g">${svgIcon('check-circle',20)}</div><div class="sil"><label>Online</label><div class="val" style="color:var(--green)">${online.length}</div><small>< 1 menit</small></div></div>
      <div class="sc"><div class="sci gg">${svgIcon('clock',20)}</div><div class="sil"><label>Idle</label><div class="val" style="color:var(--gold)">${idle.length}</div><small>1–10 menit</small></div></div>
      <div class="sc"><div class="sci r">${svgIcon('circle-minus',20)}</div><div class="sil"><label>Offline</label><div class="val">${offline.length}</div><small>> 10 menit</small></div></div>
      <div class="sc"><div class="sci b">${svgIcon('users',20)}</div><div class="sil"><label>Total</label><div class="val">${logs.length}</div><small>akun tercatat</small></div></div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Status</th><th class="col-nama">Nama</th><th>Role</th><th>Device</th><th>Terakhir Aktif</th><th>Login Pertama</th><th>Aksi</th></tr></thead>
        <tbody>${[...online,...idle,...offline].map(renderRow).join('')}</tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--text-l);margin-top:10px;text-align:center;display:flex;align-items:center;justify-content:center;gap:5px">${svgIcon('refresh',12)} Auto refresh setiap 30 detik</div>
  `;
}


async function monitorLogoutBendahara(username, nama){
  konfirm(`Logout paksa <strong>${nama}</strong> (@${username})?`, async()=>{
    await SB.from('bendahara_users').update({force_logout:true}).eq('username', username);
    await SB.from('bendahara_activity').update({last_seen: new Date(Date.now()-20*60000).toISOString()}).eq('username', username);
    toast(`✅ ${nama} berhasil di-logout`);
    await loadMonitorData();
  });
}

async function monitorBlokirBendahara(username, nama){
  konfirm(`🚫 Blokir <strong>${nama}</strong>? Tidak bisa login sampai dibuka blokirnya.`, async()=>{
    await SB.from('bendahara_users').update({is_blocked:true, force_logout:true}).eq('username', username);
    await SB.from('bendahara_activity').update({last_seen: new Date(Date.now()-20*60000).toISOString()}).eq('username', username);
    toast(`🚫 ${nama} berhasil diblokir`);
    await loadMonitorData();
  }, 'hapus');
}

async function trackActivity(){
  if(!SESSION) return;
  const device=/Mobile|Android|iPhone/i.test(navigator.userAgent)?'📱 Mobile':'💻 Desktop';
  const username=SESSION.username||SESSION.role||'unknown';
  const nama=SESSION.nama||SESSION.username||'—';
  const role=SESSION.role==='kangadmin'?'👑 Admin':'🍳 Pengelola';
  try {
    const {error}=await SB.from('bendahara_activity').upsert({
      username, nama, role, device,
      last_seen:new Date().toISOString()
    },{onConflict:'username'});
    if(error) console.warn('trackActivity error:', error.message);
  } catch(e){
    console.warn('trackActivity exception:', e.message);
  }
}

