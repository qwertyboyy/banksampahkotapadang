import db from "../config/db.js";

const getAll = async (
  id_bank_sampah,
  { startDate, endDate, search, id_kategori_pengeluaran },
) => {
  let query = `
    SELECT
      p.id_pengeluaran,
      p.id_kategori_pengeluaran,
      kp.nama_kategori,
      p.tanggal,
      p.keterangan,
      p.nominal,
      p.created_at,
      p.updated_at
    FROM pengeluaran_bank_sampah p
    INNER JOIN kategori_pengeluaran kp
      ON p.id_kategori_pengeluaran = kp.id_kategori_pengeluaran
    WHERE p.id_bank_sampah = ?
  `;

  const params = [id_bank_sampah];

  if (startDate && endDate) {
    query += ` AND p.tanggal BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  if (id_kategori_pengeluaran) {
    query += ` AND p.id_kategori_pengeluaran = ?`;
    params.push(id_kategori_pengeluaran);
  }

  if (search) {
    query += `
      AND (
        p.keterangan LIKE ?
        OR kp.nama_kategori LIKE ?
      )
    `;

    const keyword = `%${search}%`;
    params.push(keyword, keyword);
  }

  query += `
    ORDER BY p.tanggal DESC, p.id_pengeluaran DESC
  `;

  const [rows] = await db.query(query, params);

  return rows;
};

const getById = async (id_pengeluaran, id_bank_sampah) => {
  const [rows] = await db.query(
    `
    SELECT
      p.id_pengeluaran,
      p.id_kategori_pengeluaran,
      kp.nama_kategori,
      p.tanggal,
      p.keterangan,
      p.nominal,
      p.created_at,
      p.updated_at
    FROM pengeluaran_bank_sampah p
    INNER JOIN kategori_pengeluaran kp
      ON p.id_kategori_pengeluaran = kp.id_kategori_pengeluaran
    WHERE p.id_pengeluaran = ?
      AND p.id_bank_sampah = ?
    LIMIT 1
    `,
    [id_pengeluaran, id_bank_sampah],
  );

  return rows[0];
};

const create = async ({
  id_bank_sampah,
  id_kategori_pengeluaran,
  tanggal,
  keterangan,
  nominal,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO pengeluaran_bank_sampah (
      id_bank_sampah,
      id_kategori_pengeluaran,
      tanggal,
      keterangan,
      nominal
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [id_bank_sampah, id_kategori_pengeluaran, tanggal, keterangan, nominal],
  );

  return result.insertId;
};

const update = async (
  id_pengeluaran,
  id_bank_sampah,
  { id_kategori_pengeluaran, tanggal, keterangan, nominal },
) => {
  const [result] = await db.query(
    `
    UPDATE pengeluaran_bank_sampah
    SET
      id_kategori_pengeluaran = ?,
      tanggal = ?,
      keterangan = ?,
      nominal = ?
    WHERE id_pengeluaran = ?
      AND id_bank_sampah = ?
    `,
    [
      id_kategori_pengeluaran,
      tanggal,
      keterangan,
      nominal,
      id_pengeluaran,
      id_bank_sampah,
    ],
  );

  return result.affectedRows;
};

const remove = async (id_pengeluaran, id_bank_sampah) => {
  const [result] = await db.query(
    `
    DELETE FROM pengeluaran_bank_sampah
    WHERE id_pengeluaran = ?
      AND id_bank_sampah = ?
    `,
    [id_pengeluaran, id_bank_sampah],
  );

  return result.affectedRows;
};

const getKategori = async (id_bank_sampah) => {
  const [rows] = await db.query(
    `
    SELECT
      id_kategori_pengeluaran,
      nama_kategori
    FROM kategori_pengeluaran
    WHERE id_bank_sampah = ?
    ORDER BY nama_kategori ASC
    `,
    [id_bank_sampah],
  );

  return rows;
};

const validateKategori = async (id_kategori_pengeluaran, id_bank_sampah) => {
  const [rows] = await db.query(
    `
    SELECT id_kategori_pengeluaran
    FROM kategori_pengeluaran
    WHERE id_kategori_pengeluaran = ?
      AND id_bank_sampah = ?
    LIMIT 1
    `,
    [id_kategori_pengeluaran, id_bank_sampah],
  );

  return rows.length > 0;
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getKategori,
  validateKategori,
};
