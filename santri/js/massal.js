// ===== TRANSAKSI MASSAL =====
function renderMassal(){
  // Trigger pilihan cash/rekening sesuai jenis yang aktif
  onMassalJenisChange();
  if(SESSION.role==='pengurus'){
    // Pengurus: sembunyikan pilih kobong, langsung tampilkan semua santri mereka
    document.getElementById('massal-kobong-wrap').style.display='none';
    loadMassalSantriPengurus();
  } else {
    // Superadmin: tampilkan pilih kobong seperti biasa
    document.getElementById('massal-kobong-wrap').style.display='block';
    document.getElementById('massal-list').innerHTML='<div class="empty"><span class="ei">🏠</span><p>Pilih kobong dulu</p></div>';
  }
}

async function loadMassalSantriPengurus(){
  // Load semua santri milik pengurus ini (tanpa filter kobong)
  const santris = ALL_SANTRI;
  if(!santris.length){
    document.getElementById('massal-list').innerHTML='<div class="empty"><span class="ei">👥</span><p>Belum ada santri yang Anda kelola</p></div>';
    return;
  }
  // Kelompokkan per kobong untuk tampilan lebih rapi
  const byKobong = {};
  santris.forEach(s=>{
    const kNama = s.kobong?.nama||getKobongNama(s.kobong_id)||'Lainnya';
    if(!byKobong[kNama]) byKobong[kNama]=[];
    byKobong[kNama].push(s);
  });

  let html='';
  Object.entries(byKobong).forEach(([kNama, list])=>{
    html+=`<div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;padding:10px 0 4px;border-bottom:2px solid var(--green-b);margin-bottom:4px">🏠 ${kNama}</div>`;
    list.forEach(s=>{
      html+=`<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);align-items:center">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av" style="width:32px;height:32px;font-size:13px;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
          <div>
            <div style="font-weight:500;font-size:13px">${s.nama}</div>
            <div style="font-size:11px;color:${s.saldo<0?'var(--red)':'var(--text-l)'}">Saldo: ${s.saldo<0?'− ':''} ${rp(s.saldo)}</div>
          </div>
        </div>
        <input type="number" min="0" placeholder="0" id="massal-${s.id}" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none" onfocus="this.style.borderColor='var(--green-l)'" onblur="this.style.borderColor='var(--border)'">
      </div>`;
    });
  });
  document.getElementById('massal-list').innerHTML=html;
}

async function loadMassalSantri(){
  const kid = document.getElementById('massal-kobong').value;
  if(!kid){ document.getElementById('massal-list').innerHTML='<div class="empty"><span class="ei">🏠</span><p>Pilih kobong dulu</p></div>'; return; }

  const santris = ALL_SANTRI.filter(s=>String(s.kobong_id)===kid);
  if(!santris.length){ document.getElementById('massal-list').innerHTML='<div class="empty"><span class="ei">👥</span><p>Tidak ada santri di kobong ini</p></div>'; return; }

  let html=`<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;padding:8px 0;border-bottom:2px solid var(--border);margin-bottom:4px">
    <div style="font-size:11.5px;font-weight:700;color:var(--text-m);text-transform:uppercase;letter-spacing:.4px">Nama Santri</div>
    <div style="font-size:11.5px;font-weight:700;color:var(--text-m);text-transform:uppercase;letter-spacing:.4px">Nominal (Rp)</div>
  </div>`;
  santris.forEach(s=>{
    html+=`<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);align-items:center">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="av" style="width:32px;height:32px;font-size:13px;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
        <div>
          <div style="font-weight:500;font-size:13px">${s.nama}</div>
          <div style="font-size:11px;color:${s.saldo<0?'var(--red)':'var(--text-l)'}">Saldo: ${s.saldo<0?'− ':''} ${rp(s.saldo)}</div>
        </div>
      </div>
      <input type="number" min="0" placeholder="0" id="massal-${s.id}" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none" onfocus="this.style.borderColor='var(--green-l)'" onblur="this.style.borderColor='var(--border)'">
    </div>`;
  });
  document.getElementById('massal-list').innerHTML=html;
}

function isiSemuaNominal(){
  openMo('mo-nominal');
  document.getElementById('nominal-sama').value='';
}

function terapNominalSama(){
  const nom=document.getElementById('nominal-sama').value;
  document.querySelectorAll('[id^="massal-"]').forEach(el=>{ if(el.tagName==='INPUT') el.value=nom; });
  closeMo('mo-nominal');
}

function onMassalJenisChange(){
  const jenis = document.getElementById('massal-jenis').value;
  const wrap = document.getElementById('massal-sumber-wrap');
  const showSumber = jenis==='masuk' && SESSION && SESSION.role!=='ortu';
  wrap.style.display = showSumber ? 'block' : 'none';
  // Pasang listener untuk update style
  document.querySelectorAll('input[name="massal-sumber"]').forEach(r=>{
    r.onchange = updateMassalSumberStyle;
  });
  updateMassalSumberStyle();
}

function updateMassalSumberStyle(){
  const val = document.querySelector('input[name="massal-sumber"]:checked')?.value||'cash';
  const lblC = document.getElementById('massal-lbl-cash');
  const lblR = document.getElementById('massal-lbl-rekening');
  if(lblC) lblC.style.cssText = val==='cash'
    ? 'flex:1;border:1.5px solid var(--green);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;background:var(--green-p);color:var(--green);transition:.2s'
    : 'flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:.2s';
  if(lblR) lblR.style.cssText = val==='rekening'
    ? 'flex:1;border:1.5px solid var(--blue);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;background:var(--blue-p);color:var(--blue);transition:.2s'
    : 'flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:.2s';
}

// ===== LOADING OVERLAY =====
function showLoadingOverlay(title='Sedang memproses...', msg='Harap tunggu, jangan klik tombol lain.\nData sedang disimpan ke server.'){
  const el = document.getElementById('loading-overlay');
  if(el){
    document.getElementById('loading-overlay-title').textContent = title;
    document.getElementById('loading-overlay-msg').innerHTML = msg.replace(/\n/g,'<br>');
    el.style.display = 'flex';
  }
}
function hideLoadingOverlay(){
  const el = document.getElementById('loading-overlay');
  if(el) el.style.display = 'none';
}

async function prossMassal(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Memproses transaksi massal...','Menyiapkan data, harap tunggu.');
  setLoading(true, _lBtn);
  try {

  // LOCK: cegah double-click
  if(_massalBusy){ toast('⏳ Sedang memproses, tunggu sebentar...', false); return; }

  const kid=document.getElementById('massal-kobong').value;
  const jenis=document.getElementById('massal-jenis').value;
  const tgl=document.getElementById('massal-tgl').value||today();
  const ket=document.getElementById('massal-ket').value.trim()||(jenis==='masuk'?'Pemasukan':'Pengeluaran');
  const sumber=document.querySelector('input[name="massal-sumber"]:checked')?.value||'cash';

  if(SESSION.role!=='pengurus' && !kid){ toast('Pilih kobong dulu!',false); return; }

  const santris = SESSION.role==='pengurus'
    ? ALL_SANTRI
    : ALL_SANTRI.filter(s=>String(s.kobong_id)===kid);
  const oleh=SESSION.role==='super'?'Kang Admin':(SESSION.user?.nama||'Pengurus');

  let txs=[], updates=[], totalMasukRekening=0;
  santris.forEach(s=>{
    const el=document.getElementById('massal-'+s.id);
    const nom=parseInt(el?.value)||0;
    if(!nom) return;
    txs.push({santri_id:s.id,tanggal:tgl,jenis,keterangan:ket,nominal:nom,oleh});
    const ns=(s.saldo||0)+(jenis==='masuk'?nom:-nom);
    updates.push({id:s.id,saldo:ns});
    if(jenis==='masuk' && sumber==='rekening') totalMasukRekening+=nom;
  });

  if(!txs.length){ toast('Tidak ada nominal yang diisi!',false); return; }

  // Kunci dan tampilkan loading
  _massalBusy = true;
  const btnTerapkan = document.getElementById('btn-massal-terapkan');
  if(btnTerapkan){ btnTerapkan.disabled=true; btnTerapkan.textContent='⏳ Memproses...'; }
  showLoadingOverlay('Menyimpan transaksi...', `Memproses <strong>${txs.length} transaksi</strong>.<br>Harap tunggu, <strong>jangan klik tombol lain</strong><br>sampai proses selesai.`);

  try{
    const {error}=await SB.from('transaksi').insert(txs);
    if(error){ toast('Gagal: '+error.message,false); return; }

    for(const u of updates){
      await SB.from('santri').update({saldo:u.saldo}).eq('id',u.id);
    }

    if(jenis==='masuk' && sumber==='rekening' && SESSION.role==='pengurus' && totalMasukRekening>0){
      const pgKey='pg_rekening_'+(SESSION.user?.id||'0');
      const curRek=parseInt(localStorage.getItem(pgKey)||'0');
      localStorage.setItem(pgKey, curRek+totalMasukRekening);
      toast(`✅ ${txs.length} transaksi diproses! Rekening bertambah ${rp(totalMasukRekening)}`);
    } else {
      toast(`✅ ${txs.length} transaksi berhasil diproses!`);
    }

    await loadAllData();
    renderDashboard();
    if(SESSION.role==='pengurus') loadMassalSantriPengurus();
    else loadMassalSantri();
    updateNotif();
  } catch(e){
    toast('Error: '+e.message, false);
  } finally {
    // Selalu buka kunci setelah selesai
    _massalBusy = false;
    if(btnTerapkan){ btnTerapkan.disabled=false; btnTerapkan.textContent='✅ Terapkan Semua Transaksi'; }
    hideLoadingOverlay();
  }

  } finally { setLoading(false, _lBtn); }
}

