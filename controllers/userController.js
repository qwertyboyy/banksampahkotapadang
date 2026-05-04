import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import * as UserModel from "../models/userModel.js";
import NasabahModel from "../models/nasabahModel.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await loginUser(username);

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (user.status_aktif === 0) {
      return res.status(403).json({ message: "User tidak aktif" });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    console.log("LOGIN VERSION V2 - IDENTIFIER ACTIVE");
    res.json({
      token,
      user: {
        id_user: user.id_user,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const search = req.query.search || "";

    const users = await UserModel.getAllUsers(search);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const unActivateUser = async (req, res) => {
  const id = req.params.id;

  await UserModel.unActivateUser(id);
  res.json({
    message: "User berhasil dinonaktifkan",
  });
};

export const activateUser = async (req, res) => {
  const id = req.params.id;

  await UserModel.activateUser(id);

  res.json({
    message: "User berhasil diaktifkan",
  });
};

export const addUser = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { nama_lengkap, email, username, password, role, id_bank_sampah } =
      req.body;

    const existingUser = await UserModel.findUserByUsername(username);

    if (existingUser) {
      return res.status(400).json({
        message: "Username sudah digunakan",
      });
    }

    const existingEmail = await UserModel.findUserByEmail(email);

    if (existingEmail) {
      return res.status(400).json({
        message: "Email sudah digunakan",
      });
    }

    await conn.beginTransaction();

    const password_hash = await bcrypt.hash(password, 10);

    let id_nasabah = null;

    if (role === "nasabah") {
      if (!id_bank_sampah) {
        throw new Error("Bank sampah wajib dipilih");
      }

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
          req.body.nik || null,
          req.body.alamat || null,
          req.body.no_hp || null,
        ],
      );

      await NasabahModel.updateCounterNasabah(
        conn,
        id_bank_sampah,
        rekening.nomor_urut,
      );

      id_nasabah = result.insertId;
    }

    await UserModel.createUser(conn, {
      nama_lengkap,
      email,
      username,
      password_hash,
      role,
      id_bank_sampah: id_bank_sampah || null,
      id_nasabah,
    });

    await conn.commit();

    res.json({
      message: "User berhasil dibuat",
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

export const editUser = async (req, res) => {
  try {
    const id = req.params.id;

    await UserModel.updateUser(id, req.body);

    res.json({
      message: "User berhasil diperbarui",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body;

    await UserModel.resetPassword(id, password);

    res.json({
      message: "Password berhasil direset",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeUser = async (req, res) => {
  try {
    const id = req.params.id;

    await UserModel.deleteUser(id);

    res.json({
      message: "User berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
