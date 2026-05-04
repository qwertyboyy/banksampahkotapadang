import NasabahModel from "../models/nasabahModel.js";
import pool from "../config/db.js";

const NasabahController = {
  // ================= SUPERADMIN =================

  getBankSampahNasabah: async (req, res) => {
    try {
      const data = await NasabahModel.getBankSampahWithCount();

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
        id_bank_sampah,
        rekening.nomor_urut,
      );

      await conn.commit();

      res.json({
        success: true,
        nomor_rekening: rekening.nomor_rekening,
      });
    } catch (error) {
      await conn.rollback();
      console.error("ERROR createNasabah:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
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
      console.error("ERROR updateNasabah:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= DELETE =================

  deleteNasabah: async (req, res) => {
    try {
      const { id_nasabah } = req.params;

      await NasabahModel.deleteNasabah(id_nasabah);

      res.json({
        success: true,
        message: "Nasabah berhasil dihapus",
      });
    } catch (error) {
      console.error("ERROR deleteNasabah:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= SELECT =================

  getNasabahSelect: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;
      const keyword = req.query.keyword || "";

      const data = await NasabahModel.getNasabahSelect(id_bank_sampah, keyword);

      res.json(data);
    } catch (error) {
      console.error("ERROR getNasabahSelect:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ================= SALDO =================

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
        return res.status(404).json({
          message: "Nasabah tidak ditemukan",
        });
      }

      res.json(data);
    } catch (err) {
      console.error("ERROR getSaldoNasabah:", err);
      res.status(500).json({ message: err.message });
    }
  },
};

export default NasabahController;
