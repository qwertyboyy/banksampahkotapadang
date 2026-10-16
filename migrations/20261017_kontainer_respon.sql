ALTER TABLE kontainer_tindak_lanjut ADD COLUMN respon_truk ENUM('diangkut','dibersihkan') NULL;
ALTER TABLE kontainer_konfirmasi ADD COLUMN respon_truk ENUM('diangkut','dibersihkan') NULL;
ALTER TABLE monitoring_kontainer MODIFY COLUMN kondisi ENUM('kosong','sebagian','penuh','berserakan','rusak','bersih') NOT NULL;
ALTER TABLE kontainer_konfirmasi MODIFY COLUMN kondisi_setelah ENUM('kosong','sebagian','bersih') NULL;
