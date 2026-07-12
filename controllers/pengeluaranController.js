import PengeluaranModel from "../models/pengeluaranModel.js";

export const getPengeluaran = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const { startDate, endDate, search, id_kategori_pengeluaran } = req.query;

    const data = await PengeluaranModel.getAll(id_bank_sampah, {
      startDate,
      endDate,
      search,
      id_kategori_pengeluaran,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get pengeluaran error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengeluaran",
    });
  }
};

export const getPengeluaranById = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const { id } = req.params;

    const data = await PengeluaranModel.getById(id, id_bank_sampah);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data pengeluaran tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get pengeluaran by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pengeluaran",
    });
  }
};

export const createPengeluaran = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const { id_kategori_pengeluaran, tanggal, keterangan, nominal } = req.body;

    if (
      !id_kategori_pengeluaran ||
      !tanggal ||
      !keterangan ||
      nominal === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Semua data wajib diisi",
      });
    }

    if (Number(nominal) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Nominal harus lebih dari 0",
      });
    }

    const kategoriValid = await PengeluaranModel.validateKategori(
      id_kategori_pengeluaran,
      id_bank_sampah,
    );

    if (!kategoriValid) {
      return res.status(400).json({
        success: false,
        message: "Kategori pengeluaran tidak valid",
      });
    }

    const idPengeluaran = await PengeluaranModel.create({
      id_bank_sampah,
      id_kategori_pengeluaran,
      tanggal,
      keterangan: keterangan.trim(),
      nominal: Number(nominal),
    });

    const data = await PengeluaranModel.getById(idPengeluaran, id_bank_sampah);

    return res.status(201).json({
      success: true,
      message: "Pengeluaran berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error("Create pengeluaran error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan pengeluaran",
    });
  }
};

export const updatePengeluaran = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const { id } = req.params;

    const { id_kategori_pengeluaran, tanggal, keterangan, nominal } = req.body;

    const existing = await PengeluaranModel.getById(id, id_bank_sampah);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Data pengeluaran tidak ditemukan",
      });
    }

    if (
      !id_kategori_pengeluaran ||
      !tanggal ||
      !keterangan ||
      nominal === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Semua data wajib diisi",
      });
    }

    if (Number(nominal) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Nominal harus lebih dari 0",
      });
    }

    const kategoriValid = await PengeluaranModel.validateKategori(
      id_kategori_pengeluaran,
      id_bank_sampah,
    );

    if (!kategoriValid) {
      return res.status(400).json({
        success: false,
        message: "Kategori pengeluaran tidak valid",
      });
    }

    await PengeluaranModel.update(id, id_bank_sampah, {
      id_kategori_pengeluaran,
      tanggal,
      keterangan: keterangan.trim(),
      nominal: Number(nominal),
    });

    const data = await PengeluaranModel.getById(id, id_bank_sampah);

    return res.status(200).json({
      success: true,
      message: "Pengeluaran berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error("Update pengeluaran error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengeluaran",
    });
  }
};

export const deletePengeluaran = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const { id } = req.params;

    const affectedRows = await PengeluaranModel.remove(id, id_bank_sampah);

    if (!affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Data pengeluaran tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pengeluaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete pengeluaran error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menghapus pengeluaran",
    });
  }
};

export const getKategoriPengeluaran = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await PengeluaranModel.getKategori(id_bank_sampah);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get kategori pengeluaran error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil kategori pengeluaran",
    });
  }
};
