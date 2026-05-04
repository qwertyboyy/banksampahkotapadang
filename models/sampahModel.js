import db from "../config/db.js";

export const getAllJenis = async ({
  id_bank_sampah,
  search,
  limit,
  offset,
}) => {
  const [rows] = await db.query(
    `SELECT js.*, k.nama_kategori
     FROM jenis_sampah_bank js
     JOIN master_kategori_sampah k ON js.id_kategori = k.id_kategori
     WHERE js.status_aktif = 1 and js.id_bank_sampah = ?
     AND js.nama_jenis LIKE ?
     ORDER BY js.created_at DESC
     LIMIT ? OFFSET ?`,
    [id_bank_sampah, `%${search}%`, limit, offset],
  );

  const [count] = await db.query(
    `SELECT COUNT(*) as total
     FROM jenis_sampah_bank
     WHERE status_aktif = 1 AND id_bank_sampah = ?
     AND nama_jenis LIKE ?`,
    [id_bank_sampah, `%${search}%`],
  );

  return { rows, total: count[0].total };
};

export const createJenis = async (data) => {
  const { id_bank_sampah, id_kategori, nama_jenis, harga_per_kg } = data;

  return db.query(
    `INSERT INTO jenis_sampah_bank
    (id_bank_sampah, id_kategori, nama_jenis, harga_per_kg, status_aktif)
    VALUES (?, ?, ?, ?, 1)`,
    [id_bank_sampah, id_kategori, nama_jenis, harga_per_kg],
  );
};

export const updateJenis = async (id, data) => {
  const { id_kategori, nama_jenis, harga_per_kg, status_aktif } = data;

  return db.query(
    `UPDATE jenis_sampah_bank
     SET id_kategori = ?, nama_jenis = ?, harga_per_kg = ?, status_aktif = ?
     WHERE id_jenis_sampah = ?`,
    [id_kategori, nama_jenis, harga_per_kg, status_aktif, id],
  );
};

// SOFT DELETE
export const deleteJenis = async (id) => {
  return db.query(
    `UPDATE jenis_sampah_bank
     SET status_aktif = 0
     WHERE id_jenis_sampah = ?`,
    [id],
  );
};

export const getAllKategori = async () => {
  return db.query(
    `SELECT * FROM master_kategori_sampah WHERE status_aktif = 1`,
  );
};

export const getJenisSelect = async (id_bank_sampah, keyword = "") => {
  let query = `
    SELECT 
      id_jenis_sampah,
      nama_jenis,
      harga_per_kg
    FROM jenis_sampah_bank
    WHERE status_aktif = 1
    AND id_bank_sampah = ?
  `;

  let params = [id_bank_sampah];

  if (keyword) {
    query += ` AND nama_jenis LIKE ?`;
    params.push(`%${keyword}%`);
  }

  query += ` ORDER BY nama_jenis ASC LIMIT 20`;

  const [rows] = await db.query(query, params);
  return rows;
};
