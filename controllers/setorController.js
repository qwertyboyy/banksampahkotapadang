// controllers/setorController.js
import { createSetor } from "../models/setorModel.js";

export const setorSampah = async (req, res) => {
  console.log("=== DEBUG SETOR ===");
  console.log("HEADERS:", req.headers.authorization);
  console.log("USER:", req.user);
  try {
    const { id_nasabah, items } = req.body;
    const id_bank_sampah = req.user.id_bank_sampah;

    // 🔥 Validasi
    if (!id_nasabah || !items?.length) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const result = await createSetor({
      id_bank_sampah,
      id_nasabah,
      items,
    });
    console.log("USER:", req.user);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
