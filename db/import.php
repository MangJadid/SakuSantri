<?php
// Import data hasil export CSV dari Supabase ke MySQL.
//
// Cara pakai:
// 1. Di Supabase Dashboard -> Table Editor, buka tiap tabel -> tombol "..." -> Export to CSV.
// 2. Simpan file CSV ke folder db/export/, beri nama PERSIS seperti nama tabelnya, mis:
//      db/export/santri.csv, db/export/transaksi.csv, db/export/tagihan_pondok.csv, dst.
// 3. Pastikan db/schema.sql sudah dijalankan lebih dulu (tabel MySQL sudah ada, boleh kosong).
// 4. Jalankan script ini:
//      - lewat browser:  http://localhost/<folder-project>/db/import.php
//      - atau lewat CLI: php db/import.php
//
// Baris pertama tiap CSV WAJIB header nama kolom (default export Supabase sudah begini).
// Sel kosong dianggap NULL. Kolom boolean otomatis dikonversi ('t'/'true'/'1' -> 1, selain itu -> 0).

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/db.php';

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) header('Content-Type: text/plain; charset=utf-8');

function out(string $s): void { echo $s . "\n"; }

function ident_ok(string $name): bool {
  return (bool) preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $name);
}

// Urutan import: sengaja tidak terlalu penting karena FOREIGN_KEY_CHECKS dimatikan sementara,
// tapi tetap diurutkan biar enak dibaca di log.
$tableOrder = [
  'settings', 'asrama', 'kobong', 'santri', 'transaksi', 'tagihan_pondok', 'santri_deposit',
  'pengurus', 'bendahara_users', 'bendahara_akses', 'piutang_alumni', 'tf_admin',
  'konfigurasi_tagihan_asrama', 'login_sessions', 'bendahara_activity',
  'permintaan_perubahan_santri', 'riwayat_perubahan_santri', 'push_subscriptions', 'push_notifications',
];

$exportDir = __DIR__ . '/export';
if (!is_dir($exportDir)) {
  out("Folder $exportDir tidak ditemukan. Buat folder db/export/ lalu taruh file CSV di sana.");
  exit(1);
}

$pdo = db();
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

$boolColsFlat = [];
foreach (BOOL_COLUMNS as $t => $cols) foreach ($cols as $c) $boolColsFlat[$t . '.' . $c] = true;

$totalRows = 0;
foreach ($tableOrder as $table) {
  $csvPath = $exportDir . '/' . $table . '.csv';
  if (!file_exists($csvPath)) { out("[skip] $table.csv tidak ada, dilewati."); continue; }
  if (!array_key_exists($table, ALLOWED_TABLES)) { out("[skip] Tabel '$table' tidak dikenal."); continue; }

  $fh = fopen($csvPath, 'r');
  if (!$fh) { out("[gagal] Tidak bisa membuka $csvPath"); continue; }

  $header = fgetcsv($fh);
  if (!$header) { out("[skip] $table.csv kosong."); fclose($fh); continue; }
  $header = array_map('trim', $header);
  foreach ($header as $h) {
    if (!ident_ok($h)) { out("[gagal] Nama kolom tidak valid di $table.csv: $h"); fclose($fh); continue 2; }
  }

  $colSql = implode(',', array_map(fn($c) => "`$c`", $header));
  $ph = implode(',', array_fill(0, count($header), '?'));
  $stmt = $pdo->prepare("INSERT INTO `$table` ($colSql) VALUES ($ph)");

  $count = 0;
  while (($row = fgetcsv($fh)) !== false) {
    if (count($row) === 1 && $row[0] === null) continue; // baris kosong
    $vals = [];
    foreach ($header as $i => $col) {
      $v = $row[$i] ?? null;
      if ($v === '' || $v === null) { $vals[] = null; continue; }
      if (isset($boolColsFlat[$table . '.' . $col])) {
        $vals[] = in_array(strtolower($v), ['t', 'true', '1'], true) ? 1 : 0;
        continue;
      }
      $vals[] = $v;
    }
    try {
      $stmt->execute($vals);
      $count++;
    } catch (Throwable $e) {
      out("  [baris gagal] $table: " . $e->getMessage());
    }
  }
  fclose($fh);
  out("[ok] $table: $count baris diimpor.");
  $totalRows += $count;
}

$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
out("Selesai. Total $totalRows baris diimpor dari " . $exportDir);
