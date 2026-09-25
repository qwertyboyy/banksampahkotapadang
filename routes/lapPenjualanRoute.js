import express from "express";
import {
  getLaporanPenjualan,
  exportExcelPenjualan,
  exportPdfPenjualan,
  getLaporanPenjualanTahunan,
  exportExcelPenjualanTahunan,
  exportPdfPenjualanTahunan,
} from "../controllers/lapPenjualanController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔥 GET LAPORAN PENJUALAN
router.get("/", authMiddleware, roleMiddleware("admin_bank"), getLaporanPenjualan);
router.get("/excel", authMiddleware, roleMiddleware("admin_bank"), exportExcelPenjualan);
router.get("/pdf", authMiddleware, roleMiddleware("admin_bank"), exportPdfPenjualan);
router.get("/tahunan", authMiddleware, roleMiddleware("admin_bank"), getLaporanPenjualanTahunan);
router.get("/tahunan/excel", authMiddleware, roleMiddleware("admin_bank"), exportExcelPenjualanTahunan);
router.get("/tahunan/pdf", authMiddleware, roleMiddleware("admin_bank"), exportPdfPenjualanTahunan);

export default router;
