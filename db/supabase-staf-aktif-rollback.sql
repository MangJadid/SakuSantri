-- PEMBATALAN Tahap 2 (staf aktif): kembali persis ke aturan sebelumnya
-- ("siapa pun yang login boleh"). Jalankan hanya kalau setelah Tahap 2 ada staf yang tidak bisa bekerja.
begin;

drop policy if exists "select_staf_aktif" on pengurus;
drop policy if exists "insert_staf_aktif" on pengurus;
drop policy if exists "update_staf_aktif" on pengurus;
drop policy if exists "delete_staf_aktif" on pengurus;
create policy "select_authenticated" on pengurus for select to authenticated using (true);
create policy "insert_authenticated" on pengurus for insert to authenticated with check (true);
create policy "update_authenticated" on pengurus for update to authenticated using (true);
create policy "delete_authenticated" on pengurus for delete to authenticated using (true);

drop policy if exists "select_staf_aktif" on bendahara_users;
drop policy if exists "insert_staf_aktif" on bendahara_users;
drop policy if exists "update_staf_aktif" on bendahara_users;
drop policy if exists "delete_staf_aktif" on bendahara_users;
create policy "select_authenticated" on bendahara_users for select to authenticated using (true);
create policy "insert_authenticated" on bendahara_users for insert to authenticated with check (true);
create policy "update_authenticated" on bendahara_users for update to authenticated using (true);
create policy "delete_authenticated" on bendahara_users for delete to authenticated using (true);

drop policy if exists "select_secrets_staf_aktif" on settings;
drop policy if exists "insert_staf_aktif" on settings;
drop policy if exists "update_staf_aktif" on settings;
create policy "select_secrets_authenticated" on settings for select to authenticated using (true);
create policy "insert_authenticated" on settings for insert to authenticated with check (true);
create policy "update_authenticated" on settings for update to authenticated using (true);

drop function if exists public.staf_aktif();

commit;
