// ===== PILIH SERVER DATA -- dipakai Saku Santri & Bendahara =====
// Sebagian provider internet memblokir alamat proxy *.workers.dev (dibelokkan ke IP lain,
// koneksi aman gagal) -- app jadi gak bisa login & terlihat seperti "password salah".
// Jadi dicoba berurutan: alamat yang terakhir berhasil dulu, lalu sisanya. Semua alamat
// di sini menuju database Supabase yang SAMA, cuma jalurnya beda.
const SERVER_DATA = ['https://tajdid.jadidsaepul0.workers.dev', 'https://menfnmfwtxgcgvkbbjxh.supabase.co'];
let SERVER_AKTIF = SERVER_DATA[0];

async function pilihServerData(key){
  let terakhir = null;
  try{ terakhir = localStorage.getItem('server_data_ok'); }catch(e){}
  const urutan = SERVER_DATA.includes(terakhir) ? [terakhir, ...SERVER_DATA.filter(u=>u!==terakhir)] : SERVER_DATA;
  for(const url of urutan){
    const ctrl = new AbortController();
    const batas = setTimeout(()=>ctrl.abort(), 3000);
    try{
      // Ada balasan apa pun = jalurnya terbuka (yang diblokir gagal di tahap koneksi)
      await fetch(url + '/rest/v1/asrama?select=id&limit=1', {headers:{apikey:key, Authorization:'Bearer '+key}, signal:ctrl.signal});
      SERVER_AKTIF = url;
      try{ localStorage.setItem('server_data_ok', url); }catch(e){}
      return url;
    }catch(e){
    }finally{ clearTimeout(batas); }
  }
  return SERVER_AKTIF; // semua gagal (offline) -- biarkan alur offline app yang menangani
}

// Alamat file Storage (mis. gambar poster) yang tersimpan lewat jalur lain -> pakai jalur yang aktif
function alamatServerAktif(url){
  const u = String(url||'');
  const asal = SERVER_DATA.find(s=>u.startsWith(s+'/'));
  return asal ? SERVER_AKTIF + u.slice(asal.length) : u;
}

// ===== MODE PERBAIKAN -- settings 'mode_perbaikan' = '1' menutup app sementara untuk semua pengguna =====
// Saklarnya di database (bukan di kode), jadi bisa dinyalakan/dimatikan seketika tanpa upload ulang.
// Gagal mengecek (offline dll) = app TIDAK dikunci.
async function cekModePerbaikan(){
  if(typeof SB==='undefined' || !SB) return false;
  try{
    const {data} = await SB.from('settings').select('value').eq('key','mode_perbaikan').maybeSingle();
    if(String(data?.value||'')!=='1') return false;
  }catch(e){ return false; }
  tampilkanModePerbaikan();
  return true;
}

function tampilkanModePerbaikan(){
  if(document.getElementById('mode-perbaikan')) return;
  const el = document.createElement('div');
  el.id = 'mode-perbaikan';
  el.setAttribute('role','alertdialog');
  el.setAttribute('aria-modal','true');
  el.setAttribute('aria-labelledby','mode-perbaikan-judul');
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#123528;color:#fdf9ee;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;font-family:"Plus Jakarta Sans",system-ui,sans-serif';
  el.innerHTML = `<div style="font-size:52px;line-height:1" aria-hidden="true">🛠️</div>
    <h2 id="mode-perbaikan-judul" style="margin:0;font-family:Lora,Georgia,serif;font-size:24px;color:#e6c25e">Sedang dalam perbaikan</h2>
    <p style="margin:0;max-width:330px;font-size:15px;line-height:1.65;opacity:.9">Aplikasi ditutup sementara untuk perbaikan data. Data Anda aman. Silakan coba lagi beberapa saat lagi.</p>
    <button type="button" onclick="location.reload()" style="margin-top:6px;min-height:44px;padding:0 26px;border:0;border-radius:12px;background:#e6c25e;color:#123528;font:inherit;font-weight:700;font-size:15px;cursor:pointer">Coba lagi</button>`;
  document.body.appendChild(el);
  el.querySelector('button').focus();
}

// App yang sudah terbuka ikut tertutup: dicek ulang saat app dibuka lagi & tiap 1 menit
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) cekModePerbaikan(); });
setInterval(()=>{ if(!document.hidden) cekModePerbaikan(); }, 60000);

// ===== CATAT TRANSAKSI TERHAPUS -- tabel transaksi_terhapus: isi transaksi + siapa & kapan menghapus =====
// Dipanggil SEBELUM menghapus transaksi, atau santri (transaksinya ikut terhapus). Kalau pencatatan
// gagal, fungsi ini melempar error dan pemanggil WAJIB membatalkan penghapusan -- supaya tidak ada
// uang yang hilang tanpa jejak. kolom: 'id' (transaksi tertentu) atau 'santri_id' (semua transaksi santri).
async function catatTransaksiTerhapus(kolom, nilai, alasan){
  const ids = [].concat(nilai).map(Number).filter(Boolean);
  if(!ids.length) return 0;
  let rows = [];
  for(let dari = 0; ; dari += 1000){
    const {data, error} = await SB.from('transaksi').select('*,santri(nama)').in(kolom, ids).order('id').range(dari, dari+999);
    if(error) throw error;
    rows = rows.concat(data||[]);
    if(!data || data.length < 1000) break;
  }
  if(!rows.length) return 0;
  const u = SESSION?.user || SESSION || {}; // Saku Santri: SESSION.user, Bendahara: SESSION
  const log = rows.map(t=>({
    transaksi_id: t.id, santri_id: t.santri_id, santri_nama: t.santri?.nama || null,
    tanggal: t.tanggal, jenis: t.jenis, nominal: t.nominal, keterangan: t.keterangan || null,
    dicatat_oleh: t.oleh || null, dibuat_pada: t.created_at || null,
    dihapus_oleh: u.username || SESSION?.role || null, dihapus_nama: u.nama || null, alasan
  }));
  for(let i = 0; i < log.length; i += 500){
    const {error} = await SB.from('transaksi_terhapus').insert(log.slice(i, i+500));
    if(error) throw error;
  }
  return rows.length;
}
