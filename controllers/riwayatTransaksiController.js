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
      res.status(500).json({ message: "Server error" });
    }
  },

  // 🔥 KOREKSI TRANSAKSI (FIX + MUTASI)
  koreksiTransaksi: async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
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

      let total_berat = 0;
      let total_nilai = 0;

      const detailInsert = [];

      for (const item of detail_koreksi) {
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
          subtotal: selisih,
        });
      }

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
      await insertMutasi({
        conn,
        id_bank_sampah,
        id_nasabah,
        tipe: "KOREKSI",
        jumlah: total_nilai, // 🔥 delta
        referensi_id: id_transaksi_baru,
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
      res.status(500).json({ message: "Server error" });
    } finally {
      conn.release();
    }
  },

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

export default RiwayatTransaksiController;
