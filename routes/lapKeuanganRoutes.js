import express from "express";
import * as lapKeuanganController from "../controllers/lapKeuanganController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /laporan-keuangan/dashboard?id_bank_sampah=1&bulan=7&tahun=2026
router.get("/dashboard", authMiddleware, roleMiddleware("admin_bank"), lapKeuanganController.dashboard);

// GET /laporan-keuangan/summary?id_bank_sampah=1
router.get("/summary", authMiddleware, roleMiddleware("admin_bank"), lapKeuanganController.summary);

// GET /laporan-keuangan/bulanan?id_bank_sampah=1&tahun=2026
router.get("/bulanan", authMiddleware, roleMiddleware("admin_bank"), lapKeuanganController.bulanan);

// GET /laporan-keuangan/detail?id=15&jenis=PENJUALAN
router.get("/detail", authMiddleware, roleMiddleware("admin_bank"), lapKeuanganController.detail);

router.get("/cetak", authMiddleware, roleMiddleware("admin_bank"), lapKeuanganController.cetak);

export default router;
