import { PengepulModel } from "../models/pengepulModel.js";

export const createPengepul = async (req, res) => {
  try {
    const { nama_pengepul, kontak, alamat } = req.body;
    const id_bank_sampah = req.user.id_bank_sampah;

    if (!nama_pengepul) {
      return res.status(400).json({ message: "Nama pengepul wajib diisi" });
    }

    const id = await PengepulModel.create({
      id_bank_sampah,
      nama_pengepul,
      kontak,
      alamat,
    });

    res.status(201).json({
      message: "Pengepul berhasil ditambahkan",
      id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllPengepul = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await PengepulModel.findAll(id_bank_sampah);

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPengepulById = async (req, res) => {
  try {
    const { id } = req.params;
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await PengepulModel.findById(id, id_bank_sampah);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePengepul = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_pengepul, kontak, alamat } = req.body;
    const id_bank_sampah = req.user.id_bank_sampah;

    if (!nama_pengepul) {
      return res.status(400).json({ message: "Nama pengepul wajib diisi" });
    }

    const result = await PengepulModel.update(id, id_bank_sampah, {
      nama_pengepul,
      kontak,
      alamat,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json({ message: "Berhasil diupdate" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePengepul = async (req, res) => {
  try {
    const { id } = req.params;
    const id_bank_sampah = req.user.id_bank_sampah;

    const result = await PengepulModel.delete(id, id_bank_sampah);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json({ message: "Berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
