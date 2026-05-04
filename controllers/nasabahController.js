import NasabahModel from "../models/nasabahModel.js";
<<<<<<< HEAD
import pool from "../config/db.js";

const NasabahController = {
  // ================= SUPERADMIN =================

=======

const NasabahController = {
  // SUPERADMIN
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
  getBankSampahNasabah: async (req, res) => {
    try {
      const data = await NasabahModel.getBankSampahWithCount();

<<<<<<< HEAD
      res.json({ success: true, data });
    } catch (error) {
      console.error("ERROR getBankSampahNasabah:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getNasabahByBank: async (req, res) => {
    try {
      const { id_bank_sampah } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";
=======
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // SUPERADMIN
  getNasabahByBank: async (req, res) => {
    try {
      const { id_bank_sampah } = req.params;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      const offset = (page - 1) * limit;

      const data = await NasabahModel.getNasabahByBank(
        id_bank_sampah,
        limit,
        offset,
        search,
      );

      const total = await NasabahModel.getTotalNasabahByBank(
        id_bank_sampah,
        search,
      );

<<<<<<< HEAD
      res.json({ success: true, data, total, page, limit });
    } catch (error) {
      console.error("ERROR getNasabahByBank:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= ADMIN BANK =================

  getNasabahAdminBank: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";
=======
      res.json({
        success: true,
        data,
        total,
        page,
        limit,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ADMIN BANK
  getNasabahAdminBank: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      const offset = (page - 1) * limit;

      const data = await NasabahModel.getNasabahByBank(
        id_bank_sampah,
        limit,
        offset,
        search,
      );

      const total = await NasabahModel.getTotalNasabahByBank(
        id_bank_sampah,
        search,
      );

<<<<<<< HEAD
      res.json({ success: true, data, total, page, limit });
    } catch (error) {
      console.error("ERROR getNasabahAdminBank:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= CREATE NASABAH =================

  createNasabah: async (req, res) => {
    console.log("REQ.USER FULL:", req.user);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const id_bank_sampah = req.user.id_bank_sampah;
      console.log("ID BANK:", id_bank_sampah, typeof id_bank_sampah);
      console.log("REQ USER CREATE:", req.user);
      const { nama_nasabah, nik, alamat, no_hp } = req.body;

      const rekening = await NasabahModel.generateNomorRekening(
        conn,
        id_bank_sampah,
      );

      await conn.query(
        `INSERT INTO nasabah
         (id_bank_sampah, nomor_urut, nomor_rekening, nama_nasabah, nik, alamat, no_hp, saldo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          id_bank_sampah,
          rekening.nomor_urut,
          rekening.nomor_rekening,
          nama_nasabah,
          nik,
          alamat,
          no_hp,
        ],
      );

      await NasabahModel.updateCounterNasabah(
        conn,
=======
      res.json({
        success: true,
        data,
        total,
        page,
        limit,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // CREATE NASABAH
  createNasabah: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;

      const { nama_nasabah, nik, alamat, no_hp } = req.body;

      const rekening = await NasabahModel.generateNomorRekening(id_bank_sampah);

      await NasabahModel.createNasabah({
        id_bank_sampah,
        nomor_urut: rekening.nomor_urut,
        nomor_rekening: rekening.nomor_rekening,
        nama_nasabah,
        nik,
        alamat,
        no_hp,
      });

      await NasabahModel.updateCounterNasabah(
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
        id_bank_sampah,
        rekening.nomor_urut,
      );

<<<<<<< HEAD
      await conn.commit();

=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      res.json({
        success: true,
        nomor_rekening: rekening.nomor_rekening,
      });
    } catch (error) {
<<<<<<< HEAD
      await conn.rollback();
      console.error("ERROR createNasabah:", error);
=======
      console.error(error);
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

      res.status(500).json({
        success: false,
        message: error.message,
      });
<<<<<<< HEAD
    } finally {
      conn.release();
    }
  },

  // ================= PREVIEW REKENING =================

  previewRekening: async (req, res) => {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const id_bank_sampah = req.user?.id_bank_sampah;

      if (!id_bank_sampah) {
        throw new Error("Unauthorized / id_bank_sampah tidak ditemukan");
      }

      const rekening = await NasabahModel.generateNomorRekening(
        conn,
        id_bank_sampah,
      );

      await conn.rollback(); // preview only

      res.json({
        success: true,
        nomor_rekening: rekening.nomor_rekening,
      });
    } catch (error) {
      await conn.rollback();
      console.error("ERROR previewRekening:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    } finally {
      conn.release();
    }
  },

  // ================= UPDATE =================

  updateNasabah: async (req, res) => {
    try {
      const { id_nasabah } = req.params;
=======
    }
  },
  previewRekening: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;

      const rekening = await NasabahModel.generateNomorRekening(id_bank_sampah);

      res.json({
        nomor_rekening: rekening.nomor_rekening,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },

  updateNasabah: async (req, res) => {
    try {
      const { id_nasabah } = req.params;

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      const { nama_nasabah, nik, alamat, no_hp, status_aktif } = req.body;

      await NasabahModel.updateNasabah(id_nasabah, {
        nama_nasabah,
        nik,
        alamat,
        no_hp,
        status_aktif,
      });

      res.json({
        success: true,
        message: "Nasabah berhasil diperbarui",
      });
    } catch (error) {
<<<<<<< HEAD
      console.error("ERROR updateNasabah:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= DELETE =================

=======
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
  deleteNasabah: async (req, res) => {
    try {
      const { id_nasabah } = req.params;

      await NasabahModel.deleteNasabah(id_nasabah);

      res.json({
        success: true,
        message: "Nasabah berhasil dihapus",
      });
    } catch (error) {
<<<<<<< HEAD
      console.error("ERROR deleteNasabah:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= SELECT =================

=======
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
  getNasabahSelect: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;
      const keyword = req.query.keyword || "";

      const data = await NasabahModel.getNasabahSelect(id_bank_sampah, keyword);

      res.json(data);
    } catch (error) {
<<<<<<< HEAD
      console.error("ERROR getNasabahSelect:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ================= SALDO =================

=======
      res.status(500).json({
        message: error.message,
      });
    }
  },

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
  getSaldoNasabah: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id_nasabah } = req.params;
      const id_bank_sampah = req.user.id_bank_sampah;

      const data = await NasabahModel.getSaldoNasabah(
        id_nasabah,
        id_bank_sampah,
      );

      if (!data) {
<<<<<<< HEAD
        return res.status(404).json({
          message: "Nasabah tidak ditemukan",
        });
=======
        return res.status(404).json({ message: "Nasabah tidak ditemukan" });
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      }

      res.json(data);
    } catch (err) {
<<<<<<< HEAD
      console.error("ERROR getSaldoNasabah:", err);
      res.status(500).json({ message: err.message });
=======
      console.error("ERROR CONTROLLER:", err.message);

      res.status(500).json({
        message: err.message,
      });
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    }
  },
};

export default NasabahController;
