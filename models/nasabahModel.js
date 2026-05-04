import db from "../config/db.js";

const NasabahModel = {
  // ================= BANK =================
  getBankSampahWithCount: async () => {
    const query = `
      SELECT 
        bs.kode_bank_sampah,
        bs.nama_bank_sampah,
        COUNT(n.id_nasabah) AS jumlah_nasabah
      FROM bank_sampah bs
      LEFT JOIN nasabah n 
        ON bs.id_bank_sampah = n.id_bank_sampah
      GROUP BY bs.id_bank_sampah
      ORDER BY bs.nama_bank_sampah
    `;

    const [rows] = await db.query(query);
    return rows;
  },

  // ================= LIST NASABAH =================
  getNasabahByBank: async (id_bank_sampah, limit, offset, search) => {
    let searchQuery = "";
    let params = [id_bank_sampah];

    if (search) {
      searchQuery = `
        AND (
          nama_nasabah LIKE ?
          OR nomor_rekening LIKE ?
          OR no_hp LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT 
        id_nasabah,
        nomor_rekening,
        nama_nasabah,
        alamat,
        no_hp,
        saldo,
        status_aktif
      FROM nasabah
      WHERE id_bank_sampah = ?
      ${searchQuery}
      ORDER BY nomor_rekening
      LIMIT ?
      OFFSET ?
    `;

    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return rows;
  },

  getTotalNasabahByBank: async (id_bank_sampah, search) => {
    let searchQuery = "";
    let params = [id_bank_sampah];

    if (search) {
      searchQuery = `
        AND (
          nama_nasabah LIKE ?
          OR nomor_rekening LIKE ?
          OR no_hp LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT COUNT(*) AS total
      FROM nasabah
      WHERE id_bank_sampah = ?
      ${searchQuery}
    `;

    const [rows] = await db.query(query, params);
    return rows[0].total;
  },

  // ================= GENERATE REKENING =================
  generateNomorRekening: async (conn, id_bank_sampah) => {
    const [bank] = await conn.query(
      `SELECT kode_bank_sampah
       FROM bank_sampah
       WHERE id_bank_sampah = ?`,
      [id_bank_sampah],
    );

    console.log("ID BANK MASUK:", id_bank_sampah);
    console.log("HASIL BANK:", bank);

    if (!bank.length) {
      throw new Error("Bank sampah tidak ditemukan");
    }

    const kode = bank[0].kode_bank_sampah;

    const [counter] = await conn.query(
      `SELECT last_nomor_urut
       FROM counter_nasabah
       WHERE id_bank_sampah = ?
       FOR UPDATE`,
      [id_bank_sampah],
    );

    let last = 0;

    if (!counter.length) {
      await conn.query(
        `INSERT INTO counter_nasabah (id_bank_sampah, last_nomor_urut)
         VALUES (?, 0)`,
        [id_bank_sampah],
      );
    } else {
      last = counter[0].last_nomor_urut;
    }

    const nomor_urut = last + 1;

    const nomor_rekening = `${kode}${String(nomor_urut).padStart(5, "0")}`;

    return {
      nomor_urut,
      nomor_rekening,
    };
  },

  // ================= UPDATE COUNTER (TRANSACTION) =================
  updateCounterNasabah: async (conn, id_bank_sampah, nomor_urut) => {
    await conn.query(
      `UPDATE counter_nasabah
       SET last_nomor_urut = ?
       WHERE id_bank_sampah = ?`,
      [nomor_urut, id_bank_sampah],
    );
  },

  // ================= INSERT NASABAH =================
  createNasabah: async (data) => {
    const query = `
      INSERT INTO nasabah
      (id_bank_sampah, nomor_urut, nomor_rekening, nama_nasabah, nik, alamat, no_hp, status_aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await db.query(query, [
      data.id_bank_sampah,
      data.nomor_urut,
      data.nomor_rekening,
      data.nama_nasabah,
      data.nik,
      data.alamat,
      data.no_hp,
    ]);
  },

  // ================= UPDATE =================
  updateNasabah: async (id_nasabah, data) => {
    const query = `
      UPDATE nasabah
      SET
        nama_nasabah = ?,
        nik = ?,
        alamat = ?,
        no_hp = ?,
        status_aktif = ?
      WHERE id_nasabah = ?
    `;

    await db.query(query, [
      data.nama_nasabah,
      data.nik,
      data.alamat,
      data.no_hp,
      data.status_aktif,
      id_nasabah,
    ]);
  },

  // ================= SELECT =================
  getNasabahSelect: async (id_bank_sampah, keyword = "") => {
    let searchQuery = "";
    let params = [id_bank_sampah];

    if (keyword) {
      searchQuery = `
        AND (
          nama_nasabah LIKE ?
          OR nomor_rekening LIKE ?
        )
      `;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const query = `
      SELECT 
        id_nasabah,
        nama_nasabah,
        nomor_rekening,
        saldo
      FROM nasabah
      WHERE id_bank_sampah = ?
      AND status_aktif = 1
      ${searchQuery}
      ORDER BY nama_nasabah
      LIMIT 20
    `;

    const [rows] = await db.query(query, params);
    return rows;
  },

  // ================= DELETE =================
  deleteNasabah: async (id_nasabah) => {
    await db.query(`DELETE FROM nasabah WHERE id_nasabah = ?`, [id_nasabah]);
  },

  // ================= SALDO =================
  getSaldoNasabah: async (id_nasabah, id_bank_sampah) => {
    const [rows] = await db.query(
      `SELECT saldo 
       FROM nasabah 
       WHERE id_nasabah = ? AND id_bank_sampah = ?`,
      [id_nasabah, id_bank_sampah],
    );

    if (!rows.length) {
      throw new Error("Nasabah tidak ditemukan");
    }

    return rows[0];
  },
};

export default NasabahModel;
