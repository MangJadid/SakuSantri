<?php
// Pengganti Postgres RPC functions (login_*_check, login_ortu, get_*_ortu).
// Kontrak request/response sengaja dibuat identik dengan yang diharapkan kode
// frontend existing (lihat santri/js/auth.js, bendahara/js/app-core.js, santri/js/ortu.js)
// supaya file-file itu tidak perlu diubah sama sekali.
require_once __DIR__ . '/helpers.php';

$body = read_input();
$fn = $body['fn'] ?? '';
$params = $body['params'] ?? [];

function check_password(?string $stored, string $plain): bool {
  if ($stored === null) return false;
  return hash_equals($stored, hash('sha256', $plain)) || hash_equals($stored, base64_encode($plain));
}

try {
  switch ($fn) {

    case 'login_bendahara_check': {
      $stmt = db()->prepare('SELECT * FROM bendahara_users WHERE username = ?');
      $stmt->execute([$params['p_username'] ?? '']);
      $row = $stmt->fetch();
      if ($row && check_password($row['password_hash'], $params['p_password'] ?? '')) {
        unset($row['password_hash']);
        cast_rows('bendahara_users', $rows = [$row]);
        json_out(['data' => $rows[0], 'error' => null]);
      }
      json_out(['data' => null, 'error' => null]);
    }

    case 'login_pengurus_check': {
      $stmt = db()->prepare('SELECT * FROM pengurus WHERE username = ?');
      $stmt->execute([$params['p_username'] ?? '']);
      $row = $stmt->fetch();
      if ($row && check_password($row['password_hash'], $params['p_password'] ?? '')) {
        unset($row['password_hash']);
        cast_rows('pengurus', $rows = [$row]);
        json_out(['data' => $rows[0], 'error' => null]);
      }
      json_out(['data' => null, 'error' => null]);
    }

    case 'login_super_check': {
      $stmt = db()->prepare("SELECT `key`,`value` FROM settings WHERE `key` IN ('super_pass','super_user')");
      $stmt->execute();
      $vals = [];
      foreach ($stmt->fetchAll() as $r) $vals[$r['key']] = $r['value'];
      $storedPass = $vals['super_pass'] ?? null;
      $storedUser = $vals['super_user'] ?? 'superadmin';
      $ok = (($params['p_username'] ?? '') === $storedUser) && check_password($storedPass, $params['p_password'] ?? '');
      json_out(['data' => $ok, 'error' => null]);
    }

    case 'login_ortu': {
      $nama = trim($params['p_nama'] ?? '');
      $pin = trim($params['p_pin'] ?? '');
      $stmt = db()->prepare(
        'SELECT s.*, k.nama AS kobong_nama FROM santri s LEFT JOIN kobong k ON k.id = s.kobong_id ' .
        'WHERE LOWER(s.nama) = LOWER(?) AND s.pin = ?'
      );
      $stmt->execute([$nama, $pin]);
      $rows = $stmt->fetchAll();
      cast_rows('santri', $rows);
      if (empty($rows)) {
        json_out(['data' => ['error' => 'Nama atau PIN salah!'], 'error' => null]);
      }
      if (count($rows) > 1) {
        json_out(['data' => ['error' => 'Ditemukan lebih dari satu santri dengan nama sama. Hubungi admin.'], 'error' => null]);
      }
      json_out(['data' => ['data' => $rows[0]], 'error' => null]);
    }

    case 'get_transaksi_ortu': {
      $santriId = $params['p_santri_id'] ?? null;
      $pin = trim($params['p_pin'] ?? '');
      $chk = db()->prepare('SELECT id FROM santri WHERE id = ? AND pin = ?');
      $chk->execute([$santriId, $pin]);
      if (!$chk->fetch()) {
        json_out(['data' => ['error' => 'PIN tidak valid.'], 'error' => null]);
      }
      $stmt = db()->prepare('SELECT * FROM transaksi WHERE santri_id = ? ORDER BY tanggal DESC, created_at DESC');
      $stmt->execute([$santriId]);
      $rows = $stmt->fetchAll();
      json_out(['data' => ['data' => $rows], 'error' => null]);
    }

    case 'get_tagihan_ortu': {
      $santriId = $params['p_santri_id'] ?? null;
      $pin = trim($params['p_pin'] ?? '');
      $chk = db()->prepare('SELECT id FROM santri WHERE id = ? AND pin = ?');
      $chk->execute([$santriId, $pin]);
      if (!$chk->fetch()) {
        json_out(['data' => ['error' => 'PIN tidak valid.'], 'error' => null]);
      }
      $stmt = db()->prepare('SELECT * FROM tagihan_pondok WHERE santri_id = ? ORDER BY created_at DESC');
      $stmt->execute([$santriId]);
      $rows = $stmt->fetchAll();
      cast_rows('tagihan_pondok', $rows);
      json_out(['data' => ['data' => $rows], 'error' => null]);
    }

    default:
      json_out(['data' => null, 'error' => ['message' => "RPC '$fn' tidak dikenal."]]);
  }
} catch (Throwable $e) {
  json_out(['data' => null, 'error' => ['message' => $e->getMessage()]]);
}
