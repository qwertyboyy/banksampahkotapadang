// models/tarikModel.js
import db from "../config/db.js";

export const createTarik = async (data) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id_bank_sampah, id_nasabah, jumlah_tarik, keterangan } = data;

    // 🔥 1. Lock saldo nasabah
    const [rows] = await conn.query(
      `SELECT saldo, id_bank_sampah 
       FROM nasabah 
       WHERE id_nasabah = ? FOR UPDATE`,
      [id_nasabah],
    );

    if (!rows.length) throw new Error("Nasabah tidak ditemukan");

    const nasabah = rows[0];

    // 🔒 VALIDASI MULTI TENANT
    if (nasabah.id_bank_sampah !== id_bank_sampah) {
      throw new Error("Akses tidak valid (bank sampah berbeda)");
    }

    const saldoSebelum = parseFloat(nasabah.saldo);

    // 🔥 VALIDASI MINIMAL SALDO
    if (saldoSebelum < 50000) {
      throw new Error("Saldo minimal 50.000 untuk melakukan penarikan");
    }

    // 🔥 VALIDASI JUMLAH TARIK
    if (jumlah_tarik > saldoSebelum) {
      throw new Error("Saldo tidak mencukupi");
    }

    const saldoSesudah = saldoSebelum - jumlah_tarik;

    // 🔥 2. Insert transaksi_tarik
    const [trx] = await conn.query(
      `INSERT INTO transaksi_tarik 
      (id_bank_sampah, id_nasabah, jumlah_tarik, keterangan)
      VALUES (?, ?, ?, ?)`,
      [id_bank_sampah, id_nasabah, jumlah_tarik, keterangan || null],
    );

    const idTransaksi = trx.insertId;

    // 🔥 3. Insert mutasi
    await conn.query(
      `INSERT INTO mutasi_saldo 
      (id_bank_sampah, id_nasabah, tipe, referensi_id, referensi_tabel, jumlah, saldo_sebelum, saldo_sesudah)
      VALUES (?, ?, 'TARIK', ?, 'transaksi_tarik', ?, ?, ?)`,
      [
        id_bank_sampah,
        id_nasabah,
        idTransaksi,
        jumlah_tarik,
        saldoSebelum,
        saldoSesudah,
      ],
    );

    // 🔥 4. Update saldo
    await conn.query(`UPDATE nasabah SET saldo = ? WHERE id_nasabah = ?`, [
      saldoSesudah,
      id_nasabah,
    ]);

    await conn.commit();

    return {
      message: "Penarikan berhasil",
      id_transaksi: idTransaksi,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
