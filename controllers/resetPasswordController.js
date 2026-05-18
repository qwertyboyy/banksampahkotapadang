import bcrypt from "bcryptjs";

import {
  findUserByEmail,
  deleteOldResetToken,
  saveResetToken,
  verifyResetToken,
  updatePassword,
  deleteResetTokenAfterUsed,
} from "../models/resetPasswordModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
console.log("RESET CONTROLLER LOADED");
//git lagi

// =============================================
// REQUEST RESET PASSWORD
// =============================================

export const requestResetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    const user = await findUserByEmail(email);

    // response generic
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Jika email terdaftar, OTP akan dikirim",
      });
    }
    console.log("USER:", user);
    console.log("STATUS AKTIF:", user?.status_aktif);
    console.log("STATUS AKUN:", user?.status_akun);
    console.log("EMAIL VERIFIED:", user?.email_verified_at);

    // cek akun aktif
    if (!user.status_aktif) {
      return res.status(403).json({
        success: false,
        message: "Akun tidak aktif",
      });
    }

    // cek status akun
    if (user.status_akun !== "aktif") {
      return res.status(403).json({
        success: false,
        message: "Akun belum aktif",
      });
    }

    // cek email verified
    if (!user.email_verified_at) {
      return res.status(403).json({
        success: false,
        message: "Email belum diverifikasi",
      });
    }

    // generate OTP 6 digit
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // expired 15 menit
    const expired_at = new Date(Date.now() + 15 * 60 * 1000);

    // hapus token lama
    await deleteOldResetToken(email);
    console.log("SEBELUM SAVE TOKEN");

    // simpan token baru
    await saveResetToken({
      email,
      token,
      expired_at,
    });
    console.log("SETELAH SAVE TOKEN");

    // TODO:
    // kirim OTP ke email user
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Bank Sampah" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Password - OTP Verification",

      html: `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: auto;
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
    ">

      <h2 style="
        color: #16a34a;
        margin-bottom: 12px;
      ">
        Reset Password
      </h2>

      <p style="
        color: #334155;
        font-size: 15px;
        line-height: 1.6;
      ">
        Kami menerima permintaan reset password untuk akun Anda.
      </p>

      <p style="
        color: #334155;
        font-size: 15px;
        line-height: 1.6;
      ">
        Gunakan kode OTP berikut untuk melanjutkan proses reset password:
      </p>

      <div style="
        margin: 24px 0;
        text-align: center;
      ">
        <span style="
          display: inline-block;
          padding: 14px 28px;
          background: #16a34a;
          color: white;
          font-size: 32px;
          font-weight: bold;
          border-radius: 12px;
          letter-spacing: 6px;
        ">
          ${token}
        </span>
      </div>

      <p style="
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
      ">
        OTP berlaku selama 15 menit.
      </p>

      <p style="
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
      ">
        Jika Anda tidak meminta reset password, abaikan email ini.
      </p>

      <hr style="
        margin: 24px 0;
        border: none;
        border-top: 1px solid #e2e8f0;
      ">

      <p style="
        color: #94a3b8;
        font-size: 12px;
        text-align: center;
      ">
        Sistem Bank Sampah
      </p>
    </div>
  `,
    });
    // sementara tampilkan OTP dulu
    return res.status(200).json({
      success: true,
      message: "Jika email terdaftar, OTP akan dikirim",
      otp: token,
    });
  } catch (error) {
    console.error(error);
    console.error("RESET PASSWORD ERROR:");
    console.error(error.message);
    console.error(error.sqlMessage);
    console.error(error.sql);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

// =============================================
// RESET PASSWORD
// =============================================
export const resetPassword = async (req, res) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        success: false,
        message: "Data tidak lengkap",
      });
    }

    // verify token
    const validToken = await verifyResetToken({
      email,
      token,
    });

    if (!validToken) {
      return res.status(400).json({
        success: false,
        message: "OTP tidak valid atau expired",
      });
    }

    // hash password baru
    const password_hash = await bcrypt.hash(password, 10);

    // update password
    await updatePassword({
      email,
      password_hash,
    });

    // hapus token setelah dipakai
    await deleteResetTokenAfterUsed(email);

    return res.status(200).json({
      success: true,
      message: "Password berhasil direset",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};
