// ===== ADMIN: nomor WA admin per asrama + link media sosial (khusus Kang Admin) =====
// Disimpan di tabel settings (key 'wa_admin_asrama') sebagai JSON
// { "<asrama_id>": [{nama, no}, ...] } -- gak perlu tabel/kolom baru di database.
// Ortu cuma lihat nomor admin asrama anaknya sendiri (lihat kontakAdminAsramaHtml).

function getWaAdminAsrama(){
  try{ const v = JSON.parse(CONFIG.wa_admin_asrama||'{}'); return (v && typeof v==='object') ? v : {}; }
  catch(e){ return {}; }
}

function escAdm(s){
  return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 0812..., 812..., +62 812... -> 62812...; null kalau bukan nomor HP yang masuk akal
function normNoWaAdmin(no){
  let d = String(no||'').replace(/\D/g,'');
  if(d.startsWith('0')) d = '62'+d.slice(1);
  else if(d.startsWith('8')) d = '62'+d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}

function barisWaAdmin(asramaId, item){
  return `<div class="wa-admin-row" data-asrama="${escAdm(asramaId)}" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">
    <div class="fg" style="flex:1 1 140px;margin:0"><label>Nama Admin</label><input type="text" class="wa-admin-nama" maxlength="40" placeholder="Ust. Ahmad" value="${escAdm(item?.nama)}"></div>
    <div class="fg" style="flex:1 1 150px;margin:0"><label>No WhatsApp</label><input type="tel" class="wa-admin-no" inputmode="tel" maxlength="20" placeholder="0812xxxxxxx" value="${escAdm(item?.no ? '0'+String(item.no).slice(2) : '')}"></div>
    <button class="btn btn-d btn-sm" onclick="this.closest('.wa-admin-row').remove()" aria-label="Hapus nomor">${svgIcon('trash',14)}</button>
  </div>`;
}

function tambahBarisWaAdmin(asramaId){
  document.getElementById('wa-admin-list-'+asramaId)?.insertAdjacentHTML('beforeend', barisWaAdmin(asramaId, null));
}

function renderAdminAsrama(){
  const sec = document.getElementById('sec-adminasrama');
  if(!sec || SESSION?.role!=='super') return;
  const data = getWaAdminAsrama();
  const panels = ALL_ASRAMA.map(a=>`
    <div class="panel"><div class="ph"><h2>${svgIcon('building',16)} ${escAdm(a.nama)}</h2></div><div class="pb">
      <div id="wa-admin-list-${a.id}">${(data[a.id]||[]).map(it=>barisWaAdmin(a.id, it)).join('')}</div>
      <button class="btn btn-b btn-sm" onclick="tambahBarisWaAdmin('${a.id}')">${svgIcon('plus',14)} Tambah Nomor</button>
    </div></div>`).join('');
  const sosmed = getSosmedPondok();
  sec.innerHTML = `
    <div class="panel"><div class="ph"><h2>${svgIcon('link',16)} Media Sosial Pondok</h2></div><div class="pb">
      <div class="info-box" style="margin-bottom:14px">Muncul sebagai banner <strong>Follow Media Sosial</strong> di paling bawah setiap halaman, di app Saku Santri &amp; Bendahara, untuk semua pengguna. Isi link lengkap atau cukup <strong>@username</strong>. Kosongkan yang tidak dipakai.</div>
      ${SOSMED_PLATFORM.map(p=>`<div class="fg" style="margin-bottom:12px"><label>${p.label}</label><input type="url" class="sosmed-input" data-key="${p.key}" placeholder="@username atau ${p.base.replace('https://','')}..." value="${escAdm(sosmed[p.key])}"></div>`).join('')}
    </div></div>
    <h3 style="font-family:'Lora',serif;font-size:17px;color:var(--green);margin:22px 0 10px">${svgIcon('smartphone',16)} Nomor WA Admin Asrama</h3>
    <div class="info-box" style="margin-bottom:16px">Atur nomor WhatsApp admin untuk tiap asrama. Orang tua santri akan melihat tombol <strong>Hubungi Admin Asrama</strong> di beranda mereka, berisi nomor admin dari asrama anaknya saja.</div>
    ${panels || `<div class="empty"><span class="ei">🏛️</span><p>Belum ada asrama. Tambahkan dulu di menu Kobong.</p></div>`}
    <button class="btn btn-p" onclick="simpanAdminAsrama()">${svgIcon('save',14)} Simpan Semua</button>`;
}

async function simpanAdminAsrama(){
  if(_isLoading || SESSION?.role!=='super') return;
  const hasil = {};
  for(const row of document.querySelectorAll('#sec-adminasrama .wa-admin-row')){
    const nama = row.querySelector('.wa-admin-nama').value.trim();
    const noMentah = row.querySelector('.wa-admin-no').value.trim();
    if(!nama && !noMentah) continue; // baris kosong dilewati
    const no = normNoWaAdmin(noMentah);
    if(!nama || !no){
      row.querySelector(!nama ? '.wa-admin-nama' : '.wa-admin-no').focus();
      toast(!nama ? 'Nama admin wajib diisi!' : `Nomor WA "${noMentah}" tidak valid!`, false);
      return;
    }
    (hasil[row.dataset.asrama] = hasil[row.dataset.asrama] || []).push({nama, no});
  }
  const sosmed = {};
  for(const inp of document.querySelectorAll('#sec-adminasrama .sosmed-input')){
    const url = normUrlSosmed(inp.dataset.key, inp.value);
    if(url===null){ inp.focus(); toast(`Link "${inp.value.trim()}" tidak valid!`, false); return; }
    if(url) sosmed[inp.dataset.key] = url;
  }
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan pengaturan admin...','Data sedang disimpan ke server.');
  setLoading(true, _lBtn);
  try{
    const value = JSON.stringify(hasil), valueSosmed = JSON.stringify(sosmed);
    const res = await Promise.all([
      SB.from('settings').upsert({key:'wa_admin_asrama', value}),
      SB.from('settings').upsert({key:'sosmed_pondok', value:valueSosmed}),
    ]);
    const err = res.find(r=>r.error)?.error;
    if(err) throw err;
    CONFIG.wa_admin_asrama = value;
    CONFIG.sosmed_pondok = valueSosmed;
    localStorage.setItem('siujang_cfg', JSON.stringify(CONFIG));
    toast('✅ Pengaturan admin disimpan!');
    renderAdminAsrama();
    renderSosmedBanner();
  }catch(e){
    toast('Gagal menyimpan: '+(e.message||e), false);
  }finally{ setLoading(false, _lBtn); }
}

// Kartu buat beranda ortu -- kosong kalau asrama anaknya belum punya nomor admin
function kontakAdminAsramaHtml(asramaId, namaSantri){
  const list = getWaAdminAsrama()[asramaId] || [];
  if(!list.length) return '';
  const pesan = encodeURIComponent(`Assalamu'alaikum, saya orang tua/wali dari ${namaSantri||'santri'}.`);
  return `<div class="panel" style="margin-bottom:18px">
    <div class="ph"><h2>${svgIcon('smartphone',16)} Hubungi Admin Asrama</h2></div>
    <div class="pb" style="display:flex;flex-direction:column;gap:10px">
      ${list.map(it=>`<a class="btn btn-wa" href="https://wa.me/${escAdm(it.no)}?text=${pesan}" target="_blank" rel="noopener" style="justify-content:space-between;text-decoration:none">
        <span>${escAdm(it.nama)}</span><span style="font-family:'DM Mono',monospace;font-size:12px">0${escAdm(String(it.no).slice(2))}</span>
      </a>`).join('')}
    </div>
  </div>`;
}
