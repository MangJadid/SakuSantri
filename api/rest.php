<?php
// Endpoint generik pengganti Supabase PostgREST: menerima deskripsi query dari
// shim frontend (shared/supabase-client.js) dan menerjemahkannya ke SQL MySQL.
require_once __DIR__ . '/helpers.php';

$body = read_input();
$table = $body['table'] ?? '';
$action = $body['action'] ?? 'select';

if ($table === '' || !valid_ident($table)) {
  json_out(['data' => null, 'error' => ['message' => 'Nama tabel wajib diisi.']]);
}
assert_table($table);
$tIdent = quote_ident($table);

$filters = $body['filters'] ?? [];
$order = $body['order'] ?? [];
$limit = $body['limit'] ?? null;
$range = $body['range'] ?? null;
$single = !empty($body['single']);
$maybeSingle = !empty($body['maybeSingle']);
$countMode = $body['count'] ?? null;
$head = !empty($body['head']);

try {
  if ($action === 'select') {
    $tree = parse_select($body['select'] ?? '*');
    $cols = $tree['cols'];
    if (empty($cols) || in_array('*', $cols, true)) {
      $selectSql = '*';
    } else {
      // pastikan kolom FK relasi ikut terselect supaya attach_relations bisa mapping
      foreach (array_keys($tree['rel']) as $relName) {
        $conf = RELATIONS[$table][$relName] ?? null;
        if ($conf && !in_array($conf['fk'], $cols, true)) $cols[] = $conf['fk'];
      }
      $selectSql = implode(',', array_map('quote_ident', $cols));
    }

    [$whereSql, $params] = build_where($filters);
    $orderSql = build_order($order);

    $count = null;
    if ($countMode) {
      $stmt = db()->prepare("SELECT COUNT(*) AS c FROM $tIdent $whereSql");
      $stmt->execute($params);
      $count = (int) $stmt->fetch()['c'];
    }

    $data = null;
    if (!$head) {
      $limitSql = '';
      if ($range && is_array($range) && count($range) === 2) {
        $from = (int) $range[0]; $to = (int) $range[1];
        $limitSql = 'LIMIT ' . max(0, $to - $from + 1) . ' OFFSET ' . max(0, $from);
      } elseif ($limit !== null) {
        $limitSql = 'LIMIT ' . (int) $limit;
      }
      $sql = "SELECT $selectSql FROM $tIdent $whereSql $orderSql $limitSql";
      $stmt = db()->prepare($sql);
      $stmt->execute($params);
      $rows = $stmt->fetchAll();
      cast_rows($table, $rows);
      if (!empty($tree['rel'])) attach_relations($table, $rows, $tree['rel']);

      if ($single) {
        if (count($rows) !== 1) {
          json_out(['data' => null, 'error' => ['message' => 'Baris yang ditemukan bukan tepat satu (single()).'], 'count' => $count]);
        }
        $data = $rows[0];
      } elseif ($maybeSingle) {
        $data = $rows[0] ?? null;
      } else {
        $data = $rows;
      }
    }

    json_out(['data' => $data, 'error' => null, 'count' => $count]);
  }

  elseif ($action === 'insert' || $action === 'upsert') {
    $payload = $body['payload'] ?? null;
    $rows = (is_array($payload) && is_list_array($payload)) ? $payload : [$payload];
    if (empty($rows) || $rows[0] === null) {
      json_out(['data' => null, 'error' => ['message' => 'Payload insert/upsert kosong.']]);
    }

    $conflictKey = $body['onConflict'] ?? (ALLOWED_TABLES[$table]['upsertKey'] ?? ALLOWED_TABLES[$table]['pk']);
    $conflictCols = array_map('trim', explode(',', $conflictKey));

    $insertedKeys = []; // nilai kolom konflik/pk dari tiap baris yang berhasil diproses
    foreach ($rows as $row) {
      if (!is_array($row)) continue;
      $cols = array_keys($row);
      foreach ($cols as $c) quote_ident($c); // validasi
      $colSql = implode(',', array_map('quote_ident', $cols));
      $ph = implode(',', array_fill(0, count($cols), '?'));
      $vals = array_map(function ($v) {
        if (is_array($v)) return json_encode($v, JSON_UNESCAPED_UNICODE);
        if (is_bool($v)) return $v ? 1 : 0;
        return $v;
      }, array_values($row));

      if ($action === 'upsert') {
        $updates = [];
        foreach ($cols as $c) {
          if (!in_array($c, $conflictCols, true)) $updates[] = quote_ident($c) . ' = VALUES(' . quote_ident($c) . ')';
        }
        $updateSql = empty($updates) ? (quote_ident($cols[0]) . ' = VALUES(' . quote_ident($cols[0]) . ')') : implode(',', $updates);
        $sql = "INSERT INTO $tIdent ($colSql) VALUES ($ph) ON DUPLICATE KEY UPDATE $updateSql";
      } else {
        $sql = "INSERT INTO $tIdent ($colSql) VALUES ($ph)";
      }
      $stmt = db()->prepare($sql);
      $stmt->execute($vals);

      $keyVals = [];
      foreach ($conflictCols as $ck) {
        $keyVals[$ck] = $row[$ck] ?? (($ck === (ALLOWED_TABLES[$table]['pk'] ?? '')) ? db()->lastInsertId() : null);
      }
      $insertedKeys[] = $keyVals;
    }

    $data = null;
    if (array_key_exists('select', $body)) {
      $tree = parse_select($body['select'] ?? '*');
      $selectSql = (empty($tree['cols']) || in_array('*', $tree['cols'], true)) ? '*' : implode(',', array_map('quote_ident', $tree['cols']));
      $collected = [];
      foreach ($insertedKeys as $kv) {
        $clauses = []; $params = [];
        foreach ($kv as $c => $v) { $clauses[] = quote_ident($c) . ' = ?'; $params[] = $v; }
        if (empty($clauses)) continue;
        $stmt = db()->prepare("SELECT $selectSql FROM $tIdent WHERE " . implode(' AND ', $clauses));
        $stmt->execute($params);
        foreach ($stmt->fetchAll() as $r) $collected[] = $r;
      }
      cast_rows($table, $collected);
      if (!empty($tree['rel'])) attach_relations($table, $collected, $tree['rel']);
      if ($single) {
        if (count($collected) !== 1) json_out(['data' => null, 'error' => ['message' => 'Insert single() gagal: baris tidak tepat satu.']]);
        $data = $collected[0];
      } elseif ($maybeSingle) {
        $data = $collected[0] ?? null;
      } else {
        $data = $collected;
      }
    }
    json_out(['data' => $data, 'error' => null]);
  }

  elseif ($action === 'update') {
    $payload = $body['payload'] ?? [];
    if (!is_array($payload) || empty($payload)) {
      json_out(['data' => null, 'error' => ['message' => 'Payload update kosong.']]);
    }
    [$whereSql, $whereParams] = build_where($filters);
    $sets = []; $params = [];
    foreach ($payload as $c => $v) {
      quote_ident($c);
      $sets[] = quote_ident($c) . ' = ?';
      if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);
      elseif (is_bool($v)) $v = $v ? 1 : 0;
      $params[] = $v;
    }
    $sql = "UPDATE $tIdent SET " . implode(',', $sets) . " $whereSql";
    $stmt = db()->prepare($sql);
    $stmt->execute(array_merge($params, $whereParams));

    $data = null;
    if (array_key_exists('select', $body)) {
      $tree = parse_select($body['select'] ?? '*');
      $selectSql = (empty($tree['cols']) || in_array('*', $tree['cols'], true)) ? '*' : implode(',', array_map('quote_ident', $tree['cols']));
      $stmt2 = db()->prepare("SELECT $selectSql FROM $tIdent $whereSql");
      $stmt2->execute($whereParams);
      $rows = $stmt2->fetchAll();
      cast_rows($table, $rows);
      if (!empty($tree['rel'])) attach_relations($table, $rows, $tree['rel']);
      if ($single) {
        if (count($rows) !== 1) json_out(['data' => null, 'error' => ['message' => 'Update single() gagal: baris tidak tepat satu.']]);
        $data = $rows[0];
      } elseif ($maybeSingle) {
        $data = $rows[0] ?? null;
      } else {
        $data = $rows;
      }
    }
    json_out(['data' => $data, 'error' => null]);
  }

  elseif ($action === 'delete') {
    [$whereSql, $params] = build_where($filters);
    if ($whereSql === '') {
      json_out(['data' => null, 'error' => ['message' => 'Delete tanpa filter tidak diizinkan.']]);
    }
    $stmt = db()->prepare("DELETE FROM $tIdent $whereSql");
    $stmt->execute($params);
    json_out(['data' => null, 'error' => null]);
  }

  else {
    json_out(['data' => null, 'error' => ['message' => "Action '$action' tidak dikenal."]]);
  }
} catch (Throwable $e) {
  json_out(['data' => null, 'error' => ['message' => $e->getMessage()]]);
}
