import {
  findUserByUsername,
  findUserByEmail,
  createUser,
  loginUser,
} from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
<<<<<<< HEAD
import crypto from "crypto";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import NasabahModel from "../models/nasabahModel.js";

dotenv.config();

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email/Username dan password wajib diisi",
      });
    }

    const user = await loginUser(identifier);

    if (!user) {
      return res.status(401).json({
        message: "Email/Username atau password salah",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        message: "Email/Username atau password salah",
      });
    }

    // 🔥 CEK STATUS AKUN
    if (user.status_akun !== "aktif") {
      return res.status(403).json({
        message: "Akun belum diverifikasi admin",
      });
    }
=======
dotenv.config();

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const {
      nama_lengkap,
      username,
      email,
      password,
      role,
      id_bank_sampah,
      id_nasabah,
    } = req.body;

    if (!nama_lengkap || !username || !password || !role) {
      return res
        .status(400)
        .json({ message: "Nama, username, password, dan role wajib diisi" });
    }

    if (!["superadmin", "admin_bank", "nasabah"].includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }

    // cek username & email
    if (await findUserByUsername(username))
      return res.status(400).json({ message: "Username sudah dipakai" });
    if (email && (await findUserByEmail(email)))
      return res.status(400).json({ message: "Email sudah dipakai" });

    // validasi tambahan untuk admin_bank & nasabah
    if (role === "admin_bank" && !id_bank_sampah) {
      return res
        .status(400)
        .json({ message: "Admin bank wajib memiliki id_bank_sampah" });
    }

    if (role === "nasabah" && (!id_bank_sampah || !id_nasabah)) {
      return res.status(400).json({
        message: "Nasabah wajib memiliki id_bank_sampah dan id_nasabah",
      });
    }

    const id_user = await createUser({
      nama_lengkap,
      username,
      email,
      password,
      role,
      id_bank_sampah,
      id_nasabah,
    });

    res.status(201).json({
      message: "Register berhasil",
      user: {
        id_user,
        nama_lengkap,
        username,
        email,
        role,
        id_bank_sampah,
        id_nasabah,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });

    const user = await loginUser(username);
    if (!user)
      return res.status(401).json({ message: "Username atau password salah" });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword)
      return res.status(401).json({ message: "Username atau password salah" });
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

    const token = jwt.sign(
      {
        id_user: user.id_user,
        role: user.role,
        id_bank_sampah: user.id_bank_sampah,
        id_nasabah: user.id_nasabah,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({
      message: "Login sukses",
      token,
      user: {
        id_user: user.id_user,
        nama_lengkap: user.nama_lengkap,
        username: user.username,
        email: user.email,
        role: user.role,
        id_bank_sampah: user.id_bank_sampah,
        nama_bank_sampah: user.nama_bank_sampah,
        id_nasabah: user.id_nasabah,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
<<<<<<< HEAD
// POST /api/auth/register
export const register = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      nama_lengkap,
      username,
      email,
      password,
      role,
      id_bank_sampah,

      is_existing_nasabah,
      nomor_rekening,
      nik,
      alamat,
      no_hp,
    } = req.body;

    /* ================= VALIDASI ================= */

    if (!nama_lengkap || !username || !password || !role) {
      throw new Error("Data wajib belum lengkap");
    }

    if (await findUserByUsername(username)) {
      throw new Error("Username sudah dipakai");
    }

    if (email && (await findUserByEmail(email))) {
      throw new Error("Email sudah dipakai");
    }

    const password_hash = await bcrypt.hash(password, 10);

    let id_nasabah_final = null;
    let nomor_rekening_final = null; // 🔥 tambahan penting

    /* ================= KHUSUS NASABAH ================= */

    if (role === "nasabah") {
      if (!id_bank_sampah) {
        throw new Error("Nasabah wajib punya bank sampah");
      }

      // 🔥 CASE 1: NASABAH SUDAH ADA
      if (is_existing_nasabah) {
        if (!nomor_rekening) {
          throw new Error("Nomor rekening wajib diisi");
        }

        const [rows] = await conn.query(
          `SELECT id_nasabah, nomor_rekening
           FROM nasabah 
           WHERE nomor_rekening = ? AND id_bank_sampah = ?
           LIMIT 1`,
          [nomor_rekening, id_bank_sampah],
        );

        if (!rows.length) {
          throw new Error("Data nasabah tidak ditemukan");
        }

        id_nasabah_final = rows[0].id_nasabah;
        nomor_rekening_final = rows[0].nomor_rekening;
      }

      // 🔥 CASE 2: NASABAH BARU
      else {
        const rekening = await NasabahModel.generateNomorRekening(
          conn,
          id_bank_sampah,
        );

        const [result] = await conn.query(
          `INSERT INTO nasabah
           (id_bank_sampah, nomor_urut, nomor_rekening, nama_nasabah, nik, alamat, no_hp, saldo)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            id_bank_sampah,
            rekening.nomor_urut,
            rekening.nomor_rekening,
            nama_lengkap,
            nik,
            alamat,
            no_hp,
          ],
        );

        await NasabahModel.updateCounterNasabah(
          conn,
          id_bank_sampah,
          rekening.nomor_urut,
        );

        id_nasabah_final = result.insertId;
        nomor_rekening_final = rekening.nomor_rekening; // 🔥 simpan hasil generate
      }
    }

    /* ================= CREATE USER ================= */

    const id_user = await createUser(conn, {
      nama_lengkap,
      email,
      username,
      password_hash,
      role,
      id_bank_sampah,
      id_nasabah: id_nasabah_final,
    });

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Register berhasil",
      user: {
        id_user,
        username,
        role,
        id_bank_sampah,
        id_nasabah: id_nasabah_final,
        nomor_rekening: nomor_rekening_final, // 🔥 INI YANG LU BUTUH
      },
    });
    console.log("REKENING FINAL:", rekening.nomor_rekening);
  } catch (err) {
    await conn.rollback();
    console.error("ERROR REGISTER:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

export const checkNasabah = async (req, res) => {
  try {
    const { nomor_rekening, id_bank_sampah } = req.body;

    const [rows] = await pool.query(
      `SELECT id_nasabah, nama_nasabah 
       FROM nasabah 
       WHERE nomor_rekening = ? AND id_bank_sampah = ?`,
      [nomor_rekening, id_bank_sampah],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Nasabah tidak ditemukan" });
    }

    const id_nasabah = rows[0].id_nasabah;

    const [user] = await pool.query(
      `SELECT id_user FROM users WHERE id_nasabah = ?`,
      [id_nasabah],
    );

    if (user.length) {
      return res.status(400).json({ message: "Nasabah sudah punya akun" });
    }

    res.json({
      message: "Nasabah ditemukan",
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, token } = req.body;

    const [rows] = await pool.query(
      `SELECT * FROM verification_tokens
       WHERE email = ?
       AND token = ?
       AND expired_at > NOW()`,
      [email, token],
    );

    if (!rows.length) {
      return res.status(400).json({ message: "OTP tidak valid / expired" });
    }

    res.json({ message: "OTP valid" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const registerFinal = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      nama_lengkap,
      username,
      email,
      password,
      id_bank_sampah,
      nomor_rekening,
      is_existing_nasabah,
    } = req.body;

    // 🔥 VALIDASI DASAR
    if (!nama_lengkap || !username || !email || !password || !id_bank_sampah) {
      throw new Error("Data wajib belum lengkap");
    }

    // 🔥 CEK USERNAME & EMAIL
    const [checkUser] = await conn.query(
      `SELECT id_user FROM users WHERE username = ? OR email = ?`,
      [username, email],
    );

    if (checkUser.length) {
      throw new Error("Username atau email sudah digunakan");
    }

    // 🔥 CEK OTP VALID
    const [otpCheck] = await conn.query(
      `SELECT * FROM verification_tokens
       WHERE email = ? AND expired_at > NOW()`,
      [email],
    );

    if (!otpCheck.length) {
      throw new Error("OTP belum diverifikasi atau sudah expired");
    }

    let id_nasabah;

    // ===============================
    // 🔥 NASABAH EXISTING
    // ===============================
    if (is_existing_nasabah) {
      if (!nomor_rekening) {
        throw new Error("Nomor rekening wajib diisi");
      }

      const [rows] = await conn.query(
        `SELECT id_nasabah 
         FROM nasabah 
         WHERE nomor_rekening = ? AND id_bank_sampah = ?`,
        [nomor_rekening, id_bank_sampah],
      );

      if (!rows.length) {
        throw new Error("Nasabah tidak ditemukan");
      }

      id_nasabah = rows[0].id_nasabah;

      // 🔥 CEK SUDAH PUNYA AKUN
      const [userCheck] = await conn.query(
        `SELECT id_user FROM users WHERE id_nasabah = ?`,
        [id_nasabah],
      );

      if (userCheck.length) {
        throw new Error("Nasabah ini sudah memiliki akun");
      }
    } else {
      // ===============================
      // 🔥 NASABAH BARU
      // ===============================
      const rekening = await NasabahModel.generateNomorRekening(
        conn,
        id_bank_sampah,
      );

      const [result] = await conn.query(
        `INSERT INTO nasabah 
   (id_bank_sampah, nomor_urut, nomor_rekening, nama_nasabah, saldo) 
   VALUES (?, ?, ?, ?, 0)`,
        [
          id_bank_sampah,
          rekening.nomor_urut,
          rekening.nomor_rekening,
          nama_lengkap,
        ],
      );

      // 🔥 JANGAN LUPA INI (sering dilupakan)
      await NasabahModel.updateCounterNasabah(
        conn,
        id_bank_sampah,
        rekening.nomor_urut,
      );
    }

    // ===============================
    // 🔥 CREATE USER (LOGIC BARU)
    // ===============================
    const password_hash = await bcrypt.hash(password, 10);

    // 🔥 INI PERUBAHAN INTI
    let status_akun = "pending";
    let status_aktif = 0;

    if (is_existing_nasabah) {
      status_akun = "aktif";
      status_aktif = 1;
    }

    const [resultUser] = await conn.query(
      `INSERT INTO users 
       (
         nama_lengkap,
         email,
         username,
         password_hash,
         role,
         id_bank_sampah,
         id_nasabah,
         status_aktif,
         status_akun,
         email_verified_at
       ) 
       VALUES (?, ?, ?, ?, 'nasabah', ?, ?, ?, ?, NOW())`,
      [
        nama_lengkap,
        email,
        username,
        password_hash,
        id_bank_sampah,
        id_nasabah,
        status_aktif,
        status_akun,
      ],
    );

    // 🔥 HAPUS OTP (ANTI REUSE)
    await conn.query(`DELETE FROM verification_tokens WHERE email = ?`, [
      email,
    ]);

    await conn.commit();

    res.status(201).json({
      message: is_existing_nasabah
        ? "Registrasi berhasil! Akun langsung aktif."
        : "Registrasi berhasil, menunggu verifikasi admin",
      id_user: resultUser.insertId,
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id_user } = req.params;
    const { id_bank_sampah, role } = req.user;

    // 🔥 ambil user target
    const [rows] = await pool.query(
      `SELECT id_user, id_bank_sampah FROM users WHERE id_user = ?`,
      [id_user],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const targetUser = rows[0];

    // 🔥 CEK TENANT
    if (role === "admin_bank" && targetUser.id_bank_sampah !== id_bank_sampah) {
      return res.status(403).json({
        message: "Tidak punya akses ke user ini",
      });
    }

    // 🔥 APPROVE
    await pool.query(
      `UPDATE users 
       SET status_akun = 'aktif', status_aktif = 1 
       WHERE id_user = ?`,
      [id_user],
    );

    res.json({ message: "User berhasil di-approve" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { id_user } = req.params;
    const { id_bank_sampah, role } = req.user;

    const [rows] = await pool.query(
      `SELECT id_user, id_bank_sampah FROM users WHERE id_user = ?`,
      [id_user],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const targetUser = rows[0];

    if (role === "admin_bank" && targetUser.id_bank_sampah !== id_bank_sampah) {
      return res.status(403).json({
        message: "Tidak punya akses ke user ini",
      });
    }

    await pool.query(
      `UPDATE users 
       SET status_akun = 'ditolak', status_aktif = 0 
       WHERE id_user = ?`,
      [id_user],
    );

    res.json({ message: "User ditolak" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi" });
    }

    const token = crypto.randomInt(100000, 999999).toString();
    const expired = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO verification_tokens (email, token, expired_at)
       VALUES (?, ?, ?)`,
      [email, token, expired],
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Kode OTP",
      html: `
  <div style="font-family: 'Segoe UI', Georgia, sans-serif; background:#f0f2f0; padding: 32px 16px;">
    <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; border: 1px solid #e2e8e4;">

      <!-- Header -->
      <div style="background:#1a3a2a; padding: 32px 40px 24px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="#4ade80" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M12 2v20M4 7l8 5 8-5" stroke="#4ade80" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <span style="font-size:16px; font-weight:600; color:#f0fdf4; letter-spacing:0.02em;">Bank Sampah Kota Padang</span>
        </div>
        <p style="font-size:12px; color:#86efac; margin:0; letter-spacing:0.04em;">Pengelolaan Sampah Berbasis Masyarakat</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px 40px;">
        <p style="font-size:12px; color:#6b7280; margin:0 0 4px; text-transform:uppercase; letter-spacing:0.06em; font-weight:600;">Verifikasi Akun</p>
        <h2 style="font-size:20px; font-weight:600; color:#111827; margin:0 0 20px;">Kode OTP Anda</h2>

        <p style="font-size:14px; color:#4b5563; line-height:1.7; margin:0 0 28px;">
          Halo! Gunakan kode berikut untuk menyelesaikan verifikasi akun Anda.
          Kode ini bersifat rahasia dan hanya berlaku untuk satu kali penggunaan.
        </p>

        <!-- OTP Box -->
        <div style="background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb; padding:24px; text-align:center; margin-bottom:28px;">
          <p style="font-size:11px; color:#9ca3af; margin:0 0 12px; text-transform:uppercase; letter-spacing:0.08em;">Kode Verifikasi</p>
          <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
            ${token
              .split("")
              .map(
                (char) => `
              <span style="
                display:inline-block;
                background:#ffffff;
                border:1px solid #d1d5db;
                border-radius:6px;
                width:44px; height:52px;
                line-height:52px;
                text-align:center;
                font-size:24px;
                font-weight:700;
                color:#16a34a;
                font-family: 'Courier New', monospace;
              ">${char}</span>
            `,
              )
              .join("")}
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-top:16px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="#6b7280" stroke-width="1.5"/>
              <path d="M12 7v5l3 3" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span style="font-size:12px; color:#6b7280;">Berlaku selama <strong style="color:#374151;">5 menit</strong></span>
          </div>
        </div>

        <!-- Warning -->
        <div style="background:#fefce8; border:1px solid #fde68a; border-radius:8px; padding:14px 16px; display:flex; gap:10px; align-items:flex-start; margin-bottom:28px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0; margin-top:1px">
            <path d="M12 2L2 20h20L12 2z" stroke="#92400e" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M12 10v4M12 17v.5" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p style="font-size:12px; color:#78350f; margin:0; line-height:1.6;">
            Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku dari tim Bank Sampah Kota Padang.
          </p>
        </div>

        <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.7;">
          Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Akun Anda tetap aman.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #f3f4f6; padding:20px 40px; display:flex; justify-content:space-between; align-items:center;">
        <p style="font-size:11px; color:#9ca3af; margin:0;">© 2025 Bank Sampah Kota Padang</p>
        <p style="font-size:11px; color:#9ca3af; margin:0;">Dikirim otomatis — jangan balas email ini</p>
      </div>

    </div>
  </div>
`,
    });

    res.json({ message: "OTP berhasil dikirim" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal kirim OTP" });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const { id_bank_sampah, role } = req.user;

    let query = `
      SELECT id_user, nama_lengkap, username, email, created_at
      FROM users
      WHERE status_akun = 'pending'
    `;

    let params = [];

    // 🔥 FILTER TENANT
    if (role === "admin_bank") {
      query += " AND id_bank_sampah = ?";
      params.push(id_bank_sampah);
    }

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
