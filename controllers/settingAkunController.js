import bcrypt from "bcryptjs";
import AccountModel from "../models/settingAkunModel.js";


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

    const user = await AccountModel.getMe(id_user);

    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: user,
    });
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

