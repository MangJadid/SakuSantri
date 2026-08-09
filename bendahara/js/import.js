// ===== IMPORT =====
function handleDrop(e){ e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag'); const file=e.dataTransfer.files[0]; if(file) handleImportFile(file); }
function handleImportFile(file){
  if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  const reader=new FileReader();
  reader.onload=function(e){
    let rows=[];
    if(ext==='csv'){ const text=e.target.result; rows=text.split('\n').map(r=>r.split(',').map(c=>c.trim().replace(/^"|"$/g,''))); }
    else { const data=new Uint8Array(e.target.result); const wb=XLSX.read(data,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; rows=XLSX.utils.sheet_to_json(ws,{header:1}); }
    const header=rows[0]?.map(h=>String(h).toLowerCase().trim());
    const dataRows=rows.slice(1).filter(r=>r.some(c=>c));
    IMPORT_PARSED=dataRows.map(r=>{
      const get=idx=>idx>=0?String(r[idx]||'').trim():'';
      const iN=header?header.findIndex(h=>h.includes('nama')):0;
      const iJ=header?header.findIndex(h=>h.includes('jenis')):1;
      const iB=header?header.findIndex(h=>h.includes('bulan')):2;
      const iNo=header?header.findIndex(h=>h.includes('nominal')):3;
      const iK=header?header.findIndex(h=>h.includes('keterangan')):4;
      const namaSantri=get(iN), jenis=get(iJ), bulan=get(iB);
      const nominal=parseInt(get(iNo).replace(/\D/g,''))||0;
      const ket=get(iK);
      const matchSantri=ALL_SANTRI.find(s=>s.nama.toLowerCase()===namaSantri.toLowerCase());
      return {namaSantri,jenis,bulan,nominal,ket,matchSantri};
    }).filter(r=>r.namaSantri&&r.bulan&&r.nominal>0);
    renderImportPreview();
  };
  if(ext==='csv') reader.readAsText(file); else reader.readAsArrayBuffer(file);
}
function renderImportPreview(){
  if(!IMPORT_PARSED.length){ toast('⚠️ Tidak ada data valid!'); return; }
  const rows=IMPORT_PARSED.map((r,i)=>{
    const ok=!!r.matchSantri;
    return `<tr style="background:${ok?'':'#fff8f8'}">
      <td>${i+1}</td><td class="col-nama">${r.namaSantri} ${ok?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--red)">✗</span>'}</td>
      <td>${r.jenis}</td><td>${r.bulan}</td><td>${fmtRp(r.nominal)}</td><td>${r.ket||'—'}</td>
      <td><span class="badge ${ok?'badge-lunas':'badge-belum'}">${ok?'✅ Siap':'⚠️ Perlu cek'}</span></td>
    </tr>`;
  }).join('');
  document.getElementById('import-tbody').innerHTML=rows;
  const siap=IMPORT_PARSED.filter(r=>r.matchSantri).length;
  document.getElementById('import-preview-title').textContent=`Preview: ${IMPORT_PARSED.length} baris · ${siap} siap · ${IMPORT_PARSED.length-siap} perlu cek`;
  document.getElementById('import-preview').style.display='block';
}
async function prosesImport(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const valid=IMPORT_PARSED.filter(r=>r.matchSantri);
  if(!valid.length){ toast('⚠️ Tidak ada data valid!'); return; }
  // Tentukan dapur dari jenis: makan atau listrik
  const toInsert=valid.map(r=>{
    const isMakan=r.jenis.toLowerCase().includes('makan');
    return {
      santri_id:r.matchSantri.id, santri_nama:r.matchSantri.nama,
      dapur_id:r.matchSantri.dapur_id||null,
      bulan:r.bulan,
      nominal_makan:isMakan?r.nominal:0,
      nominal_listrik:!isMakan?r.nominal:0,
      nominal:r.nominal,
      status:'belum',
      tgl_tagihan:today(),
      keterangan:r.ket||'Import dari file',
      dicatat_oleh:SESSION.nama||SESSION.username
    };
  });
  const {error}=await SB.from('tagihan_pondok').insert(toInsert);
  if(error){ toast('❌ Gagal import: '+error.message); return; }
  toast(`✅ ${toInsert.length} tagihan diimport!`);
  document.getElementById('import-log').innerHTML=`<div class="success-box">${svgIcon('check-circle',13)} Import selesai: <strong>${toInsert.length}</strong> tagihan ditambahkan.</div>`;
  IMPORT_PARSED=[]; document.getElementById('import-preview').style.display='none';
  document.getElementById('import-file').value='';
  await loadAllData(); fillSelects();

  } finally { setLoading(false, _lBtn); }
}
function downloadTemplateImport(){
  const rows=[['nama_santri','jenis_tagihan','bulan','nominal','keterangan'],['Ahmad Fauzi','Uang Makan','Januari 2024','380000','Tunggakan lama'],['Ahmad Fauzi','Uang Listrik','Januari 2024','40000','Tunggakan lama']];
  const ws=XLSX.utils.aoa_to_sheet(rows); const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Template'); XLSX.writeFile(wb,'template_import.xlsx');
  toast('📄 Template didownload!');
}

