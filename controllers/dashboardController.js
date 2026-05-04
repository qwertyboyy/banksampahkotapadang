import DashboardModel from "../models/dashboardModel.js";
<<<<<<< HEAD
import db from "../config/db.js";
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

export const getDashboardStats = async (req, res) => {
  try {
    const id_bank_sampah = req.user ? req.user.id_bank_sampah : null;

    const promises = [];

    if (!id_bank_sampah) {
      promises.push(DashboardModel.getTotalBankSampah());
    } else {
      promises.push(Promise.resolve(null));
    }

    promises.push(DashboardModel.getTotalNasabah(id_bank_sampah));
    promises.push(DashboardModel.getTotalTransaksi(id_bank_sampah));
    promises.push(DashboardModel.getTotalVolume(id_bank_sampah));

    const [bankSampah, nasabah, transaksi, volume] =
      await Promise.all(promises);

    res.json({
      bankSampah,
      nasabah,
      transaksi,
      volume,
    });
  } catch (error) {
    console.error("ERROR DASHBOARD:", error);

    res.status(500).json({
      message: "Gagal mengambil data dashboard",
      error: error.message,
    });
  }
};

// ==============================
// GET CHART SETORAN PER BULAN
// ==============================
export const getSetoranChart = async (req, res) => {
  try {
    const tahun = req.query.tahun || new Date().getFullYear();
    const id_bank_sampah = req.user?.id_bank_sampah || null;

    const data = await DashboardModel.getSetoranPerBulan(tahun, id_bank_sampah);

    const bulanList = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    const result = bulanList.map((bulan, index) => {
      const found = data.find((d) => Number(d.bulan_num) === index + 1);

      return {
        bulan,
        volume: found ? Number(found.total) : 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("SETORAN CHART ERROR:", error);

    res.status(500).json({
      message: "Error mengambil chart setoran",
      error: error.message,
    });
  }
};

// ==============================
// GET CHART JENIS SAMPAH
// ==============================
export const getJenisSampahChart = async (req, res) => {
  try {
    const id_bank_sampah = req.user?.id_bank_sampah || null;

    const data = await DashboardModel.getJenisSampahStats(id_bank_sampah);

    const formatted = data.map((item) => ({
      name: item.name,
      value: Number(item.value),
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error mengambil data jenis sampah" });
  }
};
<<<<<<< HEAD

export const getChartKeuangan = async (req, res) => {
  try {
    const tahun = req.query.tahun || new Date().getFullYear();
    const id_bank_sampah = req.user?.id_bank_sampah || null;

    const data = await DashboardModel.getChartKeuangan(tahun, id_bank_sampah);

    const bulanList = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    const result = bulanList.map((bulan, index) => {
      const found = data.find((d) => Number(d.bulan) === index + 1);

      return {
        bulan,
        setoran: found ? Number(found.setoran) : 0,
        penarikan: found ? Number(found.penarikan) : 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("CHART KEUANGAN ERROR:", error);

    res.status(500).json({
      message: "Error mengambil chart keuangan",
      error: error.message,
    });
  }
};

// untuk nasabah

export const getDashboardNasabah = async (req, res) => {
  try {
    const { id_nasabah } = req.user;

    if (!id_nasabah) {
      return res.status(400).json({ message: "User bukan nasabah" });
    }

    const profil = await DashboardModel.getProfilNasabah(id_nasabah);

    if (!profil) {
      return res.status(404).json({ message: "Nasabah tidak ditemukan" });
    }

    const riwayat = await DashboardModel.getRiwayatNasabah(id_nasabah);

    const is_profile_complete = profil.is_claimed === 1;

    res.json({
      success: true,
      data: {
        profil,
        saldo: profil.saldo,
        riwayat,
        is_profile_complete: profil.is_claimed === 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal ambil dashboard" });
  }
};

// jika belum lengkap atau pertama kali login, wajib update profil
export const updateProfilNasabah = async (req, res) => {
  try {
    const { id_nasabah } = req.user;
    const { nik, alamat } = req.body;

    if (!nik || !alamat) {
      return res.status(400).json({
        message: "NIK dan alamat wajib diisi",
      });
    }

    await db.query(
      `UPDATE nasabah 
   SET nik = ?, alamat = ?, is_claimed = 1
   WHERE id_nasabah = ?`,
      [nik, alamat, id_nasabah],
    );

    res.json({ message: "Profil berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStatSetorNasabah = async (req, res) => {
  try {
    const { id_nasabah } = req.user;

    if (!id_nasabah) {
      return res.status(400).json({
        message: "User bukan nasabah",
      });
    }

    const data = await DashboardModel.getStatSetorNasabah(id_nasabah);

    res.json({
      success: true,
      data: {
        total_setor: Number(data.total_setor || 0),
        total_berat: Number(data.total_berat || 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal ambil statistik setor",
    });
  }
};
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
