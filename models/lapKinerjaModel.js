import db from "../config/db.js";

const LaporanKinerjaModel = {
  getLaporanKinerja: async (id_bank_sampah, year) => {
    const [rows] = await db.execute(
      `
      SELECT 
        bulan,

        SUM(jumlah_setor + jumlah_tarik) AS total_transaksi,
        SUM(total_penarikan) AS total_penarikan,
        SUM(total_berat_setor) AS total_berat_setor,
        SUM(total_nominal_setor) AS total_nominal_setor

      FROM (
        -- 🔵 SETOR
        SELECT 
          MONTH(ts.tanggal_setor) AS bulan,

          COUNT(DISTINCT ts.id_transaksi_setor) AS jumlah_setor,
          0 AS jumlah_tarik,

          0 AS total_penarikan,

          SUM(ds.berat) AS total_berat_setor,
          SUM(ds.subtotal) AS total_nominal_setor

        FROM transaksi_setor ts
        JOIN detail_setor ds 
          ON ts.id_transaksi_setor = ds.id_transaksi_setor
        WHERE ts.id_bank_sampah = ?
          AND YEAR(ts.tanggal_setor) = ?
        GROUP BY MONTH(ts.tanggal_setor)

        UNION ALL

        -- 🔴 TARIK
        SELECT 
          MONTH(tt.tanggal_tarik) AS bulan,

          0 AS jumlah_setor,
          COUNT(tt.id_transaksi_tarik) AS jumlah_tarik,

          SUM(tt.jumlah_tarik) AS total_penarikan,

          0 AS total_berat_setor,
          0 AS total_nominal_setor

        FROM transaksi_tarik tt
        WHERE tt.id_bank_sampah = ?
          AND YEAR(tt.tanggal_tarik) = ?
        GROUP BY MONTH(tt.tanggal_tarik)

      ) AS combined

      GROUP BY bulan
      ORDER BY bulan ASC
      `,
      [id_bank_sampah, year, id_bank_sampah, year],
    );

    return rows;
  },

  getAvailableYears: async (id_bank_sampah) => {
    const [rows] = await db.execute(
      `
    SELECT DISTINCT YEAR(tanggal_setor) AS year
    FROM (
      SELECT tanggal_setor FROM transaksi_setor WHERE id_bank_sampah = ?
      UNION
      SELECT tanggal_tarik FROM transaksi_tarik WHERE id_bank_sampah = ?
    ) AS combined
    ORDER BY year DESC
    `,
      [id_bank_sampah, id_bank_sampah],
    );

    return rows;
  },
};

export default LaporanKinerjaModel;
