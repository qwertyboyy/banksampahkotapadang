import express from "express";
import Controller from "../controllers/riwayatTransaksiController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/list", authMiddleware, roleMiddleware("admin_bank"), Controller.getRiwayat);
router.get("/detail/:id", authMiddleware, roleMiddleware("admin_bank"), Controller.getDetailState);
router.post("/koreksi", authMiddleware, roleMiddleware("admin_bank"), Controller.koreksi);

export default router;
