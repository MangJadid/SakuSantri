# Panduan Deploy ke Hosting (PHP + MySQL)

Aplikasi ini butuh hosting yang support **PHP 7.4+ dan MySQL/MariaDB** (hosting cPanel biasa/shared hosting Indonesia standar sudah cukup — Niagahoster, Hostinger, DomaiNesia, dll, atau hosting dari pondok).

## Langkah-langkah

1. **Upload semua file** project ini (folder `santri/`, `bendahara/`, `api/`, `db/`, `shared/`, dan file-file lain di root) ke `public_html` (atau subfolder domain) lewat File Manager / FTP.

2. **Buat database MySQL** lewat cPanel (menu "MySQL Databases"), catat: nama database, username, password yang dibuatkan cPanel (biasanya diberi prefix otomatis, misalnya `namacpanel_annur`).

3. **Import struktur tabel**: buka **phpMyAdmin** dari cPanel → pilih database yang baru dibuat → tab **Import** → pilih file `db/schema.sql` → klik Go.

4. **Siapkan data terbaru dari Supabase** (karena data di export lama sudah pasti ketinggalan — pengurus tetap pakai Supabase sampai hari-H):
   - Login ke Supabase Dashboard → Table Editor → export tiap tabel ke CSV (seperti sebelumnya).
   - Beri nama file persis `nama_tabel.csv` (tanpa `_rows`), taruh di folder `db/export/` di server (lewat File Manager, atau upload FTP).

5. **Jalankan import data**. Karena folder `db/` diblok dari akses browser (`db/.htaccess`), ada 2 cara:
   - **Kalau hosting punya akses SSH/Terminal**: jalankan `php db/import.php`.
   - **Kalau tidak ada SSH** (kebanyakan shared hosting): buka File Manager, **hapus/rename sementara** `db/.htaccess` (mis. jadi `db/.htaccess.bak`), buka `https://domainanda.com/db/import.php` di browser sekali, tunggu sampai selesai (muncul "Selesai. Total ... baris diimpor"), **lalu langsung kembalikan nama `db/.htaccess`** supaya folder db/ terkunci lagi.

6. **Edit kredensial database**: buka `api/config.php`, ganti baris berikut sesuai data dari cPanel di langkah 2:
   ```php
   define('DB_HOST', 'localhost');       // biasanya tetap 'localhost' di shared hosting
   define('DB_NAME', 'namacpanel_annur');
   define('DB_USER', 'namacpanel_dbuser');
   define('DB_PASS', 'password_database');
   ```

7. **Arahkan domain**: pastikan domain/subdomain pondok mengarah ke folder tempat `santri/index.html` dan `bendahara/index.html` bisa diakses, misalnya `https://domainanda.com/santri/` dan `https://domainanda.com/bendahara/`.

8. **Test**: buka kedua halaman, coba login (admin/super, pengurus, bendahara, ortu), input transaksi/tagihan, pastikan data tersimpan.

9. **Bersih-bersih setelah sukses** (penting untuk keamanan):
   - Hapus folder `db/export/` isinya (data CSV sensitif) setelah import berhasil — tidak perlu lagi disimpan di server.
   - Pastikan `db/.htaccess` sudah aktif kembali (folder `db/` tidak bisa diakses lewat URL).

## Catatan penting

- **API belum ada proteksi login/token** — siapa pun yang tahu URL `api/rest.php` bisa baca/tulis data langsung. Ini cukup untuk tahap awal, tapi sebaiknya ditambah lapisan keamanan (API key atau session) begitu aplikasi ini benar-benar dipakai publik secara permanen di hosting pondok.
- **Notifikasi push tidak aktif** di versi ini (fitur lama berbasis Supabase Edge Function, belum diporting).
- Kalau nanti mau ganti password admin/pengurus/bendahara, lakukan lewat aplikasi seperti biasa (menu masing-masing) — jangan edit `password_hash` manual kecuali paham formatnya (sha256 hex).
- **API sudah dikunci pakai `apikey`** (lihat `api/config.php` konstanta `API_KEY`, dan `bendahara/js/app-core.js` + `santri/js/init-setup.js` yang mengirim kunci yang sama). Ini cukup untuk mencegah orang iseng/bot asal nemu URL — bukan pengaman tingkat tinggi (kuncinya tetap kelihatan di source JS browser). Kalau situs sudah beneran publik & dipakai serius, pertimbangkan tambahan proteksi per-role/session di kemudian hari.
