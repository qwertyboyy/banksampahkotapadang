import express from "express";
import {
  getLaporanKinerja,
  getAvailableYears,
  exportExcelLaporanKinerja,
  exportPdfLaporanKinerja,
} from "../controllers/lapKinerjaController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getLaporanKinerja);
router.get("/tahun", authMiddleware, getAvailableYears);
router.get("/excel", authMiddleware, exportExcelLaporanKinerja);
router.get("/pdf", authMiddleware, exportPdfLaporanKinerja);

export default router;
