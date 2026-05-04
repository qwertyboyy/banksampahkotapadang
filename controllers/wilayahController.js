import Wilayah from "../models/wilayahModel.js";

export const getKecamatan = async (req, res) => {
  try {
    const data = await Wilayah.getKecamatan();

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data kecamatan",
    });
  }
};

export const getKelurahan = async (req, res) => {
  try {
    const { id_kecamatan } = req.params;

    const data = await Wilayah.getKelurahanByKecamatan(id_kecamatan);

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data kelurahan",
    });
  }
};
