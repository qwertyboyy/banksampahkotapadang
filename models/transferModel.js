import bcrypt from "bcryptjs";
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
      AND id_bank_sampah = ? AND status_aktif = 1
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

  static async getTransferPinHash(id_user) {
    const [rows] = await db.query(
      `SELECT pin_transaksi_hash
       FROM users
       WHERE id_user = ?
       LIMIT 1`,
      [id_user],
    );

    return rows[0]?.pin_transaksi_hash || null;
  }

  static async hasTransferPin(id_user) {
    const hash = await this.getTransferPinHash(id_user);
    return Boolean(hash);
  }

  static async setTransferPin(id_user, pin) {
    const pin_transaksi_hash = await bcrypt.hash(pin, 10);

    const [result] = await db.query(
      `UPDATE users
       SET pin_transaksi_hash = ?
       WHERE id_user = ? AND pin_transaksi_hash IS NULL`,
      [pin_transaksi_hash, id_user],
    );

    if (!result.affectedRows) throw this.error("PIN sudah dibuat. Perubahan PIN memerlukan verifikasi ulang", 409);
    return true;
  }

  static async verifyTransferPin(id_user, pin) {
    const pin_transaksi_hash = await this.getTransferPinHash(id_user);

    if (!pin_transaksi_hash) {
      const error = new Error("PIN transaksi belum dibuat");
      error.status = 403;
      throw error;
    }

    const isValid = await bcrypt.compare(pin, pin_transaksi_hash);

    if (!isValid) {
      const error = new Error("PIN transaksi salah");
      error.status = 400;
      throw error;
    }

    return true;
  }

  static error(message, status = 400) {
    return Object.assign(new Error(message), { status });
  }

  static async transferSaldo({ pengirim, penerima, nominal, id_bank_sampah, request_key }) {
    const maximum = Number(process.env.TRANSFER_MAX_AMOUNT || 1000000);
    const daily = Number(process.env.TRANSFER_DAILY_LIMIT || 5000000);
    const pending = Number(process.env.TRANSFER_PENDING_LIMIT || 5);
    if (!Number.isFinite(nominal) || nominal <= 0 || nominal > maximum || Math.abs(nominal * 100 - Math.round(nominal * 100)) > 0.001) throw this.error(`Nominal transfer tidak valid. Maksimal Rp ${maximum.toLocaleString("id-ID")}`);
    if (typeof request_key !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(request_key)) throw this.error("ID pengajuan tidak valid. Muat ulang halaman transfer");
    if (String(pengirim.id_nasabah) === String(penerima.id_nasabah)) throw this.error("Tidak bisa transfer ke rekening sendiri");
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [accounts] = await conn.query("SELECT id_nasabah, saldo FROM nasabah WHERE id_nasabah IN (?, ?) AND id_bank_sampah = ? AND status_aktif = 1 ORDER BY id_nasabah FOR UPDATE", [pengirim.id_nasabah, penerima.id_nasabah, id_bank_sampah]);
      if (accounts.length !== 2) throw this.error("Rekening transfer tidak aktif");
      const [existing] = await conn.query("SELECT * FROM transfer_saldo WHERE id_pengirim = ? AND request_key = ?", [pengirim.id_nasabah, request_key]);
      if (existing.length) {
        const old = existing[0];
        if (Number(old.nominal) !== nominal || String(old.id_penerima) !== String(penerima.id_nasabah)) throw this.error("ID pengajuan telah digunakan untuk transfer berbeda", 409);
        await conn.commit();
        return { id_transfer: old.id_transfer, status: old.status };
      }
      const sender = accounts.find(a => String(a.id_nasabah) === String(pengirim.id_nasabah));
      if (Number(sender.saldo) < nominal) throw this.error("Saldo tidak cukup");
      const [[usage]] = await conn.query(`SELECT SUM(status = 'MENUNGGU') AS pending_count,
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE AND status <> 'DITOLAK' THEN nominal ELSE 0 END), 0) AS daily_total
        FROM transfer_saldo WHERE id_pengirim = ?`, [pengirim.id_nasabah]);
      if (Number(usage.pending_count) >= pending) throw this.error("Batas pengajuan menunggu tercapai");
      if (Number(usage.daily_total) + nominal > daily) throw this.error("Batas nominal pengajuan harian tercapai");
      const [result] = await conn.query("INSERT INTO transfer_saldo (id_bank_sampah, id_pengirim, id_penerima, nominal, request_key) VALUES (?, ?, ?, ?, ?)", [id_bank_sampah, pengirim.id_nasabah, penerima.id_nasabah, nominal, request_key]);
      await conn.commit();
      return { id_transfer: result.insertId, status: "MENUNGGU" };
    } catch (err) { await conn.rollback(); throw err; }
    finally { conn.release(); }
  }

  static async notifications({ id_nasabah, id_bank_sampah }) {
    const [rows] = await db.query(`SELECT id_transfer, status, nominal, rejection_reason, verified_at,
      CASE WHEN id_pengirim = ? THEN 'KELUAR' ELSE 'MASUK' END AS arah
      FROM transfer_saldo WHERE id_bank_sampah = ? AND verified_at IS NOT NULL
      AND (id_pengirim = ? OR (id_penerima = ? AND status = 'DISETUJUI'))
      ORDER BY verified_at DESC LIMIT 5`, [id_nasabah, id_bank_sampah, id_nasabah, id_nasabah]);
    return rows;
  }

  static async listTransfers({ id_bank_sampah, role, id_nasabah }) {
    const params = [id_bank_sampah];
    const filter = role === "nasabah" ? " AND t.id_pengirim = ?" : "";
    if (role === "nasabah") params.push(id_nasabah);
    const [rows] = await db.query(
      `SELECT t.*, p.nama_nasabah AS nama_pengirim, p.nomor_rekening AS rekening_pengirim,
        r.nama_nasabah AS nama_penerima, r.nomor_rekening AS rekening_penerima
       FROM transfer_saldo t
       JOIN nasabah p ON p.id_nasabah = t.id_pengirim
       JOIN nasabah r ON r.id_nasabah = t.id_penerima
       WHERE t.id_bank_sampah = ?${filter} ORDER BY t.id_transfer DESC LIMIT 500`, params,
    );
    return rows;
  }

  static async verifyTransfer({ id_transfer, id_bank_sampah, admin_id, status, rejection_reason }) {
    if (!["DISETUJUI", "DITOLAK"].includes(status)) throw this.error("Status verifikasi tidak valid");
    if (status === "DITOLAK" && (typeof rejection_reason !== "string" || !rejection_reason.trim() || rejection_reason.length > 500)) throw this.error("Alasan penolakan wajib diisi (maksimal 500 karakter)");
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [requests] = await conn.query(
        "SELECT * FROM transfer_saldo WHERE id_transfer = ? AND id_bank_sampah = ? FOR UPDATE",
        [id_transfer, id_bank_sampah],
      );
      const transfer = requests[0];
      if (!transfer) throw this.error("Transfer tidak ditemukan", 404);
      if (transfer.status !== "MENUNGGU") throw this.error("Transfer sudah diverifikasi", 409);
      if (status === "DISETUJUI") {
        // Lock both accounts in a consistent order; all balance changes and audit rows commit together.
        const [accounts] = await conn.query(
          `SELECT id_nasabah, saldo FROM nasabah
           WHERE id_nasabah IN (?, ?) AND id_bank_sampah = ? AND status_aktif = 1 ORDER BY id_nasabah FOR UPDATE`,
          [transfer.id_pengirim, transfer.id_penerima, id_bank_sampah],
        );
        if (accounts.length !== 2) throw this.error("Rekening transfer tidak valid");
        const sender = accounts.find(a => String(a.id_nasabah) === String(transfer.id_pengirim));
        const amount = Number(transfer.nominal);
        const [[today]] = await conn.query("SELECT COALESCE(SUM(nominal), 0) AS total FROM transfer_saldo WHERE id_pengirim = ? AND status = 'DISETUJUI' AND verified_at >= CURRENT_DATE", [transfer.id_pengirim]);
        if (Number(today.total) + amount > Number(process.env.TRANSFER_DAILY_LIMIT || 5000000)) throw this.error("Batas transfer disetujui harian tercapai", 409);
        if (Number(sender.saldo) < amount) throw this.error("Saldo pengirim tidak mencukupi untuk menyetujui transfer", 409);
        for (const account of accounts) {
          const outgoing = String(account.id_nasabah) === String(transfer.id_pengirim);
          const before = Number(account.saldo);
          const after = Math.round((before + (outgoing ? -amount : amount)) * 100) / 100;
          await conn.query("UPDATE nasabah SET saldo = ? WHERE id_nasabah = ?", [after, account.id_nasabah]);
          await conn.query(
            `INSERT INTO mutasi_saldo
             (id_bank_sampah, id_nasabah, tipe, jumlah, saldo_sebelum, saldo_sesudah, referensi_tabel, referensi_id, admin_id)
             VALUES (?, ?, ?, ?, ?, ?, 'transfer_saldo', ?, ?)`,
            [id_bank_sampah, account.id_nasabah, outgoing ? "TRANSFER_KELUAR" : "TRANSFER_MASUK", amount, before, after, id_transfer, admin_id],
          );
        }
      }
      await conn.query(
        "UPDATE transfer_saldo SET status = ?, admin_id = ?, rejection_reason = ?, verified_at = CURRENT_TIMESTAMP WHERE id_transfer = ?",
        [status, admin_id, status === "DITOLAK" ? rejection_reason.trim() : null, id_transfer],
      );
      await conn.commit();
      return { id_transfer, status };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default TransferModel;
