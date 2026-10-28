# CLAUDE.md — Saku Santri & Bendahara (Pondok Pesantren An-Nur)

Catatan untuk sesi Claude Code di proyek ini (dari laptop maupun HP/cloud). Pemilik proyek
berbahasa Indonesia dan bukan programmer: balas dalam bahasa Indonesia yang sederhana,
jelaskan dampak perubahan, bukan istilah teknis.

## Alur kerja wajib
- **Selalu kerja di branch `main`.** Branch `master` sudah usang (riwayatnya beda), jangan dipakai.
- **Mulai sesi:** `git pull --ff-only origin main` dulu — user bergantian kerja dari laptop & HP.
- **"Upload" = commit + push ke `main`**, hanya kalau user minta. Push langsung tayang (lihat Deploy).
  Sebelum push selalu `git pull --ff-only origin main` (GitHub Action ikut membuat commit, lihat bawah).
- **Setiap file JS/CSS yang diubah, naikkan nomor `?v=N` di tag `<script>`/`<link>` di `index.html`**
  app yang memakainya (file di `shared/` dipakai `santri/index.html` DAN `bendahara/index.html`).
  Tanpa ini HP user tetap memakai file lama dari cache.
- Setelah push, pastikan tayang: cek `https://mangjadid.my.id/santri/index.html` sudah memuat `?v=` baru.

## Deploy
- Push ke `main` → GitHub Pages → **https://mangjadid.my.id** (`/santri/`, `/bendahara/`, landing `/`).
- Workflow `.github/workflows/deploy.yml` ("Auto Update Cache Version") mengubah nama cache di
  `santri/sw.js` & `bendahara/sw.js` lalu push commit sendiri. Service worker tidak punya fetch
  handler (cuma untuk push notification) — cache file diatur lewat `?v=`.
- HTML di-cache browser ±10 menit (GitHub Pages `max-age=600`).

## Struktur
- `santri/` — app **Saku Santri** (uang jajan). Role: `super` (Kang Admin), `pengurus`,
  `sekretaris`/`sekretariat`, `pengawas`, `ortu` (orang tua, login nama santri + PIN).
- `bendahara/` — app **Bendahara** (tagihan syahriyah/dapur). Role: `kangadmin`/`super`,
  `pengelola_dapur`, `pengawas`.
- `shared/` — dipakai kedua app: `sosmed-banner.js` (banner media sosial di Beranda),
  `poster.js` (slider & galeri Poster & Info), `supabase-client.js` (shim khusus localhost).
- `api/` + `db/schema.sql` — backend PHP + MySQL **hanya untuk localhost/XAMPP** (meniru Supabase).
- `index.html` (root) — landing page. `db/export/` berisi data pribadi: jangan pernah di-commit.
- Tanpa build step: HTML + JS biasa, satu file JS per fitur di `*/js/`.

## Database
- Produksi: **Supabase**, diakses lewat proxy Cloudflare `https://tajdid.jadidsaepul0.workers.dev`
  (diteruskan apa adanya, termasuk Storage). URL & anon key ada di `santri/js/init-setup.js` dan
  `bendahara/js/app-core.js`. RLS tabel memakai policy `allow_all` (akses lewat anon key).
- **Tabel baru di Supabase dibuat manual oleh user** lewat Supabase → SQL Editor. Tulis SQL-nya di
  file `db/supabase-<fitur>.sql`, berikan ke user, dan tunggu konfirmasi sebelum upload fitur.
  Untuk localhost juga tambahkan tabelnya ke `db/schema.sql` dan `ALLOWED_TABLES` di `api/config.php`.
- Pengaturan kecil disimpan di tabel `settings` (key/value, dimuat ke `CONFIG` saat app dibuka),
  mis. `wa_admin_asrama`, `wa_masukan`, `sosmed_pondok`, `super_profil` — tidak perlu tabel baru.
- Volume (Okt 2026): ±526 santri, ±6.400 transaksi, ±7.200 tagihan. Ambil data besar per 1000 baris
  secara paralel (`fetchAllTx` di `santri/js/auth.js`, `fetchAllPages` di `bendahara/js/app-core.js`).
- Gambar: foto santri → Cloudinary (preset `santri_foto`); poster → Supabase Storage bucket `fotos`,
  folder `poster/` (2 ukuran: `_besar.jpg` & `_kecil.jpg`). Jangan ubah tempat simpan tanpa diminta.

## Localhost (laptop saja)
- `C:\xampp\htdocs\annur` adalah junction ke folder proyek ini. Nyalakan Apache + MySQL di XAMPP,
  lalu buka `http://localhost/annur/santri/` atau lewat IP LAN dari HP. App otomatis pakai `../api`
  saat dibuka dari localhost/IP LAN. Upload gambar poster tidak bisa dites di localhost.
- Sesi cloud (dari HP) tidak punya XAMPP: tes langsung di website setelah upload.

## Gaya kode
- Ikuti kode sekitarnya: nama & komentar bahasa Indonesia santai, style inline, helper yang sudah ada
  (`svgIcon()` dari `js/icons.js`, `toast()`, `konfirm()`, `setLoading()`/`showLoadingOverlay()`,
  `openMo()`/`closeMo()`).
- Teks dari user/database yang masuk ke HTML wajib di-escape (lihat `escAdm`, `escPoster`, `escSosmed`).
- Cek cepat sebelum upload: `node --check <file.js>` untuk tiap file JS yang diubah.
