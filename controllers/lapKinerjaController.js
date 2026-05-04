import LaporanKinerjaModel from "../models/lapKinerjaModel.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import BankSampah from "../models/bankSampahModel.js";
import db from "../config/db.js";

// ================= HELPER =================
const sanitizeFileName = (name) =>
  name?.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");

// ================= GET DATA =================
export const getLaporanKinerja = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    let { year } = req.query;

    if (!year) year = new Date().getFullYear();

    const data = await LaporanKinerjaModel.getLaporanKinerja(
      id_bank_sampah,
      year,
    );

    res.json({
      message: "Laporan kinerja berhasil diambil",
      year,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

export const getAvailableYears = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;

    const data = await LaporanKinerjaModel.getAvailableYears(id_bank_sampah);

    res.json({
      message: "List tahun tersedia",
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

// ================= EXCEL =================
export const exportExcelLaporanKinerja = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    let { year } = req.query;

    if (!year) year = new Date().getFullYear();

    // 🔥 ambil data bank dari DB
    const bank = await BankSampah.getById(id_bank_sampah);

    const data = await LaporanKinerjaModel.getLaporanKinerja(
      id_bank_sampah,
      year,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Kinerja");

    // HEADER
    worksheet.mergeCells("A1:E1");
    worksheet.getCell("A1").value = bank?.nama_bank_sampah || "BANK SAMPAH";

    worksheet.mergeCells("A2:E2");
    worksheet.getCell("A2").value = `LAPORAN KINERJA TAHUN ${year}`;

    worksheet.mergeCells("A3:E3");
    worksheet.getCell("A3").value =
      `Dicetak: ${new Date().toLocaleDateString()}`;

    // TABLE HEADER
    worksheet.addRow([]);
    worksheet.addRow([
      "Bulan",
      "Total Transaksi",
      "Penarikan (Rp)",
      "Setoran (Kg)",
      "Setoran (Rp)",
    ]);

    const bulanNama = [
      "",
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

    let totalAll = {
      transaksi: 0,
      tarik: 0,
      berat: 0,
      setor: 0,
    };

    data.forEach((d) => {
      worksheet.addRow([
        bulanNama[d.bulan],
        d.total_transaksi,
        d.total_penarikan,
        d.total_berat_setor,
        d.total_nominal_setor,
      ]);

      totalAll.transaksi += d.total_transaksi;
      totalAll.tarik += d.total_penarikan;
      totalAll.berat += d.total_berat_setor;
      totalAll.setor += d.total_nominal_setor;
    });

    // TOTAL
    worksheet.addRow([]);
    worksheet.addRow([
      "TOTAL",
      totalAll.transaksi,
      totalAll.tarik,
      totalAll.berat,
      totalAll.setor,
    ]);

    // 🔥 filename dari DB
    const namaBank = sanitizeFileName(bank?.nama_bank_sampah || "bank_sampah");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan_kinerja${namaBank}_${year}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal export Excel" });
  }
};

// ================= PDF =================
export const exportPdfLaporanKinerja = async (req, res) => {
  try {
    // ✅ FIX 1: destructuring benar
    const { id_bank_sampah } = req.user;

    let { year } = req.query;
    if (!year) year = new Date().getFullYear();

    // ✅ FIX 2: ambil bank hanya sekali
    const [[bank]] = await db.query(
      "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
      [id_bank_sampah],
    );

    const data = await LaporanKinerjaModel.getLaporanKinerja(
      id_bank_sampah,
      year,
    );

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=laporan_kinerja_${year}.pdf`,
    );

    doc.pipe(res);

    const formatRupiah = (n) => Number(n || 0).toLocaleString("id-ID");

    const bulanNama = [
      "",
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
      totalBg: "#d6eaf8",
    };

    const PAGE_W = 595;
    const MARGIN = 45;
    const TABLE_W = PAGE_W - MARGIN * 2;

    const COL_W = {
      no: 30,
      bulan: 70,
      transaksi: 80,
      tarik: 100,
      berat: 70,
      setor: 105,
    };

    const COL_X = {
      no: MARGIN,
      bulan: MARGIN + COL_W.no,
      transaksi: MARGIN + COL_W.no + COL_W.bulan,
      tarik: MARGIN + COL_W.no + COL_W.bulan + COL_W.transaksi,
      berat: MARGIN + COL_W.no + COL_W.bulan + COL_W.transaksi + COL_W.tarik,
      setor:
        MARGIN +
        COL_W.no +
        COL_W.bulan +
        COL_W.transaksi +
        COL_W.tarik +
        COL_W.berat,
    };

    const ROW_H = 22;
    const HEADER_H = 26;

    let yPos = 40;

    const fillRect = (x, y, w, h, color) => {
      doc.save().rect(x, y, w, h).fill(color).restore();
    };

    const drawBorder = (y, h) => {
      doc.save().strokeColor(COLOR.border).lineWidth(0.5);
      doc.rect(MARGIN, y, TABLE_W, h).stroke();

      [
        COL_X.bulan,
        COL_X.transaksi,
        COL_X.tarik,
        COL_X.berat,
        COL_X.setor,
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

    // LOGO
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
      .text("LAPORAN KINERJA", MARGIN, yPos, {
        width: TABLE_W,
        align: "center",
      });

    yPos += 16;

    doc.font("Helvetica").fontSize(10).text(`Tahun: ${year}`, MARGIN, yPos, {
      width: TABLE_W,
      align: "center",
    });

    yPos += 20;

    // ================= HEADER =================
    const drawHeader = () => {
      fillRect(MARGIN, yPos, TABLE_W, HEADER_H, COLOR.headerBg);

      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.headerText);

      doc.text("No", COL_X.no, yPos + 8, { width: COL_W.no, align: "center" });
      doc.text("Bulan", COL_X.bulan + 4, yPos + 8);

      doc.text("Jumlah Transaksi", COL_X.transaksi, yPos + 8, {
        width: COL_W.transaksi,
        align: "center",
      });

      doc.text("Penarikan", COL_X.tarik, yPos + 8, {
        width: COL_W.tarik,
        align: "center",
      });

      doc.text("Berat Setor", COL_X.berat, yPos + 8, {
        width: COL_W.berat,
        align: "center",
      });

      doc.text("Setoran", COL_X.setor, yPos + 8, {
        width: COL_W.setor,
        align: "center",
      });

      drawBorder(yPos, HEADER_H);
      yPos += HEADER_H;
    };

    drawHeader();

    // ================= DATA =================
    const PAGE_BOTTOM = doc.page.height - 50;

    let total = {
      transaksi: 0,
      tarik: 0,
      berat: 0,
      setor: 0,
    };

    data.forEach((d, i) => {
      if (yPos + ROW_H > PAGE_BOTTOM) {
        doc.addPage();
        yPos = 50;
        drawHeader();
      }

      const isEven = i % 2 === 0;

      fillRect(
        MARGIN,
        yPos,
        TABLE_W,
        ROW_H,
        isEven ? COLOR.rowOdd : COLOR.rowAlt,
      );

      doc.font("Helvetica").fontSize(9).fillColor(COLOR.dark);

      doc.text(i + 1, COL_X.no, yPos + 6, {
        width: COL_W.no,
        align: "center",
      });

      doc.text(bulanNama[d.bulan], COL_X.bulan + 4, yPos + 6);

      doc.text(d.total_transaksi, COL_X.transaksi + 4, yPos + 6, {
        width: COL_W.transaksi,
        align: "left",
      });

      doc.text(
        `Rp ${formatRupiah(d.total_penarikan)}`,
        COL_X.tarik + 4,
        yPos + 6,
        {
          width: COL_W.tarik,
          align: "left",
        },
      );

      doc.text(
        `${Math.round(d.total_berat_setor)} Kg`,
        COL_X.berat + 4,
        yPos + 6,
        {
          width: COL_W.berat,
          align: "left",
        },
      );

      doc.text(
        `Rp ${formatRupiah(d.total_nominal_setor)}`,
        COL_X.setor + 4,
        yPos + 6,
        {
          width: COL_W.setor,
          align: "left",
        },
      );

      drawBorder(yPos, ROW_H);

      total.transaksi += Number(d.total_transaksi || 0);
      total.tarik += Number(d.total_penarikan || 0);
      total.berat += Number(d.total_berat_setor || 0);
      total.setor += Number(d.total_nominal_setor || 0);

      yPos += ROW_H;
    });

    // ================= TOTAL =================
    if (yPos + ROW_H > PAGE_BOTTOM) {
      doc.addPage();
      yPos = 50;
      drawHeader(); // 🔥 penting
    }

    fillRect(MARGIN, yPos, TABLE_W, ROW_H, COLOR.totalBg);

    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.primary);

    doc.text("TOTAL", COL_X.bulan + 4, yPos + 6);

    doc.text(total.transaksi, COL_X.transaksi, yPos + 6, {
      width: COL_W.transaksi,
      align: "center",
    });

    doc.text(`Rp ${formatRupiah(total.tarik)}`, COL_X.tarik, yPos + 6, {
      width: COL_W.tarik,
      align: "center",
    });

    doc.text(`${Math.round(total.berat)} Kg`, COL_X.berat, yPos + 6, {
      width: COL_W.berat,
      align: "center",
    });

    doc.text(`Rp ${formatRupiah(total.setor)}`, COL_X.setor, yPos + 6, {
      width: COL_W.setor,
      align: "center",
    });

    drawBorder(yPos, ROW_H);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal export PDF" });
  }
};
