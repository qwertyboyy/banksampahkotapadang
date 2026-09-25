import express from "express";
import NasabahController from "../controllers/nasabahController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

/* ===================== */
/* SUPERADMIN */
/* ===================== */
router.get("/bank", roleMiddleware("superadmin"), NasabahController.getBankSampahNasabah);
router.get("/bank/:id_bank_sampah", roleMiddleware("superadmin"), NasabahController.getNasabahByBank);

/* ===================== */
/* ADMIN BANK SAMPAH */
/* ===================== */
router.get("/admin", roleMiddleware("admin_bank"), NasabahController.getNasabahAdminBank);
// tambah nasabah + generate nomor rekening
router.post("/admin", roleMiddleware("admin_bank"), NasabahController.createNasabah);
// select untuk dropdwon
router.get("/select", roleMiddleware("admin_bank"), NasabahController.getNasabahSelect);
//preview nomor rekening sebelum tambah nasabah
router.get(
  "/admin/next-rekening",
  roleMiddleware("admin_bank"),
  NasabahController.previewRekening,
);
router.put("/:id_nasabah", roleMiddleware("admin_bank"), NasabahController.updateNasabah);
//hapus nasabah
router.patch("/:id_nasabah", roleMiddleware("admin_bank"), NasabahController.deleteNasabah);

//tampil saldo nasabah
router.get(
  "/:id_nasabah/saldo",
  roleMiddleware("admin_bank"),
  NasabahController.getSaldoNasabah,
);

export default router;
