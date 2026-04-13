import * as mutasiModel from "../models/lapMutasiModel.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export const getMutasi = async (req, res) => {
  try {
    const { start_date, end_date, nomor_rekening, last_id, limit } = req.query;

    const id_bank_sampah = req.user?.id_bank_sampah;

    if (!id_bank_sampah) {
      return res.status(400).json({
        message: "User tidak valid / id_bank_sampah tidak ditemukan",
      });
    }

    if (limit && Number(limit) > 100) {
      return res.status(400).json({
        message: "Limit maksimal 100",
      });
    }

    console.log("REQ.USER:", req.user);
    console.log("ID BANK:", req.user?.id_bank_sampah);

    const data = await mutasiModel.getMutasi({
      id_bank_sampah,
      start_date,
      end_date,
      nomor_rekening,
      last_id,
      limit,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data mutasi",
    });
  }
};

export const exportExcel = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await mutasiModel.getMutasi({
      id_bank_sampah,
      ...req.query,
      limit: 1000,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Mutasi");

    ws.columns = [
      { header: "Tanggal", key: "created_at" },
      { header: "Rekening", key: "nomor_rekening" },
      { header: "Nama", key: "nama_nasabah" },
      { header: "Tipe", key: "tipe" },
      { header: "Jumlah", key: "jumlah" },
      { header: "Saldo", key: "saldo_sesudah" },
    ];

    ws.addRows(data);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const exportPDF = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await mutasiModel.getMutasi({
      id_bank_sampah,
      ...req.query,
      limit: 1000,
    });

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    data.forEach((row) => {
      doc.text(
        `${row.created_at} | ${row.nomor_rekening} | ${row.tipe} | ${row.jumlah}`,
      );
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
