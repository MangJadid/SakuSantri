// ===== MANAJEMEN BENDAHARA =====
async function renderManajemenBendahara(){
  const content=document.getElementById('manajemen-content');
  content.innerHTML='<div class="empty"><span class="ei">⏳</span><p>Memuat data...</p></div>';
  // Kalau ALL_AKUN kosong, fetch langsung dari DB
  if(!ALL_AKUN.length){
    try{
      const {data:akun} = await SB.from('bendahara_users').select('id,username,nama_tampilan,role,dapur_id,foto_url,created_at').order('created_at');
      const {data:akses} = await SB.from('bendahara_akses').select('*');
      ALL_AKUN = akun||[];
      ALL_AKSES = akses||[];
    } catch(e){ console.error(e); }
  }
  if(!ALL_AKUN.length){ content.innerHTML='<div class="empty"><span class="ei">👥</span><p>Belum ada akun bendahara.</p></div>'; return; }
  content.innerHTML=`<div class="akun-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">`+
  ALL_AKUN.map(a=>{
    const aksesA=ALL_AKSES.filter(x=>x.bendahara_id===a.id);
    const chips=aksesA.map(x=>`<span class="asrama-chip">${x.asrama_nama||getAsramaNama(x.asrama_id)}</span>`).join('')||'<span style="font-size:11px;color:var(--text-l)">Semua asrama</span>';
    let dapurIds=[];
    try{ dapurIds=JSON.parse(a.dapur_id||'[]'); if(!Array.isArray(dapurIds)) dapurIds=[a.dapur_id]; }
    catch(e){ if(a.dapur_id) dapurIds=[a.dapur_id]; }
    const dapurBadges=dapurIds.length>0?dapurIds.map(did=>`<span class="badge badge-dapur">${getDapurEmoji(did)} ${getDapurNama(did)}</span>`).join(' '):'';
    return `<div class="akun-card">
      <div class="akun-av" style="${a.foto_url?'padding:0;overflow:hidden':''}">${a.foto_url?`<img src="${a.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(a.nama_tampilan?a.nama_tampilan[0].toUpperCase():'?')}</div>
      <div class="akun-info">
        <strong>${a.nama_tampilan||a.username}</strong>
        <div class="akun-un">@${a.username}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${dapurBadges}</div>
        <div class="asrama-chips" style="margin-top:6px">${chips}</div>
      </div>
      <div class="akun-actions">
        <button class="btn btn-b btn-xs mutating-only" onclick="editAkun(${a.id})" title="Edit">${svgIcon('edit',13)}</button>
        <button class="btn btn-d btn-xs mutating-only" onclick="hapusAkun(${a.id})" title="Hapus">${svgIcon('trash',13)}</button>
      </div>
    </div>`;
  }).join('')+'</div>';
}

function renderDapurCheckList(selectedIds){
  const el=document.getElementById('akun-dapur-list');
  if(!DAPUR_LIST||!DAPUR_LIST.length){ el.innerHTML='<span style="font-size:12px;color:var(--text-l)">Belum ada dapur.</span>'; return; }
  el.innerHTML=DAPUR_LIST.map(d=>{
    const checked=selectedIds.includes(String(d.id));
    return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text)">
      <input type="checkbox" name="akun-dapur" value="${d.id}" ${checked?'checked':''} style="width:16px;height:16px;accent-color:var(--green)">
      ${d.emoji||'🍽️'} ${d.nama}
    </label>`;
  }).join('');
}

function bukaModalTambahAkun(){
  document.getElementById('mo-akun-title').textContent='Tambah Akun Bendahara';
  document.getElementById('akun-id').value='';
  document.getElementById('akun-nama').value='';
  document.getElementById('akun-user').value='';
  document.getElementById('akun-pass').value='';
  document.getElementById('fg-akun-pass').style.display='block';
  renderDapurCheckList([]);
  renderAksesAsramaList([]);
  // Set default role dan akses fitur
  const roleEl=document.getElementById('akun-role');
  if(roleEl){ roleEl.value='pengelola_dapur'; setDefaultAksesFitur('pengelola_dapur'); }
  openMo('mo-akun');
}

function editAkun(id){
  const a=ALL_AKUN.find(x=>x.id===id); if(!a) return;
  document.getElementById('mo-akun-title').textContent='Edit Akun Bendahara';
  document.getElementById('akun-id').value=id;
  document.getElementById('akun-nama').value=a.nama_tampilan||'';
  document.getElementById('akun-user').value=a.username||'';
  document.getElementById('akun-pass').value='';
  document.getElementById('fg-akun-pass').style.display='block';
  // Parse dapur_id: bisa string tunggal lama atau JSON array baru
  let selectedDapur=[];
  try{ selectedDapur=JSON.parse(a.dapur_id||'[]'); if(!Array.isArray(selectedDapur)) selectedDapur=[String(a.dapur_id)]; }
  catch(e){ if(a.dapur_id) selectedDapur=[String(a.dapur_id)]; }
  renderDapurCheckList(selectedDapur.map(String));
  const aksesIds=ALL_AKSES.filter(x=>x.bendahara_id===id).map(x=>String(x.asrama_id));
  renderAksesAsramaList(aksesIds);
  // Set role
  const roleEl=document.getElementById('akun-role');
  if(roleEl) roleEl.value=a.role||'pengelola_dapur';
  syncAkunFiturVisibility(a.role||'pengelola_dapur');
  // Set akses fitur
  let selFitur=[];
  try{ const af=JSON.parse(a.akses_fitur||'null'); selFitur=Array.isArray(af)?af:[]; }catch(e){}
  document.querySelectorAll('input[name="akun-fitur"]').forEach(c=>{
    c.checked = selFitur.length ? selFitur.includes(c.value) : (AKSES_DEFAULT[a.role||'pengelola_dapur']||[]).includes(c.value);
  });
  openMo('mo-akun');
}

function renderAksesAsramaList(selectedIds){
  const el=document.getElementById('akun-asrama-list');
  el.innerHTML=ALL_ASRAMA.map(a=>{
    const checked=selectedIds.includes(String(a.id));
    return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text)">
      <input type="checkbox" name="akun-asrama" value="${a.id}" ${checked?'checked':''} style="width:16px;height:16px;accent-color:var(--green)">
      ${a.nama}
    </label>`;
  }).join('');
}

// ===== DEFAULT AKSES FITUR BERDASARKAN ROLE =====
const AKSES_DEFAULT = {
  pengelola_dapur: ['dashboard','tagihan','santri','rekap','riwayat'],
  bendahara_asrama: ['dashboard','tagihan','santri','rekap','kelulusan','riwayat','kobong'],
};

function setDefaultAksesFitur(role){
  const defaults = AKSES_DEFAULT[role]||[];
  document.querySelectorAll('input[name="akun-fitur"]').forEach(c=>{
    c.checked = defaults.includes(c.value);
  });
  syncAkunFiturVisibility(role);
}

// Pengawas selalu liat semua tab (gak lewat akses_fitur) -- sembunyiin
// checklist fitur biar gak keliatan seolah itu ngaruh buat role ini.
// Dipisah dari setDefaultAksesFitur() karena editAkun() perlu manggil ini
// tanpa ikut nge-reset checkbox fitur yang udah tersimpan.
function syncAkunFiturVisibility(role){
  const isPengawasRole = role==='pengawas';
  const fgFitur = document.getElementById('fg-akun-fitur');
  const noteEl = document.getElementById('akun-pengawas-note');
  if(fgFitur) fgFitur.style.display = isPengawasRole ? 'none' : '';
  if(noteEl) noteEl.style.display = isPengawasRole ? 'block' : 'none';
}

async function simpanAkun(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const id=document.getElementById('akun-id').value;
  const nama=document.getElementById('akun-nama').value.trim();
  const user=document.getElementById('akun-user').value.trim().toLowerCase().replace(/\s/g,'');
  const pass=document.getElementById('akun-pass').value;
  // Ambil semua dapur yang dicentang
  const selectedDapur=[...document.querySelectorAll('input[name="akun-dapur"]:checked')].map(c=>c.value);
  const dapur_id=selectedDapur.length>0?JSON.stringify(selectedDapur):null;
  if(!nama||!user){ toast('⚠️ Nama dan username wajib diisi!'); return; }
  const aksesIds=[...document.querySelectorAll('input[name="akun-asrama"]:checked')].map(c=>c.value);
  const role=document.getElementById('akun-role')?.value||'pengelola_dapur';
  const aksesF=[...document.querySelectorAll('input[name="akun-fitur"]:checked')].map(c=>c.value);
  const akses_fitur=aksesF.length?JSON.stringify(aksesF):null;

  if(id){
    const upd={nama_tampilan:nama,username:user,dapur_id,role,akses_fitur};
    if(pass) upd.password_hash=await sha256(pass);
    const {error}=await SB.from('bendahara_users').update(upd).eq('id',id);
    if(error){ toast('❌ Gagal: '+error.message); return; }
    // Update akses asrama
    await SB.from('bendahara_akses').delete().eq('bendahara_id',id);
    if(aksesIds.length){
      const toInsert=aksesIds.map(aid=>({ bendahara_id:parseInt(id), asrama_id:parseInt(aid), asrama_nama:getAsramaNama(aid) }));
      await SB.from('bendahara_akses').insert(toInsert);
    }
  } else {
    if(!pass){ toast('⚠️ Password wajib diisi!'); return; }
    const {data:newAkun,error}=await SB.from('bendahara_users').insert({nama_tampilan:nama,username:user,password_hash:await sha256(pass),role,dapur_id,akses_fitur}).select().single();
    if(error){ toast('❌ Gagal: '+error.message); return; }
    if(aksesIds.length){
      const toInsert=aksesIds.map(aid=>({ bendahara_id:newAkun.id, asrama_id:parseInt(aid), asrama_nama:getAsramaNama(aid) }));
      await SB.from('bendahara_akses').insert(toInsert);
    }
  }
  toast('✅ Akun berhasil disimpan!');
  closeMo('mo-akun');
  await loadAllData(); renderManajemenBendahara();

  } finally { setLoading(false, _lBtn); }
}

async function hapusAkun(id){
  if(_isLoading) return;
  const akun = ALL_AKUN.find(a=>String(a.id)===String(id));
  konfirm(`Hapus akun <strong>${akun?.nama||akun?.username||'ini'}</strong>? Mereka tidak akan bisa login lagi.`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    setLoading(true, _lBtn2);
    try {
      const {error}=await SB.from('bendahara_users').delete().eq('id',id);
      if(error){ toast('❌ Gagal: '+error.message); return; }
      toast('🗑 Akun dihapus!');
      await loadAllData(); renderManajemenBendahara();
    } finally { setLoading(false, _lBtn2); }
  }, 'hapus');
}

