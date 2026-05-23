import TransferModel from "../models/transferModel.js";

export const transferSaldo = async (req, res) => {
  try {
    const { id_nasabah, id_bank_sampah } = req.user;

    const { nomor_rekening, nominal } = req.body;

    if (!nomor_rekening || !nominal) {
      return res.status(400).json({
        message: "Data transfer belum lengkap",
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

    res.status(500).json({
      message: err.message || "Transfer gagal",
    });
  }
};
