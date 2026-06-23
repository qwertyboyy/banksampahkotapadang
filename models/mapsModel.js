import db from "../config/db.js";

class LokasiBankSampahModel {
  static async getAll(idKecamatan = null) {
    let query = `
      SELECT
        lbs.id,
        lbs.id_bank_sampah,
        lbs.id_kecamatan,
        lbs.nama_bank_sampah,
        lbs.alamat,
        lbs.latitude,
        lbs.longitude,
        lbs.nama_pengelola,
        lbs.no_telepon,
        lbs.status_aktif,
        lbs.created_at,
        lbs.updated_at,
        k.nama AS kecamatan
      FROM lokasi_bank_sampah lbs
      INNER JOIN kecamatan k
        ON lbs.id_kecamatan = k.id_kecamatan
      WHERE lbs.status_aktif = 1
    `;

    const params = [];

    if (idKecamatan) {
      query += ` AND lbs.id_kecamatan = ?`;
      params.push(idKecamatan);
    }

    query += ` ORDER BY lbs.nama_bank_sampah ASC`;

    const [rows] = await db.query(query, params);

    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `
      SELECT
        lbs.id,
        lbs.id_bank_sampah,
        lbs.id_kecamatan,
        lbs.nama_bank_sampah,
        lbs.alamat,
        lbs.latitude,
        lbs.longitude,
        lbs.nama_pengelola,
        lbs.no_telepon,
        lbs.status_aktif,
        lbs.created_at,
        lbs.updated_at,
        k.nama AS kecamatan
      FROM lokasi_bank_sampah lbs
      INNER JOIN kecamatan k
        ON lbs.id_kecamatan = k.id_kecamatan
      WHERE lbs.id = ?
      `,
      [id],
    );

    return rows[0];
  }
}

export default LokasiBankSampahModel;
