import express from "express";

import {
  getPengeluaran,
  getPengeluaranById,
  createPengeluaran,
  updatePengeluaran,
  deletePengeluaran,
  getKategoriPengeluaran,
} from "../controllers/pengeluaranController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/kategori", getKategoriPengeluaran);

router.get("/", getPengeluaran);
router.get("/:id", getPengeluaranById);
router.post("/", createPengeluaran);
router.put("/:id", updatePengeluaran);
router.delete("/:id", deletePengeluaran);

export default router;
