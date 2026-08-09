async function hapusKobongBendahara(id){
  const k = ALL_KOBONG.find(x=>String(x.id)===String(id));
  const cnt = ALL_SANTRI.filter(s=>String(s.kobong_id||'')===String(id)).length;
  if(cnt){ toast('⚠️ Pindahkan '+cnt+' santri dulu sebelum hapus kobong!'); return; }
  if(!confirm('Hapus kobong '+k?.nama+'?')) return;
  const {error} = await SB.from('kobong').delete().eq('id',id);
  if(error){ toast('❌ Gagal: '+error.message); return; }
  toast('🗑 Kobong dihapus!');
  await loadAllData(); fillSelects(); renderKobongBendahara();
}
async function hapusAsramaBendahara(id){
  const a = ALL_ASRAMA.find(x=>String(x.id)===String(id));
  const kobongsInAsrama = ALL_KOBONG.filter(k=>String(k.asrama_id)===String(id));
  if(kobongsInAsrama.length){ toast('⚠️ Hapus semua kobong di asrama ini dulu!'); return; }
  if(!confirm('Hapus asrama '+a?.nama+'?')) return;
  const {error} = await SB.from('asrama').delete().eq('id',id);
  if(error){ toast('❌ Gagal: '+error.message); return; }
  toast('🗑 Asrama dihapus!');
  await loadAllData(); fillSelects(); renderKobongBendahara();
}

// ===== RINCIAN PIUTANG ALUMNI =====
function bukaMoRincianPiutang(id){
  const p = ALL_PIUTANG_ALUMNI.find(x=>x.id===id);
  if(!p) return;
  const tgl = p.tgl_keluar ? new Date(p.tgl_keluar).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—';
  const isLunas = p.status_piutang==='lunas';
  document.getElementById('rincian-piutang-title').textContent = '📋 Rincian Piutang — '+p.nama_santri;
  document.getElementById('rincian-piutang-total').textContent = fmtRp(p.total_piutang||0);
  document.getElementById('rincian-piutang-info').innerHTML = `
    <div style="font-weight:700;font-size:15px;margin-bottom:6px">${p.nama_santri}</div>
    <div style="font-size:12px;color:var(--text-m);display:flex;align-items:center;gap:5px">${svgIcon('home',12)} ${p.kobong_nama||'—'} · Kelas ${p.kelas||'—'}</div>
    <div style="font-size:12px;color:var(--text-m);display:flex;align-items:center;gap:5px">${svgIcon('calendar',12)} Keluar: ${tgl}</div>
    <div style="margin-top:6px"><span class="badge ${isLunas?'badge-lunas':'badge-belum'}" style="display:inline-flex;align-items:center;gap:4px">${isLunas?svgIcon('check-circle',12):svgIcon('clock',12)} ${isLunas?'Lunas':'Belum Lunas'}</span></div>
    ${p.catatan?`<div style="font-size:12px;color:var(--text-m);margin-top:4px;display:flex;align-items:center;gap:5px">${svgIcon('edit',12)} ${p.catatan}</div>`:''}
  `;
  const rincian = p.rincian;
  const listEl = document.getElementById('rincian-piutang-list');
  if(!rincian || !rincian.length){
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-l);font-size:13px">Tidak ada rincian tagihan tersimpan</div>';
  } else {
    const bulanNama = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    listEl.innerHTML = rincian.map(r=>`
      <div style="border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:13px">${r.jenis||'Tagihan'}</div>
          <div style="font-size:12px;color:var(--text-m)">${bulanNama[r.bulan]||r.bulan} ${r.tahun}</div>
          ${r.nominal_bayar>0?`<div style="font-size:11px;color:var(--green)">Sudah bayar: ${fmtRp(r.nominal_bayar)}</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;color:var(--text-m);text-decoration:line-through">${fmtRp(r.nominal)}</div>
          <div style="font-weight:700;color:var(--red)">${fmtRp(r.sisa)}</div>
        </div>
      </div>
    `).join('');
  }
  openMo('mo-rincian-piutang');
}

