import { hashToken } from "../middlewares/security.js";
import db from "../config/db.js";

// =============================================
// FIND USER BY EMAIL
// =============================================
export const findUserByEmail = async (email) => {
  const [rows] = await db.execute(
    `
    SELECT
      id_user,
      email,
      status_aktif,
      status_akun,
      email_verified_at
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [email],
  );

  return rows[0];
};

// =============================================
// DELETE OLD RESET TOKEN
// =============================================
export const deleteOldResetToken = async (email) => {
  await db.execute(
    `
    DELETE FROM verification_tokens
    WHERE
      email = ?
      AND purpose = 'reset_password'
    `,
    [email],
  );
};

// =============================================
// SAVE RESET TOKEN
// =============================================
export const saveResetToken = async ({ email, token, expired_at }) => {
  await db.execute(
    `
    INSERT INTO verification_tokens
    (
      email,
      token,
      purpose,
      expired_at
    )
    VALUES (?, ?, 'reset_password', ?)
    `,
    [email, hashToken(token), expired_at],
  );
};

// =============================================
// VERIFY RESET TOKEN
// =============================================
export const verifyResetToken = async ({ email, token }) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM verification_tokens
    WHERE
      email = ?
      AND token = ?
      AND purpose = 'reset_password'
      AND expired_at > NOW()
    ORDER BY id DESC
    LIMIT 1
    `,
    [email, hashToken(token)],
  );

  return rows[0];
};

// =============================================
// UPDATE PASSWORD
// =============================================
export const updatePassword = async ({ email, password_hash }) => {
  await db.execute(
    `
    UPDATE users
    SET session_version = session_version + 1, password_hash = ?
    WHERE email = ?
    `,
    [password_hash, email],
  );
};

// =============================================
// DELETE TOKEN AFTER SUCCESS
// =============================================
export const deleteResetTokenAfterUsed = async (email) => {
  await db.execute(
    `
    DELETE FROM verification_tokens
    WHERE
      email = ?
      AND purpose = 'reset_password'
    `,
    [email],
  );
};

export const consumeResetToken = async ({ email, token, password_hash }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT id FROM verification_tokens WHERE email = ? AND token = ? AND purpose = 'reset_password' AND expired_at > NOW() FOR UPDATE", [email, hashToken(token)]);
    if (!rows.length) { await conn.rollback(); return false; }
    await conn.query("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE email = ? AND status_akun = 'aktif' AND status_aktif = 1", [password_hash, email]);
    await conn.query("DELETE FROM verification_tokens WHERE email = ? AND purpose = 'reset_password'", [email]);
    await conn.commit();
    return true;
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
};
