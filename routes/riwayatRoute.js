import express from "express";
import Controller from "../controllers/riwayatTransaksiController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/list", authMiddleware, Controller.getRiwayat);
router.get("/detail/:id", authMiddleware, Controller.getDetailState);
router.post("/koreksi", authMiddleware, Controller.koreksi);

export default router;
