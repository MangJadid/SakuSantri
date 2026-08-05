// ===== TUTUP BULAN =====
function konfirmasiTutupBulan(){
  const bulan = CONFIG.bulan_aktif || 'bulan ini';
  konfirm(
    `<strong>⚠️ Tutup Bulan ${bulan}?</strong><br><br>
    Proses ini akan:<br>
    • Membuat transaksi <em>"Saldo sisa ${bulan}"</em> untuk setiap santri<br>
    • Menghapus semua transaksi lama<br>
    • Saldo santri tetap aman terbawa<br><br>
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

    // 1. Ambil semua santri beserta saldo terkini
    const {data:santri, error:errS} = await SB.from('santri').select('id,nama,saldo').order('nama');
    if(errS) throw errS;

    // 2. Hapus SEMUA transaksi lama
    const {error:errD} = await SB.from('transaksi').delete().neq('id', 0);
    if(errD) throw errD;

    // 3. Buat transaksi pembuka baru untuk santri yang saldonya > 0
    const txBaru = (santri||[])
      .filter(s => s.saldo > 0)
      .map(s => ({
        santri_id: s.id,
        tanggal: tglHariIni,
        jenis: 'masuk',
        keterangan: `Saldo sisa ${bulan}`,
        nominal: s.saldo,
        oleh
      }));

    if(txBaru.length){
      const {error:errI} = await SB.from('transaksi').insert(txBaru);
      if(errI) throw errI;
    }

    // 4. Refresh data
    await loadAllData();
    renderDashboard();

    if(st) st.innerHTML = `<span style="color:var(--green)">✅ Tutup bulan <strong>${bulan}</strong> berhasil! ${txBaru.length} santri terbawa saldonya ke bulan baru.</span>`;
    if(btn){ btn.textContent='✅ Selesai'; btn.style.opacity='.5'; }
    toast(`✅ Tutup bulan ${bulan} berhasil!`);

  } catch(e) {
    if(st) st.innerHTML = `<span style="color:var(--red)">❌ Gagal: ${e.message}</span>`;
    if(btn){ btn.disabled=false; btn.textContent='🗓️ 2. Tutup Bulan'; }
    toast('Gagal tutup bulan: '+e.message, false);
  }
}

