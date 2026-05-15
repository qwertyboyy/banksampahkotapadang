import db from "../config/db.js";

export const getSaldoNasabah = async ({
  id_bank_sampah,
  keyword,
  start_date,
  end_date,
}) => {
  let query = `
    SELECT 
      n.id_nasabah,
      n.nama_nasabah,
      n.nomor_rekening,
      n.saldo,
      n.updated_at AS created_at,

      DATEDIFF(CURDATE(), DATE(n.updated_at)) AS selisih_hari

    FROM nasabah n
    WHERE n.id_bank_sampah = ?
  `;

  const params = [id_bank_sampah];

  // FILTER KEYWORD
  if (keyword && keyword.trim() !== "") {
    query += `
      AND (
        n.nama_nasabah LIKE ?
        OR n.nomor_rekening LIKE ?
      )
    `;

    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  // FILTER TANGGAL
  if (start_date && end_date) {
    query += ` AND DATE(n.updated_at) BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ` AND DATE(n.updated_at) >= ?`;
    params.push(start_date);
  } else if (end_date) {
    query += ` AND DATE(n.updated_at) <= ?`;
    params.push(end_date);
  }

  // 🔥 URUT NOMOR REKENING
  query += ` ORDER BY CAST(n.nomor_rekening AS UNSIGNED) ASC`;

  const [rows] = await db.execute(query, params);

  return rows;
};
