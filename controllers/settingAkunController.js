import bcrypt from "bcryptjs";
import crypto from "crypto";
import AccountModel from "../models/settingAkunModel.js";

// nanti isi email service lu sendiri
// import sendEmail from "../utils/sendEmail.js";

export const getMe = async (req, res) => {
  try {
    const { id_user } = req.user;

    const user = await AccountModel.getMe(id_user);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal mengambil data akun",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id_user } = req.user;

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        message: "Username wajib diisi",
      });
    }

    const existing = await AccountModel.findByUsername(username);

    if (existing && existing.id_user !== id_user) {
      return res.status(400).json({
        message: "Username sudah digunakan",
      });
    }

    let foto_profil = null;

    if (req.file) {
      foto_profil = req.file.filename;
    }

    await AccountModel.updateProfile(id_user, username, foto_profil);

    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
    });
    window.dispatchEvent(new Event("profile-updated"));
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal update profil",
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { id_user } = req.user;

    const { password_lama, password_baru, konfirmasi_password } = req.body;

    if (!password_lama || !password_baru || !konfirmasi_password) {
      return res.status(400).json({
        message: "Semua field wajib diisi",
      });
    }

    if (password_baru !== konfirmasi_password) {
      return res.status(400).json({
        message: "Konfirmasi password tidak cocok",
      });
    }

    const user = await AccountModel.getPasswordById(id_user);

    const isMatch = await bcrypt.compare(password_lama, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        message: "Password lama salah",
      });
    }

    const hashed = await bcrypt.hash(password_baru, 10);

    await AccountModel.updatePassword(id_user, hashed);

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal update password",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email wajib diisi",
      });
    }

    const user = await AccountModel.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        message: "Email tidak ditemukan",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expired = new Date(Date.now() + 1000 * 60 * 15);

    await AccountModel.saveResetToken(user.id_user, token, expired);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    console.log(resetLink);

    /*
    await sendEmail({
      to: email,
      subject: "Reset Password",
      html: `
        <h2>Reset Password</h2>

        <p>
          Klik link berikut untuk reset password:
        </p>

        <a href="${resetLink}">
          Reset Password
        </a>
      `,
    });
    */

    res.json({
      success: true,
      message: "Link reset password berhasil dikirim",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal forgot password",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password_baru, konfirmasi_password } = req.body;

    if (password_baru !== konfirmasi_password) {
      return res.status(400).json({
        message: "Konfirmasi password tidak cocok",
      });
    }

    const resetData = await AccountModel.getResetToken(token);

    if (!resetData) {
      return res.status(400).json({
        message: "Token tidak valid",
      });
    }

    if (new Date(resetData.expired_at) < new Date()) {
      return res.status(400).json({
        message: "Token sudah expired",
      });
    }

    const hashed = await bcrypt.hash(password_baru, 10);

    await AccountModel.updatePassword(resetData.id_user, hashed);

    await AccountModel.deleteResetToken(token);

    res.json({
      success: true,
      message: "Password berhasil direset",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal reset password",
    });
  }
};
