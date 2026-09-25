import { publicError } from "../middlewares/security.js";
// controllers/tarikSaldoController.js
import { createTarik } from "../models/tarikSaldoModel.js";
import { getKonfigurasiBankSampah } from "../models/konfigurasiBankSampahModel.js";

export const getKonfigurasiPenarikan = async (req, res) => {
  try {
    const konfigurasi = await getKonfigurasiBankSampah(
      req.user.id_bank_sampah,
    );
    return res.json({ minimum_penarikan: konfigurasi.minimum_penarikan });
  } catch (err) {
    console.error("Gagal mengambil konfigurasi penarikan:", err);
    return res
      .status(500)
      .json({ message: "Gagal mengambil konfigurasi penarikan" });
  }
};

export const tarikSaldo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id_nasabah, jumlah_tarik, keterangan } = req.body;
    const id_bank_sampah = req.user.id_bank_sampah;
    const admin_id = req.user.id_user;

    // 🔥 VALIDASI INPUT
    if (!id_nasabah || !jumlah_tarik) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (!Number.isFinite(Number(jumlah_tarik)) || Number(jumlah_tarik) <= 0) {
      return res.status(400).json({ message: "Jumlah tarik tidak valid" });
    }

    const result = await createTarik({
      id_bank_sampah,
      id_nasabah,
      jumlah_tarik: parseFloat(jumlah_tarik),
      keterangan,
      admin_id,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: publicError(err) });
  }
};
