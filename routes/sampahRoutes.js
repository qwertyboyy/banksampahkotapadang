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

import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("admin_bank", "nasabah"), getJenis);
router.get("/kategori", authMiddleware, roleMiddleware("admin_bank"), getKategori);
router.get("/laporan/pdf", authMiddleware, roleMiddleware("admin_bank"), exportPdfHargaSampah);
router.post("/", authMiddleware, roleMiddleware("admin_bank"), createJenis);
router.put("/:id", authMiddleware, roleMiddleware("admin_bank"), updateJenis);
router.delete("/:id", authMiddleware, roleMiddleware("admin_bank"), deleteJenis);
router.get("/select", authMiddleware, roleMiddleware("admin_bank"), getJenisSelectController);

export default router;
