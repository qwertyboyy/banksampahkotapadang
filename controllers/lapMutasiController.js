import * as mutasiModel from "../models/lapMutasiModel.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export const getMutasi = async (req, res) => {
  try {
    const { start_date, end_date, keyword, last_id, limit } = req.query;

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

    const data = await mutasiModel.getMutasi({
      id_bank_sampah,
      start_date,
      end_date,
      keyword,
      last_id,
      limit,
    });

    res.json({
      success: true,
      data: data || [],
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

    // 🔥 FIX: parsing angka biar ga NaN di Excel
    const safeData = (data || []).map((d) => ({
      ...d,
      jumlah: Number(d.jumlah || 0),
      saldo_sesudah: Number(d.saldo_sesudah || 0),
    }));

    ws.addRows(safeData);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
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

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=laporan-mutasi.pdf");

    doc.pipe(res);

    // ================= TITLE =================
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("MUTASI REKENING NASABAH", { align: "center" });

    doc.moveDown(1);

    const startX = 50;
    let startY = 100;

    const col = {
      tanggal: startX,
      rekening: startX + 100,
      nama: startX + 200,
      tipe: startX + 330,
      jumlah: startX + 380,
      saldo: startX + 460,
    };

    // ================= HEADER =================
    doc.fontSize(10).font("Helvetica-Bold");

    doc.text("Tanggal", col.tanggal, startY);
    doc.text("Rekening", col.rekening, startY);
    doc.text("Nama", col.nama, startY);
    doc.text("Tipe", col.tipe, startY);
    doc.text("Jumlah", col.jumlah, startY, { width: 70, align: "right" });
    doc.text("Saldo", col.saldo, startY, { width: 80, align: "right" });

    startY += 20;

    doc
      .moveTo(startX, startY - 5)
      .lineTo(550, startY - 5)
      .stroke();

    // ================= DATA =================
    doc.font("Helvetica").fontSize(9);

    (data || []).forEach((row) => {
      if (startY > 750) {
        doc.addPage();
        startY = 100;

        doc.font("Helvetica-Bold");

        doc.text("Tanggal", col.tanggal, startY);
        doc.text("Rekening", col.rekening, startY);
        doc.text("Nama", col.nama, startY);
        doc.text("Tipe", col.tipe, startY);
        doc.text("Jumlah", col.jumlah, startY, { width: 70, align: "right" });
        doc.text("Saldo", col.saldo, startY, { width: 80, align: "right" });

        startY += 20;

        doc
          .moveTo(startX, startY - 5)
          .lineTo(550, startY - 5)
          .stroke();

        doc.font("Helvetica");
      }

      const jumlah = Number(row.jumlah || 0);
      const saldo = Number(row.saldo_sesudah || 0);

      doc.text(
        row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "-",
        col.tanggal,
        startY,
      );

      doc.text(row.nomor_rekening || "-", col.rekening, startY);
      doc.text(row.nama_nasabah || "-", col.nama, startY, { width: 120 });
      doc.text(row.tipe || "-", col.tipe, startY);

      doc.text("Rp " + jumlah.toLocaleString("id-ID"), col.jumlah, startY, {
        width: 70,
        align: "right",
      });

      doc.text("Rp " + saldo.toLocaleString("id-ID"), col.saldo, startY, {
        width: 80,
        align: "right",
      });

      startY += 20;

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
