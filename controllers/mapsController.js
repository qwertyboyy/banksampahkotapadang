import LokasiBankSampahModel from "../models/mapsModel.js";

export const getMaps = async (req, res) => {
  try {
    const data = await LokasiBankSampahModel.getAll();

    res.status(200).json({
      success: true,
      data: data.map((item) => ({
        ...item,
        terdaftar: item.id_bank_sampah !== null,
      })),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data peta",
    });
  }
};

export const getLokasiDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await LokasiBankSampahModel.getById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail lokasi",
    });
  }
};
