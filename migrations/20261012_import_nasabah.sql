CREATE TABLE IF NOT EXISTS impor_nasabah (
  id_impor char(36) NOT NULL PRIMARY KEY,
  id_bank_sampah int NOT NULL,
  admin_id int NOT NULL,
  file_hash char(64) NOT NULL,
  nama_file varchar(255) NOT NULL,
  tanggal_awal date NOT NULL,
  jumlah_nasabah int NOT NULL,
  total_saldo decimal(15,2) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_impor_bank_file (id_bank_sampah, file_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS impor_nasabah_detail (
  id_impor char(36) NOT NULL,
  baris_excel int NOT NULL,
  id_nasabah bigint NOT NULL,
  saldo_awal decimal(15,2) NOT NULL,
  PRIMARY KEY (id_impor, baris_excel),
  UNIQUE KEY uq_impor_nasabah (id_nasabah),
  CONSTRAINT fk_impor_detail_batch FOREIGN KEY (id_impor) REFERENCES impor_nasabah(id_impor),
  CONSTRAINT fk_impor_detail_nasabah FOREIGN KEY (id_nasabah) REFERENCES nasabah(id_nasabah)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
