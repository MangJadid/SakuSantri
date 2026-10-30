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
