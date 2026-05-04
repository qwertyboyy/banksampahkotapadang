import db from "../config/db.js";

const LaporanPenjualanModel = {
  // 🔥 LIST LAPORAN PENJUALAN
  getLaporan: async (id_bank_sampah, startDate, endDate, search) => {
    let query = `
    SELECT 
      tj.id_penjualan,
      tj.tanggal,
      tj.total_harga,
      tj.catatan,
      p.nama_pengepul
    FROM transaksi_jual tj
    JOIN pengepul p ON tj.id_pengepul = p.id_pengepul
    WHERE tj.id_bank_sampah = ?
  `;

    const params = [id_bank_sampah];

    // 🔥 FILTER TANGGAL
    if (startDate && endDate) {
      query += ` AND tj.tanggal BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    // 🔥 SEARCH NAMA
    if (search) {
      query += ` AND p.nama_pengepul LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY tj.tanggal DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  getLaporanWithDetail: async (id_bank_sampah, startDate, endDate, search) => {
    let query = `
    SELECT 
      tj.id_penjualan,
      tj.tanggal,
      tj.total_harga,
      p.nama_pengepul,
      dj.nama_barang_pengepul,
      mk.nama_kategori,
      dj.berat,
      dj.harga_per_kg,
      dj.subtotal
    FROM transaksi_jual tj
    JOIN pengepul p ON tj.id_pengepul = p.id_pengepul
    JOIN detail_jual dj ON tj.id_penjualan = dj.id_penjualan
    JOIN master_kategori_sampah mk ON dj.id_kategori = mk.id_kategori
    WHERE tj.id_bank_sampah = ?
  `;

    const params = [id_bank_sampah];

    if (startDate) {
      query += ` AND tj.tanggal >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND tj.tanggal <= ?`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND p.nama_pengepul LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY tj.tanggal DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  // 🔥 DETAIL PER TRANSAKSI
  getDetail: async (id_penjualan) => {
    const [rows] = await db.execute(
      `
      SELECT 
        dj.nama_barang_pengepul,
        mk.nama_kategori,
        dj.berat,
        dj.harga_per_kg,
        dj.subtotal
      FROM detail_jual dj
      JOIN master_kategori_sampah mk 
        ON dj.id_kategori = mk.id_kategori
      WHERE dj.id_penjualan = ?
      `,
      [id_penjualan],
    );

    return rows;
  },
};

export default LaporanPenjualanModel;
