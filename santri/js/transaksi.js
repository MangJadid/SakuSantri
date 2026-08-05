// ===== TRANSAKSI =====
function openTxModal(santriId, txId=null){
  document.getElementById('tx-santri-id').value = santriId;
  document.getElementById('tx-id').value = txId||'';
  document.getElementById('mo-tx-title').textContent = txId?'Edit Transaksi':'Tambah Transaksi';
  document.getElementById('tx-tgl').value = today();
  document.getElementById('tx-ket').value='';
  document.getElementById('tx-nominal').value='';
  document.getElementById('tx-jenis').value='masuk';
  // Reset pilihan sumber ke cash
  document.querySelectorAll('input[name="tx-sumber"]').forEach(r=>{ if(r.value==='cash') r.checked=true; });
  onJenisChange();
  openMo('mo-tx');
}

function onJenisChange(){
  const jenis = document.getElementById('tx-jenis').value;
  const wrap = document.getElementById('tx-sumber-wrap');
  // Tampil pilihan sumber hanya untuk pemasukan, dan hanya jika pengurus (bukan ortu)
  const showSumber = jenis==='masuk' && SESSION && SESSION.role!=='ortu';
  wrap.style.display = showSumber ? 'block' : 'none';
  // Update visual border pilihan aktif
  updateSumberStyle();
  // Pasang listener
  document.querySelectorAll('input[name="tx-sumber"]').forEach(r=>{
    r.onchange = updateSumberStyle;
  });
}

function updateSumberStyle(){
  const val = document.querySelector('input[name="tx-sumber"]:checked')?.value||'cash';
  const lblCash = document.getElementById('lbl-cash');
  const lblRek  = document.getElementById('lbl-rekening');
  if(lblCash) lblCash.style.cssText = val==='cash'
    ? 'flex:1;border:1.5px solid var(--green);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;background:var(--green-p);color:var(--green);transition:.2s'
    : 'flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:.2s';
  if(lblRek) lblRek.style.cssText = val==='rekening'
    ? 'flex:1;border:1.5px solid var(--blue);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;background:var(--blue-p);color:var(--blue);transition:.2s'
    : 'flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;transition:.2s';
}

async function simpanTx(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan transaksi...','Data transaksi sedang diproses.');
  setLoading(true, _lBtn);
  try {

  const sid = parseInt(document.getElementById('tx-santri-id').value);
  const tgl = document.getElementById('tx-tgl').value;
  const jenis = document.getElementById('tx-jenis').value;
  const ket = document.getElementById('tx-ket').value.trim();
  const nom = parseInt(document.getElementById('tx-nominal').value)||0;

  if(!tgl||!nom){ toast('Isi tanggal dan nominal!',false); return; }

  const oleh = SESSION.role==='super'?'Kang Admin':(SESSION.user?.nama||'Pengurus');

  // Cek sumber pemasukan (cash / rekening) — hanya berlaku untuk pemasukan & pengurus
  const sumber = document.querySelector('input[name="tx-sumber"]:checked')?.value||'cash';

  const {error} = await SB.from('transaksi').insert({santri_id:sid,tanggal:tgl,jenis,keterangan:ket,nominal:nom,oleh});
  if(error){ toast('Gagal simpan: '+error.message,false); return; }

  // Hitung ulang saldo dari DB setelah insert
  const {data:semuaTx} = await SB.from('transaksi').select('jenis,nominal').eq('santri_id', sid);
  const saldoBenar = (semuaTx||[]).reduce((tot,t) => tot + (t.jenis==='masuk'?t.nominal:-t.nominal), 0);
  await SB.from('santri').update({saldo: saldoBenar}).eq('id', sid);

  // Jika pemasukan via Transfer Rekening → tambahkan ke saldo rekening pengurus
  if(jenis==='masuk' && sumber==='rekening' && SESSION.role==='pengurus'){
    const pgKey = 'pg_rekening_'+(SESSION.user?.id||'0');
    const curRek = parseInt(localStorage.getItem(pgKey)||'0');
    localStorage.setItem(pgKey, curRek + nom);
    toast('✅ Transaksi disimpan! Uang rekening bertambah '+rp(nom));
  } else {
    toast('Transaksi berhasil disimpan!');
  }

  closeMo('mo-tx');
  await loadAllData();
  renderDashboard();
  renderTabelSantri();
  renderRiwayat();
  openDetailModal(sid);

  } finally { setLoading(false, _lBtn); }
}

async function hapusTx(txId, santriId){
  if(_isLoading) return;
  try {

  const {data:tx} = await SB.from('transaksi').select('*').eq('id',txId).single();
  if(!tx) return;
  konfirm(`Hapus transaksi <strong>${tx.keterangan||'—'}</strong> senilai ${rp(tx.nominal)}?`, async()=>{
    const _lBtn2 = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
    showLoadingOverlay('Menghapus transaksi...','Transaksi sedang dihapus.');
    setLoading(true, _lBtn2);
    try {
    // Hapus transaksi dulu
    await SB.from('transaksi').delete().eq('id',txId);
    // Hitung ulang saldo dari NOL berdasarkan semua transaksi TERSISA di database
    // (tidak pakai ALL_SANTRI karena bisa stale/tidak sinkron)
    const {data:sisaTx} = await SB.from('transaksi').select('jenis,nominal').eq('santri_id', santriId);
    const saldoBenar = (sisaTx||[]).reduce((tot,t) => tot + (t.jenis==='masuk'?t.nominal:-t.nominal), 0);
    await SB.from('santri').update({saldo: saldoBenar}).eq('id', santriId);
    toast('Transaksi dihapus');
    await loadAllData();
    openDetailModal(santriId);
  
    } finally { setLoading(false, _lBtn2); }});

  } finally { setLoading(false, _lBtn); }
}

