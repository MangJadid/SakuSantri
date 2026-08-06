// ===== RIWAYAT =====
function renderRiwayat(){
  const q=document.getElementById('riw-cari')?.value.toLowerCase()||'';
  const af=document.getElementById('riw-asrama')?.value||'';
  const kf=document.getElementById('riw-kobong')?.value||'';
  const bf=document.getElementById('riw-bulan')?.value||'';
  const jf=document.getElementById('riw-jenis')?.value||'';

  let filtered=ALL_TX.filter(t=>{
    if(q && !(t.santri?.nama||'').toLowerCase().includes(q) && !(t.keterangan||'').toLowerCase().includes(q)) return false;
    if(af){
      const kId = t.santri?.kobong?.id;
      const aId = kId!=null ? ALL_KOBONG.find(k=>k.id===kId)?.asrama_id : null;
      if(String(aId)!==af) return false;
    }
    if(kf && String(t.santri?.kobong?.id||t.santri?.kobong_id)!==kf) return false;
    if(bf && !(t.tanggal||'').startsWith(bf)) return false;
    if(jf && t.jenis!==jf) return false;
    return true;
  });

  let html='';
  filtered.forEach(t=>{
    const kn=t.santri?.kobong?.nama||'—';
    html+=`<tr>
      <td style="font-size:11.5px;color:var(--text-l);white-space:nowrap">${fmtTanggal(t.tanggal)}</td>
      <td><strong>${t.santri?.nama||'—'}</strong></td>
      <td><span class="badge bg" style="font-size:10.5px">${kn}</span></td>
      <td>${t.keterangan||'—'}</td>
      <td class="s-ok">${t.jenis==='masuk'?rp(t.nominal):'—'}</td>
      <td style="color:var(--red)">${t.jenis==='keluar'?rp(t.nominal):'—'}</td>
      <td style="font-size:11.5px;color:var(--text-l)">${t.oleh||'—'}</td>
    </tr>`;
  });
  document.getElementById('riw-tbl').innerHTML=html||`<tr><td colspan="7"><div class="empty"><span class="ei">📜</span><p>Tidak ada riwayat</p></div></td></tr>`;

  const pgEl=document.getElementById('riw-pagination');
  if(pgEl) pgEl.innerHTML='';
}

