// routes/tarikRoutes.js
import express from "express";
import {
  getKonfigurasiPenarikan,
  tarikSaldo,
} from "../controllers/tarikSaldoController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 WAJIB pakai middleware
router.post("/tarik", authMiddleware, tarikSaldo);
router.get("/tarik/config", authMiddleware, getKonfigurasiPenarikan);

export default router;
