import LaporanPenjualanModel from "../models/lapPenjualanModel.js";
import db from "../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import BankSampah from "../models/bankSampahModel.js";
import fs from "fs";
import path from "path";

export const getLaporanPenjualan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { startDate, endDate, search } = req.query;

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
    res.status(500).json({ message: "Gagal ambil data" });
  }
};

export const exportExcelPenjualan = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { startDate, endDate, search } = req.query;

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
    res.status(500).json({ message: "Gagal export excel" });
  }
};

export const exportPdfPenjualan = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const [[bank]] = await db.query(
      "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
      [id_bank_sampah],
    );
    const { startDate, endDate, search } = req.query;

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

    const doc = new PDFDocument({ margin: 40 });

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
    const MARGIN = 45;
    const TABLE_W = PAGE_W - MARGIN * 2; // 505

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

    const ROW_H = 22;
    const HEADER_H = 26;

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

    const formatTanggal = (date) => new Date(date).toLocaleDateString("id-ID");

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(
        `Periode: ${startDate ? formatTanggal(startDate) : "-"} s/d ${
          endDate ? formatTanggal(endDate) : "-"
        }`,
        MARGIN,
        yPos,
        { width: TABLE_W, align: "center" },
      );

    yPos += 20;

    // ─────────────────────────────────────────
    //  HEADER TABEL
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

    drawHeader();

    // ─────────────────────────────────────────
    //  DATA
    // ─────────────────────────────────────────
    let no = 1;
    let totalSemua = 0;
    let isEven = false;

    Object.values(grouped).forEach((trx) => {
      let subtotalTrx = 0;

      trx.items.forEach((item, idx) => {
        if (yPos > 750) {
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

      // ── Baris subtotal per transaksi ──
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

      drawTableBorder(yPos, ROW_H);

      yPos += ROW_H + 8; // sedikit jarak antar transaksi
    });

    // ─────────────────────────────────────────
    //  BARIS TOTAL KESELURUHAN
    // ─────────────────────────────────────────
    if (yPos > 730) {
      doc.addPage();
      yPos = 50;
    }

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
    //  TANDA TANGAN
    // ─────────────────────────────────────────
    yPos += 30;

    const ttdX = MARGIN + TABLE_W - 160;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.dark)
      .text(
        `${bank?.nama_bank_sampah || "Bank Sampah"}, ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
        ttdX,
        yPos,
        { width: 155, align: "center" },
      );

    yPos += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLOR.dark)
      .text("Pengelola Bank Sampah", ttdX, yPos, {
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
