import express from "express";
import {
  getLaporanKinerja,
  getAvailableYears,
  exportExcelLaporanKinerja,
  exportPdfLaporanKinerja,
} from "../controllers/lapKinerjaController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("admin_bank"), getLaporanKinerja);
router.get("/tahun", authMiddleware, roleMiddleware("admin_bank"), getAvailableYears);
router.get("/excel", authMiddleware, roleMiddleware("admin_bank"), exportExcelLaporanKinerja);
router.get("/pdf", authMiddleware, roleMiddleware("admin_bank"), exportPdfLaporanKinerja);

export default router;
