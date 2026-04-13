import db from "../config/db.js";
import * as TransaksiModel from "../models/penjualanModel.js";

export const createTransaksiJual = async (req, res) => {
  const conn = await db.getConnection();

  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    let { id_pengepul, tanggal, catatan, items } = req.body;
    const id_bank_sampah = req.user.id_bank_sampah;

    // ================= FIX ITEMS STRING =================
    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    // ================= VALIDASI =================
    if (!id_pengepul) {
      return res.status(400).json({ message: "Pengepul wajib dipilih" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Detail kosong" });
    }

    // ================= FIX TANGGAL =================
    const safeTanggal = tanggal || new Date().toISOString().slice(0, 10);

    // ================= VALIDASI ITEM =================
    for (let item of items) {
      if (
        !item.nama_barang_pengepul ||
        !item.id_kategori ||
        !item.berat ||
        !item.harga_per_kg
      ) {
        return res.status(400).json({
          message: "Field item tidak lengkap",
        });
      }

      if (item.berat <= 0 || item.harga_per_kg <= 0) {
        return res.status(400).json({
          message: "Berat / harga tidak valid",
        });
      }
    }

    // ================= HITUNG TOTAL =================
    let total_harga = 0;

    const detailData = items.map((item) => {
      const subtotal = item.berat * item.harga_per_kg;
      total_harga += subtotal;

      return {
        ...item,
        subtotal,
      };
    });

    console.log("DETAIL DATA:", detailData);

    // ================= START TRANSACTION =================
    await conn.beginTransaction();
    console.log("START TRANSACTION");

    // ================= INSERT HEADER =================
    const id_penjualan = await TransaksiModel.createTransaksi(
      {
        id_bank_sampah,
        id_pengepul,
        tanggal: safeTanggal,
        total_harga,
        catatan,
      },
      conn,
    );

    console.log("ID PENJUALAN:", id_penjualan);

    // ================= INSERT DETAIL =================
    await TransaksiModel.createDetail(
      detailData,
      id_penjualan,
      id_bank_sampah,
      conn,
    );

    console.log("BEFORE COMMIT");

    await conn.commit();

    console.log("COMMIT SUCCESS");

    res.status(201).json({
      message: "Transaksi berhasil",
      id_penjualan,
    });
  } catch (error) {
    await conn.rollback();

    console.error("ERROR FULL:", error);
    console.error("SQL MESSAGE:", error.sqlMessage);
    console.error("SQL CODE:", error.code);

    res.status(500).json({
      message: error.sqlMessage || "Gagal transaksi",
    });
  } finally {
    conn.release();
  }
};
