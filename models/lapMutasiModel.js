import db from "../config/db.js";

export const getMutasi = async ({
  id_bank_sampah,
  start_date,
  end_date,
  keyword,
  last_id,
  limit,
<<<<<<< HEAD
  no_limit = false,
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
}) => {
  if (!id_bank_sampah) {
    throw new Error("id_bank_sampah tidak valid");
  }

<<<<<<< HEAD
  // ================= NORMALIZE INPUT =================
  const safeStart = start_date || null;
  const safeEnd = end_date || null;
  const safeKeyword = keyword?.trim() || null;
  const safeLastId = Number(last_id) || null;
=======
  const safeLimit = Number(limit);
  const finalLimit =
    !isNaN(safeLimit) && safeLimit > 0 && safeLimit <= 100 ? safeLimit : 20;

  const safeLastId = Number(last_id);
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

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

<<<<<<< HEAD
  // ================= FILTER TANGGAL =================
  if (safeStart && safeEnd) {
    query += ` AND m.created_at BETWEEN ? AND ?`;
    params.push(safeStart, safeEnd);
  } else if (safeStart) {
    query += ` AND m.created_at >= ?`;
    params.push(safeStart);
  } else if (safeEnd) {
    query += ` AND m.created_at <= ?`;
    params.push(safeEnd);
  }

  // ================= FILTER KEYWORD =================
  if (safeKeyword) {
=======
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
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    query += `
      AND (
        n.nama_nasabah LIKE ?
        OR n.nomor_rekening LIKE ?
      )
    `;
<<<<<<< HEAD
    params.push(`%${safeKeyword}%`, `%${safeKeyword}%`);
  }

  // ================= CURSOR PAGINATION =================
  if (safeLastId) {
=======
    params.push(`%${keyword.trim()}%`, `%${keyword.trim()}%`);
  }

  if (!isNaN(safeLastId) && safeLastId > 0) {
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    query += ` AND m.id_mutasi < ?`;
    params.push(safeLastId);
  }

<<<<<<< HEAD
  // ================= ORDER (HARUS 1 KALI) =================
  query += ` ORDER BY n.nomor_rekening ASC`;

  // ================= LIMIT (OPTIONAL) =================
  if (!no_limit) {
    const safeLimit = Number(limit);
    const finalLimit =
      !isNaN(safeLimit) && safeLimit > 0 && safeLimit <= 100 ? safeLimit : 20;

    query += ` LIMIT ${finalLimit}`;
  }

  // ================= DEBUG (optional, bisa hapus nanti) =================
  // console.log("QUERY:", query);
  // console.log("PARAMS:", params);
=======
  query += ` ORDER BY m.id_mutasi DESC LIMIT ${finalLimit}`;
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

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
