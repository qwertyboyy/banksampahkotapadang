import db from "../config/db.js";

export const getMutasi = async ({
  id_bank_sampah,
  start_date,
  end_date,
  keyword,
  last_id,
  limit,
}) => {
  if (!id_bank_sampah) {
    throw new Error("id_bank_sampah tidak valid");
  }

  const safeLimit = Number(limit);
  const finalLimit =
    !isNaN(safeLimit) && safeLimit > 0 && safeLimit <= 100 ? safeLimit : 20;

  const safeLastId = Number(last_id);

  let query = `
    SELECT 
      m.id_mutasi,
      m.tipe,
      m.jumlah,
      m.saldo_sebelum,
      m.saldo_sesudah,
      m.created_at,
      n.nomor_rekening,
      n.nama_nasabah
    FROM mutasi_saldo m
    JOIN nasabah n 
      ON m.id_nasabah = n.id_nasabah
    WHERE m.id_bank_sampah = ?
      AND n.id_bank_sampah = ?
  `;

  const params = [id_bank_sampah, id_bank_sampah];

  if (start_date && end_date) {
    query += ` AND m.created_at BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ` AND m.created_at >= ?`;
    params.push(start_date);
  } else if (end_date) {
    query += ` AND m.created_at <= ?`;
    params.push(end_date);
  }

  if (keyword && keyword.trim() !== "") {
    query += `
      AND (
        n.nama_nasabah LIKE ?
        OR n.nomor_rekening LIKE ?
      )
    `;
    params.push(`%${keyword.trim()}%`, `%${keyword.trim()}%`);
  }

  if (!isNaN(safeLastId) && safeLastId > 0) {
    query += ` AND m.id_mutasi < ?`;
    params.push(safeLastId);
  }

  query += ` ORDER BY m.id_mutasi DESC LIMIT ${finalLimit}`;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const insertMutasi = async ({
  conn,
  id_bank_sampah,
  id_nasabah,
  tipe,
  jumlah,
  referensi_id,
  referensi_tabel,
}) => {
  const [rows] = await conn.execute(
    `SELECT saldo FROM nasabah WHERE id_nasabah = ? FOR UPDATE`,
    [id_nasabah],
  );

  // 🔥 FIX: handle kalau nasabah tidak ditemukan
  if (!rows.length) {
    throw new Error("Nasabah tidak ditemukan");
  }

  const saldo_sebelum = Number(rows[0].saldo || 0);
  const nominal = Number(jumlah || 0);
  const saldo_sesudah = saldo_sebelum + nominal;

  await conn.execute(
    `INSERT INTO mutasi_saldo
    (id_bank_sampah, id_nasabah, tipe, referensi_id, referensi_tabel, jumlah, saldo_sebelum, saldo_sesudah)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_bank_sampah,
      id_nasabah,
      tipe,
      referensi_id,
      referensi_tabel,
      nominal,
      saldo_sebelum,
      saldo_sesudah,
    ],
  );

  await conn.execute(`UPDATE nasabah SET saldo = ? WHERE id_nasabah = ?`, [
    saldo_sesudah,
    id_nasabah,
  ]);
};
