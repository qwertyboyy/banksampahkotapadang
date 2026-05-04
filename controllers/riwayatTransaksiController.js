<<<<<<< HEAD
import db from "../config/db.js";
import RiwayatModel from "../models/riwayatTransaksiModel.js";
import { insertMutasi } from "../models/lapMutasiModel.js";

const Controller = {
  getRiwayat: async (req, res) => {
    try {
      const data = await RiwayatModel.getRiwayat(req.user.id_bank_sampah);
      res.json({ success: true, data });
    } catch (err) {
      console.error(err);
=======
import RiwayatTransaksiModel from "../models/riwayatTransaksiModel.js";
import { insertMutasi } from "../models/lapMutasiModel.js";
import db from "../config/db.js";

const RiwayatTransaksiController = {
  getRiwayat: async (req, res) => {
    try {
      const id_bank_sampah = req.user.id_bank_sampah;

      const data =
        await RiwayatTransaksiModel.getRiwayatTerbaru(id_bank_sampah);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(error);
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      res.status(500).json({ message: "Server error" });
    }
  },

<<<<<<< HEAD
  koreksi: async (req, res) => {
=======
  // 🔥 KOREKSI TRANSAKSI (FIX + MUTASI)
  koreksiTransaksi: async (req, res) => {
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
<<<<<<< HEAD
      const { referensi_transaksi, detail_koreksi, id_nasabah } = req.body;

      const id_bank_sampah = req.user.id_bank_sampah; // 🔥 AMAN

      const root = await RiwayatModel.getRoot(referensi_transaksi);

      const state = await RiwayatModel.getCurrentState(root);
=======
      const {
        id_bank_sampah,
        id_nasabah,
        referensi_transaksi,
        detail_koreksi,
      } = req.body;

      const created_by = req.user?.id_user || null;

      if (!referensi_transaksi || !detail_koreksi?.length) {
        await conn.rollback();
        return res.status(400).json({
          message: "Data koreksi tidak lengkap",
        });
      }

      // 🔥 ambil detail asli
      const details =
        await RiwayatTransaksiModel.getDetailSetor(referensi_transaksi);

      if (!details.length) {
        await conn.rollback();
        return res.status(404).json({
          message: "Detail tidak ditemukan",
        });
      }
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

      let total_berat = 0;
      let total_nilai = 0;

      const detailInsert = [];

      for (const item of detail_koreksi) {
<<<<<<< HEAD
        const old = state.find(
          (s) => s.id_jenis_sampah === item.id_jenis_sampah,
        );

        if (!old) continue;

        const harga = old.subtotal / old.berat;

        const nilaiBaru = item.berat * harga;
        const selisih = nilaiBaru - old.subtotal;
        const selisihBerat = item.berat - old.berat;

        total_nilai += selisih;
        total_berat += selisihBerat;

        detailInsert.push({
          id_jenis_sampah: item.id_jenis_sampah,
          berat: selisihBerat,
=======
        const original = details.find(
          (d) => d.id_jenis_sampah === item.id_jenis_sampah,
        );

        if (!original) continue;

        const harga = original.subtotal / original.berat;

        const nilai_lama = Number(original.subtotal);
        const nilai_baru = Number(item.berat) * harga;

        const selisih = nilai_baru - nilai_lama;

        total_nilai += selisih;

        const selisih_berat = Number(item.berat) - Number(original.berat);
        total_berat += selisih_berat;

        detailInsert.push({
          id_jenis_sampah: item.id_jenis_sampah,
          berat: selisih_berat,
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
          subtotal: selisih,
        });
      }

<<<<<<< HEAD
      if (total_nilai === 0) {
        throw new Error("Tidak ada perubahan");
      }

      const idBaru = await RiwayatModel.insertKoreksi(conn, {
        id_bank_sampah,
        id_nasabah,
        root_id: root,
        total_berat,
        total_nilai,
      });

      for (const d of detailInsert) {
        await RiwayatModel.insertDetail(conn, {
          id_transaksi: idBaru,
          ...d,
        });
      }

      // 🔥🔥🔥 INI FIX UTAMA LU
=======
      // ❗ kalau tidak ada perubahan, stop
      if (total_nilai === 0) {
        await conn.rollback();
        return res.status(400).json({
          message: "Tidak ada perubahan data untuk dikoreksi",
        });
      }

      // 🔥 insert transaksi koreksi
      const id_transaksi_baru =
        await RiwayatTransaksiModel.insertTransaksiKoreksi({
          id_bank_sampah,
          id_nasabah,
          total_berat,
          total_nilai,
          referensi_transaksi,
          keterangan: "Koreksi transaksi",
          created_by,
          conn, // 🔥 penting kalau model support
        });

      // 🔥 insert detail
      for (const d of detailInsert) {
        await RiwayatTransaksiModel.insertDetailKoreksi({
          id_transaksi_setor: id_transaksi_baru,
          ...d,
          conn,
        });
      }

      // 🔥 INI YANG SEBELUMNYA LU BELUM ADA
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
      await insertMutasi({
        conn,
        id_bank_sampah,
        id_nasabah,
        tipe: "KOREKSI",
<<<<<<< HEAD
        jumlah: total_nilai, // DELTA
        referensi_id: idBaru,
=======
        jumlah: total_nilai, // 🔥 delta
        referensi_id: id_transaksi_baru,
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
        referensi_tabel: "transaksi_setor",
      });

      await conn.commit();

      res.json({
        success: true,
        message: "Koreksi berhasil",
      });
    } catch (err) {
      await conn.rollback();
      console.error(err);
<<<<<<< HEAD
      res.status(500).json({ message: err.message });
=======
      res.status(500).json({ message: "Server error" });
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    } finally {
      conn.release();
    }
  },

<<<<<<< HEAD
  getDetailState: async (req, res) => {
    try {
      const { id } = req.params;

      const root = await RiwayatModel.getRoot(id);
      const data = await RiwayatModel.getCurrentState(root);
=======
  getDetailSetor: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "id wajib" });
      }

      const data = await RiwayatTransaksiModel.getDetailSetorWithJenis(id);

      if (!data.length) {
        return res.status(404).json({
          message: "Detail tidak ditemukan",
        });
      }
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Server error",
      });
    }
  },
};

<<<<<<< HEAD
export default Controller;
=======
export default RiwayatTransaksiController;
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
