import db from "../config/db.js";

export async function getKonfigurasiBankSampah(id_bank_sampah, connection = db) {
  const [rows] = await connection.query(
    `SELECT minimum_penarikan, penyesuaian_setoran_laporan
     FROM konfigurasi_bank_sampah
     WHERE id_bank_sampah = ?
     LIMIT 1`,
    [id_bank_sampah],
  );

  if (!rows.length) {
    throw new Error("Konfigurasi bank sampah belum tersedia");
  }

  return {
    minimum_penarikan: Number(rows[0].minimum_penarikan),
    penyesuaian_setoran_laporan: Number(
      rows[0].penyesuaian_setoran_laporan,
    ),
  };
}
