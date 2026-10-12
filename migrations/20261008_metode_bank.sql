ALTER TABLE bank_sampah
  ADD COLUMN metode_saldo ENUM('rupiah', 'poin') NOT NULL DEFAULT 'rupiah';

ALTER TABLE jenis_sampah_bank
  ADD COLUMN poin_per_kg DECIMAL(15,2) NOT NULL DEFAULT 0;

ALTER TABLE mutasi_saldo
  MODIFY COLUMN tipe ENUM('SETOR','TARIK','KOREKSI','TRANSFER_MASUK','TRANSFER_KELUAR','PENUKARAN') NOT NULL;

CREATE TABLE IF NOT EXISTS etalase_sembako (
  id_barang INT AUTO_INCREMENT PRIMARY KEY,
  id_bank_sampah INT NOT NULL,
  nama_barang VARCHAR(120) NOT NULL,
  satuan VARCHAR(40) NOT NULL,
  harga DECIMAL(15,2) NOT NULL,
  stok INT UNSIGNED NOT NULL DEFAULT 0,
  status_aktif TINYINT NOT NULL DEFAULT 1,
  INDEX (id_bank_sampah, status_aktif)
);

CREATE TABLE IF NOT EXISTS penukaran_sembako (
  id_penukaran INT AUTO_INCREMENT PRIMARY KEY,
  id_bank_sampah INT NOT NULL,
  id_nasabah INT NOT NULL,
  id_barang INT NOT NULL,
  nama_barang VARCHAR(120) NOT NULL,
  satuan VARCHAR(40) NOT NULL,
  jumlah INT UNSIGNED NOT NULL,
  harga_satuan DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  metode_saldo ENUM('rupiah','poin') NOT NULL,
  request_key VARCHAR(80) NOT NULL,
  admin_id INT NULL,
  status ENUM('MENUNGGU','DISERAHKAN') NOT NULL DEFAULT 'MENUNGGU',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diserahkan_at TIMESTAMP NULL,
  UNIQUE KEY penukaran_request (id_bank_sampah, id_nasabah, request_key),
  INDEX (id_bank_sampah, created_at)
);
