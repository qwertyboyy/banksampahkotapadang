import { publicError } from "../middlewares/security.js";
import LaporanPenjualanModel from "../models/lapPenjualanModel.js";
import db from "../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import BankSampah from "../models/bankSampahModel.js";
import fs from "fs";
import path from "path";

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getMonthPeriod(startMonth, endMonth) {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

  if (!startMonth && !endMonth) {
    return {
      startDate: null,
      endDate: null,
      periodLabel: "Semua Bulan",
    };
  }

  const normalizedStart = startMonth || endMonth;
  const normalizedEnd = endMonth || startMonth;

  if (
    !monthPattern.test(normalizedStart) ||
    !monthPattern.test(normalizedEnd) ||
    normalizedStart > normalizedEnd
  ) {
    const error = new Error("Rentang bulan tidak valid");
    error.statusCode = 400;
    throw error;
  }

  const [startYear, startMonthNumber] = normalizedStart.split("-").map(Number);
  const [endYear, endMonthNumber] = normalizedEnd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(endYear, endMonthNumber, 0)).getUTCDate();

  const startLabel = `${NAMA_BULAN[startMonthNumber - 1]} ${startYear}`;
  const endLabel = `${NAMA_BULAN[endMonthNumber - 1]} ${endYear}`;

  return {
    startDate: `${normalizedStart}-01`,
    endDate: `${normalizedEnd}-${String(lastDay).padStart(2, "0")}`,
    periodLabel:
      normalizedStart === normalizedEnd
        ? startLabel
        : `${startLabel} s.d. ${endLabel}`,
  };
}

function getYear(tahun) {
  const selectedYear = Number(tahun);

  if (!/^\d{4}$/.test(String(tahun || "")) || selectedYear < 1000) {
    const error = new Error("Tahun tidak valid");
    error.statusCode = 400;
    throw error;
  }

  return selectedYear;
}

async function getAnnualReport(id_bank_sampah, tahun) {
  const rows = await LaporanPenjualanModel.getLaporanTahunan(
    id_bank_sampah,
    tahun,
  );
  const data = Array.from({ length: 12 }, (_, index) => {
    const bulan = index + 1;
    const row = rows.find((item) => Number(item.bulan) === bulan);

    return {
      bulan,
      nama_bulan: NAMA_BULAN[index],
      jumlah_transaksi: Number(row?.jumlah_transaksi || 0),
      total_penjualan: Number(row?.total_penjualan || 0),
    };
  });

  return {
    tahun,
    jumlah_transaksi: data.reduce(
      (total, item) => total + item.jumlah_transaksi,
      0,
    ),
    total_penjualan: data.reduce(
      (total, item) => total + item.total_penjualan,
      0,
    ),
    data,
  };
}

export const getLaporanPenjualanTahunan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const tahun = getYear(req.query.tahun);
    const data = await getAnnualReport(id_bank_sampah, tahun);

    res.json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? publicError(error) : "Gagal ambil data" });
  }
};

export const exportExcelPenjualanTahunan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const tahun = getYear(req.query.tahun);
    const [bank, data] = await Promise.all([
      BankSampah.getById(id_bank_sampah),
      getAnnualReport(id_bank_sampah, tahun),
    ]);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Tahunan");

    sheet.mergeCells("A1:C1");
    sheet.getCell("A1").value = bank?.nama_bank_sampah || "BANK SAMPAH";
    sheet.mergeCells("A2:C2");
    sheet.getCell("A2").value = bank?.alamat || "-";
    sheet.mergeCells("A3:C3");
    sheet.getCell("A3").value = "LAPORAN PENJUALAN TAHUNAN";
    sheet.mergeCells("A4:C4");
    sheet.getCell("A4").value = `Tahun: ${tahun}`;
    sheet.addRow([]);
    sheet.addRow(["Bulan", "Jumlah Transaksi", "Total Penjualan"]);
    data.data.forEach((item) => {
      sheet.addRow([
        item.nama_bulan,
        item.jumlah_transaksi,
        item.total_penjualan,
      ]);
    });
    sheet.addRow(["TOTAL", data.jumlah_transaksi, data.total_penjualan]);
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.mergeCells("C22:C22");
    sheet.getCell("C22").value = `Padang, ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`;
    sheet.getCell("C23").value = "Direktur Bank Sampah";
    sheet.getCell("C27").value = "____________________";
    sheet.columns = [{ width: 16 }, { width: 22 }, { width: 24 }];
    sheet.getColumn(3).numFmt = '"Rp" #,##0';
    ["A1", "A2", "A3", "A4"].forEach((cell) => {
      sheet.getCell(cell).alignment = { horizontal: "center" };
    });
    sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1A5276" } };
    sheet.getCell("A3").font = { bold: true, size: 13 };
    const headerRow = sheet.getRow(6);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
    headerRow.alignment = { horizontal: "center" };
    const totalRow = sheet.getRow(19);
    totalRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
    [22, 23, 27].forEach((row) => {
      sheet.getCell(`C${row}`).alignment = { horizontal: "center" };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-penjualan-tahunan-${tahun}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? publicError(error) : "Gagal export excel" });
  }
};

export const exportPdfPenjualanTahunan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const tahun = getYear(req.query.tahun);
    const [[bankRows], data] = await Promise.all([
      db.execute(
        "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
        [id_bank_sampah],
      ),
      getAnnualReport(id_bank_sampah, tahun),
    ]);
    const bank = bankRows[0];
    const doc = new PDFDocument({ margin: 45, size: "A4" });
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
      totalBg: "#1a5276",
    };
    const MARGIN = 45;
    const TABLE_W = 505;
    const columns = [MARGIN, MARGIN + 185, MARGIN + 345];
    const widths = [185, 160, 160];
    const fillRect = (x, y, width, height, color) => {
      doc.save().rect(x, y, width, height).fill(color).restore();
    };
    const drawRow = (y, values, header = false, alternate = false) => {
      values.forEach((value, index) => {
        fillRect(
          columns[index],
          y,
          widths[index],
          22,
          header ? COLOR.headerBg : alternate ? COLOR.rowAlt : COLOR.rowOdd,
        );
        doc.save().rect(columns[index], y, widths[index], 22).strokeColor(COLOR.border).lineWidth(0.5).stroke().restore();
        doc
          .fillColor(header ? COLOR.headerText : COLOR.dark)
          .font(header ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .text(String(value), columns[index] + 6, y + 7, {
            width: widths[index] - 12,
            align: index === 0 ? "left" : "right",
          });
      });
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-penjualan-tahunan-${tahun}.pdf`,
    );
    doc.pipe(res);

    let yPos = 40;
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
      .fillColor(COLOR.primary)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(bank?.nama_bank_sampah || "BANK SAMPAH", MARGIN + 70, yPos + 10);
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica")
      .fontSize(9)
      .text(bank?.alamat || "-", MARGIN + 70, yPos + 28);
    yPos += KOP_H + 6;
    doc.save().moveTo(MARGIN, yPos).lineTo(MARGIN + TABLE_W, yPos).lineWidth(2).strokeColor(COLOR.accent).stroke().restore();
    yPos += 3;
    doc.save().moveTo(MARGIN, yPos).lineTo(MARGIN + TABLE_W, yPos).lineWidth(0.5).strokeColor(COLOR.border).stroke().restore();
    yPos += 16;
    doc.fillColor(COLOR.dark).font("Helvetica-Bold").fontSize(14).text("LAPORAN PENJUALAN TAHUNAN", MARGIN, yPos, { width: TABLE_W, align: "center" });
    yPos += 19;
    doc.fillColor(COLOR.muted).font("Helvetica").fontSize(9).text(`Tahun: ${tahun}`, MARGIN, yPos, { width: TABLE_W, align: "center" });
    yPos += 20;
    drawRow(yPos, ["Bulan", "Jumlah Transaksi", "Total Penjualan"], true);
    yPos += 22;
    data.data.forEach((item, index) => {
      drawRow(yPos, [
        item.nama_bulan,
        item.jumlah_transaksi,
        `Rp ${item.total_penjualan.toLocaleString("id-ID")}`,
      ], false, index % 2 === 0);
      yPos += 22;
    });
    fillRect(MARGIN, yPos, TABLE_W, 24, COLOR.totalBg);
    doc.fillColor(COLOR.headerText).font("Helvetica-Bold").fontSize(9).text("TOTAL", MARGIN + 6, yPos + 8, { width: 173 });
    doc.text(data.jumlah_transaksi.toLocaleString("id-ID"), columns[1] + 6, yPos + 8, { width: widths[1] - 12, align: "right" });
    doc.text(`Rp ${data.total_penjualan.toLocaleString("id-ID")}`, columns[2] + 6, yPos + 8, { width: widths[2] - 12, align: "right" });
    yPos += 54;
    const ttdX = MARGIN + TABLE_W - 160;
    doc.fillColor(COLOR.dark).font("Helvetica").fontSize(9).text(`Padang, ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, ttdX, yPos, { width: 155, align: "center" });
    yPos += 14;
    doc.font("Helvetica-Bold").text("Direktur Bank Sampah", ttdX, yPos, { width: 155, align: "center" });
    yPos += 50;
    doc.save().moveTo(ttdX + 10, yPos).lineTo(ttdX + 145, yPos).lineWidth(1).strokeColor(COLOR.dark).stroke().restore();
    yPos += 20;
    doc.save().moveTo(MARGIN, yPos).lineTo(MARGIN + TABLE_W, yPos).lineWidth(0.5).strokeColor(COLOR.border).stroke().restore();
    yPos += 8;
    doc.font("Helvetica").fontSize(8).fillColor(COLOR.muted).text(`© ${new Date().getFullYear()} ${bank?.nama_bank_sampah || "Bank Sampah"} — Dokumen ini digenerate otomatis oleh sistem.`, MARGIN, yPos, { width: TABLE_W, align: "center" });
    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res
        .status(error.statusCode || 500)
        .json({ message: error.statusCode ? publicError(error) : "Gagal export pdf" });
    }
  }
};

export const getLaporanPenjualan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { startMonth, endMonth, search } = req.query;
    const { startDate, endDate } = getMonthPeriod(startMonth, endMonth);

    const data = await LaporanPenjualanModel.getLaporan(
      id_bank_sampah,
      startDate,
      endDate,
      search,
    );

    const result = await Promise.all(
      data.map(async (item) => {
        const detail = await LaporanPenjualanModel.getDetail(item.id_penjualan);

        return {
          ...item,
          detail,
        };
      }),
    );

    res.json({
      message: "Berhasil ambil laporan",
      data: result,
    });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? publicError(error) : "Gagal ambil data" });
  }
};

export const exportExcelPenjualan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { startMonth, endMonth, search } = req.query;
    const { startDate, endDate } = getMonthPeriod(startMonth, endMonth);

    const data = await LaporanPenjualanModel.getLaporanWithDetail(
      id_bank_sampah,
      startDate,
      endDate,
      search,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan");
    sheet.getColumn("tanggal").numFmt = "dd mmm yyyy";

    sheet.columns = [
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Pengepul", key: "pengepul", width: 25 },
      { header: "Barang", key: "barang", width: 25 },
      { header: "Kategori", key: "kategori", width: 20 },
      { header: "Berat", key: "berat", width: 10 },
      { header: "Harga/kg", key: "harga", width: 15 },
      { header: "Subtotal", key: "subtotal", width: 20 },
    ];

    data.forEach((row) => {
      sheet.addRow({
        tanggal: new Date(row.tanggal),
        pengepul: row.nama_pengepul,
        barang: row.nama_barang_pengepul,
        kategori: row.nama_kategori,
        berat: row.berat,
        harga: row.harga_per_kg,
        subtotal: row.subtotal,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=laporan-penjualan.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.statusCode ? publicError(err) : "Gagal export excel" });
  }
};

export const exportPdfPenjualan = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const [[bank]] = await db.query(
      "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
      [id_bank_sampah],
    );
    const { startMonth, endMonth, search } = req.query;
    const { startDate, endDate, periodLabel } = getMonthPeriod(
      startMonth,
      endMonth,
    );

    const data = await LaporanPenjualanModel.getLaporanWithDetail(
      id_bank_sampah,
      startDate,
      endDate,
      search,
    );

    // ================= GROUPING =================
    const grouped = {};
    data.forEach((row) => {
      if (!grouped[row.id_penjualan]) {
        grouped[row.id_penjualan] = {
          tanggal: row.tanggal,
          nama_pengepul: row.nama_pengepul,
          items: [],
        };
      }

      grouped[row.id_penjualan].items.push({
        barang: row.nama_barang_pengepul,
        kategori: row.nama_kategori,
        berat: Number(row.berat) || 0,
        subtotal: Number(row.subtotal) || 0,
      });
    });

    const transactions = Object.values(grouped);
    const getMonthKey = (date) => {
      const value = new Date(date);
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    };
    const getMonthLabel = (date) => {
      const value = new Date(date);
      return `${NAMA_BULAN[value.getMonth()]} ${value.getFullYear()}`;
    };
    const monthTotals = transactions.reduce((totals, trx) => {
      const key = getMonthKey(trx.tanggal);
      const transactionTotal = trx.items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );
      totals.set(key, (totals.get(key) || 0) + transactionTotal);
      return totals;
    }, new Map());

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=laporan-penjualan.pdf",
    );

    doc.pipe(res);

    // ─────────────────────────────────────────
    //  DESIGN TOKENS
    // ─────────────────────────────────────────
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
      subtotalBg: "#d6eaf8",
      totalBg: "#1a5276",
    };

    const PAGE_W = 595;
    const PAGE_H = 842; // A4
    const MARGIN = 45;
    const TABLE_W = PAGE_W - MARGIN * 2; // 505
    const BOTTOM_LIMIT = PAGE_H - 32;

    // Lebar kolom (total = TABLE_W = 505)
    const COL_W = {
      no: 28,
      tanggal: 78,
      pengepul: 120,
      barang: 130,
      berat: 60,
      subtotal: 89,
    };

    const COL_X = {
      no: MARGIN,
      tanggal: MARGIN + COL_W.no,
      pengepul: MARGIN + COL_W.no + COL_W.tanggal,
      barang: MARGIN + COL_W.no + COL_W.tanggal + COL_W.pengepul,
      berat: MARGIN + COL_W.no + COL_W.tanggal + COL_W.pengepul + COL_W.barang,
      subtotal:
        MARGIN +
        COL_W.no +
        COL_W.tanggal +
        COL_W.pengepul +
        COL_W.barang +
        COL_W.berat,
    };

    const ROW_H = 18;
    const HEADER_H = 22;
    const MONTH_H = 21;

    let yPos = 40;

    // ─────────────────────────────────────────
    //  HELPER: filled rect
    // ─────────────────────────────────────────
    const fillRect = (x, y, w, h, color) => {
      doc.save().rect(x, y, w, h).fill(color).restore();
    };

    // ─────────────────────────────────────────
    //  HELPER: draw table border lines
    // ─────────────────────────────────────────
    const drawTableBorder = (y, h) => {
      doc.save().strokeColor(COLOR.border).lineWidth(0.5);
      doc.rect(MARGIN, y, TABLE_W, h).stroke();
      [
        COL_X.tanggal,
        COL_X.pengepul,
        COL_X.barang,
        COL_X.berat,
        COL_X.subtotal,
      ].forEach((x) => {
        doc
          .moveTo(x, y)
          .lineTo(x, y + h)
          .stroke();
      });
      doc.restore();
    };

    const drawSubtotalBorder = (y, h) => {
      doc
        .save()
        .strokeColor(COLOR.border)
        .lineWidth(0.5)
        .rect(MARGIN, y, TABLE_W, h)
        .stroke()
        .moveTo(COL_X.subtotal, y)
        .lineTo(COL_X.subtotal, y + h)
        .stroke()
        .restore();
    };

    // ─────────────────────────────────────────
    //  HEADER TABEL (dideklarasikan dulu agar bisa dipanggil ensureSpace)
    // ─────────────────────────────────────────
    const drawHeader = () => {
      fillRect(MARGIN, yPos, TABLE_W, HEADER_H, COLOR.headerBg);

      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.headerText);

      doc.text("No", COL_X.no, yPos + 8, { width: COL_W.no, align: "center" });
      doc.text("Tanggal", COL_X.tanggal + 4, yPos + 8, {
        width: COL_W.tanggal - 4,
        align: "left",
      });
      doc.text("Pengepul", COL_X.pengepul + 4, yPos + 8, {
        width: COL_W.pengepul - 4,
        align: "left",
      });
      doc.text("Barang", COL_X.barang + 4, yPos + 8, {
        width: COL_W.barang - 4,
        align: "left",
      });
      doc.text("Berat", COL_X.berat, yPos + 8, {
        width: COL_W.berat - 4,
        align: "right",
      });
      doc.text("Subtotal", COL_X.subtotal, yPos + 8, {
        width: COL_W.subtotal - 4,
        align: "right",
      });

      drawTableBorder(yPos, HEADER_H);

      yPos += HEADER_H;
    };

    // ─────────────────────────────────────────
    //  HELPER: pastikan ruang cukup, kalau tidak -> halaman baru + redraw header tabel
    //  withHeader = true artinya blok ini adalah baris tabel (perlu header tabel lagi)
    // ─────────────────────────────────────────
    const ensureSpace = (neededHeight, withHeader = true) => {
      if (yPos + neededHeight > BOTTOM_LIMIT) {
        doc.addPage();
        yPos = 50;
        if (withHeader) drawHeader();
        return true;
      }
      return false;
    };

    const drawMonthBand = (label, total, continuation = false) => {
      fillRect(MARGIN, yPos, TABLE_W, MONTH_H, COLOR.subtotalBg);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLOR.primary)
        .text(
          continuation ? `${label} (lanjutan)` : label.toUpperCase(),
          MARGIN + 8,
          yPos + 6,
          { width: TABLE_W - 190, lineBreak: false },
        )
        .text(
          `Total bulan: Rp ${total.toLocaleString("id-ID")}`,
          MARGIN + TABLE_W - 185,
          yPos + 6,
          { width: 177, align: "right", lineBreak: false },
        );
      doc
        .save()
        .strokeColor(COLOR.border)
        .lineWidth(0.5)
        .rect(MARGIN, yPos, TABLE_W, MONTH_H)
        .stroke()
        .restore();
      yPos += MONTH_H;
    };

    // ─────────────────────────────────────────
    //  KOP SURAT
    // ─────────────────────────────────────────
    const KOP_H = 60;

    fillRect(MARGIN, yPos, TABLE_W, KOP_H, "#f0f7fc");
    fillRect(MARGIN, yPos, 4, KOP_H, COLOR.primary); // accent bar kiri

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

    // Garis bawah kop — tebal biru + tipis abu
    doc
      .save()
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + TABLE_W, yPos)
      .lineWidth(2)
      .strokeColor(COLOR.accent)
      .stroke()
      .restore();
    yPos += 3;
    doc
      .save()
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + TABLE_W, yPos)
      .lineWidth(0.5)
      .strokeColor(COLOR.border)
      .stroke()
      .restore();

    // ─────────────────────────────────────────
    //  JUDUL
    // ─────────────────────────────────────────
    yPos += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLOR.dark)
      .text("LAPORAN PENJUALAN", MARGIN, yPos, {
        width: TABLE_W,
        align: "center",
      });

    yPos += 18;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(`Periode: ${periodLabel}`, MARGIN, yPos, {
        width: TABLE_W,
        align: "center",
      });

    yPos += 20;

    const formatTanggal = (date) => new Date(date).toLocaleDateString("id-ID");

    drawHeader();

    // ─────────────────────────────────────────
    //  DATA
    // ─────────────────────────────────────────
    let no = 1;
    let totalSemua = 0;
    let isEven = false;

    let activeMonthKey = null;
    let activeMonthLabel = "";
    let activeMonthTotal = 0;

    transactions.forEach((trx) => {
      const transactionMonthKey = getMonthKey(trx.tanggal);
      const transactionBlockHeight = (trx.items.length + 1) * ROW_H;
      const maxTransactionBlock = BOTTOM_LIMIT - 50 - HEADER_H - MONTH_H;

      if (transactionMonthKey !== activeMonthKey) {
        const isFirstMonth = activeMonthKey === null;
        activeMonthKey = transactionMonthKey;
        activeMonthLabel = getMonthLabel(trx.tanggal);
        activeMonthTotal = monthTotals.get(transactionMonthKey) || 0;
        const monthGap = isFirstMonth ? 0 : 10;
        const movedToNewPage = ensureSpace(
          monthGap +
            MONTH_H +
            (transactionBlockHeight < maxTransactionBlock
              ? transactionBlockHeight
              : ROW_H * 2),
        );
        if (!movedToNewPage) {
          yPos += monthGap;
        }
        drawMonthBand(activeMonthLabel, activeMonthTotal);
      }

      if (
        transactionBlockHeight < maxTransactionBlock &&
        ensureSpace(transactionBlockHeight)
      ) {
        drawMonthBand(activeMonthLabel, activeMonthTotal, true);
      }

      let subtotalTrx = 0;

      trx.items.forEach((item, idx) => {
        if (ensureSpace(ROW_H + (idx === trx.items.length - 1 ? ROW_H : 0))) {
          drawMonthBand(activeMonthLabel, activeMonthTotal, true);
        }

        fillRect(
          MARGIN,
          yPos,
          TABLE_W,
          ROW_H,
          isEven ? COLOR.rowOdd : COLOR.rowAlt,
        );

        doc.fillColor(COLOR.dark).font("Helvetica").fontSize(9);

        if (idx === 0) {
          doc.text(String(no), COL_X.no, yPos + 6, {
            width: COL_W.no,
            align: "center",
            lineBreak: false,
          });
          doc.text(formatTanggal(trx.tanggal), COL_X.tanggal + 4, yPos + 6, {
            width: COL_W.tanggal - 8,
            lineBreak: false,
          });
          doc.text(trx.nama_pengepul, COL_X.pengepul + 4, yPos + 6, {
            width: COL_W.pengepul - 8,
            lineBreak: false,
            ellipsis: true,
          });
          no++;
        }

        doc.text(`- ${item.barang}`, COL_X.barang + 4, yPos + 6, {
          width: COL_W.barang - 8,
          lineBreak: false,
          ellipsis: true,
        });

        doc.text(`${item.berat} kg`, COL_X.berat, yPos + 6, {
          width: COL_W.berat - 4,
          align: "right",
          lineBreak: false,
        });

        doc
          .font("Helvetica-Bold")
          .fillColor(COLOR.primary)
          .text(
            "Rp " + item.subtotal.toLocaleString("id-ID"),
            COL_X.subtotal,
            yPos + 6,
            { width: COL_W.subtotal - 4, align: "right", lineBreak: false },
          );

        doc.font("Helvetica").fillColor(COLOR.dark);

        subtotalTrx += item.subtotal;
        totalSemua += item.subtotal;

        drawTableBorder(yPos, ROW_H);

        yPos += ROW_H;
        isEven = !isEven;
      });

      fillRect(MARGIN, yPos, TABLE_W, ROW_H, COLOR.subtotalBg);

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLOR.primary)
        .text(`Subtotal Transaksi`, COL_X.no + 4, yPos + 6, {
          width:
            COL_W.no +
            COL_W.tanggal +
            COL_W.pengepul +
            COL_W.barang +
            COL_W.berat -
            8,
          align: "left",
          lineBreak: false,
        })
        .text(
          "Rp " + subtotalTrx.toLocaleString("id-ID"),
          COL_X.subtotal,
          yPos + 6,
          { width: COL_W.subtotal - 4, align: "right", lineBreak: false },
        );

      drawSubtotalBorder(yPos, ROW_H);

      yPos += ROW_H + 2;
    });

    // ─────────────────────────────────────────
    //  BARIS TOTAL KESELURUHAN
    // ─────────────────────────────────────────
    ensureSpace(ROW_H + 4, false);

    fillRect(MARGIN, yPos, TABLE_W, ROW_H + 4, COLOR.totalBg);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLOR.headerText)
      .text("TOTAL KESELURUHAN", COL_X.no + 4, yPos + 8, {
        width:
          COL_W.no +
          COL_W.tanggal +
          COL_W.pengepul +
          COL_W.barang +
          COL_W.berat -
          8,
        lineBreak: false,
      })
      .text(
        "Rp " + totalSemua.toLocaleString("id-ID"),
        COL_X.subtotal,
        yPos + 8,
        { width: COL_W.subtotal - 4, align: "right", lineBreak: false },
      );

    doc
      .save()
      .strokeColor(COLOR.border)
      .lineWidth(0.5)
      .rect(MARGIN, yPos, TABLE_W, ROW_H + 4)
      .stroke()
      .restore();

    yPos += ROW_H + 4;

    // ─────────────────────────────────────────
    //  TANDA TANGAN + FOOTER
    //  Dihitung sebagai SATU blok agar tidak terpotong/terpisah halaman.
    //  Tinggi blok: jarak atas(30) + baris tempat&tgl(14) + jarak ttd(50)
    //  + garis ttd + jarak footer(20) + garis + teks footer(~10) + sedikit padding
    // ─────────────────────────────────────────
    const SIGNATURE_BLOCK_H = 30 + 14 + 50 + 20 + 18 + 10;

    ensureSpace(SIGNATURE_BLOCK_H, false);

    yPos += 30;

    const ttdX = MARGIN + TABLE_W - 160;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.dark)
      .text(
        `Padang, ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
        ttdX,
        yPos,
        { width: 155, align: "center" },
      );

    yPos += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLOR.dark)
      .text("Direktur Bank Sampah", ttdX, yPos, {
        width: 155,
        align: "center",
      });

    yPos += 50;

    // Garis tanda tangan
    doc
      .save()
      .moveTo(ttdX + 10, yPos)
      .lineTo(ttdX + 145, yPos)
      .lineWidth(1)
      .strokeColor(COLOR.dark)
      .stroke()
      .restore();

    // ─────────────────────────────────────────
    //  FOOTER
    // ─────────────────────────────────────────
    yPos += 20;

    doc
      .save()
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + TABLE_W, yPos)
      .lineWidth(0.5)
      .strokeColor(COLOR.border)
      .stroke()
      .restore();

    yPos += 8;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR.muted)
      .text(
        `© ${new Date().getFullYear()} ${bank?.nama_bank_sampah || "Bank Sampah"} — Dokumen ini digenerate otomatis oleh sistem.`,
        MARGIN,
        yPos,
        { width: TABLE_W, align: "center" },
      );

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal export PDF" });
  }
};
