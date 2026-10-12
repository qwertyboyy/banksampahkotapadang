// routes/tarikRoutes.js
import express from "express";
import { requireRupiah } from "../models/metodeSaldoModel.js";
import {
  getKonfigurasiPenarikan,
  tarikSaldo,
} from "../controllers/tarikSaldoController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 WAJIB pakai middleware
router.post("/tarik", authMiddleware, roleMiddleware("admin_bank"), requireRupiah, tarikSaldo);
router.get("/tarik/config", authMiddleware, roleMiddleware("admin_bank"), requireRupiah, getKonfigurasiPenarikan);

export default router;
