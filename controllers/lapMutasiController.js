import * as mutasiModel from "../models/lapMutasiModel.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import db from "../config/db.js";

export const getMutasi = async (req, res) => {
  try {
    const { start_date, end_date, keyword, last_id, limit, tipe } = req.query;

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
      tipe,
      no_limit: false,
    });
    console.log(req.query);
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

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

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

    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;

    const MARGIN = 45;
    const TABLE_W = PAGE_W - MARGIN * 2;
    const PAGE_BOTTOM = PAGE_H - 50;

    const COL_W = {
      tanggal: 90,
      rekening: 90,
      nama: 120,
      tipe: 60,
      jumlah: 85,
      saldo: 85,
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

    // ================= HEADER TABLE =================
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

    // ================= KOP =================
    const KOP_H = 60;

    fillRect(MARGIN, yPos, TABLE_W, KOP_H, "#f0f7fc");
    fillRect(MARGIN, yPos, 4, KOP_H, COLOR.primary);

    if (bank?.logo_path) {
      const logoPath = path.join(process.cwd(), bank.logo_path);

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN + 12, yPos + 5, {
          height: 50,
        });
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

    // ================= FILTER INFO =================
    const filterBoxY = yPos;

    let tipeLabel = null;

    if (req.query.tipe) {
      const tipeUpper = req.query.tipe.toUpperCase();

      if (tipeUpper === "SETOR") {
        tipeLabel = "Transaksi Penyetoran";
      } else if (tipeUpper === "TARIK") {
        tipeLabel = "Transaksi Penarikan";
      } else {
        tipeLabel = req.query.tipe;
      }
    }

    const filterItems = [];

    if (req.query.start_date && req.query.end_date) {
      filterItems.push({
        label: "Periode",
        value: `${new Date(req.query.start_date).toLocaleDateString("id-ID")} s/d ${new Date(req.query.end_date).toLocaleDateString("id-ID")}`,
      });
    }

    if (req.query.keyword) {
      filterItems.push({
        label: "Pencarian",
        value: req.query.keyword,
      });
    }

    if (tipeLabel) {
      filterItems.push({
        label: "Jenis Transaksi",
        value: tipeLabel,
      });
    }

    if (filterItems.length) {
      const boxHeight = 18 + filterItems.length * 16;

      // background utama
      doc
        .save()
        .roundedRect(MARGIN, filterBoxY, TABLE_W, boxHeight, 6)
        .fill("#f8fbfd")
        .restore();

      // border tipis
      doc
        .save()
        .lineWidth(0.7)
        .strokeColor("#d6eaf8")
        .roundedRect(MARGIN, filterBoxY, TABLE_W, boxHeight, 6)
        .stroke()
        .restore();

      // garis atas aksen
      doc
        .save()
        .roundedRect(MARGIN, filterBoxY, TABLE_W, 4, 6)
        .fill(COLOR.primary)
        .restore();

      let labelX = MARGIN + 15;
      let valueX = MARGIN + 120;
      let itemY = filterBoxY + 14;

      filterItems.forEach((item) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLOR.primary)
          .text(item.label, labelX, itemY);

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLOR.dark)
          .text(`: ${item.value}`, valueX, itemY);

        itemY += 16;
      });

      yPos += boxHeight + 16;
    }

    // ================= HEADER =================
    drawHeader();

    // ================= DATA =================
    let isEven = false;

    (data || []).forEach((row) => {
      // 🔥 PAGE BREAK
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

      const jumlah = Number(row.jumlah || 0);
      const saldo = Number(row.saldo_sesudah || 0);

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

    // ================= TOTAL =================
    const totalSetoran = (data || [])
      .filter((d) => d.tipe === "SETOR")
      .reduce((sum, d) => sum + Number(d.jumlah || 0), 0);

    const totalPenarikan = (data || [])
      .filter((d) => d.tipe === "TARIK")
      .reduce((sum, d) => sum + Number(d.jumlah || 0), 0);

    const totalTransaksi = (data || []).length;

    // 🔥 CEK SPACE SEBELUM SUMMARY
    if (yPos + 140 > PAGE_BOTTOM) {
      doc.addPage();
      yPos = 50;
    }

    yPos += 20;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLOR.dark)
      .text("RINGKASAN TRANSAKSI", MARGIN, yPos);

    yPos += 18;

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Total Transaksi : ${totalTransaksi}`, MARGIN, yPos);

    yPos += 15;

    doc.text(
      `Total Setoran : Rp ${totalSetoran.toLocaleString("id-ID")}`,
      MARGIN,
      yPos,
    );

    yPos += 15;

    doc.text(
      `Total Penarikan : Rp ${totalPenarikan.toLocaleString("id-ID")}`,
      MARGIN,
      yPos,
    );

    // ================= TANDA TANGAN =================
    yPos += 50;

    const ttdX = PAGE_W - 220;

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Padang, ${new Date().toLocaleDateString("id-ID")}`, ttdX, yPos, {
        width: 160,
        align: "center",
      });

    yPos += 15;

    doc.font("Helvetica-Bold").text("Direktur Bank Sampah", ttdX, yPos, {
      width: 160,
      align: "center",
    });

    yPos += 70;

    doc.font("Helvetica-Bold").text("(____________________)", ttdX, yPos, {
      width: 160,
      align: "center",
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message,
    });
  }
};
