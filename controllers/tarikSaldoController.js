// controllers/tarikSaldoController.js
import { createTarik } from "../models/tarikSaldoModel.js";

export const tarikSaldo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id_nasabah, jumlah_tarik, keterangan } = req.body;
    const id_bank_sampah = req.user.id_bank_sampah;

    // 🔥 VALIDASI INPUT
    if (!id_nasabah || !jumlah_tarik) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (isNaN(jumlah_tarik) || Number(jumlah_tarik) <= 0) {
      return res.status(400).json({ message: "Jumlah tarik tidak valid" });
    }

    if (jumlah_tarik < 50000) {
      return res.status(400).json({ message: "Jumlah tarik minimal 50.000" });
    }

    const result = await createTarik({
      id_bank_sampah,
      id_nasabah,
      jumlah_tarik: parseFloat(jumlah_tarik),
      keterangan,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
