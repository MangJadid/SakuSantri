// ===== NOTIF =====
function updateNotif(){
  const kritis=parseInt(CONFIG.kritis_batas)||50000;
  const cnt=ALL_SANTRI.filter(s=>s.saldo>=0&&s.saldo<kritis).length;
  const minus=ALL_SANTRI.filter(s=>s.saldo<0).length;
  const nb=document.getElementById('notif-bar');
  if(cnt>0||minus>0){
    nb.style.display='flex';
    nb.innerHTML=`⚠️ <strong>${cnt} santri</strong> saldo kritis${minus?` · <strong>${minus} santri</strong> saldo minus`:''} — segera lakukan top up!`;
  } else {
    nb.style.display='none';
  }
}

// ===== PENGATURAN =====
async function simpanPengaturan(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  showLoadingOverlay('Menyimpan pengaturan...','Pengaturan aplikasi sedang disimpan.');
  setLoading(true, _lBtn);
  try {

  const nama=document.getElementById('set-nama').value.trim();
  const bulan=document.getElementById('set-bulan').value.trim();
  const kritis=parseInt(document.getElementById('set-kritis').value)||50000;
  await SB.from('settings').upsert({key:'pesantren_nama',value:nama});
  await SB.from('settings').upsert({key:'bulan_aktif',value:bulan});
  await SB.from('settings').upsert({key:'kritis_batas',value:String(kritis)});
  CONFIG.pesantren_nama=nama; CONFIG.bulan_aktif=bulan; CONFIG.kritis_batas=kritis;
  localStorage.setItem('siujang_cfg',JSON.stringify(CONFIG));
  document.getElementById('hdr-bulan').textContent=bulan;
  document.getElementById('hdr-sub').textContent=nama;
  toast('Pengaturan disimpan!');

  } finally { setLoading(false, _lBtn); }
}

async function gantiUsername(){
  const u1=document.getElementById('set-user1').value.trim();
  const u2=document.getElementById('set-user2').value.trim();
  if(!u1||!u2){ toast('⚠️ Isi semua kolom username!'); return; }
  if(u1!==u2){ toast('⚠️ Username tidak cocok!'); return; }
  if(u1.length<4){ toast('⚠️ Username minimal 4 karakter!'); return; }
  await SB.from('settings').upsert({key:'super_user',value:u1});
  toast('✅ Username berhasil diganti! Gunakan username baru saat login.');
  document.getElementById('set-user1').value='';
  document.getElementById('set-user2').value='';
}

async function gantiPass(){
  const p1=document.getElementById('set-pass1').value;
  const p2=document.getElementById('set-pass2').value;
  if(!p1||p1.length<6){ toast('Password min. 6 karakter!',false); return; }
  if(p1!==p2){ toast('Password tidak cocok!',false); return; }
  const newHash = await sha256(p1);
  await SB.from('settings').upsert({key:'super_pass',value:newHash});
  CONFIG.super_pass=newHash;
  localStorage.setItem('siujang_cfg',JSON.stringify(CONFIG));
  document.getElementById('set-pass1').value='';
  document.getElementById('set-pass2').value='';
  toast('Password berhasil diubah!');
}

function cekInputReset(){
  const val = document.getElementById('reset-konfirm-input').value;
  const btn = document.getElementById('btn-reset');
  if(val === 'RESET'){
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '.4';
    btn.style.cursor = 'not-allowed';
  }
}

function resetSetup(){
  const input = document.getElementById('reset-konfirm-input');
  if(input) input.value = '';
  cekInputReset();
  konfirm('Yakin reset konfigurasi? Semua pengguna akan logout dan perlu setup ulang dari awal.', ()=>{
    localStorage.removeItem('siujang_cfg');
    window.location.reload();
  }, 'lainnya');
}

async function cekKoneksi(){
  const el = document.getElementById('set-status');
  el.innerHTML = '⏳ Mengecek...';
  el.style.color = 'var(--text-m)';
  try {
    const {data, error} = await SB.from('settings').select('key').limit(1);
    if(error) throw error;
    el.innerHTML = '✅ <strong>Terhubung!</strong> Database Supabase aktif.';
    el.style.color = 'var(--green)';
    toast('✅ Koneksi Supabase aktif!');
  } catch(e) {
    el.innerHTML = '❌ <strong>Gagal terhubung.</strong> Cek URL dan API key.';
    el.style.color = 'var(--red)';
    toast('❌ Koneksi gagal: '+e.message, false);
  }
}

