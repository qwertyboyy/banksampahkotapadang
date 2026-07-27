import * as JenisModel from "../models/sampahModel.js";
import db from "../config/db.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/* ================= GET ================= */
export const getJenis = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const offset = (page - 1) * limit;

    const id_bank_sampah = req.user.id_bank_sampah;

    const { rows, total } = await JenisModel.getAllJenis({
      id_bank_sampah,
      search,
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json({
      data: rows,
      total,
    });
  } catch (err) {
    console.error(err); // WAJIB
    res.status(500).json({ message: "Gagal ambil data" });
  }
};

export const getKategori = async (req, res) => {
  try {
    const [rows] = await JenisModel.getAllKategori();

    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal ambil data kategori" });
  }
};

/* ================= CREATE ================= */
export const createJenis = async (req, res) => {
  try {
    const { id_kategori, nama_jenis, harga_per_kg } = req.body;

    if (!id_kategori || !nama_jenis || !harga_per_kg) {
      return res.status(400).json({ message: "Field wajib diisi" });
    }

    if (harga_per_kg <= 0) {
      return res.status(400).json({ message: "Harga tidak valid" });
    }

    const id_bank_sampah = req.user.id_bank_sampah;

    await JenisModel.createJenis({
      id_bank_sampah,
      id_kategori,
      nama_jenis,
      harga_per_kg,
    });

    res.json({ message: "Berhasil tambah data" });
  } catch (err) {
    console.error(err); // WAJIB
    res.status(500).json({ message: "Gagal tambah data" });
  }
};

/* ================= UPDATE ================= */
export const updateJenis = async (req, res) => {
  try {
    const { id } = req.params;

    await JenisModel.updateJenis(id, req.body);

    res.json({ message: "Berhasil update" });
  } catch {
    res.status(500).json({ message: "Gagal update" });
  }
};

/* ================= DELETE ================= */
export const deleteJenis = async (req, res) => {
  try {
    const { id } = req.params;

    await JenisModel.deleteJenis(id);

    res.json({ message: "Berhasil hapus (nonaktif)" });
  } catch {
    res.status(500).json({ message: "Gagal hapus" });
  }
};

export const getJenisSelectController = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;
    const keyword = req.query.keyword?.trim() || "";

    const data = await JenisModel.getJenisSelect(id_bank_sampah, keyword);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ERROR JENIS SELECT:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const exportPdfHargaSampah = async (req, res) => {
  try {
    const id_bank_sampah = req.user.id_bank_sampah;

    const [[bank]] = await db.query(
      "SELECT nama_bank_sampah, alamat, logo_path FROM bank_sampah WHERE id_bank_sampah = ?",
      [id_bank_sampah],
    );

    const data = await JenisModel.getLaporanHargaSampah(id_bank_sampah);

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=laporan-harga-sampah.pdf",
    );

    doc.pipe(res);

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
    const PAGE_BOTTOM = doc.page.height - 50;

    const COL_W = {
      no: 34,
      kategori: 145,
      jenis: 210,
      harga: 116,
    };

    const COL_X = {
      no: MARGIN,
      kategori: MARGIN + COL_W.no,
      jenis: MARGIN + COL_W.no + COL_W.kategori,
      harga: MARGIN + COL_W.no + COL_W.kategori + COL_W.jenis,
    };

    const ROW_H = 24;
    const HEADER_H = 26;
    let yPos = 40;

    const fillRect = (x, y, w, h, color) => {
      doc.save().rect(x, y, w, h).fill(color).restore();
    };

    const drawTableBorder = (y, h) => {
      doc.save().strokeColor(COLOR.border).lineWidth(0.5);
      doc.rect(MARGIN, y, TABLE_W, h).stroke();

      [COL_X.kategori, COL_X.jenis, COL_X.harga].forEach((x) => {
        doc
          .moveTo(x, y)
          .lineTo(x, y + h)
          .stroke();
      });

      doc.restore();
    };

    const drawHeader = () => {
      fillRect(MARGIN, yPos, TABLE_W, HEADER_H, COLOR.headerBg);

      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.headerText);
      doc.text("No", COL_X.no, yPos + 8, {
        width: COL_W.no,
        align: "center",
      });
      doc.text("Kategori", COL_X.kategori + 4, yPos + 8, {
        width: COL_W.kategori - 8,
      });
      doc.text("Jenis Sampah", COL_X.jenis + 4, yPos + 8, {
        width: COL_W.jenis - 8,
      });
      doc.text("Harga / Kg", COL_X.harga, yPos + 8, {
        width: COL_W.harga - 6,
        align: "right",
      });

      drawTableBorder(yPos, HEADER_H);
      yPos += HEADER_H;
    };

    const ensureSpace = (height, withHeader = true) => {
      if (yPos + height > PAGE_BOTTOM) {
        doc.addPage();
        yPos = 50;
        if (withHeader) drawHeader();
      }
    };

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
      .text(bank?.nama_bank_sampah || "BANK SAMPAH", MARGIN + 70, yPos + 10);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(bank?.alamat || "-", MARGIN + 70, yPos + 28, {
        width: TABLE_W - 82,
      });

    yPos += KOP_HEIGHT + 6;

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

    yPos += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLOR.dark)
      .text("LAPORAN HARGA SAMPAH", MARGIN, yPos, {
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

    drawHeader();

    if (!data.length) {
      fillRect(MARGIN, yPos, TABLE_W, ROW_H, COLOR.rowOdd);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLOR.muted)
        .text("Belum ada data harga sampah aktif.", MARGIN, yPos + 7, {
          width: TABLE_W,
          align: "center",
        });
      drawTableBorder(yPos, ROW_H);
      yPos += ROW_H;
    }

    data.forEach((row, index) => {
      ensureSpace(ROW_H);

      fillRect(
        MARGIN,
        yPos,
        TABLE_W,
        ROW_H,
        index % 2 === 0 ? COLOR.rowOdd : COLOR.rowAlt,
      );

      doc.font("Helvetica").fontSize(9).fillColor(COLOR.dark);
      doc.text(String(index + 1), COL_X.no, yPos + 7, {
        width: COL_W.no,
        align: "center",
      });
      doc.text(row.nama_kategori || "-", COL_X.kategori + 4, yPos + 7, {
        width: COL_W.kategori - 8,
        ellipsis: true,
      });
      doc.text(row.nama_jenis || "-", COL_X.jenis + 4, yPos + 7, {
        width: COL_W.jenis - 8,
        ellipsis: true,
      });
      doc
        .font("Helvetica-Bold")
        .fillColor(COLOR.primary)
        .text(
          "Rp " + Number(row.harga_per_kg || 0).toLocaleString("id-ID"),
          COL_X.harga,
          yPos + 7,
          { width: COL_W.harga - 6, align: "right" },
        );

      drawTableBorder(yPos, ROW_H);
      yPos += ROW_H;
    });

    ensureSpace(ROW_H, false);

    fillRect(MARGIN, yPos, TABLE_W, ROW_H, COLOR.totalBg);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLOR.primary)
      .text(`Total Jenis Sampah Aktif: ${data.length}`, MARGIN + 6, yPos + 7, {
        width: TABLE_W - 12,
      });
    drawTableBorder(yPos, ROW_H);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal export laporan harga sampah" });
  }
};
