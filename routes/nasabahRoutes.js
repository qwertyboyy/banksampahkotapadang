import express from "express";
import NasabahController from "../controllers/nasabahController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ===================== */
/* SUPERADMIN */
/* ===================== */
router.get("/bank", NasabahController.getBankSampahNasabah);
router.get("/bank/:id_bank_sampah", NasabahController.getNasabahByBank);

/* ===================== */
/* ADMIN BANK SAMPAH */
/* ===================== */
router.get("/admin", authMiddleware, NasabahController.getNasabahAdminBank);
// tambah nasabah + generate nomor rekening
router.post("/admin", authMiddleware, NasabahController.createNasabah);
// select untuk dropdwon
router.get("/select", authMiddleware, NasabahController.getNasabahSelect);
//preview nomor rekening sebelum tambah nasabah
router.get(
  "/admin/next-rekening",
  authMiddleware,
  NasabahController.previewRekening,
);
router.put("/:id_nasabah", authMiddleware, NasabahController.updateNasabah);
//hapus nasabah
router.delete("/:id_nasabah", authMiddleware, NasabahController.deleteNasabah);

//tampil saldo nasabah
router.get(
  "/:id_nasabah/saldo",
  authMiddleware,
  NasabahController.getSaldoNasabah,
);

export default router;
