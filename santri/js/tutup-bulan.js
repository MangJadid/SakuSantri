// ===== TUTUP BULAN =====
function konfirmasiTutupBulan(){
  const bulan = CONFIG.bulan_aktif || 'bulan ini';
  konfirm(
    `<strong>⚠️ Tutup Bulan ${bulan}?</strong><br><br>
    Proses ini akan:<br>
    • Membuat transaksi <em>"Saldo sisa ${bulan}"</em> untuk santri bersaldo positif<br>
    • Membuat transaksi <em>"Tunggakan sisa ${bulan}"</em> untuk santri bersaldo minus<br>
    • Menghapus semua transaksi lama<br>
    • Saldo santri (positif maupun minus) tetap aman terbawa<br><br>
    <span style="color:var(--red);font-weight:600">Pastikan sudah backup sebelum lanjut!</span>`,
    tutupBulan,
    'lainnya'
  );
}

async function tutupBulan(){
  const st = document.getElementById('tutup-status');
  const btn = document.getElementById('btn-tutup-bulan');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Memproses...'; }
  if(st) st.innerHTML = '⏳ Sedang memproses tutup bulan...';

  try {
    const bulan = CONFIG.bulan_aktif || 'Bulan Lalu';
    const tglHariIni = today();
    const oleh = 'Kang Admin';

    // 1. Catat ID transaksi terakhir -- yang dihapus nanti cuma transaksi s/d ID ini.
    //    Transaksi yang masuk dari pengurus lain selama proses ini tetap aman.
    const {data:akhir, error:errA} = await SB.from('transaksi').select('id').order('id',{ascending:false}).limit(1);
    if(errA) throw errA;
    const idTerakhir = akhir?.[0]?.id;
    if(!idTerakhir) throw new Error('Belum ada transaksi untuk ditutup.');

    // 2. Hitung saldo tiap santri dari transaksi lama (sama kayak cara app hitung saldo)
    const txLama = await fetchAllTx(()=>SB.from('transaksi').select('santri_id,jenis,nominal').lte('id', idTerakhir).order('id'));
    const saldoMap = {};
    txLama.forEach(t=>{
      saldoMap[t.santri_id] = (saldoMap[t.santri_id]||0) + (t.jenis==='masuk'?t.nominal:-t.nominal);
    });

    // 3. Buat transaksi pembuka baru untuk setiap santri yang saldonya gak nol --
    //    saldo positif dicatat "masuk" (Saldo sisa), saldo minus dicatat "keluar"
    //    (Tunggakan sisa) supaya kelihatan jejaknya di Riwayat.
    //    Dibuat DULUAN sebelum hapus: kalau gagal di sini, transaksi lama masih utuh.
    const txBaru = Object.entries(saldoMap)
      .filter(([,saldo]) => saldo !== 0)
      .map(([sid, saldo]) => ({
        santri_id: Number(sid),
        tanggal: tglHariIni,
        jenis: saldo > 0 ? 'masuk' : 'keluar',
        keterangan: saldo > 0 ? `Saldo sisa ${bulan}` : `Tunggakan sisa ${bulan}`,
        nominal: Math.abs(saldo),
        oleh
      }));

    let idBaru = [];
    if(txBaru.length){
      const {data:ins, error:errI} = await SB.from('transaksi').insert(txBaru).select('id');
      if(errI) throw errI;
      idBaru = (ins||[]).map(t=>t.id);
    }

    // 4. Baru hapus transaksi lama. Kalau gagal, transaksi pembuka tadi dibatalkan
    //    supaya saldo gak kehitung dobel -- data kembali seperti sebelum tutup bulan.
    const {error:errD} = await SB.from('transaksi').delete().lte('id', idTerakhir);
    if(errD){
      if(idBaru.length) await SB.from('transaksi').delete().in('id', idBaru);
      throw new Error(errD.message+' (data dikembalikan seperti semula, silakan coba lagi)');
    }

    // 5. Refresh data
    await loadAllData();
    renderDashboard();

    const jmlMinus = txBaru.filter(t=>t.jenis==='keluar').length;
    const jmlPlus = txBaru.length - jmlMinus;
    if(st) st.innerHTML = `<span style="color:var(--green)">✅ Tutup bulan <strong>${bulan}</strong> berhasil! ${jmlPlus} santri saldo terbawa, ${jmlMinus} santri tunggakan tercatat.</span>`;
    if(btn){ btn.textContent='✅ Selesai'; btn.style.opacity='.5'; }
    toast(`✅ Tutup bulan ${bulan} berhasil!`);

  } catch(e) {
    if(st) st.innerHTML = `<span style="color:var(--red)">❌ Gagal: ${e.message}</span>`;
    if(btn){ btn.disabled=false; btn.innerHTML=svgIcon('lock',14)+' 2. Tutup Bulan'; }
    toast('Gagal tutup bulan: '+e.message, false);
  }
}

