import db from "../config/db.js";

const RiwayatModel = {
  getRiwayat: async (id_bank_sampah) => {
    const [rows] = await db.execute(
      `
      SELECT * FROM (
        SELECT 
          ts.id_transaksi_setor AS id,
          ts.id_nasabah,
          ts.id_bank_sampah,
          n.nama_nasabah,
          n.nomor_rekening,
          ts.total_berat,
          ts.total_nilai AS nominal,
          ts.jenis_transaksi,
          ts.referensi_transaksi,
          ts.tanggal_setor AS tanggal,
          'setor' AS tipe
        FROM transaksi_setor ts
        JOIN nasabah n ON ts.id_nasabah = n.id_nasabah

        UNION ALL

        SELECT 
          tt.id_transaksi_tarik,
          tt.id_nasabah,
          tt.id_bank_sampah,
          n.nama_nasabah,
          n.nomor_rekening,
          NULL,
          tt.jumlah_tarik,
          tt.jenis_transaksi,
          tt.referensi_transaksi,
          tt.tanggal_tarik,
          'tarik'
        FROM transaksi_tarik tt
        JOIN nasabah n ON tt.id_nasabah = n.id_nasabah
      ) x
      WHERE id_bank_sampah = ?
      ORDER BY tanggal DESC
      LIMIT 10
    `,
      [id_bank_sampah],
    );

    return rows;
  },

  getRoot: async (id) => {
    const [rows] = await db.execute(
      `
      SELECT 
        CASE 
          WHEN referensi_transaksi IS NULL THEN id_transaksi_setor
          ELSE referensi_transaksi
        END AS root_id
      FROM transaksi_setor
      WHERE id_transaksi_setor = ?
    `,
      [id],
    );

    return rows[0]?.root_id;
  },

  getCurrentState: async (root_id) => {
    const [rows] = await db.execute(
      `
      SELECT 
        ds.id_jenis_sampah,
        js.nama_jenis,
        SUM(ds.berat) AS berat,
        SUM(ds.subtotal) AS subtotal
      FROM detail_setor ds
      JOIN transaksi_setor ts 
        ON ds.id_transaksi_setor = ts.id_transaksi_setor
      JOIN jenis_sampah_bank js
        ON ds.id_jenis_sampah = js.id_jenis_sampah
      WHERE ts.id_transaksi_setor = ?
         OR ts.referensi_transaksi = ?
      GROUP BY ds.id_jenis_sampah
    `,
      [root_id, root_id],
    );

    return rows;
  },

  insertKoreksi: async (conn, data) => {
    const [res] = await conn.execute(
      `
      INSERT INTO transaksi_setor
      (id_bank_sampah, id_nasabah, total_berat, total_nilai, jenis_transaksi, referensi_transaksi)
      VALUES (?, ?, ?, ?, 'koreksi', ?)
    `,
      [
        data.id_bank_sampah,
        data.id_nasabah,
        data.total_berat,
        data.total_nilai,
        data.root_id,
      ],
    );

    return res.insertId;
  },

  insertDetail: async (conn, data) => {
    await conn.execute(
      `
      INSERT INTO detail_setor
      (id_transaksi_setor, id_jenis_sampah, berat, subtotal)
      VALUES (?, ?, ?, ?)
    `,
      [data.id_transaksi, data.id_jenis_sampah, data.berat, data.subtotal],
    );
  },
};

export default RiwayatModel;
