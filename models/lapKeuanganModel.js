import db from "../config/db.js";
import { getKonfigurasiBankSampah } from "./konfigurasiBankSampahModel.js";

/* ==========================================================
 * HELPER
 * ========================================================== */

function getMonthRange(bulan, tahun) {
  const start = new Date(Date.UTC(tahun, bulan - 1, 1));
  const end = new Date(Date.UTC(tahun, bulan, 0)); // hari terakhir bulan
  const format = (d) => d.toISOString().split("T")[0];
  return {
    startDate: format(start),
    endDate: format(end),
    daysInMonth: end.getUTCDate(),
  };
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

/* ==========================================================
 * SUMMARY (posisi kas & saldo saat ini, tidak difilter bulan/tahun)
 * ========================================================== */

export const getSummary = async (id_bank_sampah) => {
  const { penyesuaian_setoran_laporan } =
    await getKonfigurasiBankSampah(id_bank_sampah);
  // Ambil snapshot saldo kas
  const [[saldoAwal]] = await db.query(
    `
    SELECT tanggal, saldo_awal
    FROM saldo_kas_awal
    WHERE id_bank_sampah = ?
    ORDER BY tanggal DESC
    LIMIT 1
    `,
    [id_bank_sampah],
  );

  if (!saldoAwal) {
    return {
      saldoKas: 0,
      kewajibanNasabah: 0,
      pencairanNasabah: 0,
      labaBersih: 0,
      saldoKasAwal: 0,
      totalPenjualan: 0,
      totalPenarikanPeriode: 0,
      totalSetoran: 0,
      totalMutasiPenarikan: 0,
      totalPengeluaran: 0,
    };
  }

  const tanggalSnapshot = saldoAwal.tanggal;

  const [
    [[penjualan]],
    [[penarikanPeriode]],
    [[penarikanSemua]],
    [[nasabah]],
    [[mutasi]],
    [[pengeluaran]],
  ] = await Promise.all([
    // Penjualan setelah snapshot
    db.query(
      `
      SELECT IFNULL(SUM(total_harga),0) AS total
      FROM transaksi_jual
      WHERE id_bank_sampah = ?
      AND tanggal > ?
      `,
      [id_bank_sampah, tanggalSnapshot],
    ),

    // Penarikan setelah snapshot (untuk menghitung saldo kas)
    db.query(
      `
      SELECT IFNULL(SUM(jumlah_tarik),0) AS total
      FROM transaksi_tarik
      WHERE id_bank_sampah = ?
      AND DATE(tanggal_tarik) > ?
      `,
      [id_bank_sampah, tanggalSnapshot],
    ),

    // Total pencairan nasabah (2024 - sekarang)
    db.query(
      `
      SELECT IFNULL(SUM(jumlah_tarik),0) AS total
      FROM transaksi_tarik
      WHERE id_bank_sampah = ?
      `,
      [id_bank_sampah],
    ),

    // Total saldo nasabah aktif
    db.query(
      `
      SELECT IFNULL(SUM(saldo),0) AS total
      FROM nasabah
      WHERE id_bank_sampah = ?
      AND status_aktif = 1
      `,
      [id_bank_sampah],
    ),

    // Total mutasi setor & tarik (2024 - sekarang)
    db.query(
      `
      SELECT
        IFNULL(SUM(CASE WHEN tipe='SETOR' THEN jumlah END),0) AS total_setoran,
        IFNULL(SUM(CASE WHEN tipe='TARIK' THEN jumlah END),0) AS total_penarikan
      FROM mutasi_saldo
      WHERE id_bank_sampah = ?
      `,
      [id_bank_sampah],
    ),

    // Pengeluaran setelah snapshot
    db.query(
      `
      SELECT IFNULL(SUM(nominal),0) AS total
      FROM pengeluaran_bank_sampah
      WHERE id_bank_sampah = ?
      AND tanggal > ?
      `,
      [id_bank_sampah, tanggalSnapshot],
    ),
  ]);

  const saldoKasAwal = Number(saldoAwal.saldo_awal);

  const totalPenjualan = Number(penjualan.total);

  const totalPenarikanPeriode = Number(penarikanPeriode.total);

  const saldoKas = saldoKasAwal + totalPenjualan - totalPenarikanPeriode;

  const kewajibanNasabah = Number(nasabah.total);

  const pencairanNasabah = Number(penarikanSemua.total);
  const totalSetoran = Math.max(
    0,
    Number(mutasi.total_setoran) - penyesuaian_setoran_laporan,
  );

  const totalMutasiPenarikan = Number(mutasi.total_penarikan);

  const totalPengeluaran = Number(pengeluaran.total);

  const labaBersih =
    saldoKas - (totalSetoran - totalMutasiPenarikan) - totalPengeluaran;

  return {
    saldoKas,
    kewajibanNasabah,
    pencairanNasabah,
    labaBersih,

    // informasi tambahan
    saldoKasAwal,
    totalPenjualan,
    totalPenarikanPeriode,
    totalSetoran,
    totalMutasiPenarikan,
    totalPengeluaran,
  };
};

/* ==========================================================
 * RINCIAN BULANAN (12 bulan dalam 1 tahun)
 * ========================================================== */

export async function getRincianBulanan(id_bank_sampah, tahun) {
  const [penjualanRows, setoranRows, tarikRows, pengeluaranRows] =
    await Promise.all([
      db.query(
        `SELECT MONTH(tanggal) AS bulan, COALESCE(SUM(total_harga), 0) AS total
         FROM transaksi_jual
         WHERE id_bank_sampah = ? AND YEAR(tanggal) = ?
         GROUP BY MONTH(tanggal)`,
        [id_bank_sampah, tahun],
      ),
      db.query(
        `SELECT MONTH(tanggal_setor) AS bulan, COALESCE(SUM(total_nilai), 0) AS total
         FROM transaksi_setor
         WHERE id_bank_sampah = ? AND YEAR(tanggal_setor) = ?
         GROUP BY MONTH(tanggal_setor)`,
        [id_bank_sampah, tahun],
      ),
      db.query(
        `SELECT MONTH(tanggal_tarik) AS bulan, COALESCE(SUM(jumlah_tarik), 0) AS total
         FROM transaksi_tarik
         WHERE id_bank_sampah = ? AND YEAR(tanggal_tarik) = ?
         GROUP BY MONTH(tanggal_tarik)`,
        [id_bank_sampah, tahun],
      ),
      db.query(
        `SELECT MONTH(tanggal) AS bulan, COALESCE(SUM(nominal), 0) AS total
         FROM pengeluaran_bank_sampah
         WHERE id_bank_sampah = ? AND YEAR(tanggal) = ?
         GROUP BY MONTH(tanggal)`,
        [id_bank_sampah, tahun],
      ),
    ]);

  const penjualanMap = new Map(
    penjualanRows[0].map((r) => [r.bulan, Number(r.total)]),
  );
  const setoranMap = new Map(
    setoranRows[0].map((r) => [r.bulan, Number(r.total)]),
  );
  const tarikMap = new Map(tarikRows[0].map((r) => [r.bulan, Number(r.total)]));
  const pengeluaranMap = new Map(
    pengeluaranRows[0].map((r) => [r.bulan, Number(r.total)]),
  );

  const rincian = [];
  for (let bulan = 1; bulan <= 12; bulan++) {
    const penjualan = penjualanMap.get(bulan) || 0;
    const setoran = setoranMap.get(bulan) || 0;
    const pencairan = tarikMap.get(bulan) || 0;
    const pengeluaran = pengeluaranMap.get(bulan) || 0;
    const laba = penjualan - setoran - pencairan - pengeluaran;

    rincian.push({ bulan, penjualan, setoran, pencairan, pengeluaran, laba });
  }

  return rincian;
}

export async function getLaporanTahunan(id_bank_sampah, tahun) {
  const [[bankSampahRows], rincian] = await Promise.all([
    db.query(
      `SELECT nama_bank_sampah, alamat, logo_path
       FROM bank_sampah
       WHERE id_bank_sampah = ?`,
      [id_bank_sampah],
    ),
    getRincianBulanan(id_bank_sampah, tahun),
  ]);

  const bankSampahRow = bankSampahRows[0];
  return {
    bankSampah: {
      nama: bankSampahRow?.nama_bank_sampah || "-",
      alamat: bankSampahRow?.alamat || "-",
      logoPath: bankSampahRow?.logo_path || null,
    },
    rincian,
  };
}

/* ==========================================================
 * LAPORAN CETAK (PDF harian / bulanan)
 * PENTING: saldoKas TIDAK dimasukkan di sini secara sengaja.
 * saldoKas adalah posisi kas kumulatif (snapshot), sedangkan
 * laporan ini murni kinerja transaksi pada satu periode.
 * Mencampur keduanya bisa membuat pembaca salah kira saldo kas
 * sebagai pendapatan periode tersebut.
 * ========================================================== */

export async function getLaporanCetak(id_bank_sampah, { startDate, endDate }) {
  const [
    [bankSampahRows],
    [penjualanRows],
    [setoranRows],
    [tarikRows],
    [pengeluaranRows],
  ] = await Promise.all([
    db.query(
      `SELECT nama_bank_sampah, alamat, logo_path
       FROM bank_sampah
       WHERE id_bank_sampah = ?`,
      [id_bank_sampah],
    ),
    db.query(
      `SELECT
          tj.id_penjualan AS id,
          tj.tanggal AS tanggal,
          tj.total_harga AS nominal,
          p.nama_pengepul
       FROM transaksi_jual tj
       JOIN pengepul p ON p.id_pengepul = tj.id_pengepul
       WHERE tj.id_bank_sampah = ? AND tj.tanggal BETWEEN ? AND ?
       ORDER BY tj.tanggal ASC, tj.id_penjualan ASC`,
      [id_bank_sampah, startDate, endDate],
    ),
    db.query(
      `SELECT
          ts.id_transaksi_setor AS id,
          DATE(ts.tanggal_setor) AS tanggal,
          ts.total_nilai AS nominal,
          n.nama_nasabah
       FROM transaksi_setor ts
       JOIN nasabah n ON n.id_nasabah = ts.id_nasabah
       WHERE ts.id_bank_sampah = ? AND DATE(ts.tanggal_setor) BETWEEN ? AND ?
       ORDER BY ts.tanggal_setor ASC`,
      [id_bank_sampah, startDate, endDate],
    ),
    db.query(
      `SELECT
          tt.id_transaksi_tarik AS id,
          DATE(tt.tanggal_tarik) AS tanggal,
          tt.jumlah_tarik AS nominal,
          n.nama_nasabah
       FROM transaksi_tarik tt
       JOIN nasabah n ON n.id_nasabah = tt.id_nasabah
       WHERE tt.id_bank_sampah = ? AND DATE(tt.tanggal_tarik) BETWEEN ? AND ?
       ORDER BY tt.tanggal_tarik ASC`,
      [id_bank_sampah, startDate, endDate],
    ),
    db.query(
      `SELECT
          p.id_pengeluaran AS id,
          p.tanggal AS tanggal,
          p.nominal AS nominal,
          p.keterangan,
          kp.nama_kategori
       FROM pengeluaran_bank_sampah p
       JOIN kategori_pengeluaran kp
         ON kp.id_kategori_pengeluaran = p.id_kategori_pengeluaran
       WHERE p.id_bank_sampah = ? AND p.tanggal BETWEEN ? AND ?
       ORDER BY p.tanggal ASC, p.id_pengeluaran ASC`,
      [id_bank_sampah, startDate, endDate],
    ),
  ]);

  const bankSampahRow = bankSampahRows[0];

  const penjualanItems = penjualanRows.map((r) => ({
    id: r.id,
    tanggal: formatDate(r.tanggal),
    nominal: Number(r.nominal),
    uraian: `Penjualan kepada ${r.nama_pengepul}`,
  }));

  const setoranItems = setoranRows.map((r) => ({
    id: r.id,
    tanggal: formatDate(r.tanggal),
    nominal: Number(r.nominal),
    uraian: `Setoran oleh ${r.nama_nasabah}`,
  }));

  const penarikanItems = tarikRows.map((r) => ({
    id: r.id,
    tanggal: formatDate(r.tanggal),
    nominal: Number(r.nominal),
    uraian: `Penarikan saldo oleh ${r.nama_nasabah}`,
  }));

  const pengeluaranItems = pengeluaranRows.map((r) => ({
    id: r.id,
    tanggal: formatDate(r.tanggal),
    nominal: Number(r.nominal),
    uraian: `${r.nama_kategori} - ${r.keterangan}`,
  }));

  const totalPenjualan = penjualanItems.reduce((s, it) => s + it.nominal, 0);
  const totalSetoran = setoranItems.reduce((s, it) => s + it.nominal, 0);
  const totalPenarikan = penarikanItems.reduce((s, it) => s + it.nominal, 0);
  const totalPengeluaran = pengeluaranItems.reduce(
    (s, it) => s + it.nominal,
    0,
  );
  const labaBersih =
    totalPenjualan - totalSetoran - totalPenarikan - totalPengeluaran;

  return {
    bankSampah: {
      nama: bankSampahRow?.nama_bank_sampah || "-",
      alamat: bankSampahRow?.alamat || "-",
      logoPath: bankSampahRow?.logo_path || null,
    },
    penjualan: { items: penjualanItems, total: totalPenjualan },
    setoran: { items: setoranItems, total: totalSetoran },
    penarikan: { items: penarikanItems, total: totalPenarikan },
    pengeluaran: { items: pengeluaranItems, total: totalPengeluaran },
    ringkasan: {
      pendapatanPenjualan: totalPenjualan,
      nilaiSetoran: totalSetoran,
      penarikanSaldo: totalPenarikan,
      pengeluaran: totalPengeluaran,
      labaBersih,
    },
  };
}

/* ==========================================================
 * CHART PER HARI
 * ========================================================== */

async function getChart(
  id_bank_sampah,
  startDate,
  endDate,
  daysInMonth,
  tahun,
  bulan,
) {
  const [penjualanRows, setoranRows, tarikRows, pengeluaranRows] =
    await Promise.all([
      db.query(
        `SELECT tanggal AS tgl, COALESCE(SUM(total_harga), 0) AS total
         FROM transaksi_jual
         WHERE id_bank_sampah = ? AND tanggal BETWEEN ? AND ?
         GROUP BY tanggal`,
        [id_bank_sampah, startDate, endDate],
      ),
      db.query(
        `SELECT DATE(tanggal_setor) AS tgl, COALESCE(SUM(total_nilai), 0) AS total
         FROM transaksi_setor
         WHERE id_bank_sampah = ? AND DATE(tanggal_setor) BETWEEN ? AND ?
         GROUP BY DATE(tanggal_setor)`,
        [id_bank_sampah, startDate, endDate],
      ),
      db.query(
        `SELECT DATE(tanggal_tarik) AS tgl, COALESCE(SUM(jumlah_tarik), 0) AS total
         FROM transaksi_tarik
         WHERE id_bank_sampah = ? AND DATE(tanggal_tarik) BETWEEN ? AND ?
         GROUP BY DATE(tanggal_tarik)`,
        [id_bank_sampah, startDate, endDate],
      ),
      db.query(
        `SELECT tanggal AS tgl, COALESCE(SUM(nominal), 0) AS total
         FROM pengeluaran_bank_sampah
         WHERE id_bank_sampah = ? AND tanggal BETWEEN ? AND ?
         GROUP BY tanggal`,
        [id_bank_sampah, startDate, endDate],
      ),
    ]);

  const penjualanMap = new Map(
    penjualanRows[0].map((r) => [formatDate(r.tgl), Number(r.total)]),
  );
  const setoranMap = new Map(
    setoranRows[0].map((r) => [formatDate(r.tgl), Number(r.total)]),
  );
  const tarikMap = new Map(
    tarikRows[0].map((r) => [formatDate(r.tgl), Number(r.total)]),
  );
  const pengeluaranMap = new Map(
    pengeluaranRows[0].map((r) => [formatDate(r.tgl), Number(r.total)]),
  );

  const chart = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    chart.push({
      tanggal: dateStr,
      penjualan: penjualanMap.get(dateStr) || 0,
      setoran: setoranMap.get(dateStr) || 0,
      penarikan: tarikMap.get(dateStr) || 0,
      pengeluaran: pengeluaranMap.get(dateStr) || 0,
    });
  }

  return chart;
}

/* ==========================================================
 * ACTIVITIES (UNION ALL)
 * ========================================================== */

async function getActivities(id_bank_sampah, startDate, endDate, limit = 200) {
  const [rows] = await db.query(
    `
    (
      SELECT
        tj.id_penjualan AS id,
        CONVERT('PENJUALAN' USING utf8mb4) COLLATE utf8mb4_general_ci AS jenis,
        tj.tanggal AS tanggal,
        CONVERT(CONCAT('Penjualan kepada ', p.nama_pengepul) USING utf8mb4) COLLATE utf8mb4_general_ci AS uraian,
        tj.total_harga AS nominal
      FROM transaksi_jual tj
      JOIN pengepul p ON p.id_pengepul = tj.id_pengepul
      WHERE tj.id_bank_sampah = ? AND tj.tanggal BETWEEN ? AND ?
    )
    UNION ALL
    (
      SELECT
        ts.id_transaksi_setor AS id,
        CONVERT('SETORAN' USING utf8mb4) COLLATE utf8mb4_general_ci AS jenis,
        DATE(ts.tanggal_setor) AS tanggal,
        CONVERT(CONCAT('Setoran oleh ', n.nama_nasabah) USING utf8mb4) COLLATE utf8mb4_general_ci AS uraian,
        ts.total_nilai AS nominal
      FROM transaksi_setor ts
      JOIN nasabah n ON n.id_nasabah = ts.id_nasabah
      WHERE ts.id_bank_sampah = ? AND DATE(ts.tanggal_setor) BETWEEN ? AND ?
    )
    UNION ALL
    (
      SELECT
        tt.id_transaksi_tarik AS id,
        CONVERT('PENARIKAN' USING utf8mb4) COLLATE utf8mb4_general_ci AS jenis,
        DATE(tt.tanggal_tarik) AS tanggal,
        CONVERT(CONCAT('Penarikan oleh ', n.nama_nasabah) USING utf8mb4) COLLATE utf8mb4_general_ci AS uraian,
        tt.jumlah_tarik AS nominal
      FROM transaksi_tarik tt
      JOIN nasabah n ON n.id_nasabah = tt.id_nasabah
      WHERE tt.id_bank_sampah = ? AND DATE(tt.tanggal_tarik) BETWEEN ? AND ?
    )
    UNION ALL
    (
      SELECT
        p.id_pengeluaran AS id,
        CONVERT('PENGELUARAN' USING utf8mb4) COLLATE utf8mb4_general_ci AS jenis,
        p.tanggal AS tanggal,
        CONVERT(CONCAT(kp.nama_kategori, ' - ', p.keterangan) USING utf8mb4) COLLATE utf8mb4_general_ci AS uraian,
        p.nominal AS nominal
      FROM pengeluaran_bank_sampah p
      JOIN kategori_pengeluaran kp
        ON kp.id_kategori_pengeluaran = p.id_kategori_pengeluaran
      WHERE p.id_bank_sampah = ? AND p.tanggal BETWEEN ? AND ?
    )
    ORDER BY tanggal DESC, id DESC
    LIMIT ?
    `,
    [
      id_bank_sampah,
      startDate,
      endDate,
      id_bank_sampah,
      startDate,
      endDate,
      id_bank_sampah,
      startDate,
      endDate,
      id_bank_sampah,
      startDate,
      endDate,
      limit,
    ],
  );

  return rows.map((r) => ({
    id: r.id,
    jenis: r.jenis,
    tanggal: formatDate(r.tanggal),
    uraian: r.uraian,
    nominal: Number(r.nominal),
  }));
}

/* ==========================================================
 * DASHBOARD (ENTRY POINT)
 * ========================================================== */

export async function getDashboard(id_bank_sampah, bulan, tahun) {
  const { startDate, endDate, daysInMonth } = getMonthRange(bulan, tahun);

  const [summary, chart, activities] = await Promise.all([
    getSummary(id_bank_sampah),
    getChart(id_bank_sampah, startDate, endDate, daysInMonth, tahun, bulan),
    getActivities(id_bank_sampah, startDate, endDate),
  ]);

  return { summary, chart, activities };
}

/* ==========================================================
 * DETAIL PER JENIS TRANSAKSI
 * ========================================================== */

async function getDetailPenjualan(id) {
  const [[header]] = await db.query(
    `SELECT
        tj.id_penjualan, tj.id_bank_sampah, tj.tanggal, tj.total_harga, tj.catatan,
        p.id_pengepul, p.nama_pengepul, p.kontak, p.alamat AS alamat_pengepul
     FROM transaksi_jual tj
     JOIN pengepul p ON p.id_pengepul = tj.id_pengepul
     WHERE tj.id_penjualan = ?`,
    [id],
  );

  if (!header) return null;

  const [items] = await db.query(
    `SELECT
        dj.id_detail, dj.nama_barang_pengepul, dj.id_kategori, mk.nama_kategori,
        dj.berat, dj.harga_per_kg, dj.subtotal
     FROM detail_jual dj
     LEFT JOIN master_kategori_sampah mk ON mk.id_kategori = dj.id_kategori
     WHERE dj.id_penjualan = ?`,
    [id],
  );

  return { jenis: "PENJUALAN", header, items };
}

async function getDetailSetoran(id) {
  const [[header]] = await db.query(
    `SELECT
        ts.id_transaksi_setor, ts.id_bank_sampah, ts.total_berat, ts.total_nilai,
        ts.jenis_transaksi, ts.keterangan, ts.tanggal_setor,
        n.id_nasabah, n.nama_nasabah, n.nomor_rekening, n.no_hp
     FROM transaksi_setor ts
     JOIN nasabah n ON n.id_nasabah = ts.id_nasabah
     WHERE ts.id_transaksi_setor = ?`,
    [id],
  );

  if (!header) return null;

  const [items] = await db.query(
    `SELECT
        ds.id_detail, ds.id_jenis_sampah, jsb.nama_jenis, jsb.harga_per_kg AS harga_satuan,
        ds.berat, ds.subtotal
     FROM detail_setor ds
     LEFT JOIN jenis_sampah_bank jsb ON jsb.id_jenis_sampah = ds.id_jenis_sampah
     WHERE ds.id_transaksi_setor = ?`,
    [id],
  );

  return { jenis: "SETORAN", header, items };
}

async function getDetailPenarikan(id) {
  const [[header]] = await db.query(
    `SELECT
        tt.id_transaksi_tarik, tt.id_bank_sampah, tt.jumlah_tarik, tt.jenis_transaksi,
        tt.tanggal_tarik, tt.keterangan,
        n.id_nasabah, n.nama_nasabah, n.nomor_rekening, n.no_hp
     FROM transaksi_tarik tt
     JOIN nasabah n ON n.id_nasabah = tt.id_nasabah
     WHERE tt.id_transaksi_tarik = ?`,
    [id],
  );

  if (!header) return null;

  return { jenis: "PENARIKAN", header, items: [] };
}

async function getDetailPengeluaran(id) {
  const [[header]] = await db.query(
    `SELECT
        p.id_pengeluaran, p.id_bank_sampah, p.id_kategori_pengeluaran,
        p.tanggal, p.keterangan, p.nominal, p.created_at, p.updated_at,
        kp.nama_kategori
     FROM pengeluaran_bank_sampah p
     JOIN kategori_pengeluaran kp
       ON kp.id_kategori_pengeluaran = p.id_kategori_pengeluaran
     WHERE p.id_pengeluaran = ?`,
    [id],
  );

  if (!header) return null;

  return { jenis: "PENGELUARAN", header, items: [] };
}

export async function getDetail(id, jenis) {
  switch (jenis) {
    case "PENJUALAN":
      return getDetailPenjualan(id);
    case "SETORAN":
      return getDetailSetoran(id);
    case "PENARIKAN":
      return getDetailPenarikan(id);
    case "PENGELUARAN":
      return getDetailPengeluaran(id);
    default:
      throw new Error("Jenis transaksi tidak valid");
  }
}
