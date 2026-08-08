<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

// Wajibkan header 'apikey' cocok dengan API_KEY di config.php sebelum memproses request apa pun.
$_providedApiKey = $_SERVER['HTTP_APIKEY'] ?? '';
if (!hash_equals(API_KEY, $_providedApiKey)) {
  http_response_code(401);
  echo json_encode(['data' => null, 'error' => ['message' => 'Unauthorized: apikey tidak valid.']]);
  exit;
}

function json_out($arr): void {
  echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function read_input(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

// Pengganti array_is_list() supaya tetap jalan di PHP < 8.1 (banyak XAMPP lama masih PHP 7.4/8.0).
function is_list_array(array $arr): bool {
  if (function_exists('array_is_list')) return array_is_list($arr);
  $i = 0;
  foreach ($arr as $k => $_) { if ($k !== $i++) return false; }
  return true;
}

// Nama tabel/kolom hanya boleh huruf/angka/underscore (mencegah SQL injection lewat identifier).
function valid_ident(string $name): bool {
  return (bool) preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $name);
}

function assert_table(string $table): void {
  if (!array_key_exists($table, ALLOWED_TABLES)) {
    json_out(['data' => null, 'error' => ['message' => "Tabel '$table' tidak dikenal/tidak diizinkan."]]);
  }
}

function quote_ident(string $name): string {
  if (!valid_ident($name)) {
    json_out(['data' => null, 'error' => ['message' => "Nama kolom tidak valid: $name"]]);
  }
  return "`$name`";
}

// Parser sederhana untuk string select ala PostgREST, mis:
// "id,nama,kobong(id,nama,asrama(id,nama))" -> ['cols'=>['id','nama'], 'rel'=>['kobong'=>['cols'=>[...],'rel'=>[...]]]]
function parse_select(string $str): array {
  $str = trim($str);
  $tree = ['cols' => [], 'rel' => []];
  $len = strlen($str);
  $i = 0;
  $buf = '';
  $flush = function () use (&$buf, &$tree) {
    $name = trim($buf);
    $buf = '';
    if ($name !== '') $tree['cols'][] = $name;
  };
  while ($i < $len) {
    $ch = $str[$i];
    if ($ch === ',') {
      $flush();
      $i++;
      continue;
    }
    if ($ch === '(') {
      $relName = trim($buf);
      $buf = '';
      // cari isi kurung, hitung depth untuk nested
      $depth = 1;
      $j = $i + 1;
      $inner = '';
      while ($j < $len && $depth > 0) {
        if ($str[$j] === '(') $depth++;
        elseif ($str[$j] === ')') { $depth--; if ($depth === 0) break; }
        $inner .= $str[$j];
        $j++;
      }
      if ($relName !== '') {
        $tree['rel'][$relName] = parse_select($inner);
      }
      $i = $j + 1;
      continue;
    }
    $buf .= $ch;
    $i++;
  }
  $flush();
  return $tree;
}

// Ambil relasi (embedded select) dan tempel ke tiap baris hasil query utama.
function attach_relations(string $table, array &$rows, array $relTree): void {
  if (empty($rows) || empty($relTree)) return;
  foreach ($relTree as $relName => $node) {
    $conf = RELATIONS[$table][$relName] ?? null;
    if (!$conf) continue;
    $fk = $conf['fk']; $relTable = $conf['table']; $relPk = $conf['pk'];

    $ids = [];
    foreach ($rows as $r) {
      if (isset($r[$fk]) && $r[$fk] !== null && $r[$fk] !== '') $ids[$r[$fk]] = true;
    }
    $ids = array_keys($ids);

    if (empty($ids)) {
      foreach ($rows as &$r) { $r[$relName] = null; }
      unset($r);
      continue;
    }

    $cols = $node['cols'];
    if (empty($cols) || in_array('*', $cols, true)) {
      $selectSql = '*';
    } else {
      // ikutkan kolom FK yang dibutuhkan relasi nested (mis. kobong.asrama_id untuk kobong(asrama(...)))
      foreach (array_keys($node['rel']) as $nestedRelName) {
        $nestedConf = RELATIONS[$relTable][$nestedRelName] ?? null;
        if ($nestedConf && !in_array($nestedConf['fk'], $cols, true)) $cols[] = $nestedConf['fk'];
      }
      $colSet = array_unique(array_merge($cols, [$relPk]));
      $selectSql = implode(',', array_map('quote_ident', $colSet));
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare("SELECT $selectSql FROM " . quote_ident($relTable) . " WHERE " . quote_ident($relPk) . " IN ($placeholders)");
    $stmt->execute(array_values($ids));
    $related = $stmt->fetchAll();
    cast_rows($relTable, $related);

    if (!empty($node['rel'])) {
      attach_relations($relTable, $related, $node['rel']);
    }

    $map = [];
    foreach ($related as $rr) { $map[$rr[$relPk]] = $rr; }

    foreach ($rows as &$r) {
      $key = $r[$fk] ?? null;
      $r[$relName] = ($key !== null && isset($map[$key])) ? $map[$key] : null;
    }
    unset($r);
  }
}

// Decode kolom JSON & cast kolom boolean supaya tipe data yang dikirim ke frontend
// sama seperti waktu masih di Postgres/Supabase.
function cast_rows(string $table, array &$rows): void {
  $jsonCols = JSON_COLUMNS[$table] ?? [];
  $boolCols = BOOL_COLUMNS[$table] ?? [];
  if (empty($jsonCols) && empty($boolCols)) return;
  foreach ($rows as &$r) {
    foreach ($jsonCols as $c) {
      if (isset($r[$c]) && is_string($r[$c])) {
        $decoded = json_decode($r[$c], true);
        if (json_last_error() === JSON_ERROR_NONE) $r[$c] = $decoded;
      }
    }
    foreach ($boolCols as $c) {
      if (isset($r[$c])) $r[$c] = (bool) $r[$c];
    }
  }
  unset($r);
}

// Bangun klausa WHERE dari daftar filter [{col,op,val}], kembalikan [sql, params]
function build_where(array $filters): array {
  $ops = [
    'eq' => '=', 'neq' => '<>', 'gt' => '>', 'gte' => '>=', 'lt' => '<', 'lte' => '<=',
    'like' => 'LIKE', 'ilike' => 'LIKE',
  ];
  $norm = function ($v) { return is_bool($v) ? (int) $v : $v; };
  $clauses = [];
  $params = [];
  foreach ($filters as $f) {
    $col = quote_ident($f['col']);
    $op = $f['op'] ?? 'eq';
    $val = $f['val'] ?? null;
    if ($op === 'in') {
      $vals = is_array($val) ? $val : [$val];
      if (empty($vals)) { $clauses[] = '1=0'; continue; }
      $ph = implode(',', array_fill(0, count($vals), '?'));
      $clauses[] = "$col IN ($ph)";
      foreach ($vals as $v) $params[] = $norm($v);
      continue;
    }
    if ($op === 'is') {
      $clauses[] = $val === null ? "$col IS NULL" : "$col IS NOT NULL";
      continue;
    }
    if (!isset($ops[$op])) $op = 'eq';
    if ($val === null && $op === 'eq') { $clauses[] = "$col IS NULL"; continue; }
    if ($val === null && $op === 'neq') { $clauses[] = "$col IS NOT NULL"; continue; }
    $sqlOp = $ops[$op];
    if ($op === 'ilike') {
      $clauses[] = "LOWER($col) LIKE LOWER(?)";
    } else {
      $clauses[] = "$col $sqlOp ?";
    }
    $params[] = $norm($val);
  }
  $sql = empty($clauses) ? '' : ('WHERE ' . implode(' AND ', $clauses));
  return [$sql, $params];
}

function build_order(array $order): string {
  if (empty($order)) return '';
  $parts = [];
  foreach ($order as $o) {
    $col = quote_ident($o['col']);
    $dir = (isset($o['ascending']) && !$o['ascending']) ? 'DESC' : 'ASC';
    $parts[] = "$col $dir";
  }
  return 'ORDER BY ' . implode(', ', $parts);
}
