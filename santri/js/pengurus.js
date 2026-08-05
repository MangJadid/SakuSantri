// ===== PENGURUS =====
function renderPengurus(){
  let html='';
  ALL_PENGURUS.forEach(p=>{
    const ids=JSON.parse(p.kobong_ids||'[]');
    const kobs=ids.map(id=>getKobongNama(id)).filter(Boolean).join(', ')||'Belum ada';
    const c=COLORS[p.nama.charCodeAt(0)%COLORS.length];
    const isSekretariat = p.role === 'sekretariat' || p.role === 'sekretaris';
    const asramaIds = JSON.parse(p.asrama_ids||'[]').map(String);
    const asramaNama = asramaIds.map(id=>ALL_ASRAMA.find(a=>String(a.id)===id)?.nama).filter(Boolean).join(', ')||'Semua';
    const roleBadge = isSekretariat
      ? `<span style="background:var(--blue-p);color:var(--blue);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">🏢 Sekretariat</span>`
      : `<span style="background:var(--green-p);color:var(--green);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">👨‍💼 Pengurus</span>`;
    const blokirBadge = p.is_blocked ? `<span style="background:#fee2e2;color:#b91c1c;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">🚫 Diblokir</span>` : '';
    html+=`<div class="pcard" style="align-items:flex-start;gap:16px${p.is_blocked?';background:#fef2f2':''}">
      <div class="pav" style="width:58px;height:58px;font-size:22px;flex-shrink:0;background:${c}22;color:${c};overflow:hidden;border-radius:50%;border:2px solid ${c}44">${p.foto_url?`<img src="${p.foto_url}" style="width:100%;height:100%;object-fit:cover">`:avLetter(p.nama)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:14px">${p.nama}</span>
          ${roleBadge}
          ${blokirBadge}
        </div>
        <div style="font-size:12px;color:var(--text-l);margin-bottom:4px">@${p.username}</div>
        ${p.no_wa
          ? `<a href="https://wa.me/62${p.no_wa.replace(/^0/,'')}" target="_blank"
               style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#25D366;font-weight:600;text-decoration:none;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:2px 10px;margin-bottom:4px">
               📱 ${p.no_wa}
             </a>`
          : `<div style="font-size:11.5px;color:var(--text-l);margin-bottom:4px;font-style:italic">📵 Belum ada no HP</div>`
        }
        <div style="font-size:11.5px;color:var(--text-m)">
          ${isSekretariat
            ? `🏛️ Asrama: ${asramaNama}`
            : `🏠 ${kobs}`
          }
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="btn btn-o btn-sm" onclick="editPengurus(${p.id})">✏️</button>
        ${p.is_blocked ? `<button class="btn btn-p btn-sm" style="background:#16a34a;border-color:#16a34a" onclick="bukaBlokirPengurus(${p.id},'${(p.nama||'').replace(/'/g,"\\'")}')">✅</button>` : ''}
        <button class="btn btn-d btn-sm" onclick="hapusPengurus(${p.id})">🗑</button>
      </div>
    </div>`;
  });
  document.getElementById('pengurus-grid').innerHTML=html||'<div class="empty"><span class="ei">👨‍💼</span><p>Belum ada pengurus</p></div>';
}

async function bukaBlokirPengurus(id, nama){
  konfirm(`Buka blokir <strong>${nama}</strong>? Akun ini akan bisa login lagi.`, async()=>{
    const {error} = await SB.from('pengurus').update({is_blocked:false, force_logout:false}).eq('id', id);
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast(`✅ Blokir ${nama} sudah dibuka, akun bisa login lagi.`);
    await loadAllData();
    renderPengurus();
  }, 'lainnya', 'Ya, Buka Blokir');
}

function editPengurus(id){
  const p=ALL_PENGURUS.find(x=>x.id===id);
  if(!p) return;
  document.getElementById('mo-pengurus-title').textContent='Edit Pengurus';
  document.getElementById('edit-pengurus-id').value=id;
  document.getElementById('pg-nama').value=p.nama;
  document.getElementById('pg-username').value=p.username;
  document.getElementById('pg-password').value='';
  // Set role SEBELUM populate agar tampilan benar
  document.getElementById('pg-role').value = p.role||'pengurus';
  // Populate dulu kobong & asrama options
  populatePengurusModal();
  // Untuk role pengurus: restore Asrama yang tersimpan lalu filter ulang list kobong
  if((p.role||'pengurus')==='pengurus'){
    const savedAsramaIds = JSON.parse(p.asrama_ids||'[]');
    const filterSel = document.getElementById('pg-filter-asrama');
    if(filterSel && savedAsramaIds.length){
      filterSel.value = String(savedAsramaIds[0]);
      renderPengurusKobongList();
    }
  }
  // Baru set seleksi kobong
  const ids=JSON.parse(p.kobong_ids||'[]');
  const sel=document.getElementById('pg-kobong');
  [...sel.options].forEach(o=>{ o.selected=ids.includes(parseInt(o.value)); });
  // Set seleksi asrama via checkbox
  const asramaIds=JSON.parse(p.asrama_ids||'[]').map(String);
  const checksDiv=document.getElementById('pg-asrama-checks');
  checksDiv.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.checked = asramaIds.includes(String(cb.value));
  });
  openMo('mo-pengurus');
}

function onPengurusRoleChange(){
  const role = document.getElementById('pg-role')?.value||'pengurus';
  const wrapKobong = document.getElementById('pg-wrap-kobong');
  const wrapAsrama = document.getElementById('pg-wrap-asrama');
  const isAsramaBased = role==='sekretaris' || role==='sekretariat';
  if(wrapKobong) wrapKobong.style.display = isAsramaBased ? 'none' : 'flex';
  if(wrapAsrama) wrapAsrama.style.display = isAsramaBased ? 'flex' : 'none';
}

function renderPengurusKobongList(){
  const sel = document.getElementById('pg-kobong');
  if(!sel) return;
  const filterAsrama = document.getElementById('pg-filter-asrama')?.value||'';
  const prevSelected = new Set([...sel.selectedOptions].map(o=>o.value));
  sel.innerHTML='';
  const byAsrama = {};
  ALL_KOBONG.forEach(k=>{
    if(filterAsrama && String(k.asrama_id)!==filterAsrama) return;
    const aId=k.asrama_id||'__none__';
    const aNama=k.asrama?.nama||ALL_ASRAMA.find(a=>a.id===k.asrama_id)?.nama||'Tanpa Asrama';
    if(!byAsrama[aId]) byAsrama[aId]={nama:aNama,list:[]};
    byAsrama[aId].list.push(k);
  });
  Object.values(byAsrama).forEach(group=>{
    sel.innerHTML+=`<optgroup label="🏛️ ${group.nama}">`;
    group.list.forEach(k=>{ sel.innerHTML+=`<option value="${k.id}" ${prevSelected.has(String(k.id))?'selected':''}>${k.nama}</option>`; });
    sel.innerHTML+=`</optgroup>`;
  });
}

function populatePengurusModal(){
  // Populate filter asrama
  const filterSel = document.getElementById('pg-filter-asrama');
  if(filterSel){
    filterSel.innerHTML = '<option value="">-- Pilih Asrama --</option>' + ALL_ASRAMA.map(a=>`<option value="${a.id}">${a.nama}</option>`).join('');
    filterSel.value = '';
  }
  renderPengurusKobongList();
  // Populate asrama sebagai checkbox
  const checksDiv = document.getElementById('pg-asrama-checks');
  const selectedBefore = [...checksDiv.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value);
  checksDiv.innerHTML='';
  ALL_ASRAMA.forEach(a=>{
    const checked = selectedBefore.includes(String(a.id));
    const lbl = document.createElement('label');
    lbl.style.cssText='display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 0';
    lbl.innerHTML=`<input type="checkbox" value="${a.id}" ${checked?'checked':''} style="width:16px;height:16px;accent-color:var(--green);cursor:pointer"> 🏛️ ${a.nama}`;
    checksDiv.appendChild(lbl);
  });
  onPengurusRoleChange();
}

async function simpanPengurus(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan data pengurus...','Data pengurus sedang disimpan.');
  setLoading(true, _lBtn);
  try {

  const id=document.getElementById('edit-pengurus-id').value;
  const nama=document.getElementById('pg-nama').value.trim();
  const username=document.getElementById('pg-username').value.trim().toLowerCase().replace(/\s/g,'');
  const password=document.getElementById('pg-password').value.trim();
  const role=document.getElementById('pg-role').value||'pengurus';

  const sel=document.getElementById('pg-kobong');
  const kobong_ids=JSON.stringify([...sel.selectedOptions].map(o=>parseInt(o.value)));
  const checksDiv2=document.getElementById('pg-asrama-checks');
  const filterAsramaVal = document.getElementById('pg-filter-asrama')?.value||'';
  const asrama_ids = role==='pengurus'
    ? JSON.stringify(filterAsramaVal ? [parseInt(filterAsramaVal)] : [])
    : JSON.stringify([...checksDiv2.querySelectorAll('input[type=checkbox]:checked')].map(c=>parseInt(c.value)));

  if(!nama||!username){ toast('Nama dan username wajib!',false); return; }
  if(role==='pengurus' && !filterAsramaVal){ toast('Pilih Asrama dulu untuk pengurus ini!',false); return; }

  if(id){
    const upd={nama,username,kobong_ids,role,asrama_ids};
    if(password){ upd.password_hash = await sha256(password); }
    await SB.from('pengurus').update(upd).eq('id',id);
    toast('Pengurus diperbarui!');
  } else {
    if(!password||password.length<6){ toast('Password min. 6 karakter!',false); return; }
    const pwHash = await sha256(password);
    await SB.from('pengurus').insert({nama,username,password_hash:pwHash,kobong_ids,role,asrama_ids});
    toast('Pengurus ditambahkan!');
  }
  closeMo('mo-pengurus');
  document.getElementById('edit-pengurus-id').value='';
  await loadAllData();
  renderPengurus();

  } finally { setLoading(false, _lBtn); }
}

async function hapusPengurus(id){
  if(_isLoading) return;
  try {

  const p=ALL_PENGURUS.find(x=>x.id===id);
  konfirm(`Hapus pengurus <strong>${p?.nama}</strong>? Mereka tidak akan bisa login lagi.`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menghapus pengurus...','Data pengurus sedang dihapus.');
    setLoading(true, _lBtn2);
    try {
    // Hapus persistent session jika ada (logout paksa)
    try{
      const sessions = Object.keys(localStorage).filter(k=>k.startsWith('siujang_session'));
      sessions.forEach(k=>{
        try{ const s=JSON.parse(localStorage.getItem(k)); if(s?.user?.id===id) localStorage.removeItem(k); }catch(e){}
      });
    }catch(e){}

    const {error} = await SB.from('pengurus').delete().eq('id', id);
    if(error){
      // Coba cara alternatif: update dulu lalu delete
      await SB.from('pengurus').update({username: '__deleted__'+id, nama: '__deleted__'}).eq('id', id);
      const {error:err2} = await SB.from('pengurus').delete().eq('id', id);
      if(err2){
        toast('Gagal hapus: '+err2.message, false);
        return;
      }
    }
    toast('✅ Pengurus dihapus');
    await loadAllData();
    renderPengurus();
  
    } finally { setLoading(false, _lBtn2); }});

  } finally { setLoading(false, _lBtn); }
}


