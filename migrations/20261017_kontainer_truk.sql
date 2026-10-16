ALTER TABLE monitoring_kontainer MODIFY COLUMN kondisi ENUM('kosong','sebagian','penuh','berserakan','rusak','bersih') NOT NULL;
ALTER TABLE kontainer_tindak_lanjut ADD COLUMN jenis_laporan ENUM('penuh','berserakan') NULL;
ALTER TABLE kontainer_tindak_lanjut ADD COLUMN nama_petugas_truk VARCHAR(120) NULL;
ALTER TABLE kontainer_tindak_lanjut ADD COLUMN dikonfirmasi_at DATETIME NULL;
CREATE TABLE IF NOT EXISTS kontainer_konfirmasi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_tindak_lanjut BIGINT UNSIGNED NOT NULL,
  id_user BIGINT NOT NULL,
  nama_petugas VARCHAR(120) NOT NULL,
  status ENUM('diproses','selesai') NOT NULL,
  catatan VARCHAR(2000) NULL,
  kondisi_setelah ENUM('kosong','sebagian') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX confirmation_history (id_tindak_lanjut,id),
  FOREIGN KEY (id_tindak_lanjut) REFERENCES kontainer_tindak_lanjut(id)
);
