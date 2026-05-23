// models/accountModel.js

import db from "../config/db.js";

class AccountModel {
  static async getMe(id_user) {
    const [rows] = await db.query(
      `SELECT
        id_user,
        nama_lengkap,
        email,
        username,
        role,
        foto_profil,
        status_akun
      FROM users
      WHERE id_user = ?
      LIMIT 1`,
      [id_user],
    );

    return rows[0];
  }

  static async findByUsername(username) {
    const [rows] = await db.query(
      `SELECT
        id_user,
        username
      FROM users
      WHERE username = ?
      LIMIT 1`,
      [username],
    );

    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT
        id_user,
        email
      FROM users
      WHERE email = ?
      LIMIT 1`,
      [email],
    );

    return rows[0];
  }

  static async getPasswordById(id_user) {
    const [rows] = await db.query(
      `SELECT
        id_user,
        password_hash
      FROM users
      WHERE id_user = ?
      LIMIT 1`,
      [id_user],
    );

    return rows[0];
  }

  static async updateProfile(id_user, username, foto_profil) {
    if (foto_profil) {
      await db.query(
        `UPDATE users
        SET
          username = ?,
          foto_profil = ?
        WHERE id_user = ?`,
        [username, foto_profil, id_user],
      );
    } else {
      await db.query(
        `UPDATE users
        SET
          username = ?
        WHERE id_user = ?`,
        [username, id_user],
      );
    }
  }

  static async updatePassword(id_user, password_hash) {
    await db.query(
      `UPDATE users
      SET password_hash = ?
      WHERE id_user = ?`,
      [password_hash, id_user],
    );
  }

  static async saveResetToken(id_user, token, expired_at) {
    await db.query(
      `INSERT INTO password_resets (
        id_user,
        token,
        expired_at
      )
      VALUES (?, ?, ?)`,
      [id_user, token, expired_at],
    );
  }

  static async getResetToken(token) {
    const [rows] = await db.query(
      `SELECT
        *
      FROM password_resets
      WHERE token = ?
      LIMIT 1`,
      [token],
    );

    return rows[0];
  }

  static async deleteResetToken(token) {
    await db.query(
      `DELETE FROM password_resets
      WHERE token = ?`,
      [token],
    );
  }
}

export default AccountModel;
