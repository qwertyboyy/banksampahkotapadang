import * as JenisModel from "../models/sampahModel.js";

/* ================= GET ================= */
export const getJenis = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const offset = (page - 1) * limit;

    const id_bank_sampah = req.user.id_bank_sampah;

    const { rows, total } = await JenisModel.getAllJenis({
      id_bank_sampah,
      search,
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json({
      data: rows,
      total,
    });
  } catch (err) {
    console.error(err); // WAJIB
    res.status(500).json({ message: "Gagal ambil data" });
  }
};

export const getKategori = async (req, res) => {
  try {
    const [rows] = await JenisModel.getAllKategori();

    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal ambil data kategori" });
  }
};

/* ================= CREATE ================= */
export const createJenis = async (req, res) => {
  try {
    const { id_kategori, nama_jenis, harga_per_kg } = req.body;

    if (!id_kategori || !nama_jenis || !harga_per_kg) {
      return res.status(400).json({ message: "Field wajib diisi" });
    }

    if (harga_per_kg <= 0) {
      return res.status(400).json({ message: "Harga tidak valid" });
    }

    const id_bank_sampah = req.user.id_bank_sampah;

    await JenisModel.createJenis({
      id_bank_sampah,
      id_kategori,
      nama_jenis,
      harga_per_kg,
    });

    res.json({ message: "Berhasil tambah data" });
  } catch (err) {
    console.error(err); // WAJIB
    res.status(500).json({ message: "Gagal tambah data" });
  }
};

/* ================= UPDATE ================= */
export const updateJenis = async (req, res) => {
  try {
    const { id } = req.params;

    await JenisModel.updateJenis(id, req.body);

    res.json({ message: "Berhasil update" });
  } catch {
    res.status(500).json({ message: "Gagal update" });
  }
};

/* ================= DELETE ================= */
export const deleteJenis = async (req, res) => {
  try {
    const { id } = req.params;

    await JenisModel.deleteJenis(id);

    res.json({ message: "Berhasil hapus (nonaktif)" });
  } catch {
    res.status(500).json({ message: "Gagal hapus" });
  }
};

export const getJenisSelectController = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const keyword = req.query.keyword?.trim() || "";

    const data = await JenisModel.getJenisSelect(id_bank_sampah, keyword);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ERROR JENIS SELECT:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
