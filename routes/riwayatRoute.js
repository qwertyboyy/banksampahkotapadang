import express from "express";
import RiwayatTransaksiController from "../controllers/riwayatTransaksiController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

// GET riwayat (10 terbaru)
router.get("/list", authMiddleware, RiwayatTransaksiController.getRiwayat);

// POST koreksi
router.post(
  "/koreksi",
  authMiddleware,
  RiwayatTransaksiController.koreksiTransaksi,
);
router.get(
  "/setor/detail/:id",
  authMiddleware,
  RiwayatTransaksiController.getDetailSetor,
);

export default router;
