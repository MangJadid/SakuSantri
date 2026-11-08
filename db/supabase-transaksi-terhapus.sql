-- Catatan transaksi yang dihapus: isi transaksi + siapa, kapan, dan alasannya.
-- Dipakai Saku Santri & Bendahara (catatTransaksiTerhapus di shared/server-data.js).
-- Jalankan sekali di Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists transaksi_terhapus (
  id bigserial primary key,
  transaksi_id bigint,
  santri_id bigint,
  santri_nama text,
  tanggal date,
  jenis text,
  nominal bigint,
  keterangan text,
  dicatat_oleh text,
  dibuat_pada timestamptz,
  dihapus_oleh text,
  dihapus_nama text,
  alasan text,
  dihapus_pada timestamptz not null default now()
);

create index if not exists idx_transaksi_terhapus_waktu on transaksi_terhapus (dihapus_pada desc);

-- Dari aplikasi catatan hanya bisa DITAMBAH dan DIBACA. Sengaja tidak ada aturan ubah/hapus,
-- jadi catatan tidak bisa diubah atau dihapus lewat aplikasi (jejak permanen).
alter table transaksi_terhapus enable row level security;
drop policy if exists "tambah_catatan" on transaksi_terhapus;
drop policy if exists "baca_catatan" on transaksi_terhapus;
create policy "tambah_catatan" on transaksi_terhapus for insert with check (true);
create policy "baca_catatan" on transaksi_terhapus for select using (true);
