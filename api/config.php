<?php
// Konfigurasi koneksi MySQL (default XAMPP) & aturan tabel yang boleh diakses.
// Sesuaikan DB_USER/DB_PASS kalau MySQL di XAMPP Anda sudah diberi password.

define('DB_HOST', 'localhost');
define('DB_NAME', 'annur_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Kunci rahasia yang wajib dikirim frontend lewat header 'apikey' di tiap request ke
// api/rest.php & api/rpc.php (lihat helpers.php). Cegah orang luar yang cuma tahu alamat
// API langsung baca/tulis data tanpa lewat aplikasi. JANGAN taruh key ini di tempat publik
// selain shared/supabase-client.js (yang memang jalan di browser, sama seperti anon key Supabase dulu).
define('API_KEY', 'e3d37d584dce22eba5836211744f18ffab5a7c663ef2fe48f5c2447fa3e8ac0e');

// Tabel yang boleh diakses lewat api/rest.php (whitelist keamanan).
// 'upsertKey' = kolom unik yang dipakai kalau frontend tidak mengirim onConflict eksplisit.
const ALLOWED_TABLES = [
  'settings'                      => ['pk' => 'key',  'upsertKey' => 'key'],
  'asrama'                        => ['pk' => 'id',   'upsertKey' => 'id'],
  'kobong'                        => ['pk' => 'id',   'upsertKey' => 'id'],
  'santri'                        => ['pk' => 'id',   'upsertKey' => 'id'],
  'transaksi'                     => ['pk' => 'id',   'upsertKey' => 'id'],
  'tagihan_pondok'                => ['pk' => 'id',   'upsertKey' => 'id'],
  'santri_deposit'                => ['pk' => 'id',   'upsertKey' => 'santri_id'],
  'pengurus'                      => ['pk' => 'id',   'upsertKey' => 'id'],
  'bendahara_users'                => ['pk' => 'id',   'upsertKey' => 'username'],
  'bendahara_akses'               => ['pk' => 'id',   'upsertKey' => 'id'],
  'piutang_alumni'                => ['pk' => 'id',   'upsertKey' => 'id'],
  'tf_admin'                      => ['pk' => 'id',   'upsertKey' => 'id'],
  'konfigurasi_tagihan_asrama'    => ['pk' => 'id',   'upsertKey' => 'id'],
  'login_sessions'                => ['pk' => 'id',   'upsertKey' => 'session_id'],
  'bendahara_activity'            => ['pk' => 'id',   'upsertKey' => 'username'],
  'permintaan_perubahan_santri'   => ['pk' => 'id',   'upsertKey' => 'id'],
  'riwayat_perubahan_santri'      => ['pk' => 'id',   'upsertKey' => 'id'],
  'push_subscriptions'            => ['pk' => 'id',   'upsertKey' => 'username'],
  'push_notifications'            => ['pk' => 'id',   'upsertKey' => 'id'],
];

// Relasi embedded select yang didukung, mis. .select('*,kobong(id,nama)')
// Bentuk: table asal => nama relasi => [kolom FK di table asal, table tujuan, PK table tujuan]
const RELATIONS = [
  'santri'    => ['kobong' => ['fk' => 'kobong_id', 'table' => 'kobong', 'pk' => 'id']],
  'kobong'    => ['asrama' => ['fk' => 'asrama_id', 'table' => 'asrama', 'pk' => 'id']],
  'transaksi' => ['santri' => ['fk' => 'santri_id', 'table' => 'santri', 'pk' => 'id']],
];

// Kolom JSON yang perlu di-decode jadi object/array (bukan string mentah) saat dikirim ke frontend.
const JSON_COLUMNS = [
  'tagihan_pondok'              => ['rincian'],
  'piutang_alumni'               => ['rincian'],
  'permintaan_perubahan_santri' => ['data_lama', 'data_baru'],
  'riwayat_perubahan_santri'    => ['data_lama', 'data_baru'],
  'push_subscriptions'           => ['subscription'],
];

// Kolom boolean (TINYINT(1) di MySQL) yang perlu dicast jadi true/false asli.
const BOOL_COLUMNS = [
  'santri'          => ['is_arsip'],
  'pengurus'        => ['force_logout', 'is_blocked'],
  'bendahara_users' => ['force_logout', 'is_blocked'],
  'login_sessions'  => ['is_online', 'revoked'],
];
