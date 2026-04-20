import db from "../config/db.js";

const RiwayatTransaksiModel = {
  getRiwayatTerbaru: async (id_bank_sampah) => {
    const query = `
      SELECT * FROM (
    SELECT 
      ts.id_transaksi_setor AS id,
      ts.id_nasabah,
      n.nomor_rekening,
      n.nama_nasabah,
      ts.id_bank_sampah,
      ts.total_berat,
      ts.total_nilai AS nominal,
      'setor' AS tipe,
      ts.jenis_transaksi,
      ts.referensi_transaksi,
      ts.keterangan,
      ts.created_by,
      ts.tanggal_setor AS tanggal
    FROM transaksi_setor ts
    JOIN nasabah n ON ts.id_nasabah = n.id_nasabah

    UNION ALL

    SELECT 
      tt.id_transaksi_tarik AS id,
      tt.id_nasabah,
      n.nomor_rekening,
      n.nama_nasabah,
      tt.id_bank_sampah,
      NULL AS total_berat,
      tt.jumlah_tarik AS nominal,
      'tarik' AS tipe,
      tt.jenis_transaksi,
      tt.referensi_transaksi,
      tt.keterangan,
      tt.created_by,
      tt.tanggal_tarik AS tanggal
    FROM transaksi_tarik tt
    JOIN nasabah n ON tt.id_nasabah = n.id_nasabah
  ) AS riwayat
   WHERE id_bank_sampah = ?
  ORDER BY tanggal DESC
  LIMIT 10
    `;

    const [rows] = await db.execute(query, [id_bank_sampah]);
    return rows;
  },

  // 🔥 ambil detail setor
  getDetailSetor: async (id_transaksi_setor) => {
    const [rows] = await db.execute(
      `SELECT id_jenis_sampah, berat, subtotal
       FROM detail_setor
       WHERE id_transaksi_setor = ?`,
      [id_transaksi_setor],
    );

    return rows;
  },

  // 🔥 insert transaksi koreksi
  insertTransaksiKoreksi: async (data) => {
    const [result] = await db.execute(
      `INSERT INTO transaksi_setor
      (id_bank_sampah, id_nasabah, total_berat, total_nilai, jenis_transaksi, referensi_transaksi, keterangan, created_by)
      VALUES (?, ?, ?, ?, 'koreksi', ?, ?, ?)`,
      [
        data.id_bank_sampah,
        data.id_nasabah,
        data.total_berat,
        data.total_nilai,
        data.referensi_transaksi,
        data.keterangan,
        data.created_by,
      ],
    );
    await db.execute(
      `UPDATE nasabah 
   SET saldo = saldo + ? 
   WHERE id_nasabah = ?`,
      [data.total_nilai, data.id_nasabah],
    );

    return result.insertId;
  },

  // 🔥 insert detail
  insertDetailKoreksi: async (data) => {
    await db.execute(
      `INSERT INTO detail_setor
      (id_transaksi_setor, id_jenis_sampah, berat, subtotal)
      VALUES (?, ?, ?, ?)`,
      [
        data.id_transaksi_setor,
        data.id_jenis_sampah,
        data.berat,
        data.subtotal,
      ],
    );
  },

  getDetailSetorWithJenis: async (id_transaksi_setor) => {
    const [rows] = await db.execute(
      `SELECT 
        ds.id_jenis_sampah,
        js.nama_jenis,
        ds.berat,
        ds.subtotal
     FROM detail_setor ds
     JOIN jenis_sampah_bank js 
       ON ds.id_jenis_sampah = js.id_jenis_sampah
     WHERE ds.id_transaksi_setor = ?`,
      [id_transaksi_setor],
    );

    return rows;
  },
};

export default RiwayatTransaksiModel;
