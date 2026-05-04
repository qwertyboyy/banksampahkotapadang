import * as mutasiModel from "../models/lapMutasiModel.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import db from "../config/db.js";

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
      no_limit: false,
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
      no_limit: true,
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

    const [[bank]] = await db.query(
      "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
      [id_bank_sampah],
    );

    const data = await mutasiModel.getMutasi({
      id_bank_sampah,
      ...req.query,
      no_limit: true,
    });

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=laporan-mutasi.pdf");

    doc.pipe(res);

    // ================= DESIGN =================
    const COLOR = {
      primary: "#1a5276",
      accent: "#2e86c1",
      headerBg: "#1a5276",
      headerText: "#ffffff",
      rowAlt: "#eaf4fb",
      rowOdd: "#ffffff",
      border: "#aed6f1",
      muted: "#7f8c8d",
      dark: "#1c2833",
    };

    const PAGE_W = 595;
    const MARGIN = 45;
    const TABLE_W = PAGE_W - MARGIN * 2;

    const COL_W = {
      tanggal: 90,
      rekening: 90,
      nama: 120,
      tipe: 60,
      jumlah: 70,
      saldo: 75,
    };

    const COL_X = {
      tanggal: MARGIN,
      rekening: MARGIN + COL_W.tanggal,
      nama: MARGIN + COL_W.tanggal + COL_W.rekening,
      tipe: MARGIN + COL_W.tanggal + COL_W.rekening + COL_W.nama,
      jumlah: MARGIN + COL_W.tanggal + COL_W.rekening + COL_W.nama + COL_W.tipe,
      saldo:
        MARGIN +
        COL_W.tanggal +
        COL_W.rekening +
        COL_W.nama +
        COL_W.tipe +
        COL_W.jumlah,
    };

    const ROW_H = 22;
    const HEADER_H = 26;

    let yPos = 40;

    // ================= HELPER =================
    const fillRect = (x, y, w, h, color) => {
      doc.save().rect(x, y, w, h).fill(color).restore();
    };

    const drawBorder = (y, h) => {
      doc.save().strokeColor(COLOR.border).lineWidth(0.5);
      doc.rect(MARGIN, y, TABLE_W, h).stroke();

      [
        COL_X.rekening,
        COL_X.nama,
        COL_X.tipe,
        COL_X.jumlah,
        COL_X.saldo,
      ].forEach((x) => {
        doc
          .moveTo(x, y)
          .lineTo(x, y + h)
          .stroke();
      });

      doc.restore();
    };

    // ================= KOP =================
    const KOP_H = 60;

    fillRect(MARGIN, yPos, TABLE_W, KOP_H, "#f0f7fc");
    fillRect(MARGIN, yPos, 4, KOP_H, COLOR.primary);

    if (bank?.logo_path) {
      const logoPath = path.join(process.cwd(), bank.logo_path);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN + 12, yPos + 5, { height: 50 });
      }
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(COLOR.primary)
      .text(bank?.nama_bank_sampah || "BANK SAMPAH", MARGIN + 70, yPos + 10);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(bank?.alamat || "-", MARGIN + 70, yPos + 28);

    yPos += KOP_H + 6;

    doc
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + TABLE_W, yPos)
      .lineWidth(2)
      .strokeColor(COLOR.accent)
      .stroke();

    yPos += 3;

    doc
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + TABLE_W, yPos)
      .lineWidth(0.5)
      .strokeColor(COLOR.border)
      .stroke();

    // ================= TITLE =================
    yPos += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLOR.dark)
      .text("LAPORAN MUTASI REKENING", MARGIN, yPos, {
        width: TABLE_W,
        align: "center",
      });

    yPos += 20;

    // ================= HEADER =================
    const drawHeader = () => {
      fillRect(MARGIN, yPos, TABLE_W, HEADER_H, COLOR.headerBg);

      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.headerText);

      doc.text("Tanggal", COL_X.tanggal + 4, yPos + 8);
      doc.text("Rekening", COL_X.rekening + 4, yPos + 8);
      doc.text("Nama", COL_X.nama + 4, yPos + 8);
      doc.text("Tipe", COL_X.tipe + 4, yPos + 8);

      doc.text("Jumlah", COL_X.jumlah, yPos + 8, {
        width: COL_W.jumlah - 4,
        align: "right",
      });

      doc.text("Saldo", COL_X.saldo, yPos + 8, {
        width: COL_W.saldo - 4,
        align: "right",
      });

      drawBorder(yPos, HEADER_H);

      yPos += HEADER_H;
    };

    drawHeader();

    // ================= DATA =================
    let isEven = false;
    const PAGE_BOTTOM = doc.page.height - 50;

    (data || []).forEach((row) => {
      // 🔥 CHECK SEBELUM RENDER
      if (yPos + ROW_H > PAGE_BOTTOM) {
        doc.addPage();
        yPos = 50;
        drawHeader();
      }

      fillRect(
        MARGIN,
        yPos,
        TABLE_W,
        ROW_H,
        isEven ? COLOR.rowOdd : COLOR.rowAlt,
      );

      const jumlah = Number(row.jumlah) || 0;
      const saldo = Number(row.saldo_sesudah) || 0;

      doc.font("Helvetica").fontSize(9).fillColor(COLOR.dark);

      doc.text(
        row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "-",
        COL_X.tanggal + 4,
        yPos + 6,
      );

      doc.text(row.nomor_rekening || "-", COL_X.rekening + 4, yPos + 6);

      doc.text(row.nama_nasabah || "-", COL_X.nama + 4, yPos + 6, {
        width: COL_W.nama - 8,
        ellipsis: true,
      });

      doc.text(row.tipe || "-", COL_X.tipe + 4, yPos + 6);

      doc.text("Rp " + jumlah.toLocaleString("id-ID"), COL_X.jumlah, yPos + 6, {
        width: COL_W.jumlah - 4,
        align: "right",
      });

      doc.text("Rp " + saldo.toLocaleString("id-ID"), COL_X.saldo, yPos + 6, {
        width: COL_W.saldo - 4,
        align: "right",
      });

      drawBorder(yPos, ROW_H);

      yPos += ROW_H;
      isEven = !isEven;
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
