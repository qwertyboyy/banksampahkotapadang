import DashboardModel from "../models/dashboardModel.js";

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
