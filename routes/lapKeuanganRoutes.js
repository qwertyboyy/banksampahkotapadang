import express from "express";
import * as lapKeuanganController from "../controllers/lapKeuanganController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /laporan-keuangan/dashboard?id_bank_sampah=1&bulan=7&tahun=2026
router.get("/dashboard", authMiddleware, lapKeuanganController.dashboard);

// GET /laporan-keuangan/summary?id_bank_sampah=1
router.get("/summary", authMiddleware, lapKeuanganController.summary);

// GET /laporan-keuangan/bulanan?id_bank_sampah=1&tahun=2026
router.get("/bulanan", authMiddleware, lapKeuanganController.bulanan);

// GET /laporan-keuangan/detail?id=15&jenis=PENJUALAN
router.get("/detail", authMiddleware, lapKeuanganController.detail);

router.get("/cetak", authMiddleware, lapKeuanganController.cetak);

export default router;
