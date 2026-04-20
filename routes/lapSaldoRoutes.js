import express from "express";
import {
  getSaldoNasabah,
  exportSaldoExcel,
  exportSaldoPDF,
} from "../controllers/lapSaldoController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getSaldoNasabah);
router.get("/export/excel", authMiddleware, exportSaldoExcel);
router.get("/export/pdf", authMiddleware, exportSaldoPDF);

export default router;
