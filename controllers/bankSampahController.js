import BankSampah from "../models/bankSampahModel.js";

export const getBankSampah = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const result = await BankSampah.getAll(page, limit, search);

    const totalPage = Math.ceil(result.total / limit);

    res.json({
      data: result.data,
      total: result.total,
      page,
      totalPage,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data bank sampah",
    });
  }
};

export const generateKodeBankSampah = async (req, res) => {
  try {
    const { id_kecamatan } = req.params;

    const lastNo = await BankSampah.getLastUrutan();

    let urutan = lastNo ? lastNo + 1 : 1;

    const kodeKecamatan = String(id_kecamatan).padStart(2, "0");
    const kodeUrut = String(urutan).padStart(3, "0");

    const kode = kodeKecamatan + kodeUrut;

    res.json({
      kode,
      no_urut_bank: urutan,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal generate kode bank sampah",
    });
  }
};

export const createBankSampah = async (req, res) => {
  try {
    const id = await BankSampah.create(req.body);

    res.json({
      message: "Bank sampah berhasil ditambahkan",
      id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menambah bank sampah",
    });
  }
};

export const updateBankSampah = async (req, res) => {
  try {
    const { id } = req.params;

    await BankSampah.update(id, req.body);

    res.json({
      message: "Bank sampah berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal update bank sampah",
    });
  }
};

export const deleteBankSampah = async (req, res) => {
  try {
    const { id } = req.params;

    await BankSampah.delete(id);

    res.json({
      message: "Bank sampah berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal hapus bank sampah",
    });
  }
};
<<<<<<< HEAD

export const getSettingBankSampah = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await BankSampah.getByIdFull(id);

    if (!data) {
      return res.status(404).json({
        message: "Data tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil setting",
    });
  }
};

export const updateSettingBankSampah = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_bank_sampah, alamat, no_telepon } = req.body;

    let logo_path = null;

    if (req.file) {
      logo_path = `uploads/logo/${req.file.filename}`;
    }

    await BankSampah.updateProfile(id, {
      nama_bank_sampah,
      alamat,
      no_telepon,
      logo_path,
    });

    res.json({ message: "Berhasil update" });
  } catch (err) {
    console.error("ERROR UPDATE:", err); // 🔥 ini penting
    res.status(500).json({ message: err.message });
  }
};
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
