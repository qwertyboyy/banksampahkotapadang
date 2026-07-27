import db from "../config/db.js";
import bcrypt from "bcryptjs";

export const getNasabahAccounts = async (id_bank_sampah) => {
  const [rows] = await db.query(
    `
    SELECT
      u.id_user,
      u.nama_lengkap,
      u.username,
      u.email,
      u.status_akun,
      u.status_aktif,
      u.id_nasabah,
      n.nomor_rekening,
      n.nama_nasabah,
      n.nik,
      n.alamat,
      n.no_hp
    FROM users u
    INNER JOIN nasabah n
      ON n.id_nasabah = u.id_nasabah
    WHERE u.role = 'nasabah'
      AND u.id_bank_sampah = ?
      AND n.id_bank_sampah = ?
    ORDER BY
      CASE u.status_akun
        WHEN 'pending' THEN 0
        WHEN 'aktif' THEN 1
        WHEN 'ditolak' THEN 2
        ELSE 3
      END,
      u.id_user DESC
    `,
    [id_bank_sampah, id_bank_sampah],
  );

  return rows;
};

export const getPendingNasabahAccounts = async (id_bank_sampah) => {
  const rows = await getNasabahAccounts(id_bank_sampah);
  return rows.filter((row) => row.status_akun === "pending");
};

export const getNasabahAccountByBank = async (id_user, id_bank_sampah) => {
  const [rows] = await db.query(
    `
    SELECT
      u.id_user,
      u.nama_lengkap,
      u.username,
      u.email,
      u.role,
      u.status_akun,
      u.status_aktif,
      u.id_bank_sampah,
      u.id_nasabah,
      n.nomor_rekening,
      n.nama_nasabah
    FROM users u
    INNER JOIN nasabah n
      ON n.id_nasabah = u.id_nasabah
    WHERE u.id_user = ?
      AND u.id_bank_sampah = ?
      AND n.id_bank_sampah = ?
      AND u.role = 'nasabah'
    LIMIT 1
    `,
    [id_user, id_bank_sampah, id_bank_sampah],
  );

  return rows[0] || null;
};

export const approveNasabahAccount = async (id_user, id_bank_sampah) => {
  const [result] = await db.query(
    `
    UPDATE users
    SET status_akun = 'aktif',
        status_aktif = 1
    WHERE id_user = ?
      AND id_bank_sampah = ?
      AND role = 'nasabah'
    `,
    [id_user, id_bank_sampah],
  );

  return result.affectedRows;
};

export const rejectNasabahAccount = async (id_user, id_bank_sampah) => {
  const [result] = await db.query(
    `
    UPDATE users
    SET status_akun = 'ditolak',
        status_aktif = 0
    WHERE id_user = ?
      AND id_bank_sampah = ?
      AND role = 'nasabah'
    `,
    [id_user, id_bank_sampah],
  );

  return result.affectedRows;
};

export const resetNasabahPassword = async (
  id_user,
  id_bank_sampah,
  password,
) => {
  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await db.query(
    `
    UPDATE users
    SET password_hash = ?
    WHERE id_user = ?
      AND id_bank_sampah = ?
      AND role = 'nasabah'
    `,
    [password_hash, id_user, id_bank_sampah],
  );

  return result.affectedRows;
};
