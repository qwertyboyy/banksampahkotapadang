import express from "express";
import {
  getJenis,
  createJenis,
  updateJenis,
  deleteJenis,
  getKategori,
  getJenisSelectController,
  exportPdfHargaSampah,
} from "../controllers/sampahController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getJenis);
router.get("/kategori", authMiddleware, getKategori);
router.get("/laporan/pdf", authMiddleware, exportPdfHargaSampah);
router.post("/", authMiddleware, createJenis);
router.put("/:id", authMiddleware, updateJenis);
router.delete("/:id", authMiddleware, deleteJenis);
router.get("/select", authMiddleware, getJenisSelectController);

export default router;
