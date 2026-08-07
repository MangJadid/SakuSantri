// ===== EXPORT EXCEL =====
// ===== EXPORT EXCEL LENGKAP (MULTI-SHEET) =====

function styleSheet(ws, cols){
  // Set column widths
  ws['!cols'] = cols.map(w=>({wch:w}));
  return ws;
}

async function exportLengkap(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Mengekspor data...','Data sedang disiapkan untuk diunduh.');
  setLoading(true, _lBtn);
  try {

  // Untuk pengurus & admin — ambil transaksi bulan aktif santri binaan
  const btn = event?.target;
  if(btn){ btn.textContent='⏳ Memproses...'; btn.disabled=true; }
  try{
    const bulan = CONFIG.bulan_aktif||today();
    const isSuper = SESSION.role==='super';
    const username = SESSION.user?.username||SESSION.user?.nama||'Pengurus';

    // Ambil transaksi bulan aktif untuk santri yang relevan
    const sids = ALL_SANTRI.map(s=>s.id);
    let txsBulan = [];
    if(sids.length){
      // Filter by bulan aktif
      const bulanParts = bulan.split(' '); // ["Mei", "2026"]
      const bulanMap = {Januari:'01',Februari:'02',Maret:'03',April:'04',Mei:'05',Juni:'06',
        Juli:'07',Agustus:'08',September:'09',Oktober:'10',November:'11',Desember:'12'};
      const mm = bulanMap[bulanParts[0]]||'';
      const yy = parseInt(bulanParts[1])||new Date().getFullYear();
      const tglStart = mm ? `${yy}-${mm}-01` : null;
      const lastDay = mm ? new Date(yy, parseInt(mm), 0).getDate() : 31;
      const tglEnd = mm ? `${yy}-${mm}-${String(lastDay).padStart(2,'0')}` : null;

      // Ambil SEMUA transaksi bulan ini pakai pagination — Supabase batasi 1000 baris
      // per request, kalau gak di-paging data akhir bulan bisa kepotong diam-diam
      // (mis. bulan dengan >1000 transaksi keseluruhan cuma kebawa sampai tanggal tertentu).
      txsBulan = [];
      const PAGE = 1000;
      let from = 0;
      while(true){
        let q = SB.from('transaksi').select('*,santri(nama,kobong(nama))').in('santri_id',sids).order('tanggal').order('created_at').range(from, from+PAGE-1);
        if(tglStart) q = q.gte('tanggal',tglStart).lte('tanggal',tglEnd);
        const {data, error} = await q;
        if(error) throw error;
        txsBulan = txsBulan.concat(data||[]);
        if(!data || data.length < PAGE) break;
        from += PAGE;
      }
    }

    const wb = XLSX.utils.book_new();
    const kritis = parseInt(CONFIG.kritis_batas)||50000;

    // ===== SHEET 1: RINGKASAN =====
    const totalSaldo = ALL_SANTRI.reduce((a,s)=>a+s.saldo,0);
    const rekening = parseFloat(CONFIG.rekening_saldo)||0;
    const cash = totalSaldo - rekening;
    const salKritis = ALL_SANTRI.filter(s=>s.saldo<kritis).length;
    const totalMasuk = txsBulan.filter(t=>t.jenis==='masuk').reduce((a,t)=>a+t.nominal,0);
    const totalKeluar = txsBulan.filter(t=>t.jenis==='keluar').reduce((a,t)=>a+t.nominal,0);

    const rowsRingkasan = [
      {'Keterangan':'RINGKASAN DATA UANG JAJAN SANTRI','Nilai':''},
      {'Keterangan':'Periode','Nilai':bulan},
      {'Keterangan':'Tanggal Export','Nilai':today()},
      {'Keterangan':isSuper?'Dibuat oleh (Admin)':'Pengurus','Nilai':isSuper?'Kang Admin':username},
      {'Keterangan':'','Nilai':''},
      {'Keterangan':'=== DATA SANTRI ===','Nilai':''},
      {'Keterangan':'Total Santri Binaan','Nilai':ALL_SANTRI.length},
      {'Keterangan':'Total Saldo Seluruh Santri','Nilai':totalSaldo},
      {'Keterangan':'Uang di Rekening','Nilai':rekening},
      {'Keterangan':'Uang Cash','Nilai':cash},
      {'Keterangan':'Santri Saldo Kritis','Nilai':salKritis},
      {'Keterangan':'','Nilai':''},
      {'Keterangan':'=== TRANSAKSI BULAN INI ===','Nilai':''},
      {'Keterangan':'Total Pemasukan','Nilai':totalMasuk},
      {'Keterangan':'Total Pengeluaran','Nilai':totalKeluar},
      {'Keterangan':'Selisih','Nilai':totalMasuk-totalKeluar},
    ];

    // Kalau admin, tambah rekap per asrama
    if(isSuper){
      rowsRingkasan.push({'Keterangan':'','Nilai':''});
      rowsRingkasan.push({'Keterangan':'=== REKAP PER ASRAMA ===','Nilai':''});
      ALL_ASRAMA.forEach(a=>{
        const kobIds = ALL_KOBONG.filter(k=>k.asrama_id===a.id).map(k=>k.id);
        const santriAsrama = ALL_SANTRI.filter(s=>kobIds.includes(s.kobong_id));
        const totalA = santriAsrama.reduce((x,s)=>x+s.saldo,0);
        rowsRingkasan.push({'Keterangan':`Asrama ${a.nama}`,'Nilai':`${santriAsrama.length} santri | Saldo: Rp ${totalA.toLocaleString('id-ID')}`});
      });
    }

    const ws1 = styleSheet(XLSX.utils.json_to_sheet(rowsRingkasan),[40,30]);
    XLSX.utils.book_append_sheet(wb, ws1, '📋 Ringkasan');

    // ===== SHEET 2: DATA SANTRI =====
    const rowsSantri = ALL_SANTRI.map((s,i)=>{
      const kob = s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
      const asrama = ALL_KOBONG.find(k=>k.id===s.kobong_id);
      const aNama = asrama ? (ALL_ASRAMA.find(a=>a.id===asrama.asrama_id)?.nama||'—') : '—';
      return {
        'No': i+1,
        'Nama Santri': s.nama,
        ...(isSuper?{'Asrama':aNama}:{}),
        'Kobong': kob,
        'Saldo (Rp)': s.saldo,
        'Status': s.saldo<0?'MINUS':s.saldo===0?'NOL':s.saldo<kritis?'KRITIS':'NORMAL',
        'Catatan': s.catatan||''
      };
    });
    const ws2 = styleSheet(XLSX.utils.json_to_sheet(rowsSantri), isSuper?[5,30,20,15,15,10,20]:[5,30,15,15,10,20]);
    XLSX.utils.book_append_sheet(wb, ws2, '👥 Data Santri');

    // ===== SHEET 3: RIWAYAT TRANSAKSI =====
    const rowsTx = txsBulan.map((t,i)=>{
      const kob = t.santri?.kobong?.nama||'—';
      const asrama = ALL_KOBONG.find(k=>k.nama===kob);
      const aNama = asrama ? (ALL_ASRAMA.find(a=>a.id===asrama.asrama_id)?.nama||'—') : '—';
      return {
        'No': i+1,
        'Tanggal': t.tanggal,
        'Santri': t.santri?.nama||'—',
        ...(isSuper?{'Asrama':aNama}:{}),
        'Kobong': kob,
        'Keterangan': t.keterangan||'—',
        'Pemasukan (Rp)': t.jenis==='masuk'?t.nominal:0,
        'Pengeluaran (Rp)': t.jenis==='keluar'?t.nominal:0,
        'Dicatat oleh': t.oleh||'—'
      };
    });
    const ws3 = styleSheet(XLSX.utils.json_to_sheet(rowsTx.length?rowsTx:[{'Keterangan':'Tidak ada transaksi bulan ini'}]),
      isSuper?[5,12,25,18,15,25,15,15,15]:[5,12,25,15,25,15,15,15]);
    XLSX.utils.book_append_sheet(wb, ws3, '📜 Riwayat Transaksi');

    // ===== SHEET PER SANTRI — hanya santri yang menitipkan uang jajan bulan ini =====
    // (punya minimal 1 transaksi di bulan aktif, walau saldonya udah habis/0 sebelum akhir bulan)
    const santriNitip = ALL_SANTRI.filter(s => txsBulan.some(t=>t.santri_id===s.id));
    santriNitip.forEach(s=>{
      const txSantri = txsBulan.filter(t=>t.santri_id===s.id);
      let running = s.saldo - txSantri.filter(t=>t.jenis==='masuk').reduce((a,t)=>a+t.nominal,0)
                              + txSantri.filter(t=>t.jenis==='keluar').reduce((a,t)=>a+t.nominal,0);
      const rows = txSantri.map(t=>{
        running += t.jenis==='masuk'?t.nominal:-t.nominal;
        return {
          'Tanggal': t.tanggal,
          'Keterangan': t.keterangan||'—',
          'Pemasukan (Rp)': t.jenis==='masuk'?t.nominal:0,
          'Pengeluaran (Rp)': t.jenis==='keluar'?t.nominal:0,
          'Saldo (Rp)': running,
          'Dicatat oleh': t.oleh||'—'
        };
      });
      rows.push({'Tanggal':'','Keterangan':'SALDO AKHIR','Pemasukan (Rp)':'','Pengeluaran (Rp)':'','Saldo (Rp)':s.saldo,'Dicatat oleh':''});
      const sheetName = s.nama.substring(0,28).replace(/[:\\\/\?\*\[\]]/g,'');
      const wsS = styleSheet(XLSX.utils.json_to_sheet(rows), [12,25,15,15,12,15]);
      XLSX.utils.book_append_sheet(wb, wsS, sheetName);
    });

    // ===== SHEET PER ASRAMA (hanya untuk Admin) =====
    if(isSuper){
      ALL_ASRAMA.forEach(a=>{
        const kobIds = ALL_KOBONG.filter(k=>k.asrama_id===a.id).map(k=>k.id);
        const santriAsrama = ALL_SANTRI.filter(s=>kobIds.includes(s.kobong_id));
        const rows = santriAsrama.map((s,i)=>({
          'No': i+1,
          'Nama Santri': s.nama,
          'Kobong': s.kobong?.nama||getKobongNama(s.kobong_id)||'—',
          'Saldo (Rp)': s.saldo,
          'Status': s.saldo<0?'MINUS':s.saldo===0?'NOL':s.saldo<kritis?'KRITIS':'NORMAL',
          'Catatan': s.catatan||''
        }));
        const sheetName = `Asrama ${a.nama}`.substring(0,31);
        const wsA = styleSheet(XLSX.utils.json_to_sheet(rows.length?rows:[{'Keterangan':'Belum ada santri'}]),[5,25,15,15,10,20]);
        XLSX.utils.book_append_sheet(wb, wsA, sheetName);
      });
    }

    const namaFile = isSuper
      ? `Backup_Admin_${bulan.replace(' ','_')}_${today()}.xlsx`
      : `Backup_${username}_${bulan.replace(' ','_')}_${today()}.xlsx`;
    XLSX.writeFile(wb, namaFile);
    toast(`✅ Backup ${bulan} berhasil didownload!`);
  } catch(e){
    toast('Gagal export: '+e.message, false);
  } finally {
    if(btn){ btn.innerHTML=svgIcon('archive',14)+' Backup Lengkap'; btn.disabled=false; }
  }

  } finally { setLoading(false, _lBtn); }
}

function exportExcelDashboard(){
  const kritis=parseInt(CONFIG.kritis_batas)||50000;
  const rows=ALL_SANTRI.map(s=>({
    'Nama Santri':s.nama,
    'Kobong':s.kobong?.nama||getKobongNama(s.kobong_id)||'—',
    'Catatan':s.catatan||'',
    'Saldo (Rp)':s.saldo,
    'Status':s.saldo<0?'MINUS':s.saldo===0?'NOL':s.saldo<kritis?'KRITIS':'NORMAL'
  }));
  exportXLSX(rows, `Dashboard_${CONFIG.bulan_aktif||'Semua'}`);
}

function exportExcelSantri(){
  const rows=ALL_SANTRI.map(s=>({
    'Nama Santri':s.nama,
    'Kobong':s.kobong?.nama||getKobongNama(s.kobong_id)||'—',
    'PIN':s.pin,
    'Saldo (Rp)':s.saldo,
    'Catatan':s.catatan||''
  }));
  exportXLSX(rows,'Data_Santri');
}

async function exportExcelSantriDetail(santriId, nama){
  const {data:txs}=await SB.from('transaksi').select('*').eq('santri_id',santriId).order('tanggal');
  let running=0;
  const rows=(txs||[]).map(t=>{
    running+=t.jenis==='masuk'?t.nominal:-t.nominal;
    return {
      'Tanggal':t.tanggal,
      'Keterangan':t.keterangan||'—',
      'Pemasukan (Rp)':t.jenis==='masuk'?t.nominal:0,
      'Pengeluaran (Rp)':t.jenis==='keluar'?t.nominal:0,
      'Saldo (Rp)':running,
      'Dicatat oleh':t.oleh||'—'
    };
  });
  exportXLSX(rows,`Riwayat_${nama}`);
}

function exportExcelRiwayat(){
  const rows=ALL_TX.map(t=>({
    'Tanggal':t.tanggal,
    'Santri':t.santri?.nama||'—',
    'Kobong':t.santri?.kobong?.nama||'—',
    'Keterangan':t.keterangan||'—',
    'Jenis':t.jenis==='masuk'?'Pemasukan':'Pengeluaran',
    'Nominal (Rp)':t.nominal,
    'Dicatat oleh':t.oleh||'—'
  }));
  exportXLSX(rows,`Riwayat_Transaksi`);
}

function exportXLSX(rows, nama){
  if(!rows.length){ toast('Tidak ada data untuk diexport!',false); return; }
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,nama.substring(0,31));
  XLSX.writeFile(wb,`Data Uang Jajan Santri_${nama}_${today()}.xlsx`);
  toast(`✅ File Excel ${nama} berhasil didownload!`);
}

// ===== BACKUP SEMUA DATA =====
async function backupSemuaData(){
  await exportLengkap();
  // Aktifkan tombol Tutup Bulan setelah backup
  const btnTutup = document.getElementById('btn-tutup-bulan');
  if(btnTutup){
    btnTutup.disabled = false;
    btnTutup.style.opacity = '1';
    btnTutup.style.cursor = 'pointer';
    btnTutup.innerHTML = svgIcon('lock',14)+' 2. Tutup Bulan';
  }
  const st = document.getElementById('tutup-status');
  if(st) st.innerHTML = '<span style="color:var(--green)">✅ Backup selesai! Sekarang kamu bisa klik <strong>Tutup Bulan</strong>.</span>';
}

// ===== CEK STATUS STORAGE =====
async function testStorage(){
  const el = document.getElementById('storage-status');
  el.innerHTML = '⏳ Mengecek...';
  try {
    const {data, error} = await SB.storage.from('fotos').list('', {limit:1});
    if(error) throw error;
    el.innerHTML = '✅ <strong>Storage aktif!</strong> Foto baru akan otomatis tersimpan di Storage.';
    el.style.color = 'var(--green)';
  } catch(e) {
    el.innerHTML = '❌ Storage belum aktif. Jalankan SQL di atas terlebih dahulu.';
    el.style.color = 'var(--red)';
  }
}

