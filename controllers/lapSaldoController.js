import * as saldoModel from "../models/lapSaldoModel.js";
import db from "../config/db.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

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

    const [[bank]] = await db.query(
      "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
      [id_bank_sampah],
    );

    const data = await saldoModel.getSaldoNasabah({
      id_bank_sampah,
      ...req.query,
    });

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=laporan-saldo.pdf");

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
      divider: "#2e86c1",
      totalBg: "#d6eaf8",
    };

    const PAGE_W = 595;
    const MARGIN = 45;
    const TABLE_W = PAGE_W - MARGIN * 2;

    const COL_W = {
      no: 30,
      nama: 155,
      rekening: 110,
      saldo: 110,
      tanggal: 100,
    };

    const COL_X = {
      no: MARGIN,
      nama: MARGIN + COL_W.no,
      rekening: MARGIN + COL_W.no + COL_W.nama,
      saldo: MARGIN + COL_W.no + COL_W.nama + COL_W.rekening,
      tanggal: MARGIN + COL_W.no + COL_W.nama + COL_W.rekening + COL_W.saldo,
    };

    const ROW_H = 22;
    const HEADER_H = 26;

    let yPos = 40;

    const fillRect = (x, y, w, h, color) => {
      doc.save().rect(x, y, w, h).fill(color).restore();
    };

    const drawTableBorder = (y, h) => {
      doc.save().strokeColor(COLOR.border).lineWidth(0.5);
      doc.rect(MARGIN, y, TABLE_W, h).stroke();

      [COL_X.nama, COL_X.rekening, COL_X.saldo, COL_X.tanggal].forEach((x) => {
        doc
          .moveTo(x, y)
          .lineTo(x, y + h)
          .stroke();
      });

      doc.restore();
    };

    // ================= KOP =================
    const KOP_HEIGHT = 60;

    fillRect(MARGIN, yPos, TABLE_W, KOP_HEIGHT, "#f0f7fc");
    fillRect(MARGIN, yPos, 4, KOP_HEIGHT, COLOR.primary);

    if (bank?.logo_path) {
      const logoFullPath = path.join(process.cwd(), bank.logo_path);
      if (fs.existsSync(logoFullPath)) {
        doc.image(logoFullPath, MARGIN + 12, yPos + 5, { height: 50 });
      }
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(COLOR.primary)
      .text(
        "Bank Sampah " + (bank?.nama_bank_sampah || "BANK SAMPAH"),
        MARGIN + 70,
        yPos + 10,
      );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(bank?.alamat || "-", MARGIN + 70, yPos + 28);

    yPos += KOP_HEIGHT + 6;

    doc
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + TABLE_W, yPos)
      .lineWidth(2)
      .strokeColor(COLOR.divider)
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
      .text("LAPORAN SALDO NASABAH", MARGIN, yPos, {
        width: TABLE_W,
        align: "center",
      });

    yPos += 18;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(
        `Dicetak pada: ${new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
        MARGIN,
        yPos,
        { width: TABLE_W, align: "center" },
      );

    yPos += 18;

    // ================= HEADER =================
    const drawHeader = () => {
      fillRect(MARGIN, yPos, TABLE_W, HEADER_H, COLOR.headerBg);

      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.headerText);

      doc.text("No", COL_X.no, yPos + 8, { width: COL_W.no, align: "center" });
      doc.text("Nama Nasabah", COL_X.nama + 4, yPos + 8);
      doc.text("No. Rekening", COL_X.rekening + 4, yPos + 8);
      doc.text("Saldo", COL_X.saldo, yPos + 8, {
        width: COL_W.saldo - 4,
        align: "right",
      });
      doc.text("Tgl. Update", COL_X.tanggal + 4, yPos + 8);

      drawTableBorder(yPos, HEADER_H);
      yPos += HEADER_H;
    };

    drawHeader();

    // ================= DATA =================
    const PAGE_BOTTOM = doc.page.height - 50;

    data.forEach((row, index) => {
      // 🔥 PAGE BREAK FIX
      if (yPos + ROW_H > PAGE_BOTTOM) {
        doc.addPage();
        yPos = 50;
        drawHeader();
      }

      const isEven = index % 2 === 0;

      fillRect(
        MARGIN,
        yPos,
        TABLE_W,
        ROW_H,
        isEven ? COLOR.rowOdd : COLOR.rowAlt,
      );

      doc.font("Helvetica").fontSize(9).fillColor(COLOR.dark);

      doc.text(String(index + 1), COL_X.no, yPos + 6, {
        width: COL_W.no,
        align: "center",
      });

      doc.text(row.nama_nasabah || "-", COL_X.nama + 4, yPos + 6, {
        width: COL_W.nama - 8,
        ellipsis: true,
      });

      doc.font("Courier");
      doc.text(row.nomor_rekening || "-", COL_X.rekening + 4, yPos + 6);
      doc.font("Helvetica");

      doc
        .font("Helvetica-Bold")
        .fillColor(COLOR.primary)
        .text(
          "Rp " + Number(row.saldo || 0).toLocaleString("id-ID"),
          COL_X.saldo,
          yPos + 6,
          {
            width: COL_W.saldo - 4,
            align: "right",
          },
        );

      doc.font("Helvetica").fillColor(COLOR.dark);

      doc.text(
        row.created_at
          ? new Date(row.created_at).toLocaleDateString("id-ID")
          : "-",
        COL_X.tanggal + 4,
        yPos + 6,
      );

      drawTableBorder(yPos, ROW_H);

      yPos += ROW_H;
    });

    // ================= TOTAL =================
    if (data.length > 0) {
      const totalSaldo = data.reduce(
        (sum, row) => sum + Number(row.saldo || 0),
        0,
      );

      if (yPos + ROW_H > PAGE_BOTTOM) {
        doc.addPage();
        yPos = 50;
      }

      fillRect(MARGIN, yPos, TABLE_W, ROW_H, COLOR.totalBg);

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLOR.primary)
        .text(`Total (${data.length} nasabah)`, COL_X.no + 4, yPos + 6, {
          width: COL_W.no + COL_W.nama + COL_W.rekening - 8,
        });

      doc.text(
        "Rp " + totalSaldo.toLocaleString("id-ID"),
        COL_X.saldo,
        yPos + 6,
        {
          width: COL_W.saldo - 4,
          align: "right",
        },
      );

      drawTableBorder(yPos, ROW_H);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
