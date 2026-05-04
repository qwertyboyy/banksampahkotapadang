import db from "../config/db.js";

class DashboardModel {
  static async getTotalNasabah(id_bank_sampah = null) {
    let query = `SELECT COUNT(*) as total FROM nasabah`;
    const params = [];

    if (id_bank_sampah) {
      query += ` WHERE id_bank_sampah = ?`;
      params.push(id_bank_sampah);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  static async getTotalTransaksi(id_bank_sampah = null) {
    let query = `
      SELECT COUNT(*) as total
      FROM transaksi_setor
    `;

    const params = [];

    if (id_bank_sampah) {
      query += " WHERE id_bank_sampah = ?";
      params.push(id_bank_sampah);
    }

    const [rows] = await db.query(query, params);

    return rows[0].total;
  }

  static async getTotalVolume(id_bank_sampah = null) {
    let query = `
      SELECT COALESCE(SUM(ds.berat),0) as total
      FROM transaksi_setor ts
      JOIN detail_setor ds
        ON ts.id_transaksi_setor = ds.id_transaksi_setor
    `;

    const params = [];

    if (id_bank_sampah) {
      query += " WHERE ts.id_bank_sampah = ?";
      params.push(id_bank_sampah);
    }

    const [rows] = await db.query(query, params);

    return rows[0].total;
  }

  static async getJenisSampahStats(id_bank_sampah = null) {
    let query = `
    SELECT 
      k.nama_kategori AS name,
      SUM(ds.berat) AS value
    FROM transaksi_setor ts
    JOIN detail_setor ds
      ON ts.id_transaksi_setor = ds.id_transaksi_setor
    JOIN jenis_sampah_bank js
      ON ds.id_jenis_sampah = js.id_jenis_sampah
    JOIN master_kategori_sampah k
      ON js.id_kategori = k.id_kategori
  `;

    const params = [];

    if (id_bank_sampah) {
      query += ` WHERE ts.id_bank_sampah = ?`;
      params.push(id_bank_sampah);
    }

    query += `
    GROUP BY k.id_kategori, k.nama_kategori
    ORDER BY value DESC
  `;

    const [rows] = await db.query(query, params);

    return rows;
  }

  static async getSaldoNasabah(id_bank_sampah = null) {
    let query = `
      SELECT COALESCE(SUM(saldo),0) as total
      FROM nasabah
    `;

    const params = [];

    if (id_bank_sampah) {
      query += " WHERE id_bank_sampah = ?";
      params.push(id_bank_sampah);
    }

    const [rows] = await db.query(query, params);

    return rows[0].total;
  }

  static async getTotalBankSampah() {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM bank_sampah
      WHERE status_aktif = 1
    `);

    return rows[0].total;
  }

  static async getSetoranPerBulan(tahun, id_bank_sampah = null) {
    let query = `
    SELECT 
      MONTH(ts.tanggal_setor) AS bulan_num,
      DATE_FORMAT(ts.tanggal_setor,'%b') AS bulan,
      SUM(ds.berat) AS total
    FROM transaksi_setor ts
    JOIN detail_setor ds
      ON ts.id_transaksi_setor = ds.id_transaksi_setor
    WHERE YEAR(ts.tanggal_setor) = ?
  `;

    const params = [tahun];

    if (id_bank_sampah) {
      query += ` AND ts.id_bank_sampah = ?`;
      params.push(id_bank_sampah);
    }

    query += `
    GROUP BY 
      MONTH(ts.tanggal_setor),
      DATE_FORMAT(ts.tanggal_setor,'%b')
    ORDER BY 
      MONTH(ts.tanggal_setor)
  `;

    const [rows] = await db.query(query, params);

    return rows;
  }

  static async getChartKeuangan(tahun, id_bank_sampah = null) {
    let query = `
    SELECT 
      bulan,
      SUM(setoran) AS setoran,
      SUM(penarikan) AS penarikan
    FROM (

      -- SETORAN
      SELECT 
        MONTH(ts.tanggal_setor) AS bulan,
        SUM(ts.total_nilai) AS setoran,
        0 AS penarikan
      FROM transaksi_setor ts
      WHERE YEAR(ts.tanggal_setor) = ?
  `;

    const params = [tahun];

    if (id_bank_sampah) {
      query += ` AND ts.id_bank_sampah = ?`;
      params.push(id_bank_sampah);
    }

    query += `
      GROUP BY MONTH(ts.tanggal_setor)

      UNION ALL

      -- PENARIKAN
      SELECT 
        MONTH(tt.tanggal_tarik) AS bulan,
        0 AS setoran,
        SUM(tt.jumlah_tarik) AS penarikan
      FROM transaksi_tarik tt
      WHERE YEAR(tt.tanggal_tarik) = ?
  `;

    params.push(tahun);

    if (id_bank_sampah) {
      query += ` AND tt.id_bank_sampah = ?`;
      params.push(id_bank_sampah);
    }

    query += `
      GROUP BY MONTH(tt.tanggal_tarik)

    ) AS combined
    GROUP BY bulan
    ORDER BY bulan ASC
  `;

    const [rows] = await db.query(query, params);

    return rows;
  }

  // Profil Nasabah
  static async getProfilNasabah(id_nasabah) {
    const [rows] = await db.query(
      `SELECT 
      nama_nasabah,
      nomor_rekening,
      saldo,
      nik,
      alamat,
      is_claimed
     FROM nasabah
     WHERE id_nasabah = ?
     LIMIT 1`,
      [id_nasabah],
    );

    return rows[0] || null;
  }

  static async getRiwayatNasabah(id_nasabah, limit = 10) {
    const [rows] = await db.query(
      `SELECT 
      tipe,
      jumlah,
      saldo_sesudah,
      created_at
     FROM mutasi_saldo
     WHERE id_nasabah = ?
     ORDER BY id_mutasi DESC
     LIMIT ?`,
      [id_nasabah, limit],
    );

    return rows;
  }

  static async isProfilLengkap(id_nasabah) {
    const [rows] = await db.query(
      `SELECT 
      nik,
      alamat
     FROM nasabah
     WHERE id_nasabah = ?
     LIMIT 1`,
      [id_nasabah],
    );

    if (!rows.length) return false;

    return rows[0].nik !== null && rows[0].alamat !== null;
  }

  static async getStatSetorNasabah(id_nasabah) {
    const [rows] = await db.query(
      `SELECT 
      COUNT(*) AS total_setor,
      COALESCE(SUM(total_berat), 0) AS total_berat
     FROM transaksi_setor
     WHERE id_nasabah = ?
       AND jenis_transaksi = 'normal'`,
      [id_nasabah],
    );

    return rows[0];
  }
}

export default DashboardModel;
