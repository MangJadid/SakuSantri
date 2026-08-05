// ===== EDIT MASSAL KOBONG =====
let _currentKobongId = null;

function getSelectedKobongIds(){
  return [...document.querySelectorAll('.kob-chk:checked')].map(c=>parseInt(c.value));
}

function updateMassalToolbar(){
  const selected = getSelectedKobongIds();
  const toolbar = document.getElementById('kobong-massal-toolbar');
  const countEl = document.getElementById('kobong-massal-count');
  if(selected.length > 0){
    toolbar.style.display = 'flex';
    countEl.textContent = selected.length + ' santri dipilih';
  } else {
    toolbar.style.display = 'none';
  }
  const all = document.querySelectorAll('.kob-chk');
  const chkAll = document.getElementById('kobong-check-all');
  if(chkAll) chkAll.checked = all.length > 0 && selected.length === all.length;
}

function togglePilihSemua(chk){
  document.querySelectorAll('.kob-chk').forEach(c => c.checked = chk.checked);
  updateMassalToolbar();
}

async function massalKobongPindah(){
  const ids = getSelectedKobongIds();
  if(!ids.length) return;
  const opts = getKobongAccessible().filter(k=>k.id!==_currentKobongId).map(k=>`<option value="${k.id}">${k.nama}</option>`).join('');
  konfirm(`<div>Pindahkan <strong>${ids.length} santri</strong> ke kobong:<br><br><select id="massal-kobong-tujuan" class="inp" style="width:100%"><option value="">-- Pilih Kobong --</option>${opts}</select></div>`,
    async()=>{
      const tujuan = parseInt(document.getElementById('massal-kobong-tujuan').value);
      if(!tujuan){ toast('Pilih kobong tujuan dulu!'); return; }
      const {error} = await SB.from('santri').update({kobong_id:tujuan}).in('id', ids);
      if(error){ toast('Gagal: '+error.message); return; }
      toast('✅ '+ids.length+' santri berhasil dipindah!');
      await loadAllData(); lihatSantriKobong(_currentKobongId);
    }, 'pindah', 'Pindahkan');
}

async function massalKobongKelas(){
  const ids = getSelectedKobongIds();
  if(!ids.length) return;
  konfirm(`<div>Edit kelas <strong>${ids.length} santri</strong>:<br><br><input id="massal-kelas-val" class="inp" placeholder="Contoh: 7, 8, 9..." style="width:100%"></div>`,
    async()=>{
      const kelas = document.getElementById('massal-kelas-val').value.trim();
      if(!kelas){ toast('Isi kelas dulu!'); return; }
      const {error} = await SB.from('santri').update({kelas}).in('id', ids);
      if(error){ toast('Gagal: '+error.message); return; }
      toast('✅ Kelas berhasil diupdate!');
      await loadAllData(); lihatSantriKobong(_currentKobongId);
    }, 'simpan', 'Simpan Kelas');
}

async function massalKobongWali(){
  const ids = getSelectedKobongIds();
  if(!ids.length) return;
  const diriSendiri = (SESSION.role==='sekretaris'||SESSION.role==='sekretariat') ? `<option value="${SESSION.user.username}">⭐ ${SESSION.user.nama} (Anda)</option>` : '';
  const opts = diriSendiri + getPengurusRelevanUntukWali().map(p=>`<option value="${p.username}">${p.nama}</option>`).join('');
  konfirm(`<div>Edit wali <strong>${ids.length} santri</strong>:<br><br><select id="massal-wali-val" class="inp" style="width:100%"><option value="">-- Pilih Wali --</option>${opts}</select></div>`,
    async()=>{
      const waliUsername = document.getElementById('massal-wali-val').value;
      if(!waliUsername){ toast('Pilih wali dulu!'); return; }
      const {error} = await SB.from('santri').update({created_by: waliUsername}).in('id', ids);
      if(error){ toast('Gagal: '+error.message); return; }
      toast('✅ Wali berhasil diupdate!');
      await loadAllData(); populateWaliSelects(); lihatSantriKobong(_currentKobongId);
    }, 'simpan', 'Simpan Wali');
}

async function massalKobongHapus(){
  const ids = getSelectedKobongIds();
  if(!ids.length) return;
  konfirm(`Hapus <strong>${ids.length} santri</strong> secara permanen?<br><span style="color:var(--red)">⚠️ Tidak bisa dibatalkan!</span>`,
    async()=>{
      const {error} = await SB.from('santri').delete().in('id', ids);
      if(error){ toast('Gagal: '+error.message); return; }
      toast('🗑 '+ids.length+' santri dihapus!');
      await loadAllData(); lihatSantriKobong(_currentKobongId);
    }, 'hapus', 'HAPUS');
}



