import db from "../config/db.js";

class BankSampah {
  static async getAll(page, limit, search) {
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `
    SELECT 
  bs.id_bank_sampah,
  bs.kode_bank_sampah,
  bs.nama_bank_sampah,
  bs.no_telepon,
  kl.nama_kelurahan,
  kc.nama,
  (
    SELECT COUNT(*) 
    FROM nasabah n 
    WHERE n.id_bank_sampah = bs.id_bank_sampah
  ) AS jumlah_nasabah

FROM bank_sampah bs

JOIN kelurahan kl 
  ON bs.id_kelurahan = kl.id_kelurahan

JOIN kecamatan kc 
  ON kl.id_kecamatan = kc.id_kecamatan

WHERE 
  bs.nama_bank_sampah LIKE ?
  OR bs.kode_bank_sampah LIKE ?
  OR kl.nama_kelurahan LIKE ?

ORDER BY bs.id_bank_sampah DESC

LIMIT ? OFFSET ?
    `,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset],
    );

    const [count] = await db.query(
      `
    SELECT COUNT(*) as total
    FROM bank_sampah bs
    JOIN kelurahan kl 
      ON bs.id_kelurahan = kl.id_kelurahan
    WHERE 
      bs.nama_bank_sampah LIKE ?
      OR bs.kode_bank_sampah LIKE ?
      OR kl.nama_kelurahan LIKE ?
    `,
      [`%${search}%`, `%${search}%`, `%${search}%`],
    );

    return {
      data: rows,
      total: count[0].total,
    };
  }

  static async create(data) {
    const {
      kode_bank_sampah,
      no_urut_bank,
      nama_bank_sampah,
      id_kelurahan,
      alamat,
      no_telepon,
    } = data;

    const [result] = await db.query(
      `
    INSERT INTO bank_sampah 
    (kode_bank_sampah, no_urut_bank, nama_bank_sampah, id_kelurahan, alamat, no_telepon)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        kode_bank_sampah,
        no_urut_bank,
        nama_bank_sampah,
        id_kelurahan,
        alamat,
        no_telepon,
      ],
    );

    return result.insertId;
  }

  static async update(id, data) {
    const { nama_bank_sampah, id_kelurahan, alamat, no_telepon } = data;

    await db.query(
      `
      UPDATE bank_sampah
      SET nama_bank_sampah=?, id_kelurahan=?, alamat=?, no_telepon=?
      WHERE id_bank_sampah=?
    `,
      [nama_bank_sampah, id_kelurahan, alamat, no_telepon, id],
    );
  }

  static async delete(id) {
    await db.query(
      `
      DELETE FROM bank_sampah
      WHERE id_bank_sampah=?
    `,
      [id],
    );
  }

  static async getLastUrutan() {
    const [rows] = await db.query(`
    SELECT MAX(no_urut_bank) AS last_no
    FROM bank_sampah
  `);

    return rows[0].last_no;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `
    SELECT 
      bs.nama_bank_sampah,
      bs.alamat,
      bs.no_telepon,
      kl.nama_kelurahan,
      kc.nama AS nama_kecamatan
    FROM bank_sampah bs
    JOIN kelurahan kl 
      ON bs.id_kelurahan = kl.id_kelurahan
    JOIN kecamatan kc 
      ON kl.id_kecamatan = kc.id_kecamatan
    WHERE bs.id_bank_sampah = ?
    `,
      [id],
    );

    return rows[0];
  }

  static async getByIdFull(id) {
    const [rows] = await db.query(
      `
    SELECT 
      id_bank_sampah,
      nama_bank_sampah,
      alamat,
      no_telepon,
      logo_path
    FROM bank_sampah
    WHERE id_bank_sampah = ?
    `,
      [id],
    );

    return rows[0];
  }

  static async updateProfile(id, data) {
    const { nama_bank_sampah, alamat, no_telepon, logo_path } = data;

    let query = `
    UPDATE bank_sampah
    SET nama_bank_sampah=?, alamat=?, no_telepon=?
  `;

    let params = [nama_bank_sampah, alamat, no_telepon];

    if (logo_path) {
      query += `, logo_path=?`;
      params.push(logo_path);
    }

    query += ` WHERE id_bank_sampah=?`;
    params.push(id);

    await db.query(query, params);
  }
}

export default BankSampah;
