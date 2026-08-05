// ===== NOTIFIKASI =====
async function renderNotifikasi(){
  // Hitung subscriber
  const { data: subs } = await SB.from('push_subscriptions').select('id, username');
  const countEl = document.getElementById('notif-subscriber-count');
  if(countEl) countEl.textContent = `${subs?.length||0} pengurus terdaftar`;

  // Isi dropdown penerima
  const sel = document.getElementById('notif-target');
  if(sel){
    sel.innerHTML = '<option value="">Semua Pengurus</option>';
    (subs||[]).forEach(s=>{
      sel.innerHTML += `<option value="${s.username}">${s.username}</option>`;
    });
  }

  // Riwayat notifikasi
  const { data: riwayat } = await SB.from('push_notifications').select('*').order('created_at', {ascending:false}).limit(20);
  const listEl = document.getElementById('notif-riwayat-list');
  if(listEl){
    if(!riwayat?.length){ listEl.innerHTML='<div style="color:var(--text-l);font-size:13px;text-align:center;padding:16px">Belum ada notifikasi dikirim</div>'; return; }
    listEl.innerHTML = riwayat.map(n=>{
      const tgl = new Date(n.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      return `<div style="border:1.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px">${n.judul}</div>
            <div style="font-size:12px;color:var(--text-m);margin-top:2px">${n.pesan}</div>
            <div style="font-size:11px;color:var(--text-l);margin-top:4px">
              ${n.target_username?`👤 ${n.target_username}`:'👥 Semua pengurus'} · ${tgl}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span style="font-size:11px;background:var(--green-p);color:var(--green);padding:2px 8px;border-radius:6px;white-space:nowrap">${n.tipe||'bebas'}</span>
            <button onclick="hapusNotifikasi(${n.id})" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--red);font-size:13px" title="Hapus">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
}

function onNotifTipeChange(){
  const tipe = document.getElementById('notif-tipe')?.value;
  const judulEl = document.getElementById('notif-judul');
  const pesanEl = document.getElementById('notif-pesan');
  if(tipe==='tutup_bulan'){
    if(judulEl) judulEl.value = '📅 Pengingat Tutup Bulan';
    if(pesanEl) pesanEl.value = `Mohon segera selesaikan input data bulan ${bulanAktif()} sebelum ditutup. Pastikan semua transaksi sudah tercatat dengan benar.`;
  } else {
    if(judulEl) judulEl.value = '';
    if(pesanEl) pesanEl.value = '';
  }
}

async function kirimNotifikasi(){
  const judul = document.getElementById('notif-judul')?.value?.trim();
  const pesan = document.getElementById('notif-pesan')?.value?.trim();
  const tipe = document.getElementById('notif-tipe')?.value;
  const target = document.getElementById('notif-target')?.value;

  if(!judul){ toast('Isi judul notifikasi!', false); return; }
  if(!pesan){ toast('Isi pesan notifikasi!', false); return; }

  toast('⏳ Mengirim notifikasi...');

  try{
    const res = await fetch('https://menfnmfwtxgcgvkbbjxh.supabase.co/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmZubWZ3dHhnY2d2a2JianhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ2NjUsImV4cCI6MjA5NTU3MDY2NX0.-xenaY9VPUzodik7nnN1emtnhg0WTqdU6dToyXSpwec`
      },
      body: JSON.stringify({
        judul, pesan, tipe,
        target_username: target || null,
        dikirim_oleh: SESSION?.user?.username || 'admin'
      })
    });
    const data = await res.json();
    if(data.success){
      toast(`✅ Notifikasi terkirim ke ${data.sent} pengurus!`);
      document.getElementById('notif-judul').value='';
      document.getElementById('notif-pesan').value='';
      renderNotifikasi();
    } else {
      toast('Gagal kirim: '+(data.error||'Unknown error'), false);
    }
  } catch(e){
    toast('Error: '+e.message, false);
  }
}

async function hapusNotifikasi(id){
  konfirm('Hapus notifikasi ini?', async()=>{
    const {error} = await SB.from('push_notifications').delete().eq('id', id);
    if(error){ toast('Gagal hapus: '+error.message, false); return; }
    toast('🗑️ Notifikasi dihapus!');
    renderNotifikasi();
  }, 'hapus');
}

