-- Skema MySQL untuk migrasi dari Supabase (Postgres)
-- Jalankan file ini di phpMyAdmin / mysql client pada database kosong (mis. `annur_db`)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ================= settings =================
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= asrama =================
CREATE TABLE IF NOT EXISTS asrama (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL UNIQUE,
  keterangan TEXT,
  jenis_kelamin VARCHAR(20) DEFAULT 'putera',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= kobong =================
CREATE TABLE IF NOT EXISTS kobong (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL UNIQUE,
  asrama_id BIGINT,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kobong_asrama (asrama_id),
  CONSTRAINT fk_kobong_asrama FOREIGN KEY (asrama_id) REFERENCES asrama(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= santri =================
CREATE TABLE IF NOT EXISTS santri (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255),
  kobong_id BIGINT,
  pin VARCHAR(20) DEFAULT '1234',
  saldo BIGINT DEFAULT 0,
  kelas VARCHAR(100),
  catatan TEXT,
  foto_url TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  no_wa VARCHAR(30),
  kecamatan VARCHAR(255),
  kota VARCHAR(255),
  dapur_id VARCHAR(100),
  jenis_kelamin VARCHAR(20) DEFAULT 'putera',
  nisn VARCHAR(30),
  is_arsip TINYINT(1) DEFAULT 0,
  tgl_keluar DATE,
  catatan_keluar TEXT,
  bulan_mulai_tagihan VARCHAR(50),
  KEY idx_santri_kobong (kobong_id),
  CONSTRAINT fk_santri_kobong FOREIGN KEY (kobong_id) REFERENCES kobong(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= transaksi =================
CREATE TABLE IF NOT EXISTS transaksi (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT,
  tanggal DATE,
  jenis VARCHAR(20),
  keterangan TEXT,
  nominal BIGINT,
  oleh VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_transaksi_santri (santri_id),
  CONSTRAINT fk_transaksi_santri FOREIGN KEY (santri_id) REFERENCES santri(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= tagihan_pondok =================
CREATE TABLE IF NOT EXISTS tagihan_pondok (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT,
  santri_nama VARCHAR(255),
  dapur_id VARCHAR(100),
  bulan VARCHAR(50) NOT NULL,
  nominal_makan INT DEFAULT 0,
  nominal_listrik INT DEFAULT 0,
  nominal INT NOT NULL,
  nominal_bayar INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'belum',
  tgl_tagihan DATE,
  tgl_bayar DATE,
  keterangan TEXT,
  dicatat_oleh VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rincian JSON,
  jenis_id BIGINT,
  jenis_nama VARCHAR(255),
  KEY idx_tagihan_santri (santri_id),
  CONSTRAINT fk_tagihan_santri FOREIGN KEY (santri_id) REFERENCES santri(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= santri_deposit =================
CREATE TABLE IF NOT EXISTS santri_deposit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT NOT NULL UNIQUE,
  saldo INT DEFAULT 0,
  tgl_terakhir DATE,
  keterangan TEXT,
  dicatat_oleh VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deposit_santri FOREIGN KEY (santri_id) REFERENCES santri(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= pengurus =================
CREATE TABLE IF NOT EXISTS pengurus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  kobong_ids TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role VARCHAR(30) DEFAULT 'pengurus',
  asrama_ids TEXT DEFAULT '[]',
  no_wa VARCHAR(30),
  foto_url TEXT,
  force_logout TINYINT(1) DEFAULT 0,
  is_blocked TINYINT(1) DEFAULT 0,
  auth_id VARCHAR(64),
  akses_tab TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= bendahara_users =================
CREATE TABLE IF NOT EXISTS bendahara_users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  nama_tampilan VARCHAR(255),
  foto_url TEXT,
  role VARCHAR(30) DEFAULT 'pengelola',
  dapur_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  no_wa VARCHAR(30),
  force_logout TINYINT(1) DEFAULT 0,
  is_blocked TINYINT(1) DEFAULT 0,
  akses_fitur TEXT,
  auth_id VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= bendahara_akses =================
CREATE TABLE IF NOT EXISTS bendahara_akses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bendahara_id BIGINT,
  asrama_id BIGINT,
  asrama_nama VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_bendahara_asrama (bendahara_id, asrama_id),
  CONSTRAINT fk_akses_bendahara FOREIGN KEY (bendahara_id) REFERENCES bendahara_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= piutang_alumni =================
CREATE TABLE IF NOT EXISTS piutang_alumni (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT,
  nama_santri VARCHAR(255),
  kobong_nama VARCHAR(255),
  kelas VARCHAR(100),
  total_piutang DECIMAL(15,2) DEFAULT 0,
  status_piutang VARCHAR(20) DEFAULT 'belum',
  tgl_keluar DATE,
  tgl_lunas DATE,
  catatan TEXT,
  catatan_lunas TEXT,
  no_wa VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rincian JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= tf_admin =================
CREATE TABLE IF NOT EXISTS tf_admin (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT,
  nama_santri VARCHAR(255),
  bulan TEXT,
  total_tf BIGINT,
  uang_makan BIGINT,
  listrik BIGINT,
  spp_mts BIGINT,
  spp_ma BIGINT,
  spp BIGINT,
  uang_jajan BIGINT,
  dll TEXT,
  sisa BIGINT,
  catatan TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= konfigurasi_tagihan_asrama =================
CREATE TABLE IF NOT EXISTS konfigurasi_tagihan_asrama (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  asrama_id BIGINT,
  jenis VARCHAR(100) NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_konfigurasi_asrama FOREIGN KEY (asrama_id) REFERENCES asrama(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= login_sessions =================
CREATE TABLE IF NOT EXISTS login_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  pengurus_id VARCHAR(50),
  pengurus_username VARCHAR(100),
  pengurus_nama VARCHAR(255),
  pengurus_role VARCHAR(30),
  device_name VARCHAR(255),
  user_agent TEXT,
  is_online TINYINT(1) DEFAULT 1,
  revoked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_login_sessions_pengurus (pengurus_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= bendahara_activity =================
CREATE TABLE IF NOT EXISTS bendahara_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  nama VARCHAR(255),
  role VARCHAR(30),
  device VARCHAR(255),
  ip VARCHAR(64),
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= permintaan_perubahan_santri =================
CREATE TABLE IF NOT EXISTS permintaan_perubahan_santri (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT NOT NULL,
  santri_nama VARCHAR(255),
  asrama_id BIGINT,
  jenis VARCHAR(20) DEFAULT 'hapus',
  data_lama JSON,
  data_baru JSON,
  diajukan_oleh VARCHAR(100),
  diajukan_nama VARCHAR(255),
  alasan TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  diproses_oleh VARCHAR(100),
  diproses_nama VARCHAR(255),
  catatan_admin TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= riwayat_perubahan_santri =================
CREATE TABLE IF NOT EXISTS riwayat_perubahan_santri (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  santri_id BIGINT NOT NULL,
  santri_nama VARCHAR(255),
  asrama_id BIGINT,
  jenis VARCHAR(20) NOT NULL,
  data_lama JSON,
  data_baru JSON,
  diubah_oleh VARCHAR(100),
  diubah_nama VARCHAR(255),
  sumber VARCHAR(20) DEFAULT 'langsung',
  permintaan_id BIGINT,
  diajukan_oleh VARCHAR(100),
  diajukan_nama VARCHAR(255),
  alasan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= push_subscriptions =================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  pengurus_id VARCHAR(50),
  username VARCHAR(100) UNIQUE,
  subscription JSON,
  app_source VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= push_notifications =================
CREATE TABLE IF NOT EXISTS push_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255),
  pesan TEXT,
  tipe VARCHAR(50),
  target_username VARCHAR(100),
  dikirim_oleh VARCHAR(100),
  app_source VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
