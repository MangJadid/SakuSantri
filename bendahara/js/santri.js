// ===== TAMBAH SANTRI (sama dengan Saku Santri) =====
function bukaModalTambahSantri(){
  document.getElementById('mo-santri-title').textContent='Tambah Santri Baru';
  document.getElementById('s-id').value='';
  document.getElementById('s-nama').value='';
  document.getElementById('s-pin').value='1234';
  document.getElementById('s-kelas').value='';
  document.getElementById('s-nowa').value='';
  document.getElementById('s-kecamatan').value='';
  document.getElementById('s-kota').value='';
  document.getElementById('s-kobong').innerHTML='<option value="">-- Pilih Kobong --</option>';
  const sd=document.getElementById('s-dapur');
  sd.innerHTML='<option value="">-- Pilih Dapur --</option>'+DAPUR_LIST.map(d=>`<option value="${d.id}">${d.emoji} ${d.nama}</option>`).join('');
  hapusFoto();
  populateBulanMulai(''); // kosong = dari awal
  // Reset asrama & populate
  const sa=document.getElementById('s-asrama');
  sa.innerHTML='<option value="">-- Pilih Asrama --</option>'+ALL_ASRAMA.map(a=>`<option value="${a.id}">${a.nama}</option>`).join('');
  openMo('mo-santri');
}

async function simpanSantri(){
  if(_isLoading) return;
  const _lBtn = document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
  setLoading(true, _lBtn);
  try {

  const nama=document.getElementById('s-nama').value.trim();
  const kobong_id=parseInt(document.getElementById('s-kobong').value)||null;
  const pin=document.getElementById('s-pin').value.trim()||'1234';
  const kelas=document.getElementById('s-kelas').value.trim();
  const dapur_id=document.getElementById('s-dapur').value||null;
  const no_wa=document.getElementById('s-nowa').value.trim().replace(/\D/g,'')||null;
  const kecamatan=document.getElementById('s-kecamatan').value.trim()||null;
  const kota=document.getElementById('s-kota').value.trim()||null;
  const bulan_mulai_tagihan=document.getElementById('s-bulan-mulai')?.value||null;
  if(!nama){ toast('⚠️ Nama santri wajib diisi!'); return; }
  if(!kobong_id){ toast('⚠️ Kobong wajib dipilih!'); setLoading(false, _lBtn); return; }

  const btn = document.querySelector('#mo-santri .btn-p');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Menyimpan...'; }

  const doInsert = async () => {
    try {
      const created_by = SESSION?.username || 'kangadmin';
      const payload = { nama, kobong_id, pin, kelas, dapur_id, no_wa, kecamatan, kota, saldo:0, created_by };
      if(bulan_mulai_tagihan) payload.bulan_mulai_tagihan = bulan_mulai_tagihan;
      const {data:newSantri, error} = await SB.from('santri').insert(payload).select().single();
      if(error){ toast('❌ Gagal: '+error.message); return; }
      if(fotoFile){
        try{
          const url = await uploadFoto(newSantri.id);
          if(url) await SB.from('santri').update({foto_url:url}).eq('id',newSantri.id);
        } catch(e){
          toast('⚠️ Santri tersimpan tapi foto gagal diupload: '+e.message, false);
        }
      }
      toast('✅ Santri berhasil ditambahkan!');
      closeMo('mo-santri'); hapusFoto();
      await loadAllData(); fillSelects(); renderSantri();
    } catch(e){
      toast('❌ Error: '+e.message);
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='✅ Simpan'; }
    }
  };

  // ===== CEK DUPLIKAT (Fuzzy) =====
  function levenshtein(a,b){
    const m=a.length,n=b.length;
    const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    return dp[m][n];
  }
  function normalize(s){ return s.toLowerCase().replace(/\s+/g,' ').trim(); }
  const namaInput=normalize(nama);
  const mirip=ALL_SANTRI.filter(s=>{
    const namaDb=normalize(s.nama||'');
    if(namaDb===namaInput) return true;
    if(levenshtein(namaInput,namaDb)<=2) return true;
    const wi=namaInput.split(' '), wd=namaDb.split(' ');
    let cocok=0;
    wi.forEach(a=>{ if(a.length<=2) return; wd.forEach(b=>{ if(b.length<=2) return; if(a===b||levenshtein(a,b)<=1) cocok++; }); });
    return cocok>=2;
  });

  if(mirip.length>0){
    const html=mirip.map(s=>{
      const kn=s.kobong?.nama||getKobongNama(s.kobong_id)||'—';
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--gold-p);border:1px solid var(--gold-b);border-radius:9px;margin-bottom:7px">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:16px;flex-shrink:0">${(s.nama||'?')[0].toUpperCase()}</div>
        <div><div style="font-weight:700;font-size:13px">${s.nama}</div>
        <div style="font-size:11px;color:var(--text-m)">🏠 ${kn} ${s.kelas?'· Kelas '+s.kelas:''}</div></div>
      </div>`;
    }).join('');
    if(btn){ btn.disabled=false; btn.textContent='✅ Simpan'; }
    konfirm(`Ditemukan santri dengan nama serupa:<br><br>${html}<span style="font-size:12px;color:var(--text-m)">Pastikan bukan data duplikat sebelum melanjutkan.</span>`,
      ()=>doInsert(), 'duplikat');
    return;
  }

  await doInsert();

  } finally { setLoading(false, _lBtn); }
}

// ===== FOTO =====
function previewFoto(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const MAX=400; let w=img.width, h=img.height;
      if(w>h){ if(w>MAX){h=Math.round(h*MAX/w);w=MAX;} } else { if(h>MAX){w=Math.round(w*MAX/h);h=MAX;} }
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>{ fotoFile=blob; fotoBase64=canvas.toDataURL('image/jpeg',.72);
        document.getElementById('foto-preview').innerHTML=`<img src="${fotoBase64}" style="width:100%;height:100%;object-fit:cover">`;
        document.getElementById('hapus-foto-btn').style.display='inline-flex';
      },'image/jpeg',.72);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function hapusFoto(){
  fotoBase64=null; fotoFile=null;
  document.getElementById('foto-preview').innerHTML=svgIcon('person',28);
  document.getElementById('s-foto').value='';
  document.getElementById('hapus-foto-btn').style.display='none';
}
async function uploadFoto(santriId){
  if(!fotoFile) return null;
  // Upload ke Cloudinary — tidak ada fallback, error langsung dilempar ke caller
  const CLOUD='dfj1eutgf'; const PRESET='santri_foto';
  const form=new FormData();
  form.append('file',fotoFile); form.append('upload_preset',PRESET);
  form.append('folder','santri'); form.append('public_id',`santri_${santriId}_${Date.now()}`);
  const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,{method:'POST',body:form});
  if(!res.ok){
    const errBody = await res.text().catch(()=>'');
    throw new Error('Upload foto gagal (' + res.status + '): ' + errBody);
  }
  const r=await res.json();
  if(!r.secure_url) throw new Error('Upload foto gagal: URL tidak diterima dari Cloudinary');
  return r.secure_url.replace('/upload/','/upload/f_auto,q_auto,w_400/');
}

