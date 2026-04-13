import NasabahModel from "../models/nasabahModel.js";

const NasabahController = {
  // SUPERADMIN
  getBankSampahNasabah: async (req, res) => {
    try {
      const data = await NasabahModel.getBankSampahWithCount();

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
        id_bank_sampah,
        rekening.nomor_urut,
      );

      res.json({
        success: true,
        nomor_rekening: rekening.nomor_rekening,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
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
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  deleteNasabah: async (req, res) => {
    try {
      const { id_nasabah } = req.params;

      await NasabahModel.deleteNasabah(id_nasabah);

      res.json({
        success: true,
        message: "Nasabah berhasil dihapus",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  getNasabahSelect: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;
      const keyword = req.query.keyword || "";

      const data = await NasabahModel.getNasabahSelect(id_bank_sampah, keyword);

      res.json(data);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },

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
        return res.status(404).json({ message: "Nasabah tidak ditemukan" });
      }

      res.json(data);
    } catch (err) {
      console.error("ERROR CONTROLLER:", err.message);

      res.status(500).json({
        message: err.message,
      });
    }
  },
};

export default NasabahController;
