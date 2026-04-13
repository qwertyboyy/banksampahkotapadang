import db from "../config/db.js";

export const getMutasi = async ({
  id_bank_sampah,
  start_date,
  end_date,
  nomor_rekening,
  last_id,
  limit,
}) => {
  // ================= SAFETY =================
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
    JOIN nasabah n ON m.id_nasabah = n.id_nasabah
    WHERE m.id_bank_sampah = ?
  `;

  const params = [id_bank_sampah];

  // FILTER
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

  if (nomor_rekening && nomor_rekening.trim() !== "") {
    query += ` AND n.nomor_rekening = ?`;
    params.push(nomor_rekening.trim());
  }

  if (!isNaN(safeLastId) && safeLastId > 0) {
    query += ` AND m.id_mutasi < ?`;
    params.push(safeLastId);
  }

  // 🔥 FIX DI SINI (BUANG PARAM LIMIT)
  query += ` ORDER BY m.id_mutasi DESC LIMIT ${finalLimit}`;

  const [rows] = await db.execute(query, params);
  return rows;
};
