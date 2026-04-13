import db from "../config/db.js";

export const PengepulModel = {
  async create(data) {
    const query = `
      INSERT INTO pengepul 
      (id_bank_sampah, nama_pengepul, kontak, alamat)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      data.id_bank_sampah,
      data.nama_pengepul,
      data.kontak,
      data.alamat,
    ]);

    return result.insertId;
  },

  async findAll(id_bank_sampah) {
    const [rows] = await db.execute(
      `SELECT * FROM pengepul WHERE id_bank_sampah = ? ORDER BY id_pengepul DESC`,
      [id_bank_sampah],
    );
    return rows;
  },

  async findById(id, id_bank_sampah) {
    const [rows] = await db.execute(
      `SELECT * FROM pengepul WHERE id_pengepul = ? AND id_bank_sampah = ?`,
      [id, id_bank_sampah],
    );
    return rows[0];
  },

  async update(id, id_bank_sampah, data) {
    const query = `
      UPDATE pengepul 
      SET nama_pengepul = ?, kontak = ?, alamat = ?
      WHERE id_pengepul = ? AND id_bank_sampah = ?
    `;

    const [result] = await db.execute(query, [
      data.nama_pengepul,
      data.kontak,
      data.alamat,
      id,
      id_bank_sampah,
    ]);

    return result;
  },

  async delete(id, id_bank_sampah) {
    const [result] = await db.execute(
      `DELETE FROM pengepul WHERE id_pengepul = ? AND id_bank_sampah = ?`,
      [id, id_bank_sampah],
    );

    return result;
  },
};
