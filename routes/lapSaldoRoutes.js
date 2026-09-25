import express from "express";
import {
  getSaldoNasabah,
  exportSaldoExcel,
  exportSaldoPDF,
} from "../controllers/lapSaldoController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("admin_bank"), getSaldoNasabah);
router.get("/export/excel", authMiddleware, roleMiddleware("admin_bank"), exportSaldoExcel);
router.get("/export/pdf", authMiddleware, roleMiddleware("admin_bank"), exportSaldoPDF);

export default router;
