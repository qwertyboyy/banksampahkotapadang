import db from "../config/db.js";

class Wilayah {
  static async getKecamatan() {
    const [rows] = await db.query(`
      SELECT
        id_kecamatan,
        nama
      FROM kecamatan
      ORDER BY id_kecamatan
    `);

    return rows;
  }

  static async getKelurahanByKecamatan(id_kecamatan) {
    const [rows] = await db.query(
      `
      SELECT
        id_kelurahan,
        nama_kelurahan
      FROM kelurahan
      WHERE id_kecamatan = ?
      ORDER BY nama_kelurahan
    `,
      [id_kecamatan],
    );

    return rows;
  }
}

export default Wilayah;
