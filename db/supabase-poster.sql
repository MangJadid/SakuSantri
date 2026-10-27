-- Poster & Info (slider beranda Saku Santri & Bendahara)
-- Jalankan sekali di Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists poster_kategori (
  id bigserial primary key,
  nama text not null unique,
  created_at timestamptz default now()
);

create table if not exists poster (
  id bigserial primary key,
  judul text not null,
  gambar_url text not null,
  kategori_id bigint references poster_kategori(id) on delete set null,
  tampil_sampai date,
  dibuat_oleh text,
  dibuat_oleh_nama text,
  created_at timestamptz default now()
);

create index if not exists idx_poster_created_at on poster (created_at desc);

-- Sama seperti tabel lain di app ini: akses lewat anon key
alter table poster_kategori enable row level security;
alter table poster enable row level security;
create policy "allow_all" on poster_kategori for all using (true) with check (true);
create policy "allow_all" on poster for all using (true) with check (true);
