// ===== COCOKKAN NISN (isi NISN santri lama dari data resmi yayasan) =====
// Cuma UPDATE kolom nisn ke santri yang SUDAH ADA (dicocokkan by nama) --
// gak pernah bikin santri baru / gak nyentuh transaksi & saldo sama sekali.
let _nisnRows = []; // hasil parsing + pencocokan, direview manual sebelum diterapkan

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}

function normNama(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function similarityNama(a, b) {
  const na = normNama(a), nb = normNama(b);
  if (!na || !nb) return 0;
  return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
}

function kobongLabelSantri(s) {
  const k = ALL_KOBONG.find(x => String(x.id) === String(s.kobong_id));
  return k ? k.nama : '—';
}

function cariKandidatSantri(namaYayasan) {
  let best = null, bestScore = -1, samaSkor = [];
  ALL_SANTRI.forEach(s => {
    const score = similarityNama(namaYayasan, s.nama);
    if (score > bestScore) { bestScore = score; best = s; samaSkor = [s]; }
    else if (score === bestScore && score > 0) { samaSkor.push(s); }
  });
  return { best, bestScore, ambigu: samaSkor.length > 1 };
}

function openModalCocokkanNisn() {
  openMo('mo-cocokkan-nisn');
  document.getElementById('nisn-file-excel').value = '';
  document.getElementById('nisn-preview-wrap').style.display = 'none';
  document.getElementById('nisn-error-wrap').style.display = 'none';
  const btn = document.getElementById('btn-terapkan-nisn');
  btn.disabled = true; btn.style.opacity = '.5';
  _nisnRows = [];
}

function previewCocokkanNisn(input) {
  const file = input.files[0];
  if (!file) return;
  const errWrap = document.getElementById('nisn-error-wrap');
  errWrap.style.display = 'none';
  _nisnRows = [];

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!allRows || allRows.length < 2) {
        errWrap.innerHTML = '❌ File kosong atau tidak ada data.'; errWrap.style.display = 'block'; return;
      }
      const header = allRows[0].map(h => String(h).trim().toLowerCase());
      const iNama = header.indexOf('nama');
      const iNisn = header.indexOf('nisn');
      if (iNama < 0 || iNisn < 0) {
        errWrap.innerHTML = '❌ Kolom <strong>nama</strong> dan <strong>nisn</strong> wajib ada di baris pertama (header).';
        errWrap.style.display = 'block'; return;
      }

      const dataRows = allRows.slice(1).filter(r => String(r[iNama] || '').trim());
      _nisnRows = dataRows.map(r => {
        const namaYayasan = String(r[iNama]).trim();
        const nisnYayasan = String(r[iNisn] || '').trim();
        const { best, bestScore, ambigu } = cariKandidatSantri(namaYayasan);
        const confident = best && bestScore >= 0.85 && !ambigu;
        return {
          namaYayasan, nisnYayasan,
          matchId: best ? best.id : '',
          score: best ? bestScore : 0,
          ambigu,
          confirmed: !!confident,
        };
      });

      renderReviewNisn();
      document.getElementById('nisn-preview-wrap').style.display = 'block';
    } catch (err) {
      errWrap.innerHTML = '❌ Gagal membaca file: ' + err.message;
      errWrap.style.display = 'block';
    }
  };
  reader.readAsArrayBuffer(file);
}

function badgeStatusNisn(row) {
  if (row.ambigu) return '<span style="color:var(--red);font-weight:700">⚠️ Ada nama kembar</span>';
  if (!row.matchId) return '<span style="color:var(--red);font-weight:700">❌ Gak ketemu</span>';
  if (row.score >= 0.999) return '<span style="color:var(--green);font-weight:700">✅ Sama persis</span>';
  if (row.score >= 0.85) return '<span style="color:#a67c00;font-weight:700">🟡 Mirip, cek dulu</span>';
  return '<span style="color:var(--red);font-weight:700">❌ Beda jauh</span>';
}

function renderReviewNisn() {
  const confirmedCount = _nisnRows.filter(r => r.confirmed && r.matchId).length;
  document.getElementById('nisn-preview-info').innerHTML =
    `<strong>${_nisnRows.length} baris</strong> dari file &nbsp;•&nbsp; <strong style="color:var(--green)">${confirmedCount} siap diterapkan</strong> &nbsp;•&nbsp; ${_nisnRows.length - confirmedCount} perlu dicek manual`;

  document.getElementById('nisn-preview-head').innerHTML =
    `<tr>${['Nama (Yayasan)', 'NISN', 'Dicocokkan ke Santri', 'Status', 'Terapkan?'].map(h =>
      `<th style="padding:7px 10px;white-space:nowrap">${h}</th>`).join('')}</tr>`;

  document.getElementById('nisn-preview-body').innerHTML = _nisnRows.map((r, i) => {
    const optionsHtml = ALL_SANTRI.map(s =>
      `<option value="${s.id}" ${String(s.id) === String(r.matchId) ? 'selected' : ''}>${s.nama} (${kobongLabelSantri(s)})</option>`).join('');
    return `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:6px 10px;font-weight:600">${r.namaYayasan}</td>
      <td style="padding:6px 10px;font-family:'DM Mono',monospace">${r.nisnYayasan || '—'}</td>
      <td style="padding:6px 10px">
        <select onchange="onPilihSantriNisn(${i}, this.value)" style="max-width:220px;font-size:12px">
          <option value="">— Lewati —</option>
          ${optionsHtml}
        </select>
      </td>
      <td style="padding:6px 10px;font-size:11.5px" id="nisn-status-${i}">${badgeStatusNisn(r)}</td>
      <td style="padding:6px 10px;text-align:center">
        <input type="checkbox" id="nisn-chk-${i}" ${r.confirmed ? 'checked' : ''} ${r.matchId ? '' : 'disabled'}
          onchange="_nisnRows[${i}].confirmed=this.checked; renderReviewNisnSummaryOnly()">
      </td>
    </tr>`;
  }).join('');

  const btn = document.getElementById('btn-terapkan-nisn');
  const adaYangSiap = _nisnRows.some(r => r.confirmed && r.matchId);
  btn.disabled = !adaYangSiap; btn.style.opacity = adaYangSiap ? '1' : '.5';
}

function onPilihSantriNisn(i, santriId) {
  const row = _nisnRows[i];
  row.matchId = santriId || '';
  if (santriId) {
    const s = ALL_SANTRI.find(x => String(x.id) === String(santriId));
    row.score = s ? similarityNama(row.namaYayasan, s.nama) : 0;
    row.ambigu = false;
    row.confirmed = true; // dipilih manual = dianggap sudah dicek Anda
  } else {
    row.confirmed = false;
  }
  document.getElementById(`nisn-status-${i}`).innerHTML = badgeStatusNisn(row);
  document.getElementById(`nisn-chk-${i}`).checked = row.confirmed;
  document.getElementById(`nisn-chk-${i}`).disabled = !row.matchId;
  renderReviewNisnSummaryOnly();
}

function renderReviewNisnSummaryOnly() {
  const confirmedCount = _nisnRows.filter(r => r.confirmed && r.matchId).length;
  document.getElementById('nisn-preview-info').innerHTML =
    `<strong>${_nisnRows.length} baris</strong> dari file &nbsp;•&nbsp; <strong style="color:var(--green)">${confirmedCount} siap diterapkan</strong> &nbsp;•&nbsp; ${_nisnRows.length - confirmedCount} perlu dicek manual`;
  const btn = document.getElementById('btn-terapkan-nisn');
  const adaYangSiap = _nisnRows.some(r => r.confirmed && r.matchId);
  btn.disabled = !adaYangSiap; btn.style.opacity = adaYangSiap ? '1' : '.5';
}

async function terapkanCocokkanNisn() {
  if (_isLoading) return;
  const toApply = _nisnRows.filter(r => r.confirmed && r.matchId);
  if (!toApply.length) { toast('Tidak ada baris yang dicentang!', false); return; }
  const _lBtn = document.activeElement?.tagName === 'BUTTON' ? document.activeElement : null;
  showLoadingOverlay('Menyimpan NISN...', `Mengisi NISN untuk ${toApply.length} santri, harap tunggu.`);
  setLoading(true, _lBtn);
  try {
    let sukses = 0, gagal = 0;
    for (const row of toApply) {
      const { error } = await SB.from('santri').update({ nisn: row.nisnYayasan || null }).eq('id', row.matchId);
      if (error) gagal++; else sukses++;
    }
    closeMo('mo-cocokkan-nisn');
    toast(gagal ? `✅ ${sukses} NISN tersimpan, ❌ ${gagal} gagal` : `✅ ${sukses} NISN berhasil diisi!`, gagal === 0);
    await loadAllData();
    renderTabelSantri();
  } finally { setLoading(false, _lBtn); }
}
