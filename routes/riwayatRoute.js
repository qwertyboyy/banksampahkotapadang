import express from "express";
<<<<<<< HEAD
import Controller from "../controllers/riwayatTransaksiController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/list", authMiddleware, Controller.getRiwayat);
router.get("/detail/:id", authMiddleware, Controller.getDetailState);
router.post("/koreksi", authMiddleware, Controller.koreksi);
=======
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
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

export default router;
