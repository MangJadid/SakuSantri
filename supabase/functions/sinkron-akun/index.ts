// Edge Function "sinkron-akun" -- menyamakan akun login Supabase staf dengan password di app.
// Dipanggil app saat password app BENAR tapi login Supabase gagal (akun belum ada, atau password
// baru direset Kang Admin di app). Password dicek dulu dengan fungsi login yang sama dengan app;
// tanpa password yang benar tidak ada yang diubah. Pasang: Supabase -> Edge Functions -> Deploy a
// new function -> Via Editor -> nama "sinkron-akun" -> tempel file ini -> Deploy.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': 'https://mangjadid.my.id',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// jenis akun -> fungsi pengecek password yang sudah dipakai app
const CEK = { pengurus: 'login_pengurus_check', super: 'login_super_check', bendahara: 'login_bendahara_check' };

const balas = (isi: unknown, status = 200) =>
  new Response(JSON.stringify(isi), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { jenis, username, password } = await req.json();
    const fungsiCek = CEK[jenis as keyof typeof CEK];
    if (!fungsiCek || !username || !password) return balas({ error: 'Permintaan tidak lengkap' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } });

    const { data: cocok, error: eCek } = await admin.rpc(fungsiCek, { p_username: username, p_password: password });
    if (eCek || !cocok || cocok.is_blocked) return balas({ error: 'Username atau password salah' }, 401);

    const email = String(username).trim().toLowerCase() + '@annur.internal';
    const { error: eBuat } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (eBuat) {
      // Akun sudah ada -> samakan passwordnya.
      // shortcut: hanya halaman pertama (1000 akun), cukup untuk pondok; tambah paging kalau staf > 1000
      const { data, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (eList) throw eList;
      const akun = data.users.find((u) => u.email === email);
      if (!akun) throw eBuat;
      const { error: eUbah } = await admin.auth.admin.updateUserById(akun.id, { password });
      if (eUbah) throw eUbah;
    }
    return balas({ ok: true });
  } catch (e) {
    return balas({ error: String((e as Error)?.message || e) }, 500);
  }
});
