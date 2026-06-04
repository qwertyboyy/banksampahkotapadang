import TransferModel from "../models/transferModel.js";

export const getTransferPinStatus = async (req, res) => {
  try {
    const { id_user } = req.user;
    const hasPin = await TransferModel.hasTransferPin(id_user);

    res.json({
      hasPin,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal memeriksa status PIN transfer",
    });
  }
};

export const createTransferPin = async (req, res) => {
  try {
    const { id_user } = req.user;
    const { pin, confirm_pin } = req.body;

    if (!pin || !confirm_pin) {
      return res.status(400).json({
        message: "PIN dan konfirmasi PIN wajib diisi",
      });
    }

    if (pin !== confirm_pin) {
      return res.status(400).json({
        message: "PIN dan konfirmasi PIN tidak cocok",
      });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        message: "PIN harus berupa 4 sampai 6 digit angka",
      });
    }

    await TransferModel.setTransferPin(id_user, pin);

    res.json({
      success: true,
      message: "PIN transaksi berhasil dibuat",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message || "Gagal membuat PIN transaksi",
    });
  }
};

export const getTransferRecipient = async (req, res) => {
  try {
    const { id_nasabah, id_bank_sampah } = req.user;
    const { nomor_rekening } = req.query;

    if (!nomor_rekening) {
      return res.status(400).json({
        message: "Nomor rekening tujuan wajib diisi",
      });
    }

    const penerima = await TransferModel.findNasabahByRekening(
      nomor_rekening,
      id_bank_sampah,
    );

    if (!penerima) {
      return res.status(404).json({
        message: "Nasabah tujuan tidak ditemukan",
      });
    }

    if (penerima.id_nasabah === id_nasabah) {
      return res.status(400).json({
        message: "Tidak bisa transfer ke rekening sendiri",
      });
    }

    res.json({
      success: true,
      data: {
        nomor_rekening: penerima.nomor_rekening,
        nama_nasabah: penerima.nama_nasabah,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message || "Gagal mengambil data penerima transfer",
    });
  }
};

export const transferSaldo = async (req, res) => {
  try {
    const { id_user, id_nasabah, id_bank_sampah } = req.user;
    const { nomor_rekening, nominal, pin } = req.body;

    if (!nomor_rekening || !nominal || !pin) {
      return res.status(400).json({
        message: "Data transfer belum lengkap",
      });
    }

    if (Number(nominal) <= 0) {
      return res.status(400).json({
        message: "Nominal transfer tidak valid",
      });
    }

    await TransferModel.verifyTransferPin(id_user, String(pin));

    const penerima = await TransferModel.findNasabahByRekening(
      nomor_rekening,
      id_bank_sampah,
    );

    if (!penerima) {
      return res.status(404).json({
        message: "Nasabah tujuan tidak ditemukan",
      });
    }

    if (penerima.id_nasabah === id_nasabah) {
      return res.status(400).json({
        message: "Tidak bisa transfer ke rekening sendiri",
      });
    }

    const pengirim = {
      id_nasabah,
    };

    await TransferModel.transferSaldo({
      pengirim,
      penerima,
      nominal: Number(nominal),
      id_bank_sampah,
    });

    res.json({
      success: true,
      message: "Transfer berhasil",
    });
  } catch (err) {
    console.error(err);

    res.status(err.status || 500).json({
      message: err.message || "Transfer gagal",
    });
  }
};
