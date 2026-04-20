import * as saldoModel from "../models/lapSaldoModel.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export const getSaldoNasabah = async (req, res) => {
  try {
    const { keyword, start_date, end_date } = req.query;

    const id_bank_sampah = req.user?.id_bank_sampah;

    if (!id_bank_sampah) {
      return res.status(400).json({
        message: "User tidak valid",
      });
    }

    const data = await saldoModel.getSaldoNasabah({
      id_bank_sampah,
      keyword,
      start_date,
      end_date,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil laporan saldo",
    });
  }
};

export const exportSaldoExcel = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await saldoModel.getSaldoNasabah({
      id_bank_sampah,
      ...req.query,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Saldo Nasabah");

    ws.columns = [
      { header: "Nama Nasabah", key: "nama_nasabah", width: 25 },
      { header: "No Rekening", key: "nomor_rekening", width: 20 },
      { header: "Saldo", key: "saldo_sesudah", width: 20 },
      { header: "Terakhir Update", key: "created_at", width: 25 },
    ];

    data.forEach((row) => {
      ws.addRow({
        ...row,
        saldo_sesudah: Number(row.saldo_sesudah),
      });
    });

    // format currency
    ws.getColumn("saldo_sesudah").numFmt = '"Rp" #,##0';

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=laporan-saldo.xlsx",
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const exportSaldoPDF = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const data = await saldoModel.getSaldoNasabah({
      id_bank_sampah,
      ...req.query,
    });

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=laporan-saldo.pdf");

    doc.pipe(res);

    // ================= TITLE =================
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("LAPORAN SALDO NASABAH", { align: "center" });

    doc.moveDown();

    // ================= KOLOM =================
    const startX = 40;
    let startY = 100;

    const col = {
      nama: startX,
      rekening: startX + 180,
      saldo: startX + 300,
      tanggal: startX + 400,
    };

    // ================= HEADER =================
    doc.fontSize(10).font("Helvetica-Bold");

    doc.text("Nama", col.nama, startY);
    doc.text("Rekening", col.rekening, startY);
    doc.text("Saldo", col.saldo, startY, { width: 80, align: "right" });
    doc.text("Update", col.tanggal, startY);

    startY += 20;

    doc
      .moveTo(startX, startY - 5)
      .lineTo(550, startY - 5)
      .stroke();

    // ================= DATA =================
    doc.font("Helvetica").fontSize(9);

    data.forEach((row) => {
      if (startY > 750) {
        doc.addPage();
        startY = 100;
      }

      doc.text(row.nama_nasabah, col.nama, startY, { width: 160 });

      doc.text(row.nomor_rekening, col.rekening, startY);

      doc.text(
        "Rp " + Number(row.saldo_sesudah).toLocaleString("id-ID"),
        col.saldo,
        startY,
        { width: 80, align: "right" },
      );

      doc.text(
        new Date(row.created_at).toLocaleDateString("id-ID"),
        col.tanggal,
        startY,
      );

      startY += 20;

      // garis antar row
      doc
        .moveTo(startX, startY - 5)
        .lineTo(550, startY - 5)
        .strokeColor("#eeeeee")
        .stroke()
        .strokeColor("#000000");
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
