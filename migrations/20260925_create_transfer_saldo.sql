CREATE TABLE IF NOT EXISTS transfer_saldo (
  id_transfer BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_bank_sampah INT NOT NULL,
  id_pengirim BIGINT NOT NULL,
  id_penerima BIGINT NOT NULL,
  nominal DECIMAL(15,2) NOT NULL,
  status ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
  admin_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  INDEX idx_transfer_bank_status (id_bank_sampah, status),
  INDEX idx_transfer_pengirim (id_pengirim)
) ENGINE=InnoDB;
