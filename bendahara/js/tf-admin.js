// ===== TF ADMIN =====
function getTFFiltered(){
  const q=(document.getElementById('cari-tf')?.value||'').toLowerCase();
  const tahunF=document.getElementById('filter-tahun-tf')?.value||'';
  const bulanF=document.getElementById('filter-bulan-tf')?.value||'';
  const dariF=document.getElementById('filter-tgl-dari-tf')?.value||'';
  const sampaiF=document.getElementById('filter-tgl-sampai-tf')?.value||'';

  return ALL_TF_ADMIN.filter(tf=>{
    if(q && !(tf.nama_santri||'').toLowerCase().includes(q)) return false;
    if(tahunF && !(tf.bulan||'').endsWith(tahunF)) return false;
    if(bulanF && !(tf.bulan||'').includes(bulanF)) return false;
    if(dariF && tf.created_at && tf.created_at.split('T')[0] < dariF) return false;
    if(sampaiF && tf.created_at && tf.created_at.split('T')[0] > sampaiF) return false;
    return true;
  });
}

function resetFilterTF(){
  document.getElementById('cari-tf').value='';
  document.getElementById('filter-tahun-tf').value='';
  document.getElementById('filter-bulan-tf').value='';
  document.getElementById('filter-tgl-dari-tf').value='';
  document.getElementById('filter-tgl-sampai-tf').value='';
  renderTFAdmin();
}

function renderTFAdmin(){
  const data = getTFFiltered();

  // Rekap total
  const totalMasuk = data.reduce((s,tf)=>s+Number(tf.total_tf||0),0);
  const totalMakan = data.reduce((s,tf)=>s+Number(tf.uang_makan||0),0);
  const totalListrik = data.reduce((s,tf)=>s+Number(tf.listrik||0),0);
  const totalSppMts = data.reduce((s,tf)=>s+Number(tf.spp_mts||0),0);
  const totalSppMa = data.reduce((s,tf)=>s+Number(tf.spp_ma||0),0);
  const totalJajan = data.reduce((s,tf)=>s+Number(tf.uang_jajan||0),0);
  const totalSisa = data.reduce((s,tf)=>s+Number(tf.sisa||0),0);

  // Rekap Dll per keterangan
  const dllRekap = {};
  data.forEach(tf=>{
    if(!tf.dll) return;
    try{
      JSON.parse(tf.dll).forEach(item=>{
        const ket = item.ket || 'Lainnya';
        if(!dllRekap[ket]) dllRekap[ket]=0;
        dllRekap[ket] += Number(item.nominal||0);
      });
    }catch(e){}
  });

  // Rekap per dapur
  const dapurRekap = {};
  data.forEach(tf=>{
    const s = getSantriById(tf.santri_id)||{};
    const d = DAPUR_LIST?.find(dp=>String(dp.id)===String(s.dapur_id));
    const dNama = d ? `${d.emoji||'🍽️'} ${d.nama}` : '🍽️ Dapur';
    if(!dapurRekap[dNama]) dapurRekap[dNama]=0;
    dapurRekap[dNama] += Number(tf.uang_makan||0);
  });

  const rekapEl = document.getElementById('tf-rekap-total');
  if(rekapEl){
    const dapurHtml = Object.entries(dapurRekap).map(([nama,total])=>`
      <div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${nama}</div>
        <div style="font-size:15px;font-weight:700;color:#0369a1">${fmtRp(total)}</div>
      </div>
    `).join('');

    const dllHtml = Object.entries(dllRekap).map(([ket,total])=>`
      <div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${svgIcon('tag',11)} ${ket}</div>
        <div style="font-size:16px;font-weight:700;color:#475569">${fmtRp(total)}</div>
      </div>
    `).join('');

    rekapEl.innerHTML = `
      <div style="background:var(--green-p);border:1.5px solid var(--green-b);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">Total TF Masuk</div>
        <div style="font-size:16px;font-weight:700;color:var(--green)">${fmtRp(totalMasuk)}</div>
      </div>
      ${dapurHtml}
      <div style="background:#fefce8;border:1.5px solid #fde047;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${svgIcon('zap',11)} Listrik</div>
        <div style="font-size:16px;font-weight:700;color:#a16207">${fmtRp(totalListrik)}</div>
      </div>
      ${totalSppMts?`<div style="background:#fdf4ff;border:1.5px solid #e879f9;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${svgIcon('graduation-cap',11)} SPP MTs</div>
        <div style="font-size:16px;font-weight:700;color:#7e22ce">${fmtRp(totalSppMts)}</div>
      </div>`:''}
      ${totalSppMa?`<div style="background:#fdf4ff;border:1.5px solid #e879f9;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${svgIcon('graduation-cap',11)} SPP MA</div>
        <div style="font-size:16px;font-weight:700;color:#7e22ce">${fmtRp(totalSppMa)}</div>
      </div>`:''}
      <div style="background:#fff7ed;border:1.5px solid #fdba74;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${svgIcon('cash',11)} Uang Jajan</div>
        <div style="font-size:16px;font-weight:700;color:#c2410c">${fmtRp(totalJajan)}</div>
      </div>
      ${dllHtml}
      ${totalSisa!==0?`<div style="background:${totalSisa>0?'#f0fdf4':'#fef2f2'};border:1.5px solid ${totalSisa>0?'#bbf7d0':'#fecaca'};border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-m);font-weight:600;text-transform:uppercase">${totalSisa>0?svgIcon('cash',11)+' Sisa':svgIcon('alert-triangle',11)+' Kekurangan'}</div>
        <div style="font-size:16px;font-weight:700;color:${totalSisa>0?'var(--green)':'var(--red)'}">${fmtRp(Math.abs(totalSisa))}</div>
      </div>`:''}
    `;
  }

  const el = document.getElementById('tf-list');
  const emptyEl = document.getElementById('tf-empty');
  if(!data.length){ if(el) el.innerHTML=''; if(emptyEl) emptyEl.style.display='block'; return; }
  if(emptyEl) emptyEl.style.display='none';

  el.innerHTML = data.map(tf=>{
    const sisa = Number(tf.sisa||0);
    const tgl = tf.created_at ? new Date(tf.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const s = getSantriById(tf.santri_id)||{};
    const d = DAPUR_LIST?.find(dp=>String(dp.id)===String(s.dapur_id));
    const dNama = d ? `${d.emoji||'🍽️'} ${d.nama}` : null;
    const bulanArr = tf.bulan ? tf.bulan.split(',').map(b=>b.trim()) : [];

    return `<div style="border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <strong style="font-size:14px">${tf.nama_santri||'—'}</strong>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
            ${bulanArr.map(b=>`<span class="badge badge-lunas" style="font-size:11px">${b}</span>`).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-m);margin-bottom:6px">${svgIcon('calendar',11)} ${tgl}${tf.catatan?' · '+svgIcon('edit',11)+' '+tf.catatan:''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${tf.uang_makan?`<span style="font-size:11px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:2px 8px;color:#0369a1">${svgIcon('utensils',10)}${dNama?' '+dNama:''}: ${fmtRp(tf.uang_makan)}</span>`:''}
            ${tf.listrik?`<span style="font-size:11px;background:#fefce8;border:1px solid #fde047;border-radius:6px;padding:2px 8px;color:#a16207">${svgIcon('zap',10)} ${fmtRp(tf.listrik)}</span>`:''}
            ${tf.spp_mts?`<span style="font-size:11px;background:#fdf4ff;border:1px solid #e879f9;border-radius:6px;padding:2px 8px;color:#7e22ce">${svgIcon('graduation-cap',10)} MTs: ${fmtRp(tf.spp_mts)}</span>`:''}
            ${tf.spp_ma?`<span style="font-size:11px;background:#fdf4ff;border:1px solid #e879f9;border-radius:6px;padding:2px 8px;color:#7e22ce">${svgIcon('graduation-cap',10)} MA: ${fmtRp(tf.spp_ma)}</span>`:''}
            ${tf.uang_jajan?`<span style="font-size:11px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:2px 8px;color:#c2410c">${svgIcon('cash',10)} ${fmtRp(tf.uang_jajan)}</span>`:''}
            ${tf.dll?JSON.parse(tf.dll).map(i=>`<span style="font-size:11px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:2px 8px;color:#475569">${svgIcon('tag',10)} ${i.ket}: ${fmtRp(i.nominal)}</span>`).join(''):''}
            ${sisa!==0?`<span style="font-size:11px;background:${sisa>0?'#f0fdf4':'#fef2f2'};border:1px solid ${sisa>0?'#bbf7d0':'#fecaca'};border-radius:6px;padding:2px 8px;color:${sisa>0?'var(--green)':'var(--red)'}">
              ${sisa>0?svgIcon('cash',10):svgIcon('alert-triangle',10)}: ${fmtRp(Math.abs(sisa))}</span>`:''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:18px;font-weight:700;color:var(--green)">${fmtRp(tf.total_tf)}</div>
          <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
            <button class="btn btn-b btn-xs" onclick="editTFAdmin(${tf.id})">${svgIcon('edit',12)}</button>
            <button class="btn btn-d btn-xs" onclick="hapusTFAdmin(${tf.id},'${(tf.nama_santri||'').replace(/'/g,'')}')">${svgIcon('trash',12)}</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Search santri
function tfSearchSantri(){
  const q = (document.getElementById('tf-santri-search')?.value||'').toLowerCase();
  const dd = document.getElementById('tf-santri-dropdown');
  if(!q){ dd.style.display='none'; return; }
  const results = ALL_SANTRI.filter(s=>(s.nama||'').toLowerCase().includes(q)).slice(0,10);
  if(!results.length){ dd.style.display='none'; return; }
  dd.innerHTML = results.map(s=>`
    <div onclick="tfPilihSantri('${s.id}','${(s.nama||'').replace(/'/g,'')}')"
      style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--green-p)'" onmouseout="this.style.background=''">
      <div style="font-weight:600">${s.nama}</div>
      <div style="font-size:11px;color:var(--text-l)">${s.kobong?.nama||'—'} · Kelas ${s.kelas||'—'}</div>
    </div>
  `).join('');
  dd.style.display='block';
}

function tfPilihSantri(id, nama){
  document.getElementById('tf-santri-id').value = id;
  document.getElementById('tf-santri-search').value = nama;
  document.getElementById('tf-santri-dropdown').style.display='none';
  const selEl = document.getElementById('tf-santri-selected');
  document.getElementById('tf-santri-selected-nama').textContent = nama;
  selEl.style.display='flex';

  // Isi info dapur
  const s = getSantriById(id)||{};
  const d = DAPUR_LIST?.find(dp=>String(dp.id)===String(s.dapur_id));
  const dapurInfo = document.getElementById('tf-makan-dapur-info');
  if(dapurInfo) dapurInfo.textContent = d ? `Dapur: ${d.emoji||''} ${d.nama}` : '';

  tfIsibulanCheckbox(id);
}

function tfClearSantri(){
  document.getElementById('tf-santri-id').value='';
  document.getElementById('tf-santri-search').value='';
  document.getElementById('tf-santri-selected').style.display='none';
  document.getElementById('tf-bulan-list').innerHTML='<div style="color:var(--text-l);font-size:13px;text-align:center;padding:10px">Pilih santri dulu</div>';
  document.getElementById('tf-makan').value='';
  document.getElementById('tf-listrik').value='';
  document.getElementById('tf-makan-hint').textContent='';
  document.getElementById('tf-listrik-hint').textContent='';
  document.getElementById('tf-makan-dapur-info').textContent='';
  tfHitungSisa();
}

function tfIsibulanCheckbox(santriId){
  const tagihan = ALL_TAGIHAN.filter(t=>
    String(t.santri_id)===String(santriId) && t.status!=='lunas'
  );
  const bulanList = document.getElementById('tf-bulan-list');
  if(!tagihan.length){
    bulanList.innerHTML='<div style="color:var(--green);font-size:13px;text-align:center;padding:10px">✅ Semua tagihan sudah lunas!</div>';
    return;
  }
  const URUTAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const sorted = [...tagihan].sort((a,b)=>{
    const [nmA,thnA]=(a.bulan||'').split(' '); const [nmB,thnB]=(b.bulan||'').split(' ');
    return (parseInt(thnA||0)*12+URUTAN.indexOf(nmA))-(parseInt(thnB||0)*12+URUTAN.indexOf(nmB));
  });
  bulanList.innerHTML = sorted.map(t=>{
    const makan = Number(t.nominal_makan||0);
    const listrik = Number(t.nominal_listrik||0);
    const bayar = Number(t.nominal_bayar||0);
    const sisa = Number(t.nominal||0) - bayar;
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;background:#fff">
      <input type="checkbox" class="tf-bulan-cb" value="${t.bulan}" data-makan="${makan}" data-listrik="${listrik}" data-bayar="${bayar}"
        onchange="tfBulanChecked()" style="width:16px;height:16px;accent-color:var(--green);flex-shrink:0">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${t.bulan}</div>
        <div style="font-size:11px;color:var(--text-m)">
          Makan: ${fmtRp(makan)} · Listrik: ${fmtRp(listrik)}
          ${bayar>0?` · <span style="color:orange">Sudah bayar: ${fmtRp(bayar)}</span>`:''}
        </div>
        <div style="font-size:11px;color:var(--red);font-weight:600">Sisa: ${fmtRp(sisa)}</div>
      </div>
    </label>`;
  }).join('');
}

function tfBulanChecked(){
  const cbs = document.querySelectorAll('.tf-bulan-cb:checked');
  let totalMakan=0, totalListrik=0;
  cbs.forEach(cb=>{
    totalMakan += Number(cb.dataset.makan||0);
    totalListrik += Number(cb.dataset.listrik||0);
  });
  // Kurangi yang sudah dibayar
  cbs.forEach(cb=>{ totalMakan -= Math.min(Number(cb.dataset.bayar||0), Number(cb.dataset.makan||0)); });
  document.getElementById('tf-makan').value = totalMakan||'';
  document.getElementById('tf-listrik').value = totalListrik||'';
  const jumlah = cbs.length;
  document.getElementById('tf-makan-hint').textContent = jumlah>0?`(${jumlah} bulan)` : '';
  document.getElementById('tf-listrik-hint').textContent = jumlah>0?`(${jumlah} bulan)` : '';
  tfHitungSisa();
}

function bukaModalTFAdmin(){
  document.getElementById('tf-edit-id').value='';
  document.getElementById('tf-santri-id').value='';
  document.getElementById('tf-santri-search').value='';
  document.getElementById('tf-santri-selected').style.display='none';
  document.getElementById('tf-santri-dropdown').style.display='none';
  document.getElementById('tf-bulan-list').innerHTML='<div style="color:var(--text-l);font-size:13px;text-align:center;padding:10px">Pilih santri dulu</div>';
  document.getElementById('tf-total').value='';
  document.getElementById('tf-makan').value='';
  document.getElementById('tf-listrik').value='';
  document.getElementById('tf-spp-mts').value='';
  document.getElementById('tf-spp-ma').value='';
  document.getElementById('tf-jajan').value='';
  document.getElementById('tf-catatan').value='';
  document.getElementById('tf-dll-list').innerHTML='';
  document.getElementById('tf-makan-hint').textContent='';
  document.getElementById('tf-listrik-hint').textContent='';
  document.getElementById('tf-makan-dapur-info').textContent='';
  document.getElementById('mo-tf-title').textContent='➕ Tambah TF Admin';
  tfHitungSisa();
  openMo('mo-tf-admin');
}

function editTFAdmin(id){
  const tf = ALL_TF_ADMIN.find(t=>String(t.id)===String(id));
  if(!tf) return;
  bukaModalTFAdmin();
  document.getElementById('tf-edit-id').value=tf.id;
  document.getElementById('tf-santri-id').value=tf.santri_id||'';
  document.getElementById('tf-santri-search').value=tf.nama_santri||'';
  document.getElementById('tf-santri-selected-nama').textContent=tf.nama_santri||'';
  document.getElementById('tf-santri-selected').style.display='flex';
  document.getElementById('tf-total').value=tf.total_tf||'';
  document.getElementById('tf-makan').value=tf.uang_makan||'';
  document.getElementById('tf-listrik').value=tf.listrik||'';
  document.getElementById('tf-spp-mts').value=tf.spp_mts||'';
  document.getElementById('tf-spp-ma').value=tf.spp_ma||'';
  document.getElementById('tf-jajan').value=tf.uang_jajan||'';
  document.getElementById('tf-catatan').value=tf.catatan||'';
  // Isi dll
  document.getElementById('tf-dll-list').innerHTML='';
  if(tf.dll && Array.isArray(tf.dll)){
    tf.dll.forEach(item=>tfTambahDll(item.ket, item.nominal));
  }
  document.getElementById('mo-tf-title').textContent='✏️ Edit TF Admin';
  if(tf.santri_id) tfIsibulanCheckbox(tf.santri_id);
  // Re-check bulan yang sudah dipilih
  if(tf.bulan){
    const bulanArr = tf.bulan.split(',').map(b=>b.trim());
    setTimeout(()=>{
      document.querySelectorAll('.tf-bulan-cb').forEach(cb=>{
        if(bulanArr.includes(cb.value)) cb.checked=true;
      });
    }, 100);
  }

  // Info dapur
  const s = getSantriById(tf.santri_id)||{};
  const d = DAPUR_LIST?.find(dp=>String(dp.id)===String(s.dapur_id));
  const dapurInfo = document.getElementById('tf-makan-dapur-info');
  if(dapurInfo) dapurInfo.textContent = d ? `Dapur: ${d.emoji||''} ${d.nama}` : '';
  tfHitungSisa();
}

function tfAutoFillTagihan(){ /* deprecated, pakai tfBulanChecked */ }

function tfTambahDll(ket='', nominal=''){
  const list = document.getElementById('tf-dll-list');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
  div.innerHTML=`
    <input type="text" placeholder="Keterangan" value="${ket}" 
      style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px"
      class="tf-dll-ket">
    <input type="number" placeholder="Nominal" value="${nominal}"
      style="width:120px;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px"
      class="tf-dll-nominal" oninput="tfHitungSisa()">
    <button type="button" onclick="this.parentElement.remove();tfHitungSisa()"
      style="background:#fee2e2;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;color:var(--red);display:inline-flex" title="Hapus">${svgIcon('x',13)}</button>
  `;
  list.appendChild(div);
}

function tfHitungSisa(){
  const total = Number(document.getElementById('tf-total')?.value||0);
  const makan = Number(document.getElementById('tf-makan')?.value||0);
  const listrik = Number(document.getElementById('tf-listrik')?.value||0);
  const sppMts = Number(document.getElementById('tf-spp-mts')?.value||0);
  const sppMa = Number(document.getElementById('tf-spp-ma')?.value||0);
  const jajan = Number(document.getElementById('tf-jajan')?.value||0);
  const dllTotal = [...document.querySelectorAll('.tf-dll-nominal')].reduce((s,el)=>s+Number(el.value||0),0);
  const sisa = total - makan - listrik - sppMts - sppMa - jajan - dllTotal;
  const sisaEl = document.getElementById('tf-sisa-display');
  const sisaBox = document.getElementById('tf-sisa-box');
  if(sisaEl){
    sisaEl.textContent = fmtRp(Math.abs(sisa));
    sisaEl.style.color = sisa>=0?'var(--green)':'var(--red)';
  }
  if(sisaBox){
    sisaBox.style.background = sisa>=0?'var(--green-p)':'#fef2f2';
    sisaBox.querySelector('span:first-child').textContent = sisa>=0?'Sisa / Kelebihan':'⚠️ Kekurangan';
  }
}

async function simpanTFAdmin(){
  const editId = document.getElementById('tf-edit-id').value;
  const santriId = document.getElementById('tf-santri-id').value;
  const total = Number(document.getElementById('tf-total').value||0);
  const makan = Number(document.getElementById('tf-makan').value||0);
  const listrik = Number(document.getElementById('tf-listrik').value||0);
  const sppMts = Number(document.getElementById('tf-spp-mts').value||0);
  const sppMa = Number(document.getElementById('tf-spp-ma').value||0);
  const jajan = Number(document.getElementById('tf-jajan').value||0);
  const catatan = document.getElementById('tf-catatan').value.trim();

  // Kumpulkan dll
  const dllItems = [];
  document.querySelectorAll('#tf-dll-list > div').forEach(div=>{
    const ket = div.querySelector('.tf-dll-ket')?.value?.trim()||'';
    const nom = Number(div.querySelector('.tf-dll-nominal')?.value||0);
    if(ket || nom) dllItems.push({ket, nominal:nom});
  });
  const dllTotal = dllItems.reduce((s,i)=>s+i.nominal,0);

  // Ambil bulan yang dicentang
  const cbs = document.querySelectorAll('.tf-bulan-cb:checked');
  const bulanArr = [...cbs].map(cb=>cb.value);

  if(!santriId){ toast('Pilih santri dulu!', false); return; }
  if(!bulanArr.length){ toast('Pilih bulan tagihan!', false); return; }
  if(!total){ toast('Isi total TF!', false); return; }

  const s = getSantriById(santriId)||{};
  const sisa = total - makan - listrik - sppMts - sppMa - jajan - dllTotal;
  const bulanStr = bulanArr.join(', ');

  const payload = {
    santri_id: santriId,
    nama_santri: s.nama||'',
    bulan: bulanStr,
    total_tf: total,
    uang_makan: makan,
    listrik,
    spp_mts: sppMts,
    spp_ma: sppMa,
    spp: sppMts + sppMa,
    uang_jajan: jajan,
    dll: dllItems.length ? JSON.stringify(dllItems) : null,
    sisa, catatan,
    created_by: SESSION?.username||''
  };

  try{
    let error;
    if(editId){
      ({error} = await SB.from('tf_admin').update(payload).eq('id', editId));
    } else {
      ({error} = await SB.from('tf_admin').insert(payload));
    }
    if(error){ toast('Gagal simpan: '+error.message, false); return; }

    // Update tagihan santri otomatis per bulan
    if(makan||listrik){
      for(const bulan of bulanArr){
        const tagihan = ALL_TAGIHAN.find(t=>String(t.santri_id)===String(santriId)&&t.bulan===bulan&&t.status!=='lunas');
        if(tagihan){
          const totalBayar = makan/bulanArr.length + listrik/bulanArr.length;
          const nominal = Number(tagihan.nominal||0);
          const status = totalBayar >= nominal ? 'lunas' : totalBayar > 0 ? 'cicilan' : tagihan.status;
          await SB.from('tagihan_pondok').update({
            nominal_bayar: Math.round(totalBayar),
            status,
            tgl_bayar: new Date().toISOString().split('T')[0],
            keterangan: `TF Admin${catatan?' - '+catatan:''}`
          }).eq('id', tagihan.id);
        }
      }
    }

    toast(editId?'✅ TF berhasil diupdate!':'✅ TF berhasil disimpan!');
    closeMo('mo-tf-admin');
    await loadAllData();
    renderTFAdmin();
    renderTagihanTable();
  } catch(e){ toast('Error: '+e.message, false); }
}

async function hapusTFAdmin(id, nama){
  konfirm(`Hapus data TF Admin "${nama}"? Data akan dihapus permanen!`, async()=>{
    try{
      const {error} = await SB.from('tf_admin').delete().eq('id', id);
      if(error){ toast('Gagal hapus: '+error.message, false); return; }
      toast('🗑️ Data TF berhasil dihapus!');
      await loadAllData();
      renderTFAdmin();
    } catch(e){ toast('Error: '+e.message, false); }
  }, 'hapus');
}

function printTFAdmin(){
  const data = getTFFiltered();
  const tahunF=document.getElementById('filter-tahun-tf')?.value||'';
  const bulanF=document.getElementById('filter-bulan-tf')?.value||'';
  const dariF=document.getElementById('filter-tgl-dari-tf')?.value||'';
  const sampaiF=document.getElementById('filter-tgl-sampai-tf')?.value||'';
  let judul = bulanF ? `Rekap TF Admin — ${bulanF}` : tahunF ? `Rekap TF Admin — ${tahunF}` : 'Rekap TF Admin — Semua';
  if(dariF||sampaiF) judul += ` (${dariF||'...'} s/d ${sampaiF||'...'})`;

  const totalMasuk = data.reduce((s,tf)=>s+Number(tf.total_tf||0),0);
  const totalMakan = data.reduce((s,tf)=>s+Number(tf.uang_makan||0),0);
  const totalListrik = data.reduce((s,tf)=>s+Number(tf.listrik||0),0);
  const totalSppMts = data.reduce((s,tf)=>s+Number(tf.spp_mts||0),0);
  const totalSppMa = data.reduce((s,tf)=>s+Number(tf.spp_ma||0),0);
  const totalJajan = data.reduce((s,tf)=>s+Number(tf.uang_jajan||0),0);
  const totalSisa = data.reduce((s,tf)=>s+Number(tf.sisa||0),0);
  const totalDllAll = data.reduce((s,tf)=>{
    if(!tf.dll) return s;
    try{ return s + JSON.parse(tf.dll).reduce((s2,i)=>s2+Number(i.nominal||0),0); }catch(e){ return s; }
  },0);
  const dllRekap = {};
  data.forEach(tf=>{
    if(!tf.dll) return;
    try{
      JSON.parse(tf.dll).forEach(item=>{
        const ket = item.ket || 'Lainnya';
        if(!dllRekap[ket]) dllRekap[ket]=0;
        dllRekap[ket] += Number(item.nominal||0);
      });
    }catch(e){}
  });
  const dllRekapHtml = Object.entries(dllRekap).map(([ket,total])=>`
    <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:10px;color:#666;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px">${svgIcon('tag',11)} ${ket.toUpperCase()}</div>
      <div style="font-size:14px;font-weight:700">${fmtRp(total)}</div>
    </div>
  `).join('');
  const dapurRekap = {};
  data.forEach(tf=>{
    const s = getSantriById(tf.santri_id)||{};
    const d = DAPUR_LIST?.find(dp=>String(dp.id)===String(s.dapur_id));
    const dNama = d ? `${d.emoji||'🍽️'} ${d.nama}` : '🍽️ Lainnya';
    if(!dapurRekap[dNama]) dapurRekap[dNama]=0;
    dapurRekap[dNama] += Number(tf.uang_makan||0);
  });
  const dapurRekapHtml = Object.entries(dapurRekap).map(([nama,total])=>`
    <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:11px;color:#666;font-weight:600">${nama}</div>
      <div style="font-size:15px;font-weight:700">${fmtRp(total)}</div>
    </div>
  `).join('');

  const rows = data.map((tf,i)=>{
    const tgl = tf.created_at ? new Date(tf.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const s = getSantriById(tf.santri_id)||{};
    const d = DAPUR_LIST?.find(dp=>String(dp.id)===String(s.dapur_id));
    const dNama = d ? d.nama : '—';
    let dllList = [];
    try{ dllList = tf.dll ? JSON.parse(tf.dll) : []; }catch(e){}
    const dllText = dllList.length ? dllList.map(it=>`${it.ket}: ${fmtRp(it.nominal)}`).join('<br>') : '—';
    return `<tr>
      <td style="border:1px solid #ddd;padding:5px;text-align:center">${i+1}</td>
      <td style="border:1px solid #ddd;padding:5px">${tf.nama_santri||'—'}</td>
      <td style="border:1px solid #ddd;padding:5px;font-size:11px">${tgl}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(tf.total_tf)}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right;font-size:11px">${tf.uang_makan?`${fmtRp(tf.uang_makan)}<br><span style="color:#666">${dNama}</span>`:'—'}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right">${tf.listrik?fmtRp(tf.listrik):'—'}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right">${tf.spp_mts?fmtRp(tf.spp_mts):'—'}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right">${tf.spp_ma?fmtRp(tf.spp_ma):'—'}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right">${tf.uang_jajan?fmtRp(tf.uang_jajan):'—'}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right;font-size:10px">${dllText}</td>
      <td style="border:1px solid #ddd;padding:5px;text-align:right;color:${Number(tf.sisa||0)>=0?'green':'red'}">${tf.sisa?fmtRp(Math.abs(tf.sisa)):'—'}</td>
    </tr>`;
  }).join('');

  // Total per dapur untuk baris total
  const totalPerDapur = {};
  data.forEach(tf=>{
    const s = getSantriById(tf.santri_id)||{};
    const dNama = getDapurNama(s.dapur_id)||'Lainnya';
    if(!totalPerDapur[dNama]) totalPerDapur[dNama]=0;
    totalPerDapur[dNama] += Number(tf.uang_makan||0);
  });
  const totalMakanPerDapurHtml = Object.entries(totalPerDapur)
    .map(([nama,total])=>`${nama}: ${fmtRp(total)}`).join('<br>');

  const content = `
    <div style="font-family:sans-serif;padding:16px;font-size:12px">
      <div style="text-align:center;margin-bottom:16px">
        <h2 style="margin:0;font-size:16px">${CONFIG.pesantren_nama||'Pondok Pesantren An-Nur'}</h2>
        <h3 style="margin:4px 0;font-size:13px;color:#666">${judul}</h3>
        <div style="font-size:11px;color:#999">Dicetak: ${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      <!-- Rekap Ringkas -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px">
        <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center;background:#f0fdf4">
          <div style="font-size:10px;color:#666;font-weight:600">TOTAL TF MASUK</div>
          <div style="font-size:14px;font-weight:700;color:green">${fmtRp(totalMasuk)}</div>
        </div>
        ${dapurRekapHtml}
        <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#666;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px">${svgIcon('zap',11)} LISTRIK</div>
          <div style="font-size:14px;font-weight:700">${fmtRp(totalListrik)}</div>
        </div>
        <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#666;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px">${svgIcon('graduation-cap',11)} SPP MTs</div>
          <div style="font-size:14px;font-weight:700">${fmtRp(totalSppMts)}</div>
        </div>
        <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#666;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px">${svgIcon('graduation-cap',11)} SPP MA</div>
          <div style="font-size:14px;font-weight:700">${fmtRp(totalSppMa)}</div>
        </div>
        <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#666;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px">${svgIcon('cash',11)} UANG JAJAN</div>
          <div style="font-size:14px;font-weight:700">${fmtRp(totalJajan)}</div>
        </div>
        ${dllRekapHtml}
        <div style="border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center;background:${totalSisa>=0?'#f0fdf4':'#fef2f2'}">
          <div style="font-size:10px;color:#666;font-weight:600">${totalSisa>=0?'SISA':'KEKURANGAN'}</div>
          <div style="font-size:14px;font-weight:700;color:${totalSisa>=0?'green':'red'}">${fmtRp(Math.abs(totalSisa))}</div>
        </div>
      </div>

      <!-- Tabel Detail -->
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="border:1px solid #ddd;padding:5px;text-align:center">#</th>
              <th style="border:1px solid #ddd;padding:5px">Nama Santri</th>
              <th style="border:1px solid #ddd;padding:5px">Tgl Input</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">Total TF</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">Makan/Dapur</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">Listrik</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">SPP MTs</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">SPP MA</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">Jajan</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">Lainnya (Dll)</th>
              <th style="border:1px solid #ddd;padding:5px;text-align:right">Sisa</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f8fafc;font-weight:700">
              <td colspan="3" style="border:1px solid #ddd;padding:5px;text-align:right">TOTAL</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(totalMasuk)}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right;font-size:10px;line-height:1.6">${totalMakanPerDapurHtml}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(totalListrik)}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(totalSppMts)}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(totalSppMa)}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(totalJajan)}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right">${fmtRp(totalDllAll)}</td>
              <td style="border:1px solid #ddd;padding:5px;text-align:right;color:${totalSisa>=0?'green':'red'}">${fmtRp(Math.abs(totalSisa))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin-top:20px;text-align:right;font-size:11px;color:#666">Bendahara An-Nur</div>
    </div>
  `;
  document.getElementById('print-tf-content').innerHTML=content;
  openMo('mo-print-tf');
}

function doPrintTF(){
  const c = document.getElementById('print-tf-content').innerHTML;
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Rekap TF Admin</title>
  <style>
    body{font-family:sans-serif;margin:0;padding:16px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ddd;padding:5px}
    @media print{@page{margin:10mm;size:A4 landscape}}
  </style></head><body>${c}
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Rekap-TF-Admin.html';
  a.click();
  URL.revokeObjectURL(url);
  toast('📄 File rekap berhasil didownload!');
}

function exportExcelTFAdmin(){
  const data = getTFFiltered();
  const tahunF=document.getElementById('filter-tahun-tf')?.value||'';
  const bulanF=document.getElementById('filter-bulan-tf')?.value||'';
  const dariF=document.getElementById('filter-tgl-dari-tf')?.value||'';
  const sampaiF=document.getElementById('filter-tgl-sampai-tf')?.value||'';
  let judul = bulanF ? `TF Admin - ${bulanF}` : tahunF ? `TF Admin - ${tahunF}` : 'TF Admin - Semua';
  if(dariF||sampaiF) judul += ` (${dariF||'...'} sd ${sampaiF||'...'})`;

  const rows = data.map((tf,i)=>{
    const tgl = tf.created_at ? new Date(tf.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const s = getSantriById(tf.santri_id)||{};
    const dNama = getDapurNama(s.dapur_id)||'—';
    let dllList = [];
    try{ dllList = tf.dll ? JSON.parse(tf.dll) : []; }catch(e){}
    const dllText = dllList.map(it=>`${it.ket}: ${fmtRp(it.nominal)}`).join('; ');
    const dllTotal = dllList.reduce((s2,it)=>s2+Number(it.nominal||0),0);
    return [
      i+1,
      tf.nama_santri||'—',
      tgl,
      tf.bulan||'—',
      Number(tf.total_tf||0),
      Number(tf.uang_makan||0),
      dNama,
      Number(tf.listrik||0),
      Number(tf.spp_mts||0),
      Number(tf.spp_ma||0),
      Number(tf.uang_jajan||0),
      dllText,
      dllTotal,
      Number(tf.sisa||0),
      tf.catatan||''
    ];
  });

  // Header
  const header = ['#','Nama Santri','Tgl Input','Bulan','Total TF','Uang Makan','Dapur','Listrik','SPP MTs','SPP MA','Uang Jajan','Lainnya (Dll)','Total Dll','Sisa','Catatan'];

  // Total row
  const totalRow = [
    '','TOTAL','','',
    data.reduce((s,tf)=>s+Number(tf.total_tf||0),0),
    data.reduce((s,tf)=>s+Number(tf.uang_makan||0),0),
    '',
    data.reduce((s,tf)=>s+Number(tf.listrik||0),0),
    data.reduce((s,tf)=>s+Number(tf.spp_mts||0),0),
    data.reduce((s,tf)=>s+Number(tf.spp_ma||0),0),
    data.reduce((s,tf)=>s+Number(tf.uang_jajan||0),0),
    '',
    data.reduce((s,tf)=>{
      if(!tf.dll) return s;
      try{ return s + JSON.parse(tf.dll).reduce((s2,it)=>s2+Number(it.nominal||0),0); }catch(e){ return s; }
    },0),
    data.reduce((s,tf)=>s+Number(tf.sisa||0),0),
    ''
  ];

  // Buat CSV (kompatibel Excel)
  const csvRows = [header, ...rows, totalRow].map(row=>
    row.map(cell=>{
      const str = String(cell??'');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g,'""')}"` : str;
    }).join(',')
  );

  const BOM = '\uFEFF'; // agar Excel baca UTF-8 dengan benar
  const csv = BOM + csvRows.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${judul}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📊 Export Excel berhasil!');
}
