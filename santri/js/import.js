// ===== IMPORT EXCEL =====
let _importExcelRows = []; // baris valid dari preview

function openModalImport(){
  openMo('mo-import');
  document.getElementById('import-file-excel').value='';
  document.getElementById('import-preview-wrap').style.display='none';
  document.getElementById('import-error-wrap').style.display='none';
  const btn = document.getElementById('btn-import-excel');
  btn.disabled=true; btn.style.opacity='.5';
  _importExcelRows=[];
}

function downloadTemplateExcel(){
  if(typeof XLSX==='undefined'){ toast('Library XLSX belum dimuat!',false); return; }
  const ws = XLSX.utils.aoa_to_sheet([
    ['nama','asrama','kobong','kelas','pin','no_wa','kecamatan','kota','catatan'],
    ['Ahmad Fauzi','Al-Badri','Al-Badri 1','7','1234','081234567890','Cibeureum','Kab. Ciamis',''],
    ['Budi Santoso','Al-Badri','','8','5678','','','','Kobong kosong = Belum Ditentukan'],
  ]);
  ws['!cols']=[{wch:22},{wch:18},{wch:16},{wch:8},{wch:7},{wch:16},{wch:16},{wch:16},{wch:24}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Santri');
  XLSX.writeFile(wb, 'template_import_santri.xlsx');
}

function previewImportExcel(input){
  const file = input.files[0];
  if(!file) return;
  const errWrap = document.getElementById('import-error-wrap');
  errWrap.style.display='none';
  _importExcelRows=[];
  const btn = document.getElementById('btn-import-excel');
  btn.disabled=true; btn.style.opacity='.5';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allRows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      if(!allRows || allRows.length < 2){
        errWrap.innerHTML='❌ File kosong atau tidak ada data.'; errWrap.style.display='block'; return;
      }

      const header = allRows[0].map(h=>String(h).trim().toLowerCase());
      const getCol = key => header.indexOf(key);
      const iNama = getCol('nama');
      const iAsrama = getCol('asrama');
      const iKobong = getCol('kobong');
      const iKelas = getCol('kelas');
      const iPin = getCol('pin');
      const iNoWa = getCol('no_wa');
      const iKecamatan = getCol('kecamatan');
      const iKota = getCol('kota');
      const iCatatan = getCol('catatan');

      if(iNama<0){
        errWrap.innerHTML='❌ Kolom <strong>nama</strong> wajib ada di baris pertama (header).';
        errWrap.style.display='block'; return;
      }
      if(iAsrama<0){
        errWrap.innerHTML='❌ Kolom <strong>asrama</strong> wajib ada — digunakan untuk menentukan gender santri.';
        errWrap.style.display='block'; return;
      }

      const dataRows = allRows.slice(1).filter(r=>r.some(c=>String(c).trim()));
      let valid=[], errMsgs=[];

      // Cari kobong "Belum Ditentukan" per asrama
      const belumKobongMap = {};
      ALL_ASRAMA.forEach(a=>{
        const belum = ALL_KOBONG.find(k=>String(k.asrama_id)===String(a.id)&&k.nama.toLowerCase().includes('belum'));
        if(belum) belumKobongMap[a.id] = belum.id;
      });

      dataRows.forEach((r,i)=>{
        const nama = String(r[iNama]||'').trim();
        const asramaNama = String(r[iAsrama]||'').trim();
        const kobongNama = iKobong>=0 ? String(r[iKobong]||'').trim() : '';
        if(!nama){ errMsgs.push(`Baris ${i+2}: nama kosong — dilewati`); return; }

        // Cari asrama
        const asramaObj = ALL_ASRAMA.find(a=>a.nama.toLowerCase()===asramaNama.toLowerCase()
          || a.nama.toLowerCase().includes(asramaNama.toLowerCase()));
        if(!asramaObj){ errMsgs.push(`Baris ${i+2}: asrama "<strong>${asramaNama}</strong>" tidak ditemukan — dilewati`); return; }

        // Gender otomatis dari asrama
        const jenis_kelamin = asramaObj.jenis_kelamin||'putera';

        // Cari kobong
        let kobong_id = null;
        let kobong_display = '—';
        if(kobongNama){
          const k = ALL_KOBONG.find(x=>String(x.asrama_id)===String(asramaObj.id)&&x.nama.toLowerCase()===kobongNama.toLowerCase());
          if(k){ kobong_id=k.id; kobong_display=k.nama; }
          else { errMsgs.push(`Baris ${i+2}: kobong "<strong>${kobongNama}</strong>" tidak ditemukan di asrama ${asramaObj.nama} — dipakai "Belum Ditentukan"`); }
        }
        // Fallback ke Belum Ditentukan
        if(!kobong_id){
          kobong_id = belumKobongMap[asramaObj.id]||null;
          kobong_display = 'Belum Ditentukan';
          if(!kobong_id){ errMsgs.push(`Baris ${i+2}: kobong "Belum Ditentukan" belum ada di asrama ${asramaObj.nama} — buat dulu!`); return; }
        }

        valid.push({
          nama,
          kobong_id,
          jenis_kelamin,
          kelas: iKelas>=0 ? String(r[iKelas]||'').trim() : '',
          pin: iPin>=0 ? String(r[iPin]||'1234').trim().padStart(4,'0').slice(0,4)||'1234' : '1234',
          no_wa: iNoWa>=0 ? String(r[iNoWa]||'').replace(/\D/g,'').trim() : '',
          kecamatan: iKecamatan>=0 ? String(r[iKecamatan]||'').trim() : '',
          kota: iKota>=0 ? String(r[iKota]||'').trim() : '',
          catatan: iCatatan>=0 ? String(r[iCatatan]||'').trim() : '',
          created_by: 'kangadmin',
          _asrama_nama: asramaObj.nama,
          _kobong_display: kobong_display,
          _jk_label: jenis_kelamin==='puteri'?'👧 Puteri':'🧒 Putera',
        });
      });

      _importExcelRows = valid;

      const prevWrap = document.getElementById('import-preview-wrap');
      document.getElementById('import-preview-info').innerHTML =
        `✅ <strong>${valid.length} santri</strong> siap diimport${errMsgs.length?` &nbsp;⚠️ <span style="color:var(--red)">${errMsgs.length} peringatan</span>`:''}`;

      document.getElementById('import-preview-head').innerHTML =
        `<tr>${['Nama','Asrama','Kobong','Gender','Kelas','PIN','No WA'].map(h=>`<th style="padding:7px 10px;white-space:nowrap">${h}</th>`).join('')}</tr>`;

      document.getElementById('import-preview-body').innerHTML =
        valid.slice(0,10).map(r=>`<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:6px 10px;font-weight:600">${r.nama}</td>
          <td style="padding:6px 10px;font-size:11.5px">${r._asrama_nama}</td>
          <td style="padding:6px 10px;font-size:11.5px">${r._kobong_display}</td>
          <td style="padding:6px 10px">${r._jk_label}</td>
          <td style="padding:6px 10px">${r.kelas||'—'}</td>
          <td style="padding:6px 10px;font-family:'DM Mono',monospace">${r.pin}</td>
          <td style="padding:6px 10px">${r.no_wa||'—'}</td>
        </tr>`).join('')+(valid.length>10?`<tr><td colspan="7" style="padding:8px 10px;text-align:center;color:var(--text-l);font-style:italic">... dan ${valid.length-10} santri lainnya</td></tr>`:'');

      prevWrap.style.display='block';

      if(errMsgs.length){
        errWrap.innerHTML='⚠️ Catatan:<br>'+errMsgs.join('<br>');
        errWrap.style.display='block';
      }

      if(valid.length>0){
        btn.disabled=false; btn.style.opacity='1';
      }

    } catch(err){
      errWrap.innerHTML='❌ Gagal membaca file: '+err.message;
      errWrap.style.display='block';
    }
  };
  reader.readAsArrayBuffer(file);
}

async function prosesImportExcel(){
  if(_isLoading) return;
  if(!_importExcelRows.length){ toast('Tidak ada data valid!',false); return; }
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Mengimpor data Excel...','Data sedang diimpor ke database, harap tunggu.');
  setLoading(true, _lBtn);
  try {
    const rows = _importExcelRows.map(r=>{
      const obj = {
        nama: r.nama,
        kobong_id: r.kobong_id,
        pin: r.pin,
        saldo: 0,
        catatan: r.catatan||'',
        jenis_kelamin: r.jenis_kelamin||'putera',
        created_by: 'kangadmin',
      };
      if(r.kelas) obj.kelas = r.kelas;
      if(r.no_wa) obj.no_wa = r.no_wa;
      if(r.kecamatan) obj.kecamatan = r.kecamatan;
      if(r.kota) obj.kota = r.kota;
      return obj;
    });

    const {error}=await SB.from('santri').insert(rows);
    if(error){ toast('Gagal import: '+error.message,false); return; }

    closeMo('mo-import');
    toast(`✅ ${rows.length} santri berhasil diimport!`);
    await loadAllData();
    if(typeof loadSantriNames==='function') await loadSantriNames();
    populateFilterKelas();
    renderTabelSantri();
    renderDashboard();
  } finally { setLoading(false, _lBtn); }
}

