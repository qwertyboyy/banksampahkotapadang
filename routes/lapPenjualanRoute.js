import express from "express";
import {
  getLaporanPenjualan,
  exportExcelPenjualan,
  exportPdfPenjualan,
} from "../controllers/lapPenjualanController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔥 GET LAPORAN PENJUALAN
router.get("/", authMiddleware, getLaporanPenjualan);
router.get("/excel", authMiddleware, exportExcelPenjualan);
router.get("/pdf", authMiddleware, exportPdfPenjualan);

export default router;
