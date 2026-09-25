CREATE TABLE IF NOT EXISTS konfigurasi_bank_sampah (
  id_bank_sampah INT NOT NULL,
  minimum_penarikan DECIMAL(15,2) NOT NULL DEFAULT 50000.00,
  penyesuaian_setoran_laporan DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bank_sampah),
  CONSTRAINT fk_konfigurasi_bank_sampah
    FOREIGN KEY (id_bank_sampah)
    REFERENCES bank_sampah (id_bank_sampah)
    ON DELETE CASCADE,
  CONSTRAINT chk_minimum_penarikan_nonnegatif
    CHECK (minimum_penarikan >= 0),
  CONSTRAINT chk_penyesuaian_setoran_nonnegatif
    CHECK (penyesuaian_setoran_laporan >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO konfigurasi_bank_sampah (id_bank_sampah, minimum_penarikan)
SELECT id_bank_sampah, 50000.00
FROM bank_sampah
ON DUPLICATE KEY UPDATE id_bank_sampah = VALUES(id_bank_sampah);

-- Ganti placeholder dengan ID tenant LH yang benar, lalu jalankan:
-- UPDATE konfigurasi_bank_sampah
-- SET penyesuaian_setoran_laporan = 480000.00
-- WHERE id_bank_sampah = <ID_BANK_SAMPAH_LH>;
