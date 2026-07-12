import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import * as lapKeuanganModel from "../models/lapKeuanganModel.js";

const VALID_JENIS = ["PENJUALAN", "SETORAN", "PENARIKAN", "PENGELUARAN"];

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

/**
 * GET /laporan-keuangan/dashboard
 * Query params: id_bank_sampah, bulan, tahun (bulan & tahun opsional, default bulan berjalan)
 */
export async function dashboard(req, res) {
  try {
    // Asumsi: id_bank_sampah bisa dikirim via query, atau tersedia di req.user (middleware auth)
    const id_bank_sampah = req.query.id_bank_sampah || req.user?.id_bank_sampah;

    if (!id_bank_sampah) {
      return res
        .status(400)
        .json({ success: false, message: "id_bank_sampah wajib diisi" });
    }

    const now = new Date();
    const bulan = req.query.bulan
      ? parseInt(req.query.bulan, 10)
      : now.getMonth() + 1;
    const tahun = req.query.tahun
      ? parseInt(req.query.tahun, 10)
      : now.getFullYear();

    if (Number.isNaN(bulan) || bulan < 1 || bulan > 12) {
      return res
        .status(400)
        .json({ success: false, message: "Bulan tidak valid" });
    }
    if (Number.isNaN(tahun) || tahun < 2000 || tahun > 2100) {
      return res
        .status(400)
        .json({ success: false, message: "Tahun tidak valid" });
    }

    const data = await lapKeuanganModel.getDashboard(
      id_bank_sampah,
      bulan,
      tahun,
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getDashboard laporan keuangan:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil laporan keuangan",
    });
  }
}

/**
 * GET /laporan-keuangan/summary
 * Query params: id_bank_sampah
 * Posisi kas & saldo saat ini (tidak difilter bulan/tahun)
 */
export async function summary(req, res) {
  try {
    const id_bank_sampah = req.query.id_bank_sampah || req.user?.id_bank_sampah;

    if (!id_bank_sampah) {
      return res
        .status(400)
        .json({ success: false, message: "id_bank_sampah wajib diisi" });
    }

    const data = await lapKeuanganModel.getSummary(id_bank_sampah);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getSummary laporan keuangan:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil ringkasan keuangan",
    });
  }
}

/**
 * GET /laporan-keuangan/bulanan
 * Query params: id_bank_sampah, tahun (opsional, default tahun berjalan)
 * Rincian 12 bulan: penjualan, setoran, pencairan, laba
 */
export async function bulanan(req, res) {
  try {
    const id_bank_sampah = req.query.id_bank_sampah || req.user?.id_bank_sampah;

    if (!id_bank_sampah) {
      return res
        .status(400)
        .json({ success: false, message: "id_bank_sampah wajib diisi" });
    }

    const tahun = req.query.tahun
      ? parseInt(req.query.tahun, 10)
      : new Date().getFullYear();

    if (Number.isNaN(tahun) || tahun < 2000 || tahun > 2100) {
      return res
        .status(400)
        .json({ success: false, message: "Tahun tidak valid" });
    }

    const data = await lapKeuanganModel.getRincianBulanan(
      id_bank_sampah,
      tahun,
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getRincianBulanan laporan keuangan:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil rincian bulanan",
    });
  }
}

/**
 * GET /laporan-keuangan/cetak
 * Query params:
 *  - mode=harian, tanggal=YYYY-MM-DD
 *  - mode=bulanan, bulan=1-12, tahun=YYYY
 *  - id_bank_sampah
 */
export async function cetak(req, res) {
  try {
    const id_bank_sampah = req.query.id_bank_sampah || req.user?.id_bank_sampah;
    const mode = req.query.mode;

    if (!id_bank_sampah) {
      return res
        .status(400)
        .json({ success: false, message: "id_bank_sampah wajib diisi" });
    }
    if (!["harian", "bulanan"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Parameter mode harus "harian" atau "bulanan"',
      });
    }

    let startDate;
    let endDate;
    let judul;
    let subjudul;
    let periodeLabel;
    let namaFile;

    if (mode === "harian") {
      const { tanggal } = req.query;

      if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        return res.status(400).json({
          success: false,
          message: "Parameter tanggal wajib diisi dengan format YYYY-MM-DD",
        });
      }

      startDate = tanggal;
      endDate = tanggal;
      judul = "LAPORAN KEUANGAN HARIAN";
      subjudul = formatTanggalPanjang(tanggal).toUpperCase();
      periodeLabel = formatTanggalPanjang(tanggal);
      namaFile = `laporan-keuangan-harian-${tanggal}.pdf`;
    } else {
      const bulan = parseInt(req.query.bulan, 10);
      const tahun = parseInt(req.query.tahun, 10);

      if (!bulan || bulan < 1 || bulan > 12) {
        return res
          .status(400)
          .json({ success: false, message: "Parameter bulan tidak valid" });
      }
      if (!tahun || tahun < 2000 || tahun > 2100) {
        return res
          .status(400)
          .json({ success: false, message: "Parameter tahun tidak valid" });
      }

      const awal = new Date(Date.UTC(tahun, bulan - 1, 1));
      const akhir = new Date(Date.UTC(tahun, bulan, 0));
      startDate = awal.toISOString().split("T")[0];
      endDate = akhir.toISOString().split("T")[0];

      judul = "LAPORAN KEUANGAN";
      subjudul = `${NAMA_BULAN[bulan - 1].toUpperCase()} ${tahun}`;
      periodeLabel = `${formatTanggalPanjang(startDate)} s.d. ${formatTanggalPanjang(endDate)}`;
      namaFile = `laporan-keuangan-${String(bulan).padStart(2, "0")}-${tahun}.pdf`;
    }

    const laporan = await lapKeuanganModel.getLaporanCetak(id_bank_sampah, {
      startDate,
      endDate,
    });
    const tanggalCetak = formatTanggalPanjang(new Date());

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${namaFile}"`);

    const doc = new PDFDocument({ size: "A4", margin: 45, bufferPages: true });
    doc.pipe(res);

    renderLaporanKeuanganPDF(doc, {
      ...laporan,
      judul,
      subjudul,
      periodeLabel,
      tanggalCetak,
      // TODO: ganti nama kota sesuai kelurahan/kota bank sampah bila tersedia di tabel
      kotaTandaTangan: "Padang",
    });

    doc.end();
  } catch (error) {
    console.error("Error cetak laporan keuangan:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat membuat PDF laporan keuangan",
      });
    }
    res.end();
  }
}

/* ==========================================================
 * HELPER RENDER PDF (internal, tidak diekspor)
 * ========================================================== */

// Palet warna disamakan dengan laporan kinerja
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

function formatTanggalPanjang(dateInput) {
  const d =
    typeof dateInput === "string"
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function formatAngka(n) {
  return Math.round(n || 0).toLocaleString("id-ID");
}

function fillRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function renderLaporanKeuanganPDF(doc, laporan) {
  const marginLeft = doc.page.margins.left;
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  let y = doc.page.margins.top;

  // ---- KOP: logo + nama bank + alamat (gaya laporan kinerja) ----
  const KOP_H = 60;

  fillRect(doc, marginLeft, y, pageWidth, KOP_H, "#f0f7fc");
  fillRect(doc, marginLeft, y, 4, KOP_H, COLOR.primary);

  if (laporan.bankSampah?.logoPath) {
    const logoFullPath = path.join(process.cwd(), laporan.bankSampah.logoPath);
    if (fs.existsSync(logoFullPath)) {
      doc.image(logoFullPath, marginLeft + 12, y + 5, { height: 50 });
    } else {
      console.error(`[logo] File tidak ditemukan: ${logoFullPath}`);
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLOR.primary)
    .text(laporan.bankSampah.nama, marginLeft + 70, y + 10, {
      width: pageWidth - 80,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLOR.muted)
    .text(laporan.bankSampah.alamat, marginLeft + 70, y + 28, {
      width: pageWidth - 80,
    });

  y += KOP_H + 6;

  doc
    .moveTo(marginLeft, y)
    .lineTo(marginLeft + pageWidth, y)
    .lineWidth(2)
    .strokeColor(COLOR.accent)
    .stroke();
  y += 3;
  doc
    .moveTo(marginLeft, y)
    .lineTo(marginLeft + pageWidth, y)
    .lineWidth(0.5)
    .strokeColor(COLOR.border)
    .stroke();
  y += 14;

  // ---- Judul laporan ----
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(COLOR.dark)
    .text(laporan.judul, marginLeft, y, { width: pageWidth, align: "center" });
  y += 16;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR.dark)
    .text(laporan.subjudul, marginLeft, y, {
      width: pageWidth,
      align: "center",
    });
  y += 20;

  // ---- Periode & tanggal cetak ----
  doc.font("Helvetica").fontSize(9).fillColor(COLOR.dark);
  doc.text(`Periode       : ${laporan.periodeLabel}`, marginLeft, y);
  y += 13;
  doc.text(`Tanggal Cetak : ${laporan.tanggalCetak}`, marginLeft, y);
  y += 20;

  const colNo = 28;
  const colTanggal = 65;
  const colJumlah = 105;
  const colUraian = pageWidth - colNo - colTanggal - colJumlah;

  const columns = [
    { key: "no", label: "No", width: colNo, align: "center" },
    { key: "tanggal", label: "Tanggal", width: colTanggal, align: "center" },
    { key: "uraian", label: "Uraian", width: colUraian, align: "left" },
    { key: "jumlah", label: "Jumlah (Rp)", width: colJumlah, align: "right" },
  ];

  y = drawSectionTable(doc, {
    title: "A. PENDAPATAN PENJUALAN",
    columns,
    rows: laporan.penjualan.items.map((it, i) => ({
      no: i + 1,
      tanggal: it.tanggal,
      uraian: it.uraian,
      jumlah: formatAngka(it.nominal),
    })),
    totalLabel: "Total Pendapatan",
    totalValue: formatAngka(laporan.penjualan.total),
    startY: y,
  });

  y = drawSectionTable(doc, {
    title: "B. NILAI SETORAN NASABAH",
    columns,
    rows: laporan.setoran.items.map((it, i) => ({
      no: i + 1,
      tanggal: it.tanggal,
      uraian: it.uraian,
      jumlah: formatAngka(it.nominal),
    })),
    totalLabel: "Total Nilai Setoran",
    totalValue: formatAngka(laporan.setoran.total),
    startY: y,
  });

  y = drawSectionTable(doc, {
    title: "C. PENARIKAN SALDO NASABAH",
    columns,
    rows: laporan.penarikan.items.map((it, i) => ({
      no: i + 1,
      tanggal: it.tanggal,
      uraian: it.uraian,
      jumlah: formatAngka(it.nominal),
    })),
    totalLabel: "Total Penarikan Saldo",
    totalValue: formatAngka(laporan.penarikan.total),
    startY: y,
  });

  y = drawSectionTable(doc, {
    title: "D. PENGELUARAN",
    columns,
    rows: laporan.pengeluaran.items.map((it, i) => ({
      no: i + 1,
      tanggal: it.tanggal,
      uraian: it.uraian,
      jumlah: formatAngka(it.nominal),
    })),
    totalLabel: "Total Pengeluaran",
    totalValue: formatAngka(laporan.pengeluaran.total),
    startY: y,
  });

  y = drawRingkasan(doc, laporan.ringkasan, y, pageWidth, marginLeft);
  drawTandaTangan(doc, laporan, y, pageWidth, marginLeft);
}

function ensureSpace(doc, y, needed) {
  const limit = doc.page.height - doc.page.margins.bottom;
  if (y + needed > limit) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
}

function drawSectionTable(
  doc,
  { title, columns, rows, totalLabel, totalValue, startY },
) {
  const marginLeft = doc.page.margins.left;
  const rowHeight = 22;
  const headerHeight = 24;
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);
  const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom;

  const colX = [];
  {
    let x = marginLeft;
    columns.forEach((c) => {
      colX.push(x);
      x += c.width;
    });
  }

  const drawBorder = (y, h) => {
    doc.save().strokeColor(COLOR.border).lineWidth(0.5);
    doc.rect(marginLeft, y, totalWidth, h).stroke();
    colX.slice(1).forEach((x) => {
      doc
        .moveTo(x, y)
        .lineTo(x, y + h)
        .stroke();
    });
    doc.restore();
  };

  let y = ensureSpace(doc, startY, headerHeight + rowHeight * 2 + 24);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLOR.primary)
    .text(title, marginLeft, y);
  y += 16;

  const drawHeader = () => {
    fillRect(doc, marginLeft, y, totalWidth, headerHeight, COLOR.headerBg);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR.headerText);
    columns.forEach((col, i) => {
      doc.text(col.label, colX[i] + 4, y + 8, {
        width: col.width - 8,
        align: col.align,
      });
    });
    drawBorder(y, headerHeight);
    y += headerHeight;
  };

  drawHeader();

  if (rows.length === 0) {
    y = ensureSpace(doc, y, rowHeight);
    fillRect(doc, marginLeft, y, totalWidth, rowHeight, COLOR.rowOdd);
    doc
      .font("Helvetica-Oblique")
      .fontSize(8.5)
      .fillColor(COLOR.muted)
      .text("Tidak ada data", marginLeft + 4, y + 7, {
        width: totalWidth - 8,
        align: "center",
      });
    drawBorder(y, rowHeight);
    y += rowHeight;
  } else {
    rows.forEach((row, i) => {
      if (y + rowHeight > PAGE_BOTTOM - 40) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }

      const isEven = i % 2 === 0;
      fillRect(
        doc,
        marginLeft,
        y,
        totalWidth,
        rowHeight,
        isEven ? COLOR.rowOdd : COLOR.rowAlt,
      );

      doc.font("Helvetica").fontSize(8.5).fillColor(COLOR.dark);
      columns.forEach((col, ci) => {
        doc.text(String(row[col.key] ?? ""), colX[ci] + 4, y + 7, {
          width: col.width - 8,
          align: col.align,
        });
      });

      drawBorder(y, rowHeight);
      y += rowHeight;
    });
  }

  // Baris total
  y = ensureSpace(doc, y, rowHeight);
  const jumlahColWidth = columns[columns.length - 1].width;
  const labelWidth = totalWidth - jumlahColWidth;

  fillRect(doc, marginLeft, y, totalWidth, rowHeight, COLOR.totalBg);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR.primary);
  doc.text(totalLabel, marginLeft + 4, y + 7, {
    width: labelWidth - 8,
    align: "right",
  });
  doc.text(totalValue, marginLeft + labelWidth + 4, y + 7, {
    width: jumlahColWidth - 8,
    align: "right",
  });
  drawBorder(y, rowHeight);

  return y + rowHeight + 20;
}

function drawRingkasan(doc, ringkasan, startY, pageWidth, marginLeft) {
  const rowHeight = 22;
  const valueWidth = 140;
  const labelWidth = pageWidth - valueWidth;

  let y = ensureSpace(doc, startY, rowHeight * 6 + 20);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLOR.primary)
    .text("E. RINGKASAN KEUANGAN", marginLeft, y);
  y += 16;

  const rows = [
    ["Pendapatan Penjualan", ringkasan.pendapatanPenjualan],
    ["Nilai Setoran Nasabah", ringkasan.nilaiSetoran],
    ["Penarikan Saldo Nasabah", ringkasan.penarikanSaldo],
    ["Pengeluaran", ringkasan.pengeluaran],
  ];

  rows.forEach(([label, value], i) => {
    const isEven = i % 2 === 0;
    fillRect(
      doc,
      marginLeft,
      y,
      pageWidth,
      rowHeight,
      isEven ? COLOR.rowOdd : COLOR.rowAlt,
    );
    doc.font("Helvetica").fontSize(8.5).fillColor(COLOR.dark);
    doc.text(label, marginLeft + 6, y + 7, { width: labelWidth - 12 });
    doc.text(formatAngka(value), marginLeft + labelWidth + 4, y + 7, {
      width: valueWidth - 8,
      align: "right",
    });
    doc
      .save()
      .strokeColor(COLOR.border)
      .lineWidth(0.5)
      .rect(marginLeft, y, pageWidth, rowHeight)
      .stroke()
      .moveTo(marginLeft + labelWidth, y)
      .lineTo(marginLeft + labelWidth, y + rowHeight)
      .stroke()
      .restore();
    y += rowHeight;
  });

  fillRect(doc, marginLeft, y, pageWidth, rowHeight, COLOR.totalBg);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.primary);
  doc.text("LABA BERSIH PERIODE", marginLeft + 6, y + 7, {
    width: labelWidth - 12,
  });
  doc.text(
    formatAngka(ringkasan.labaBersih),
    marginLeft + labelWidth + 4,
    y + 7,
    {
      width: valueWidth - 8,
      align: "right",
    },
  );
  doc
    .save()
    .strokeColor(COLOR.border)
    .lineWidth(0.5)
    .rect(marginLeft, y, pageWidth, rowHeight)
    .stroke()
    .moveTo(marginLeft + labelWidth, y)
    .lineTo(marginLeft + labelWidth, y + rowHeight)
    .stroke()
    .restore();

  return y + rowHeight + 34;
}

function drawTandaTangan(doc, laporan, startY, pageWidth, marginLeft) {
  const blockHeight = 30 + 14 + 50 + 14 + 20;
  let y = ensureSpace(doc, startY, blockHeight);

  const ttdX = marginLeft + pageWidth - 160;

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLOR.dark)
    .text(`${laporan.kotaTandaTangan}, ${laporan.tanggalCetak}`, ttdX, y, {
      width: 155,
      align: "center",
    });
  y += 20;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLOR.dark)
    .text("Direktur Bank Sampah", ttdX, y, { width: 155, align: "center" });

  y += 50;

  doc
    .save()
    .moveTo(ttdX + 10, y)
    .lineTo(ttdX + 145, y)
    .lineWidth(1)
    .strokeColor(COLOR.dark)
    .stroke()
    .restore();

  y += 14;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLOR.dark)
    .text(`Bank Sampah ${laporan.bankSampah.nama || "Bank Sampah"}`, ttdX, y, {
      width: 155,
      align: "center",
    });
}

export async function detail(req, res) {
  try {
    const { id, jenis } = req.query;

    if (!id || !jenis) {
      return res
        .status(400)
        .json({ success: false, message: "id dan jenis wajib diisi" });
    }

    const jenisUpper = String(jenis).toUpperCase();

    if (!VALID_JENIS.includes(jenisUpper)) {
      return res
        .status(400)
        .json({ success: false, message: "Jenis transaksi tidak valid" });
    }

    const data = await lapKeuanganModel.getDetail(id, jenisUpper);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Data transaksi tidak ditemukan" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getDetail laporan keuangan:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil detail transaksi",
    });
  }
}
