// ===== NAIK KELAS / PINDAH KOBONG =====
function renderNaikKelas(){
  const sec = document.getElementById('sec-naikkelas');
  sec.innerHTML = `
  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,var(--green),var(--green-m));border-radius:var(--rad);padding:22px 26px;margin-bottom:22px;color:#fff;position:relative;overflow:hidden">
    <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:80px;opacity:.07;font-family:'Amiri',serif">🎓</div>
    <div style="position:relative;z-index:1">
      <div style="font-family:'Amiri',serif;font-size:22px;font-weight:700;margin-bottom:4px">🎓 Naik Kelas & Pindah Kobong</div>
      <div style="font-size:13px;opacity:.8">Kelola perpindahan kelas dan kobong santri setiap tahun ajaran baru</div>
    </div>
  </div>

  <!-- MODE TABS -->
  <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">
    <button id="nk-mode-kelas" class="btn btn-p" onclick="nkSetMode('kelas')" style="flex:1;min-width:140px;justify-content:center">📚 Naik Kelas Massal</button>
    <button id="nk-mode-kobong" class="btn btn-o" onclick="nkSetMode('kobong')" style="flex:1;min-width:140px;justify-content:center">🏠 Pindah Kobong per Kobong</button>
    <button id="nk-mode-individu" class="btn btn-o" onclick="nkSetMode('individu')" style="flex:1;min-width:140px;justify-content:center">👤 Atur Individu</button>
    <button id="nk-mode-wali" class="btn btn-o" onclick="nkSetMode('wali')" style="flex:1;min-width:140px;justify-content:center">👨‍💼 Ganti Wali Massal</button>
  </div>

  <!-- PANEL: NAIK KELAS -->
  <div id="nk-panel-kelas" class="panel">
    <div class="ph">
      <h2>📚 Naik Kelas Santri</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span id="nk-kelas-badge" style="display:none;background:var(--green);color:#fff;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700"></span>
        <button class="btn btn-o btn-sm" onclick="nkKelasPilihSemua()">☑️ Pilih Semua</button>
        <button class="btn btn-o btn-sm" onclick="nkKelasBatalSemua()">✕ Batal Semua</button>
      </div>
    </div>
    <div class="pb">
      <!-- STEP 1: Cari & Pilih Santri -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">① Pilih Santri yang Akan Naik Kelas</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <input type="text" id="nk-kelas-cari" placeholder="🔍 Cari nama santri..." oninput="nkRenderKelasList()"
            style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
          <select id="nk-kelas-filter-kelas" onchange="nkRenderKelasList()"
            style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
            <option value="">Semua Kelas</option>
          </select>
          <select id="nk-kelas-filter-kobong" onchange="nkRenderKelasList()"
            style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
            <option value="">Semua Kobong</option>
            ${getKobongAccessible().map(k=>`<option value="${k.id}">🏠 ${k.nama}</option>`).join('')}
          </select>
        </div>
        <div id="nk-kelas-list" style="max-height:340px;overflow-y:auto;border:1.5px solid var(--border);border-radius:10px"></div>
      </div>

      <!-- STEP 2: Isi Kelas Tujuan -->
      <div id="nk-kelas-step2" style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:12px;padding:16px;display:none">
        <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">② Tentukan Kelas Tujuan</div>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
          <div class="fg" style="flex:1;min-width:160px">
            <label>Kelas Tujuan</label>
            <input type="text" id="nk-kelas-tujuan" placeholder="Mis: 8, 9, 10..." oninput="nkKelasUpdateStep2()"
              style="padding:9px 13px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;width:100%">
          </div>
          <div style="flex:1;min-width:160px">
            <div style="font-size:11px;color:var(--text-m);margin-bottom:4px">atau pilih dari daftar kelas:</div>
            <div id="nk-kelas-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div>
          </div>
        </div>
        <div id="nk-kelas-info" style="font-size:13px;color:var(--green);margin-bottom:14px;display:none"></div>
        <button class="btn btn-p" onclick="nkTerapkanNaikKelas()" id="nk-btn-kelas" disabled style="opacity:.4">✅ Terapkan Naik Kelas</button>
      </div>
    </div>
  </div>

  <!-- PANEL: PINDAH KOBONG -->
  <div id="nk-panel-kobong" class="panel" style="display:none">
    <div class="ph">
      <h2>🏠 Pindah Kobong Santri</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span id="nk-selected-badge" style="display:none;background:var(--green);color:#fff;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700"></span>
        <button class="btn btn-o btn-sm" onclick="nkPilihSemua()">☑️ Pilih Semua</button>
        <button class="btn btn-o btn-sm" onclick="nkBatalSemua()">✕ Batal Semua</button>
      </div>
    </div>
    <div class="pb">
      <!-- STEP 1: Cari & Pilih Santri -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">① Pilih Santri yang Akan Dipindah</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <input type="text" id="nk-pindah-cari" placeholder="🔍 Cari nama santri..." oninput="nkRenderPindahList()"
            style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
          <select id="nk-pindah-filter-kobong" onchange="nkRenderPindahList()"
            style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
            <option value="">Semua Kobong</option>
            ${getKobongAccessible().map(k=>`<option value="${k.id}">🏠 ${k.nama}</option>`).join('')}
          </select>
        </div>
        <div id="nk-pindah-list" style="max-height:340px;overflow-y:auto;border:1.5px solid var(--border);border-radius:10px"></div>
      </div>

      <!-- STEP 2: Pilih Kobong Tujuan & Konfirmasi -->
      <div id="nk-step2" style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:12px;padding:16px;display:none">
        <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">② Pilih Kobong Tujuan</div>
        <div class="fg" style="margin-bottom:14px">
          <select id="nk-kobong-tujuan" onchange="nkUpdateStep2()"
            style="padding:9px 13px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;width:100%">
            <option value="">-- Pilih Kobong Tujuan --</option>
            ${getKobongAccessible().map(k=>`<option value="${k.id}">🏠 ${k.nama}</option>`).join('')}
          </select>
        </div>
        <div id="nk-konfirmasi-info" style="font-size:13px;color:var(--green);margin-bottom:14px;display:none"></div>
        <button class="btn btn-p" onclick="nkTerapkanPindahKobong()" id="nk-btn-pindah" disabled style="opacity:.4">✅ Pindahkan Santri</button>
      </div>
    </div>
  </div>

  <!-- PANEL: ATUR INDIVIDU -->

  <!-- PANEL: GANTI WALI MASSAL -->
  <div id="nk-panel-wali" class="panel" style="display:none">
    <div class="ph">
      <h2>👨‍💼 Ganti Wali Kobong Massal</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span id="nk-wali-badge" style="display:none;background:var(--green);color:#fff;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700"></span>
        <button class="btn btn-o btn-sm" onclick="nkWaliPilihSemua()">☑️ Pilih Semua</button>
        <button class="btn btn-o btn-sm" onclick="nkWaliBatalSemua()">✕ Batal Semua</button>
      </div>
    </div>
    <div class="pb" style="padding:14px 16px">

      <!-- STEP 1: Pilih santri -->
      <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">① Pilih Santri yang Akan Dipindah Walinya</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <input type="text" id="nk-wali-cari" placeholder="🔍 Cari nama santri..."
          oninput="nkRenderWaliList()"
          style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
        <select id="nk-wali-filter-pengurus" onchange="nkRenderWaliList()"
          style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
          <option value="">Semua Wali</option>
        </select>
      </div>
      <div id="nk-wali-list" style="max-height:340px;overflow-y:auto;border:1.5px solid var(--border);border-radius:10px;margin-bottom:16px"></div>

      <!-- STEP 2: Pilih Wali Tujuan -->
      <div id="nk-wali-step2" style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:12px;padding:16px;display:none">
        <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">② Pilih Wali Tujuan (Pengurus Baru)</div>
        <div class="fg" style="margin-bottom:14px">
          <select id="wali-ke" onchange="nkWaliUpdateStep2()"
            style="padding:9px 13px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;width:100%">
            <option value="">— Pilih Pengurus Tujuan —</option>
          </select>
        </div>
        <div id="nk-wali-konfirmasi-info" style="font-size:13px;color:var(--green);margin-bottom:14px;display:none"></div>
        <button class="btn btn-p" onclick="nkGantiWaliMassal()" id="nk-btn-wali" disabled style="opacity:.4">✅ Ganti Wali Sekarang</button>
      </div>

    </div>
  </div>

  <div id="nk-panel-individu" class="panel" style="display:none">
    <div class="ph">
      <h2>👤 Atur Kelas & Kobong per Santri</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="text" id="nk-cari" placeholder="🔍 Cari nama..." oninput="nkRenderTabel()" style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;min-width:170px">
        <select id="nk-filter-kobong" onchange="nkRenderTabel()" style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
          <option value="">Semua Kobong</option>
          ${getKobongAccessible().map(k=>`<option value="${k.id}">${k.nama}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="pb" style="padding:0">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:var(--green);color:#fff">
              <th style="padding:10px 12px;text-align:left;font-size:11.5px">Santri</th>
              <th style="padding:10px 12px;text-align:left;font-size:11.5px">Kelas Saat Ini</th>
              <th style="padding:10px 12px;text-align:left;font-size:11.5px">Kelas Baru</th>
              <th style="padding:10px 12px;text-align:left;font-size:11.5px">Kobong Saat Ini</th>
              <th style="padding:10px 12px;text-align:left;font-size:11.5px">Kobong Baru</th>
              <th style="padding:10px 12px;text-align:center;font-size:11.5px">Simpan</th>
            </tr>
          </thead>
          <tbody id="nk-individu-tbl"></tbody>
        </table>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-p" onclick="nkSimpanSemuaIndividu()">💾 Simpan Semua Perubahan</button>
      <span id="nk-individu-count" style="font-size:12px;color:var(--text-l);align-self:center"></span>
    </div>
  </div>`;

  // Init kelas filter chips
  nkInitKelasFilter();
  nkRenderKelasList();
  nkRenderTabel();
}

// ===== STATE NAIK KELAS =====
let nkKelasSelectedIds = new Set();
let nkPerubahanIndividu = {};

function nkInitKelasFilter(){
  const sel = document.getElementById('nk-kelas-filter-kelas');
  if(!sel) return;
  const kelasList = [...new Set(ALL_SANTRI.map(s=>s.kelas).filter(Boolean))].sort((a,b)=>(parseInt(a)||0)-(parseInt(b)||0));
  sel.innerHTML = '<option value="">Semua Kelas</option>' + kelasList.map(k=>`<option value="${k}">Kelas ${k}</option>`).join('');
  // Render chips kelas tujuan
  const chips = document.getElementById('nk-kelas-chips');
  if(chips) chips.innerHTML = kelasList.map(k=>`
    <button onclick="document.getElementById('nk-kelas-tujuan').value='${k}';nkKelasUpdateStep2()"
      style="padding:4px 12px;border:1.5px solid var(--border);border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;background:var(--white);font-family:'DM Sans',sans-serif;color:var(--text-m);transition:.15s"
      onmouseover="this.style.borderColor='var(--green);this.style.color='var(--green)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-m)'">
      Kelas ${k}
    </button>`).join('');
}

function nkRenderKelasList(){
  const q = (document.getElementById('nk-kelas-cari')?.value||'').toLowerCase();
  const kf = document.getElementById('nk-kelas-filter-kelas')?.value||'';
  const kobf = document.getElementById('nk-kelas-filter-kobong')?.value||'';
  const el = document.getElementById('nk-kelas-list');
  if(!el) return;

  let list = ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(kf && (s.kelas||'')!==kf) return false;
    if(kobf && String(s.kobong_id)!==kobf) return false;
    return true;
  });

  if(!list.length){
    el.innerHTML=`<div class="empty" style="padding:30px"><span class="ei">👤</span><p>Tidak ada santri ditemukan</p></div>`;
    return;
  }

  // Group by kelas
  const byKelas = {};
  list.forEach(s=>{
    const k = s.kelas||'Tanpa Kelas';
    if(!byKelas[k]) byKelas[k]=[];
    byKelas[k].push(s);
  });
  const sortedKeys = Object.keys(byKelas).sort((a,b)=>(parseInt(a)||0)-(parseInt(b)||0));

  el.innerHTML = sortedKeys.map(kelas=>{
    const group = byKelas[kelas];
    const ids = group.map(s=>s.id);
    return `
    <div style="padding:6px 14px;background:var(--green-p);border-bottom:1px solid var(--green-b);font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;justify-content:space-between">
      <span>📚 Kelas ${kelas} — ${group.length} santri</span>
      <button onclick="nkKelasPilihGroup(${JSON.stringify(ids)})" style="background:none;border:1px solid var(--green-b);color:var(--green);border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif">Pilih Semua Kelas Ini</button>
    </div>
    ${group.map(s=>`
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;${nkKelasSelectedIds.has(s.id)?'background:#f0fdf4;':''}">
        <input type="checkbox" ${nkKelasSelectedIds.has(s.id)?'checked':''} onchange="nkKelasToggle(${s.id},this.checked)"
          style="width:16px;height:16px;accent-color:var(--green);flex-shrink:0;cursor:pointer">
        <div class="av" style="width:32px;height:32px;font-size:12px;flex-shrink:0;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${s.nama}</div>
          <div style="font-size:11px;color:var(--text-l)">🏠 ${s.kobong?.nama||getKobongNama(s.kobong_id)||'—'} · Kelas ${s.kelas||'—'}</div>
        </div>
        ${nkKelasSelectedIds.has(s.id)?'<span style="font-size:11px;color:var(--green);font-weight:600">✓ Dipilih</span>':''}
      </label>
    `).join('')}`;
  }).join('');

  nkKelasUpdateBadge();
}

function nkKelasToggle(id, checked){
  if(checked) nkKelasSelectedIds.add(id);
  else nkKelasSelectedIds.delete(id);
  nkKelasUpdateBadge();
  nkRenderKelasList();
}

function nkKelasPilihSemua(){
  const q = (document.getElementById('nk-kelas-cari')?.value||'').toLowerCase();
  const kf = document.getElementById('nk-kelas-filter-kelas')?.value||'';
  const kobf = document.getElementById('nk-kelas-filter-kobong')?.value||'';
  ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(kf && (s.kelas||'')!==kf) return false;
    if(kobf && String(s.kobong_id)!==kobf) return false;
    return true;
  }).forEach(s=>nkKelasSelectedIds.add(s.id));
  nkKelasUpdateBadge();
  nkRenderKelasList();
}

function nkKelasBatalSemua(){
  nkKelasSelectedIds.clear();
  nkKelasUpdateBadge();
  nkRenderKelasList();
}

function nkKelasPilihGroup(ids){
  ids.forEach(id=>nkKelasSelectedIds.add(id));
  nkKelasUpdateBadge();
  nkRenderKelasList();
}

function nkKelasUpdateBadge(){
  const cnt = nkKelasSelectedIds.size;
  const badge = document.getElementById('nk-kelas-badge');
  const step2 = document.getElementById('nk-kelas-step2');
  if(badge){ badge.textContent=cnt+' santri dipilih'; badge.style.display=cnt?'inline-block':'none'; }
  if(step2) step2.style.display = cnt ? 'block' : 'none';
  nkKelasUpdateStep2();
}

function nkKelasUpdateStep2(){
  const tujuan = (document.getElementById('nk-kelas-tujuan')?.value||'').trim();
  const cnt = nkKelasSelectedIds.size;
  const btn = document.getElementById('nk-btn-kelas');
  const info = document.getElementById('nk-kelas-info');
  if(tujuan && cnt){
    if(info){ info.style.display='block'; info.innerHTML=`<strong>${cnt} santri</strong> akan naik ke <strong>Kelas ${tujuan}</strong>`; }
    if(btn){ btn.disabled=false; btn.style.opacity='1'; }
  } else {
    if(info) info.style.display='none';
    if(btn){ btn.disabled=true; btn.style.opacity='.4'; }
  }
}

async function nkTerapkanNaikKelas(){
  const tujuan = (document.getElementById('nk-kelas-tujuan')?.value||'').trim();
  const cnt = nkKelasSelectedIds.size;
  if(!tujuan||!cnt){ toast('Pilih santri dan isi kelas tujuan!',false); return; }
  if(_isLoading) return;

  konfirm(`Ubah kelas <strong>${cnt} santri</strong> menjadi <strong>Kelas ${tujuan}</strong>?`, async()=>{
    const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menerapkan naik kelas...', `Memproses <strong>${cnt} santri</strong>.<br>Harap tunggu, jangan klik tombol lain.`);
    setLoading(true, _lBtn);
    try {
    const ids = [...nkKelasSelectedIds];
    const targetSantri = ids.map(id=>ALL_SANTRI.find(s=>s.id===id)).filter(Boolean);
    const {error} = await SB.from('santri').update({kelas:tujuan, catatan:tujuan}).in('id',ids);
    if(error){ toast('Gagal: '+error.message,false); return; }
    for(const s of targetSantri){
      if((s.kelas||'')===tujuan) continue;
      const diffObj = {kelas:{label:'Kelas', lama:s.kelas||'—', baru:tujuan}};
      await catatRiwayatSantri({santri_id:s.id, santri_nama:s.nama, asrama_id:getAsramaIdBySantri(s), jenis:'edit', diffObj, sumber:'langsung'});
    }
    toast(`✅ ${ids.length} santri berhasil naik ke Kelas ${tujuan}!`);
    nkKelasSelectedIds.clear();
    await loadAllData();
    nkInitKelasFilter();
    nkRenderKelasList();
    } catch(e){ toast('Gagal: '+e.message,false); }
    finally { setLoading(false, _lBtn); }
  }, 'lainnya');
}

// ===== PINDAH KOBONG: PILIH SANTRI DULU =====
let nkSelectedIds = new Set();

function nkRenderPindahList(){
  const q = (document.getElementById('nk-pindah-cari')?.value||'').toLowerCase();
  const kf = document.getElementById('nk-pindah-filter-kobong')?.value||'';
  const el = document.getElementById('nk-pindah-list');
  if(!el) return;

  let list = ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(kf && String(s.kobong_id)!==kf) return false;
    return true;
  });

  if(!list.length){
    el.innerHTML=`<div class="empty" style="padding:30px"><span class="ei">👤</span><p>Tidak ada santri ditemukan</p></div>`;
    return;
  }

  // Group by kobong
  const byKobong = {};
  list.forEach(s=>{
    const kId = s.kobong_id||'__none__';
    const kNama = s.kobong?.nama||getKobongNama(s.kobong_id)||'Tanpa Kobong';
    if(!byKobong[kId]) byKobong[kId]={nama:kNama, list:[]};
    byKobong[kId].list.push(s);
  });

  el.innerHTML = Object.values(byKobong).map(group=>`
    <div style="padding:6px 14px;background:var(--green-p);border-bottom:1px solid var(--green-b);font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;justify-content:space-between">
      <span>🏠 ${group.nama}</span>
      <button onclick="nkPilihSatuKobong(${JSON.stringify(group.list.map(s=>s.id))})" style="background:none;border:1px solid var(--green-b);color:var(--green);border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif">Pilih Semua Kobong Ini</button>
    </div>
    ${group.list.map(s=>`
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:.1s;${nkSelectedIds.has(s.id)?'background:#f0fdf4;':''}">
        <input type="checkbox" ${nkSelectedIds.has(s.id)?'checked':''} onchange="nkToggle(${s.id},this.checked)"
          style="width:16px;height:16px;accent-color:var(--green);flex-shrink:0;cursor:pointer">
        <div class="av" style="width:32px;height:32px;font-size:12px;flex-shrink:0;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${s.nama}</div>
          <div style="font-size:11px;color:var(--text-l)">Kelas ${s.kelas||'—'} · Saldo ${rp(s.saldo)}</div>
        </div>
        ${nkSelectedIds.has(s.id)?'<span style="font-size:11px;color:var(--green);font-weight:600">✓ Dipilih</span>':''}
      </label>
    `).join('')}
  `).join('');

  nkUpdateBadge();
}

function nkToggle(id, checked){
  if(checked) nkSelectedIds.add(id);
  else nkSelectedIds.delete(id);
  nkUpdateBadge();
  nkRenderPindahList();
}

function nkPilihSemua(){
  const kf = document.getElementById('nk-pindah-filter-kobong')?.value||'';
  const q = (document.getElementById('nk-pindah-cari')?.value||'').toLowerCase();
  ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(kf && String(s.kobong_id)!==kf) return false;
    return true;
  }).forEach(s=>nkSelectedIds.add(s.id));
  nkUpdateBadge();
  nkRenderPindahList();
}

function nkBatalSemua(){
  nkSelectedIds.clear();
  nkUpdateBadge();
  nkRenderPindahList();
}

function nkPilihSatuKobong(ids){
  ids.forEach(id=>nkSelectedIds.add(id));
  nkUpdateBadge();
  nkRenderPindahList();
}

function nkUpdateBadge(){
  const cnt = nkSelectedIds.size;
  const badge = document.getElementById('nk-selected-badge');
  const step2 = document.getElementById('nk-step2');
  if(badge){ badge.textContent=cnt+' santri dipilih'; badge.style.display=cnt?'inline-block':'none'; }
  if(step2) step2.style.display = cnt ? 'block' : 'none';
  nkUpdateStep2();
}

function nkUpdateStep2(){
  const tujuanId = parseInt(document.getElementById('nk-kobong-tujuan')?.value)||0;
  const btn = document.getElementById('nk-btn-pindah');
  const info = document.getElementById('nk-konfirmasi-info');
  const cnt = nkSelectedIds.size;
  if(tujuanId && cnt){
    const kTujuan = ALL_KOBONG.find(k=>k.id===tujuanId);
    if(info){ info.style.display='block'; info.innerHTML=`<strong>${cnt} santri</strong> akan dipindah ke kobong <strong>🏠 ${kTujuan?.nama}</strong>`; }
    if(btn){ btn.disabled=false; btn.style.opacity='1'; }
  } else {
    if(info) info.style.display='none';
    if(btn){ btn.disabled=true; btn.style.opacity='.4'; }
  }
}

async function nkTerapkanPindahKobong(){
  const tujuanId = parseInt(document.getElementById('nk-kobong-tujuan')?.value)||0;
  const cnt = nkSelectedIds.size;
  if(!tujuanId||!cnt){ toast('Pilih santri dan kobong tujuan!',false); return; }
  if(_isLoading) return;
  const kTujuan = ALL_KOBONG.find(k=>k.id===tujuanId);

  // Cek apakah ada santri yang sudah di kobong tujuan
  const sudahDisana = ALL_SANTRI.filter(s=>nkSelectedIds.has(s.id)&&s.kobong_id===tujuanId);
  const pesanTambahan = sudahDisana.length ? `<br><small style="color:var(--gold)">(${sudahDisana.length} santri sudah di kobong ini, akan dilewati)</small>` : '';

  konfirm(`Pindahkan <strong>${cnt} santri</strong> ke kobong <strong>${kTujuan?.nama}</strong>?${pesanTambahan}`, async()=>{
    const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Memindahkan kobong...', `Memproses <strong>${cnt} santri</strong>.<br>Harap tunggu, jangan klik tombol lain.`);
    setLoading(true, _lBtn);
    try {
    const ids = [...nkSelectedIds].filter(id=>{
      const s = ALL_SANTRI.find(x=>x.id===id);
      return s && s.kobong_id !== tujuanId;
    });
    if(!ids.length){ toast('Semua santri sudah di kobong tujuan!',false); return; }
    const {error} = await SB.from('santri').update({kobong_id:tujuanId}).in('id',ids);
    if(error){ toast('Gagal: '+error.message,false); return; }
    toast(`✅ ${ids.length} santri berhasil dipindah ke ${kTujuan?.nama}!`);
    nkSelectedIds.clear();
    await loadAllData();
    nkRenderPindahList();
    nkUpdateBadge();
    document.getElementById('nk-kobong-tujuan').value='';
    } catch(e){ toast('Gagal: '+e.message,false); }
    finally { setLoading(false, _lBtn); }
  }, 'hapus');
}

// ===== ATUR INDIVIDU =====
function nkSetMode(mode){
  ['kelas','kobong','individu','wali'].forEach(m=>{
    document.getElementById('nk-panel-'+m).style.display = m===mode?'block':'none';
    const btn = document.getElementById('nk-mode-'+m);
    if(btn){ btn.className = m===mode?'btn btn-p':'btn btn-o'; }
  });
  if(mode==='kelas'){ nkInitKelasFilter(); nkRenderKelasList(); }
  if(mode==='kobong') nkRenderPindahList();
  if(mode==='individu') nkRenderTabel();
  if(mode==='wali') nkInitWaliSelects();
}

let nkWaliSelectedIds = new Set();

function nkInitWaliSelects(){
  // Populate filter wali (semua pengurus yang punya santri)
  const waliAda = new Set(ALL_SANTRI.map(s=>s.created_by).filter(Boolean));
  const pengurusAda = ALL_PENGURUS.filter(p=>waliAda.has(p.username));
  const filterSel = document.getElementById('nk-wali-filter-pengurus');
  if(filterSel){
    filterSel.innerHTML='<option value="">Semua Wali</option>';
    pengurusAda.forEach(p=>{ filterSel.innerHTML+=`<option value="${p.username}">👨‍💼 ${p.nama}</option>`; });
    // Juga tambah "kangadmin" jika ada santrinya
    if(waliAda.has('kangadmin') && !pengurusAda.find(p=>p.username==='kangadmin')){
      filterSel.innerHTML+=`<option value="kangadmin">👑 Kang Admin</option>`;
    }
  }
  // Populate wali tujuan (pengurus sesuai scope sekretaris, atau semua kalau Kang Admin)
  const keSel = document.getElementById('wali-ke');
  if(keSel){
    const diriSendiri = (SESSION.role==='sekretaris'||SESSION.role==='sekretariat') ? `<option value="${SESSION.user.username}">⭐ ${SESSION.user.nama} (Anda)</option>` : '';
    keSel.innerHTML='<option value="">— Pilih Pengurus Tujuan —</option>' + diriSendiri;
    getPengurusRelevanUntukWali().forEach(p=>{
      keSel.innerHTML+=`<option value="${p.username}">👨‍💼 ${p.nama} (@${p.username})</option>`;
    });
  }
  nkWaliSelectedIds.clear();
  nkRenderWaliList();
}

function nkRenderWaliList(){
  const q = (document.getElementById('nk-wali-cari')?.value||'').toLowerCase();
  const pf = document.getElementById('nk-wali-filter-pengurus')?.value||'';
  const el = document.getElementById('nk-wali-list');
  if(!el) return;

  let list = ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(pf && s.created_by!==pf) return false;
    return true;
  });

  if(!list.length){
    el.innerHTML=`<div class="empty" style="padding:30px"><span class="ei">👤</span><p>Tidak ada santri ditemukan</p></div>`;
    nkWaliUpdateBadge(); return;
  }

  // Group by wali (created_by)
  const byWali = {};
  list.forEach(s=>{
    const w = s.created_by||'__none__';
    const p = ALL_PENGURUS.find(x=>x.username===w);
    const wNama = p ? p.nama+' (@'+w+')' : (w==='kangadmin'?'👑 Kang Admin':w||'Tanpa Wali');
    if(!byWali[w]) byWali[w]={nama:wNama, list:[]};
    byWali[w].list.push(s);
  });

  el.innerHTML = Object.values(byWali).map(group=>`
    <div style="padding:6px 14px;background:var(--green-p);border-bottom:1px solid var(--green-b);font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;justify-content:space-between">
      <span>👨‍💼 ${group.nama} — ${group.list.length} santri</span>
      <button onclick="nkWaliPilihGroup(${JSON.stringify(group.list.map(s=>s.id))})" style="background:none;border:1px solid var(--green-b);color:var(--green);border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif">Pilih Semua Wali Ini</button>
    </div>
    ${group.list.map(s=>`
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:.1s;${nkWaliSelectedIds.has(s.id)?'background:#f0fdf4;':''}">
        <input type="checkbox" ${nkWaliSelectedIds.has(s.id)?'checked':''} onchange="nkWaliToggle(${s.id},this.checked)"
          style="width:16px;height:16px;accent-color:var(--green);flex-shrink:0;cursor:pointer">
        <div class="av" style="width:32px;height:32px;font-size:12px;flex-shrink:0;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${s.nama}</div>
          <div style="font-size:11px;color:var(--text-l)">🏠 ${s.kobong?.nama||getKobongNama(s.kobong_id)||'—'} · Kelas ${s.kelas||'—'}</div>
        </div>
        ${nkWaliSelectedIds.has(s.id)?'<span style="font-size:11px;color:var(--green);font-weight:600">✓ Dipilih</span>':''}
      </label>
    `).join('')}
  `).join('');

  nkWaliUpdateBadge();
}

function nkWaliToggle(id, checked){
  if(checked) nkWaliSelectedIds.add(id);
  else nkWaliSelectedIds.delete(id);
  nkWaliUpdateBadge();
  nkRenderWaliList();
}

function nkWaliPilihSemua(){
  const q = (document.getElementById('nk-wali-cari')?.value||'').toLowerCase();
  const pf = document.getElementById('nk-wali-filter-pengurus')?.value||'';
  ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(pf && s.created_by!==pf) return false;
    return true;
  }).forEach(s=>nkWaliSelectedIds.add(s.id));
  nkWaliUpdateBadge();
  nkRenderWaliList();
}

function nkWaliBatalSemua(){
  nkWaliSelectedIds.clear();
  nkWaliUpdateBadge();
  nkRenderWaliList();
}

function nkWaliPilihGroup(ids){
  ids.forEach(id=>nkWaliSelectedIds.add(id));
  nkWaliUpdateBadge();
  nkRenderWaliList();
}

function nkWaliUpdateBadge(){
  const cnt = nkWaliSelectedIds.size;
  const badge = document.getElementById('nk-wali-badge');
  const step2 = document.getElementById('nk-wali-step2');
  if(badge){ badge.textContent=cnt+' santri dipilih'; badge.style.display=cnt?'inline-block':'none'; }
  if(step2) step2.style.display = cnt ? 'block' : 'none';
  nkWaliUpdateStep2();
}

function nkWaliUpdateStep2(){
  const ke = document.getElementById('wali-ke')?.value||'';
  const cnt = nkWaliSelectedIds.size;
  const btn = document.getElementById('nk-btn-wali');
  const info = document.getElementById('nk-wali-konfirmasi-info');
  if(ke && cnt){
    const namaKe = ALL_PENGURUS.find(p=>p.username===ke)?.nama||ke;
    if(info){ info.style.display='block'; info.innerHTML=`<strong>${cnt} santri</strong> akan dipindahkan ke wali <strong>👨‍💼 ${namaKe}</strong>`; }
    if(btn){ btn.disabled=false; btn.style.opacity='1'; }
  } else {
    if(info) info.style.display='none';
    if(btn){ btn.disabled=true; btn.style.opacity='.4'; }
  }
}

async function nkGantiWaliMassal(){
  const ke = document.getElementById('wali-ke')?.value||'';
  const cnt = nkWaliSelectedIds.size;
  if(!ke||!cnt){ toast('Pilih santri dan pengurus tujuan!',false); return; }
  if(_isLoading) return;
  const namaKe = ALL_PENGURUS.find(p=>p.username===ke)?.nama||ke;

  // Cek apakah ada santri yang sudah di wali tujuan
  const sudahDisana = ALL_SANTRI.filter(s=>nkWaliSelectedIds.has(s.id)&&s.created_by===ke);
  const pesanTambahan = sudahDisana.length ? `<br><small style="color:var(--gold)">(${sudahDisana.length} santri sudah di wali ini, akan dilewati)</small>` : '';

  konfirm(`Pindahkan <strong>${cnt} santri</strong> ke wali <strong>${namaKe}</strong>?${pesanTambahan}`, async()=>{
    const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Mengganti wali...', `Memproses <strong>${cnt} santri</strong>.<br>Harap tunggu, jangan klik tombol lain.`);
    setLoading(true, _lBtn);
    try {
    const ids = [...nkWaliSelectedIds].filter(id=>{
      const s = ALL_SANTRI.find(x=>x.id===id);
      return s && s.created_by !== ke;
    });
    if(!ids.length){ toast('Semua santri sudah di wali tujuan!',false); return; }
    const targetSantri = ids.map(id=>ALL_SANTRI.find(s=>s.id===id)).filter(Boolean);
    const {error} = await SB.from('santri').update({created_by:ke}).in('id',ids);
    if(error){ toast('Gagal: '+error.message,false); return; }
    const namaLabel = (u)=> u==='kangadmin' || !u ? 'Kang Admin' : (ALL_PENGURUS.find(p=>p.username===u)?.nama || u);
    for(const s of targetSantri){
      const diffObj = {created_by:{label:'Wali Santri/Pengurus', lama:namaLabel(s.created_by), baru:namaLabel(ke)}};
      await catatRiwayatSantri({santri_id:s.id, santri_nama:s.nama, asrama_id:getAsramaIdBySantri(s), jenis:'edit', diffObj, sumber:'langsung'});
    }
    toast(`✅ ${ids.length} santri berhasil dipindahkan ke ${namaKe}`);
    nkWaliSelectedIds.clear();
    await loadAllData();
    nkInitWaliSelects();
    } catch(e){ toast('Gagal: '+e.message,false); }
    finally { setLoading(false, _lBtn); }
  }, 'lainnya');
}

function nkRenderTabel(){
  const q = (document.getElementById('nk-cari')?.value||'').toLowerCase();
  const kf = document.getElementById('nk-filter-kobong')?.value||'';
  const tbody = document.getElementById('nk-individu-tbl');
  if(!tbody) return;

  let list = ALL_SANTRI.filter(s=>{
    if(q && !(s.nama||'').toLowerCase().includes(q)) return false;
    if(kf && String(s.kobong_id)!==kf) return false;
    return true;
  });

  document.getElementById('nk-individu-count').textContent = `${list.length} santri ditampilkan`;

  tbody.innerHTML = list.map(s=>{
    const kobNama = s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
    const perubahan = nkPerubahanIndividu[s.id]||{};
    const kelasVal = perubahan.kelas !== undefined ? perubahan.kelas : (s.kelas||'');
    const kobongVal = perubahan.kobong_id !== undefined ? perubahan.kobong_id : (s.kobong_id||'');
    const adaPerubahan = perubahan.kelas !== undefined || perubahan.kobong_id !== undefined;

    return `<tr style="border-bottom:1px solid var(--border);${adaPerubahan?'background:#fffbea;':''}" id="nk-row-${s.id}">
      <td style="padding:10px 12px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av" style="width:32px;height:32px;font-size:12px;background:${avColor(s.nama)}22;color:${avColor(s.nama)}">${avLetter(s.nama)}</div>
          <div style="font-weight:600;font-size:13px">${s.nama}</div>
        </div>
      </td>
      <td style="padding:10px 12px;font-size:13px;color:var(--text-m)">${s.kelas||'—'}</td>
      <td style="padding:10px 12px">
        <input type="text" value="${kelasVal}" placeholder="${s.kelas||'Isi kelas'}"
          onchange="nkSetPerubahan(${s.id},'kelas',this.value);nkHighlightRow(${s.id})"
          style="width:80px;padding:6px 9px;border:1.5px solid ${adaPerubahan&&perubahan.kelas!==undefined?'var(--gold)':'var(--border)'};border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
      </td>
      <td style="padding:10px 12px">
        <span class="badge bg" style="font-size:11px">${kobNama}</span>
      </td>
      <td style="padding:10px 12px">
        <select onchange="nkSetPerubahan(${s.id},'kobong_id',parseInt(this.value));nkHighlightRow(${s.id})"
          style="padding:6px 9px;border:1.5px solid ${adaPerubahan&&perubahan.kobong_id!==undefined?'var(--gold)':'var(--border)'};border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none">
          <option value="${s.kobong_id||''}">— Tetap (${kobNama}) —</option>
          ${getKobongAccessible().filter(k=>k.id!==s.kobong_id).map(k=>`<option value="${k.id}" ${kobongVal==k.id?'selected':''}>${k.nama}</option>`).join('')}
        </select>
      </td>
      <td style="padding:10px 12px;text-align:center">
        <button class="btn btn-p btn-sm" onclick="nkSimpanSatu(${s.id})" ${adaPerubahan?'':'style="opacity:.4"'}>💾</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty"><span class="ei">👤</span><p>Tidak ada santri</p></div></td></tr>`;
}

function nkSetPerubahan(id, field, val){
  if(!nkPerubahanIndividu[id]) nkPerubahanIndividu[id]={};
  nkPerubahanIndividu[id][field] = val;
}

function nkHighlightRow(id){
  const row = document.getElementById('nk-row-'+id);
  if(row) row.style.background='#fffbea';
}

async function nkSimpanSatu(id){
  const p = nkPerubahanIndividu[id];
  if(!p||(!p.kelas&&!p.kobong_id)){ toast('Tidak ada perubahan untuk santri ini.',false); return; }
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan perubahan...','Data santri sedang disimpan.');
  setLoading(true, _lBtn);
  try {
  const upd = {};
  if(p.kelas!==undefined) upd.kelas = p.kelas;
  if(p.kobong_id!==undefined) upd.kobong_id = p.kobong_id;
  const {error} = await SB.from('santri').update(upd).eq('id',id);
  if(error){ toast('Gagal: '+error.message,false); return; }
  delete nkPerubahanIndividu[id];
  toast('✅ Data santri diperbarui!');
  await loadAllData();
  nkRenderTabel();
  } catch(e){ toast('Gagal: '+e.message,false); }
  finally { setLoading(false, _lBtn); }
}

async function nkSimpanSemuaIndividu(){
  const ids = Object.keys(nkPerubahanIndividu);
  if(!ids.length){ toast('Belum ada perubahan yang dilakukan.',false); return; }
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan perubahan...', `Memproses <strong>${ids.length} santri</strong>.<br>Harap tunggu, jangan klik tombol lain.`);
  setLoading(true, _lBtn);
  try {
  let berhasil=0;
  for(const id of ids){
    const p = nkPerubahanIndividu[id];
    const upd = {};
    if(p.kelas!==undefined) upd.kelas = p.kelas;
    if(p.kobong_id!==undefined) upd.kobong_id = p.kobong_id;
    const {error} = await SB.from('santri').update(upd).eq('id',id);
    if(!error){ berhasil++; delete nkPerubahanIndividu[id]; }
  }
  toast(`✅ ${berhasil} santri berhasil diperbarui!`);
  await loadAllData();
  nkRenderTabel();
  } catch(e){ toast('Gagal: '+e.message,false); }
  finally { setLoading(false, _lBtn); }
}



