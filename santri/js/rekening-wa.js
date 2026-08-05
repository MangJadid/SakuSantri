// ===== LOGOUT =====
// ===== REKENING PENGURUS =====
function openRekeningModal(){
  const pgKey = 'pg_rekening_'+(SESSION.user?.id||'0');
  const cur = parseInt(localStorage.getItem(pgKey)||'0');
  const totalSaldo = ALL_SANTRI.reduce((a,s)=>a+s.saldo,0);
  document.getElementById('input-rekening').value = cur||'';
  updateRekeningPreview(totalSaldo, cur);
  document.getElementById('input-rekening').oninput = function(){
    const v = parseInt(this.value)||0;
    updateRekeningPreview(totalSaldo, v);
  };
  openMo('mo-rekening');
}

function updateRekeningPreview(totalSaldo, rekening){
  const cash = totalSaldo - rekening;
  document.getElementById('rek-preview-total').textContent = rp(totalSaldo);
  document.getElementById('rek-preview-rek').textContent = rp(rekening);
  const cashEl = document.getElementById('rek-preview-cash');
  cashEl.textContent = (cash<0?'− ':'')+rp(Math.abs(cash));
  cashEl.style.color = cash<0?'var(--red)':'var(--purple)';
}

function simpanRekening(){
  const pgKey = 'pg_rekening_'+(SESSION.user?.id||'0');
  const v = parseInt(document.getElementById('input-rekening').value)||0;
  if(v<0){ toast('Jumlah tidak boleh negatif!',false); return; }
  localStorage.setItem(pgKey, v);
  closeMo('mo-rekening');
  toast('✅ Uang rekening berhasil disimpan!');
  renderDashboard(); // refresh stat cards
}

// ===== FITUR WhatsApp =====
const DEFAULT_WA_TEMPLATE = `Assalamu'alaikum Bapak/Ibu Wali Santri,

Kami informasikan bahwa saldo uang jajan putra/putri Bapak/Ibu:

👤 Nama   : {{nama}}
🏠 Kobong : {{kobong}}
💰 Saldo  : {{saldo}}

Saldo sudah di bawah batas minimum. Mohon segera melakukan top up agar kebutuhan harian santri tetap terpenuhi.

Cek saldo secara langsung di:
🔗 {{link}}

Jazakallahu Khairan 🙏
{{pondok}}`;

function getWATemplate(){
  return CONFIG.wa_template || DEFAULT_WA_TEMPLATE;
}

function buatPesanWA(santri){
  const kritis = parseInt(CONFIG.kritis_batas)||50000;
  const k = santri.kobong?.nama || getKobongNama(santri.kobong_id) || '—';
  const link = window.location.href.split('?')[0];
  const pondok = CONFIG.pesantren_nama || 'Pondok Pesantren';
  return getWATemplate()
    .replace(/{{nama}}/g, santri.nama)
    .replace(/{{kobong}}/g, k)
    .replace(/{{saldo}}/g, 'Rp '+santri.saldo.toLocaleString('id-ID'))
    .replace(/{{link}}/g, link)
    .replace(/{{pondok}}/g, pondok);
}

function formatNoWA(no){
  if(!no) return null;
  let n = no.replace(/\D/g,'');
  if(n.startsWith('0')) n = '62'+n.slice(1);
  return n;
}

function kirimWASantri(santriId){
  const s = ALL_SANTRI.find(x=>x.id===santriId);
  if(!s || !s.no_wa){ toast('No WA orang tua tidak ada!', false); return; }
  const noWA = formatNoWA(s.no_wa);
  const pesan = buatPesanWA(s);
  const url = `https://wa.me/${noWA}?text=${encodeURIComponent(pesan)}`;
  window.open(url, '_blank');
}

// State untuk WA satu per satu
let _waQueue = [];
let _waIndex = 0;

function kirimWASemuaKritis(){
  const kritis = parseInt(CONFIG.kritis_batas)||50000;
  const af = document.getElementById('dash-asrama')?.value||'';
  const scope = af ? ALL_SANTRI.filter(s=>String(getAsramaIdBySantri(s))===af) : ALL_SANTRI;
  const kritisAdaWA = scope.filter(s=>s.saldo<kritis && s.no_wa);
  const tanpaWA = scope.filter(s=>s.saldo<kritis && !s.no_wa).length;

  if(!kritisAdaWA.length){
    toast('Tidak ada santri kritis yang punya no WA!', false);
    return;
  }

  const infoTanpaWA = tanpaWA>0 ? `\n\n⚠️ ${tanpaWA} santri kritis tidak punya no WA (dilewati).` : '';
  konfirm(`Kirim WA ke <strong>${kritisAdaWA.length} orang tua</strong> santri saldo kritis?${infoTanpaWA}<br><br><span style="font-size:12px;color:var(--text-m)">WA akan dikirim satu per satu — klik <strong>Kirim Berikutnya</strong> setiap selesai.</span>`, ()=>{
    _waQueue = kritisAdaWA;
    _waIndex = 0;
    kirimWABerikutnya();
  }, 'wa');
}

function kirimWABerikutnya(){
  if(_waIndex >= _waQueue.length){
    toast(`✅ Semua ${_waQueue.length} WA berhasil dikirim!`);
    document.getElementById('mo-wa-progress')?.remove();
    return;
  }
  const s = _waQueue[_waIndex];
  const noWA = formatNoWA(s.no_wa);
  const pesan = buatPesanWA(s);
  const url = `https://wa.me/${noWA}?text=${encodeURIComponent(pesan)}`;
  window.open(url, '_blank');
  _waIndex++;

  // Tampilkan modal progress
  let mo = document.getElementById('mo-wa-progress');
  if(!mo){
    mo = document.createElement('div');
    mo.id = 'mo-wa-progress';
    mo.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:9999;background:#fff;border:1.5px solid var(--green-b);border-radius:14px;padding:16px 20px;box-shadow:0 8px 32px rgba(26,92,58,.18);min-width:240px;animation:slideUp .25s ease';
    document.body.appendChild(mo);
  }
  const sisa = _waQueue.length - _waIndex;
  mo.innerHTML = `
    <div style="font-size:12px;color:var(--text-l);margin-bottom:4px">📲 Progres WA</div>
    <div style="font-size:14px;font-weight:600;color:var(--green);margin-bottom:10px">
      ${_waIndex} / ${_waQueue.length} terkirim
      ${sisa>0?`<span style="color:var(--text-m);font-weight:400"> — ${sisa} sisa</span>`:''}
    </div>
    <div style="background:var(--border);border-radius:3px;height:5px;margin-bottom:12px">
      <div style="background:var(--green);height:5px;border-radius:3px;width:${(_waIndex/_waQueue.length*100).toFixed(0)}%;transition:width .4s"></div>
    </div>
    ${sisa>0
      ? `<button class="btn btn-wa btn-sm" style="width:100%" onclick="kirimWABerikutnya()">📲 Kirim ke: ${_waQueue[_waIndex]?.nama||''}</button>`
      : `<div style="color:var(--green);font-weight:600;text-align:center">✅ Semua selesai!</div>`
    }
    ${sisa>0?`<button class="btn btn-o btn-sm" style="width:100%;margin-top:6px" onclick="document.getElementById('mo-wa-progress').remove()">Hentikan</button>`:''}
  `;
  if(sisa===0) setTimeout(()=>{ mo.remove(); }, 3000);
}

async function simpanTemplateWA(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan template WA...','Template pesan WhatsApp sedang disimpan.');
  setLoading(true, _lBtn);
  try {

  const tmpl = document.getElementById('set-wa-template')?.value || '';
  await SB.from('settings').upsert({key:'wa_template', value:tmpl});
  CONFIG.wa_template = tmpl;
  localStorage.setItem('siujang_cfg', JSON.stringify(CONFIG));
  toast('✅ Template WA berhasil disimpan!');

  } finally { setLoading(false, _lBtn); }
}

function loadTemplateWAInput(){
  const el = document.getElementById('set-wa-template');
  if(el) el.value = getWATemplate();
}

