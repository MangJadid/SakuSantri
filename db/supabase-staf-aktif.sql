-- Temuan audit No. 1 (Tahap 2): tabel pengurus, bendahara_users, dan data rahasia di settings
-- hanya untuk STAF AKTIF, bukan sembarang akun yang login ke Supabase.
-- Staf aktif = alamat login <username>@annur.internal cocok dengan pengurus atau bendahara_users
-- yang TIDAK diblokir, atau dengan username Kang Admin (settings.super_user).
-- Pembatalan: db/supabase-staf-aktif-rollback.sql
begin;

create or replace function public.staf_aktif()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.email() is not null and (
    exists (select 1 from pengurus
            where lower(username) || '@annur.internal' = lower(auth.email())
              and coalesce(is_blocked, false) = false)
    or exists (select 1 from bendahara_users
               where lower(username) || '@annur.internal' = lower(auth.email())
                 and coalesce(is_blocked, false) = false)
    or exists (select 1 from settings
               where key = 'super_user'
                 and lower(value) || '@annur.internal' = lower(auth.email()))
  );
$$;
revoke all on function public.staf_aktif() from public;
grant execute on function public.staf_aktif() to authenticated;

-- pengurus
drop policy if exists "select_authenticated" on pengurus;
drop policy if exists "insert_authenticated" on pengurus;
drop policy if exists "update_authenticated" on pengurus;
drop policy if exists "delete_authenticated" on pengurus;
create policy "select_staf_aktif" on pengurus for select to authenticated using (public.staf_aktif());
create policy "insert_staf_aktif" on pengurus for insert to authenticated with check (public.staf_aktif());
create policy "update_staf_aktif" on pengurus for update to authenticated using (public.staf_aktif()) with check (public.staf_aktif());
create policy "delete_staf_aktif" on pengurus for delete to authenticated using (public.staf_aktif());

-- bendahara_users
drop policy if exists "select_authenticated" on bendahara_users;
drop policy if exists "insert_authenticated" on bendahara_users;
drop policy if exists "update_authenticated" on bendahara_users;
drop policy if exists "delete_authenticated" on bendahara_users;
create policy "select_staf_aktif" on bendahara_users for select to authenticated using (public.staf_aktif());
create policy "insert_staf_aktif" on bendahara_users for insert to authenticated with check (public.staf_aktif());
create policy "update_staf_aktif" on bendahara_users for update to authenticated using (public.staf_aktif()) with check (public.staf_aktif());
create policy "delete_staf_aktif" on bendahara_users for delete to authenticated using (public.staf_aktif());

-- settings: pengaturan umum tetap terbaca semua orang (select_public_settings tidak diubah)
drop policy if exists "select_secrets_authenticated" on settings;
drop policy if exists "insert_authenticated" on settings;
drop policy if exists "update_authenticated" on settings;
create policy "select_secrets_staf_aktif" on settings for select to authenticated using (public.staf_aktif());
create policy "insert_staf_aktif" on settings for insert to authenticated with check (public.staf_aktif());
create policy "update_staf_aktif" on settings for update to authenticated using (public.staf_aktif()) with check (public.staf_aktif());

commit;
