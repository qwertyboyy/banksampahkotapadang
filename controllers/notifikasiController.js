import dayjs from "dayjs";
import NasabahModel from "../models/nasabahModel.js";

export const getNotifikasiNasabah = async (req, res) => {
  try {
    const id_nasabah = req.user.id_nasabah;

    const lastSetoran = await NasabahModel.getLastSetoranNasabah(id_nasabah);

    // Belum pernah setor
    if (!lastSetoran) {
      return res.json({
        success: true,
        show_notification: true,
        type: "new_user",
        days: 0,
        message:
          "Belum ada setoran pertama 🌱 Yuk mulai setor sampah dan kumpulkan saldo pertamamu!",
      });
    }

    const today = dayjs();
    const lastDate = dayjs(lastSetoran.tanggal_setor);

    const diffDays = today.diff(lastDate, "day");

    // Tidak tampil kalau masih aktif
    if (diffDays < 3) {
      return res.json({
        success: true,
        show_notification: false,
      });
    }

    let message = "";

    if (diffDays >= 3 && diffDays < 7) {
      message = `Udah ${diffDays} hari sejak setoran terakhir 👀 Yuk setor lagi dan ubah sampah jadi saldo!`;
    } else if (diffDays >= 7 && diffDays < 14) {
      message = `${diffDays} hari belum setor 😄 Sampah di rumah jangan numpuk, waktunya setor lagi!`;
    } else if (diffDays >= 14 && diffDays < 30) {
      message = `Wah, sudah ${diffDays} hari belum aktif setor ♻️ Yuk mulai lagi kebiasaan baikmu hari ini.`;
    } else {
      message = `${diffDays} hari tanpa setoran 😢 Kami tunggu kamu kembali jadi pejuang lingkungan!`;
    }

    return res.json({
      success: true,
      show_notification: true,
      type: "inactive",
      days: diffDays,
      message,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};
