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

      MAX(ts.tanggal_setor) AS terakhir_setor,

      CASE
        WHEN MAX(ts.tanggal_setor) IS NULL THEN NULL
        ELSE DATEDIFF(
          CURDATE(),
          DATE(MAX(ts.tanggal_setor))
        )
      END AS selisih_hari

    FROM nasabah n

    LEFT JOIN transaksi_setor ts 
      ON ts.id_nasabah = n.id_nasabah

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

  // FILTER TANGGAL SETOR
  if (start_date && end_date) {
    query += `
      AND DATE(ts.tanggal_setor) BETWEEN ? AND ?
    `;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += `
      AND DATE(ts.tanggal_setor) >= ?
    `;
    params.push(start_date);
  } else if (end_date) {
    query += `
      AND DATE(ts.tanggal_setor) <= ?
    `;
    params.push(end_date);
  }

  query += `
    GROUP BY 
      n.id_nasabah,
      n.nama_nasabah,
      n.nomor_rekening,
      n.saldo

    ORDER BY CAST(n.nomor_rekening AS UNSIGNED) ASC
  `;

  const [rows] = await db.execute(query, params);

  return rows;
};
