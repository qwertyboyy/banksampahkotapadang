CREATE TABLE IF NOT EXISTS kontainer_tindak_lanjut (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kontainer INT UNSIGNED NOT NULL,
  id_pemohon BIGINT NOT NULL,
  status ENUM('menunggu','diproses','selesai') NOT NULL DEFAULT 'menunggu',
  catatan VARCHAR(2000) NULL,
  catatan_admin VARCHAR(2000) NULL,
  updated_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  open_unit INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status IN ('menunggu','diproses') THEN id_kontainer ELSE NULL END) STORED,
  UNIQUE KEY one_open_request (open_unit),
  INDEX request_queue (status, created_at),
  FOREIGN KEY (id_kontainer) REFERENCES kontainer(id)
);
