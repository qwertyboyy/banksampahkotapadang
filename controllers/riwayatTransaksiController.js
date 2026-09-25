import { publicError } from "../middlewares/security.js";
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
    const { referensi_transaksi, detail_koreksi, id_nasabah } = req.body;

    if (
      !referensi_transaksi ||
      !id_nasabah ||
      !Array.isArray(detail_koreksi) ||
      detail_koreksi.length === 0
    ) {
      return res.status(400).json({
        message: "Referensi transaksi, nasabah, dan detail koreksi wajib diisi",
      });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      const id_bank_sampah = req.user.id_bank_sampah; // 🔥 AMAN
      const admin_id = req.user.id_user; // 🔥 AMAN

      const [owned] = await conn.query("SELECT id_transaksi_setor FROM transaksi_setor WHERE id_transaksi_setor = ? AND id_bank_sampah = ? AND id_nasabah = ? FOR UPDATE", [referensi_transaksi, id_bank_sampah, id_nasabah]);
      if (!owned.length) throw new Error("Transaksi tidak ditemukan pada rekening ini");
      const root = await RiwayatModel.getRoot(referensi_transaksi, req.user.id_bank_sampah);

      const state = await RiwayatModel.getCurrentState(root, req.user.id_bank_sampah);

      let total_berat = 0;
      let total_nilai = 0;

      const detailInsert = [];

      const seen = new Set();
      for (const item of detail_koreksi) {
        if (seen.has(String(item.id_jenis_sampah))) throw new Error("Jenis sampah koreksi duplikat");
        seen.add(String(item.id_jenis_sampah));
        if (!Number.isFinite(Number(item.berat)) || Number(item.berat) < 0) throw new Error("Berat koreksi tidak valid");
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
        admin_id,
      });

      await conn.commit();

      res.json({
        success: true,
        message: "Koreksi berhasil",
      });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ message: publicError(err) });
    } finally {
      conn.release();
    }
  },

  getDetailState: async (req, res) => {
    try {
      const { id } = req.params;

      const [owned] = await db.query("SELECT id_transaksi_setor FROM transaksi_setor WHERE id_transaksi_setor = ? AND id_bank_sampah = ?", [id, req.user.id_bank_sampah]);
      if (!owned.length) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
      const root = await RiwayatModel.getRoot(id, req.user.id_bank_sampah);
      const data = await RiwayatModel.getCurrentState(root, req.user.id_bank_sampah);

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
