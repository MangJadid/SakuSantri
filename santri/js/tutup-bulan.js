// ===== TUTUP BULAN =====
// "Oktober 2026" -> {batas:'2026-11-01', akhir:'2026-10-31'}; null kalau teks bulan aktif tidak dikenali.
// Yang ditutup cuma transaksi SEBELUM batas -- kalau tutup bulan telat (sudah ada transaksi tgl 1
// bulan berikutnya), transaksi baru itu tidak ikut diringkas/dihapus.
function batasTutupBulan(bulanAktif){
  const [nm, th] = String(bulanAktif||'').trim().split(/\s+/);
  const i = bNames.findIndex(b=>b.toLowerCase()===String(nm).toLowerCase());
  const y = parseInt(th);
  if(i<0 || !y) return null;
  const tgl = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return {batas: tgl(new Date(y, i+1, 1)), akhir: tgl(new Date(y, i+1, 0))};
}

// Bulan yang belum berakhir tidak boleh ditutup -- mencegah tutup dua kali / tutup bulan yang baru mulai
function cekBolehTutupBulan(bulan){
  const periode = batasTutupBulan(bulan);
  if(!periode) return `Bulan aktif "${bulan}" tidak dikenali. Perbaiki dulu di Pengaturan → Bulan Aktif (contoh: "Oktober 2026").`;
  if(today() < periode.batas) return `${bulan} belum berakhir. Tutup bulan ${bulan} baru bisa mulai tanggal ${fmtTglTutup(periode.batas)}.`;
  return null;
}
function fmtTglTutup(iso){ const [y,m,d] = iso.split('-'); return `${parseInt(d)} ${bNames[parseInt(m)-1]} ${y}`; }

function konfirmasiTutupBulan(){
  const bulan = CONFIG.bulan_aktif || 'bulan ini';
  const tolak = cekBolehTutupBulan(bulan);
  if(tolak){ toast(tolak, false); return; }
  konfirm(
    `<strong>⚠️ Tutup Bulan ${bulan}?</strong><br><br>
    Proses ini akan:<br>
    • Membuat transaksi <em>"Saldo sisa ${bulan}"</em> untuk santri bersaldo positif<br>
    • Membuat transaksi <em>"Tunggakan sisa ${bulan}"</em> untuk santri bersaldo minus<br>
    • Menghapus transaksi sampai akhir ${bulan} (transaksi bulan berikutnya tetap utuh)<br>
    • Saldo santri (positif maupun minus) tetap aman terbawa<br>
    • Bulan Aktif otomatis maju ke bulan berikutnya<br><br>
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
    const tolak = cekBolehTutupBulan(bulan); // dicek ulang: bisa saja ditekan dua kali
    if(tolak) throw new Error(tolak);
    const periode = batasTutupBulan(bulan);
    const tglHariIni = periode.akhir; // saldo sisa dicatat di hari terakhir bulan yang ditutup
    const oleh = 'Kang Admin';

    // 1. Catat ID transaksi terakhir -- yang dihapus nanti cuma transaksi s/d ID ini.
    //    Transaksi yang masuk dari pengurus lain selama proses ini tetap aman.
    const {data:akhir, error:errA} = await SB.from('transaksi').select('id').order('id',{ascending:false}).limit(1);
    if(errA) throw errA;
    const idTerakhir = akhir?.[0]?.id;
    if(!idTerakhir) throw new Error('Belum ada transaksi untuk ditutup.');

    // 2. Hitung saldo tiap santri dari transaksi lama (sama kayak cara app hitung saldo)
    const txLama = await fetchAllTx(()=>SB.from('transaksi').select('santri_id,jenis,nominal').lte('id', idTerakhir).lt('tanggal', periode.batas).order('id'));
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
    const {error:errD} = await SB.from('transaksi').delete().lte('id', idTerakhir).lt('tanggal', periode.batas);
    if(errD){
      if(idBaru.length) await SB.from('transaksi').delete().in('id', idBaru);
      throw new Error(errD.message+' (data dikembalikan seperti semula, silakan coba lagi)');
    }

    // 5. Bulan Aktif maju otomatis -- biar urutan "tutup dulu, baru ganti bulan" gak mungkin kebalik
    const bulanBaru = bNames[parseInt(periode.batas.slice(5,7))-1]+' '+periode.batas.slice(0,4);
    const {error:errB} = await SB.from('settings').upsert({key:'bulan_aktif', value:bulanBaru});
    if(!errB){
      CONFIG.bulan_aktif = bulanBaru;
      localStorage.setItem('siujang_cfg', JSON.stringify(CONFIG));
      const hdrBulan = document.getElementById('hdr-bulan');
      if(hdrBulan) hdrBulan.textContent = bulanBaru;
    }

    // 6. Refresh data
    await loadAllData();
    renderDashboard();

    const jmlMinus = txBaru.filter(t=>t.jenis==='keluar').length;
    const jmlPlus = txBaru.length - jmlMinus;
    if(st) st.innerHTML = `<span style="color:var(--green)">✅ Tutup bulan <strong>${bulan}</strong> berhasil! ${jmlPlus} santri saldo terbawa, ${jmlMinus} santri tunggakan tercatat. ${errB ? '⚠️ Bulan Aktif gagal diganti otomatis, ganti manual di Pengaturan.' : `Bulan aktif sekarang <strong>${bulanBaru}</strong>.`}</span>`;
    if(btn){ btn.textContent='✅ Selesai'; btn.style.opacity='.5'; }
    toast(`✅ Tutup bulan ${bulan} berhasil!`);

  } catch(e) {
    if(st) st.innerHTML = `<span style="color:var(--red)">❌ Gagal: ${e.message}</span>`;
    if(btn){ btn.disabled=false; btn.innerHTML=svgIcon('lock',14)+' 2. Tutup Bulan'; }
    toast('Gagal tutup bulan: '+e.message, false);
  }
}

