import db from "../config/db.js";

class TransferModel {
  static async findNasabahByRekening(nomor_rekening, id_bank_sampah) {
    const [rows] = await db.query(
      `SELECT
        id_nasabah,
        nama_nasabah,
        saldo,
        nomor_rekening
      FROM nasabah
      WHERE nomor_rekening = ?
      AND id_bank_sampah = ?
      LIMIT 1`,
      [nomor_rekening, id_bank_sampah],
    );

    return rows[0];
  }

  static async getSaldoNasabah(id_nasabah) {
    const [rows] = await db.query(
      `SELECT saldo
       FROM nasabah
       WHERE id_nasabah = ?
       LIMIT 1`,
      [id_nasabah],
    );

    return rows[0];
  }

  static async transferSaldo({ pengirim, penerima, nominal, id_bank_sampah }) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // =========================
      // SALDO PENGIRIM
      // =========================

      const [senderRows] = await conn.query(
        `SELECT saldo
           FROM nasabah
           WHERE id_nasabah = ?
           FOR UPDATE`,
        [pengirim.id_nasabah],
      );

      const saldoPengirim = Number(senderRows[0].saldo);

      if (saldoPengirim < nominal) {
        throw new Error("Saldo tidak cukup");
      }

      const saldoBaruPengirim = saldoPengirim - nominal;

      // =========================
      // SALDO PENERIMA
      // =========================

      const [receiverRows] = await conn.query(
        `SELECT saldo
           FROM nasabah
           WHERE id_nasabah = ?
           FOR UPDATE`,
        [penerima.id_nasabah],
      );

      const saldoPenerima = Number(receiverRows[0].saldo);

      const saldoBaruPenerima = saldoPenerima + nominal;

      // =========================
      // UPDATE SALDO
      // =========================

      await conn.query(
        `UPDATE nasabah
         SET saldo = ?
         WHERE id_nasabah = ?`,
        [saldoBaruPengirim, pengirim.id_nasabah],
      );

      await conn.query(
        `UPDATE nasabah
         SET saldo = ?
         WHERE id_nasabah = ?`,
        [saldoBaruPenerima, penerima.id_nasabah],
      );

      // =========================
      // MUTASI KELUAR
      // =========================

      await conn.query(
        `INSERT INTO mutasi_saldo
        (
          id_bank_sampah,
          id_nasabah,
          tipe,
          jumlah,
          saldo_sebelum,
          saldo_sesudah,
          referensi_tabel
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id_bank_sampah,
          pengirim.id_nasabah,
          "TRANSFER_KELUAR",
          nominal,
          saldoPengirim,
          saldoBaruPengirim,
          "transfer",
        ],
      );

      // =========================
      // MUTASI MASUK
      // =========================

      await conn.query(
        `INSERT INTO mutasi_saldo
        (
          id_bank_sampah,
          id_nasabah,
          tipe,
          jumlah,
          saldo_sebelum,
          saldo_sesudah,
          referensi_tabel
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id_bank_sampah,
          penerima.id_nasabah,
          "TRANSFER_MASUK",
          nominal,
          saldoPenerima,
          saldoBaruPenerima,
          "transfer",
        ],
      );

      await conn.commit();

      return true;
    } catch (err) {
      await conn.rollback();

      throw err;
    } finally {
      conn.release();
    }
  }
}

export default TransferModel;
