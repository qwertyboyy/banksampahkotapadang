import {
  findUserByUsername,
  findUserByEmail,
  createUser,
  loginUser,
} from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
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
    console.log("USER LOGIN:", req.user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
