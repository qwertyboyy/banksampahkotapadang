// models/setorModel.js
import db from "../config/db.js";

export const createSetor = async (data) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id_bank_sampah, id_nasabah, items } = data;

    // 🔥 1. Hitung total dari backend
    let totalBerat = 0;
    let totalNilai = 0;

    for (const item of items) {
      const [jenis] = await conn.query(
        "SELECT harga_per_kg FROM jenis_sampah_bank WHERE id_jenis_sampah = ?",
        [item.id_jenis_sampah],
      );

      if (!jenis.length) throw new Error("Jenis sampah tidak ditemukan");

      const harga = jenis[0].harga_per_kg;
      const subtotal = harga * item.berat;

      item.subtotal = subtotal;
      totalBerat += item.berat;
      totalNilai += subtotal;
    }

    // 🔥 2. Insert transaksi_setor
    const [transaksi] = await conn.query(
      `INSERT INTO transaksi_setor 
      (id_bank_sampah, id_nasabah, total_berat, total_nilai)
      VALUES (?, ?, ?, ?)`,
      [id_bank_sampah, id_nasabah, totalBerat, totalNilai],
    );

    const idTransaksi = transaksi.insertId;

    // 🔥 3. Insert detail_setor
    for (const item of items) {
      await conn.query(
        `INSERT INTO detail_setor 
        (id_transaksi_setor, id_jenis_sampah, berat, subtotal)
        VALUES (?, ?, ?, ?)`,
        [idTransaksi, item.id_jenis_sampah, item.berat, item.subtotal],
      );
    }

    // 🔥 4. Lock saldo nasabah
    const [nasabahRows] = await conn.query(
      `SELECT saldo FROM nasabah WHERE id_nasabah = ? FOR UPDATE`,
      [id_nasabah],
    );

    if (!nasabahRows.length) throw new Error("Nasabah tidak ditemukan");

    const saldoSebelum = parseFloat(nasabahRows[0].saldo);
    const saldoSesudah = saldoSebelum + totalNilai;

    // 🔥 5. Insert mutasi
    await conn.query(
      `INSERT INTO mutasi_saldo 
      (id_bank_sampah, id_nasabah, tipe, referensi_id, referensi_tabel, jumlah, saldo_sebelum, saldo_sesudah)
      VALUES (?, ?, 'SETOR', ?, 'transaksi_setor', ?, ?, ?)`,
      [
        id_bank_sampah,
        id_nasabah,
        idTransaksi,
        totalNilai,
        saldoSebelum,
        saldoSesudah,
      ],
    );

    // 🔥 6. Update saldo
    await conn.query(`UPDATE nasabah SET saldo = ? WHERE id_nasabah = ?`, [
      saldoSesudah,
      id_nasabah,
    ]);

    await conn.commit();

    return {
      message: "Setor berhasil",
      id_transaksi: idTransaksi,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
