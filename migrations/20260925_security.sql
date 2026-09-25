ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE verification_tokens MODIFY token VARCHAR(64) NOT NULL;
CREATE TABLE IF NOT EXISTS security_rate_limits (
 bucket_key CHAR(64) PRIMARY KEY, attempts INT UNSIGNED NOT NULL, expires_at DATETIME NOT NULL,
 INDEX (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS security_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, id_user BIGINT NULL, id_bank_sampah INT NULL,
 method VARCHAR(10) NOT NULL, path VARCHAR(255) NOT NULL, status_code INT NOT NULL,
 ip_hash CHAR(64) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX (created_at)
) ENGINE=InnoDB;
ALTER TABLE transfer_saldo ADD COLUMN request_key VARCHAR(100) NULL,
 ADD COLUMN rejection_reason VARCHAR(500) NULL,
 ADD UNIQUE KEY unique_sender_request (id_pengirim, request_key);
