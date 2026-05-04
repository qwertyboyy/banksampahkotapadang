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
      res.status(500).json({ message: "Server error" });
    }
  },

  koreksi: async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      const { referensi_transaksi, detail_koreksi, id_nasabah } = req.body;

      const id_bank_sampah = req.user.id_bank_sampah; // 🔥 AMAN

      const root = await RiwayatModel.getRoot(referensi_transaksi);

      const state = await RiwayatModel.getCurrentState(root);

      let total_berat = 0;
      let total_nilai = 0;

      const detailInsert = [];

      for (const item of detail_koreksi) {
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
          subtotal: selisih,
        });
      }

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
      await insertMutasi({
        conn,
        id_bank_sampah,
        id_nasabah,
        tipe: "KOREKSI",
        jumlah: total_nilai, // DELTA
        referensi_id: idBaru,
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
      res.status(500).json({ message: err.message });
    } finally {
      conn.release();
    }
  },

  getDetailState: async (req, res) => {
    try {
      const { id } = req.params;

      const root = await RiwayatModel.getRoot(id);
      const data = await RiwayatModel.getCurrentState(root);

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

export default Controller;
