import pool from "../config/db.js";
import bcrypt from "bcryptjs";

export const loginUser = async (identifier) => {
  const [rows] = await pool.query(
    `SELECT 
        u.id_user,
        u.nama_lengkap,
        u.username,
        u.email,
        u.password_hash,
        u.role,
        u.id_bank_sampah,
        b.nama_bank_sampah,
        u.id_nasabah,
        u.status_aktif,
        u.status_akun
     FROM users u
     LEFT JOIN bank_sampah b 
     ON u.id_bank_sampah = b.id_bank_sampah
     WHERE u.username = ? OR u.email = ?
     LIMIT 1`,
    [identifier, identifier],
  );

  return rows[0] || null;
};

/* ================================
   FIND USER
================================ */

export const findUserByUsername = async (username) => {
  const [rows] = await pool.query(
    `SELECT id_user, username, email, role 
     FROM users 
     WHERE username = ? 
     LIMIT 1`,
    [username],
  );

  return rows[0] || null;
};

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT id_user, username, email 
     FROM users 
     WHERE email = ? 
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
};

/* ================================
   NASABAH
================================ */

export const createNasabah = async (conn, nama_lengkap, id_bank_sampah) => {
  const [result] = await conn.query(
    `INSERT INTO nasabah
     (nama_nasabah, id_bank_sampah, saldo)
     VALUES (?, ?, 0)`,
    [nama_lengkap, id_bank_sampah],
  );

  return result.insertId;
};

/* ================================
   CREATE USER
================================ */

export const createUser = async (
  conn,
  {
    nama_lengkap,
    email,
    username,
    password_hash,
    role,
    id_bank_sampah,
    id_nasabah,
  },
) => {
  const [result] = await conn.query(
    `INSERT INTO users
     (
       nama_lengkap,
       email,
       username,
       password_hash,
       role,
       id_bank_sampah,
       id_nasabah,
       status_aktif
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      nama_lengkap,
      email,
      username,
      password_hash,
      role,
      id_bank_sampah ?? null,
      id_nasabah ?? null,
    ],
  );

  return result.insertId;
};

/* ================================
   GET USERS
================================ */

export const getAllUsers = async (search = "") => {
  let query = `
    SELECT 
      u.id_user,
      u.nama_lengkap,
      u.username,
      u.email,
      u.status_aktif,
      u.role,
      u.id_bank_sampah,
      u.id_nasabah,
      b.nama_bank_sampah
    FROM users u
    LEFT JOIN bank_sampah b 
      ON u.id_bank_sampah = b.id_bank_sampah
  `;

  const params = [];

  if (search) {
    query += `
      WHERE 
        u.nama_lengkap LIKE ?
        OR u.username LIKE ?
        OR u.email LIKE ?
    `;

    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY u.id_user DESC`;

  const [rows] = await pool.query(query, params);

  return rows;
};

/* ================================
   UPDATE USER
================================ */

export const updateUser = async (
  id_user,
  { nama_lengkap, username, email, role },
) => {
  const [result] = await pool.query(
    `UPDATE users
     SET 
        nama_lengkap = ?,
        username = ?,
        email = ?,
        role = ?
     WHERE id_user = ?`,
    [nama_lengkap, username, email, role, id_user],
  );

  return result.affectedRows;
};

/* ================================
   RESET PASSWORD
================================ */

export const resetPassword = async (id_user, password) => {
  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `UPDATE users
     SET password_hash = ?
     WHERE id_user = ?`,
    [password_hash, id_user],
  );

  return result.affectedRows;
};

/* ================================
   DELETE USER
================================ */

export const deleteUser = async (id_user) => {
  const [result] = await pool.query(`DELETE FROM users WHERE id_user = ?`, [
    id_user,
  ]);

  return result.affectedRows;
};

export const activateUser = async (id_user) => {
  const [result] = await pool.query(
    `UPDATE users SET status_aktif = 1 WHERE id_user = ?`,
    [id_user],
  );

  return result.affectedRows;
};

export const unActivateUser = async (id_user) => {
  const [result] = await pool.query(
    `UPDATE users SET status_aktif = 0 WHERE id_user = ?`,
    [id_user],
  );

  return result.affectedRows;
};

// ================= OTP =================

export const saveVerificationToken = async (conn, email, token, expired_at) => {
  await conn.query(
    `UPDATE users 
     SET verification_token = ?, verification_expired_at = ?
     WHERE email = ?`,
    [token, expired_at, email],
  );
};

export const findUserByToken = async (token) => {
  const [rows] = await pool.query(
    `SELECT * FROM users 
     WHERE verification_token = ? 
     AND verification_expired_at > NOW()
     LIMIT 1`,
    [token],
  );

  return rows[0] || null;
};
