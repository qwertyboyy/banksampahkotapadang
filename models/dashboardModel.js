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
}

export default DashboardModel;
