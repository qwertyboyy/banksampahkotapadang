// routes/tarikRoutes.js
import express from "express";
import {
  getKonfigurasiPenarikan,
  tarikSaldo,
} from "../controllers/tarikSaldoController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 WAJIB pakai middleware
router.post("/tarik", authMiddleware, roleMiddleware("admin_bank"), tarikSaldo);
router.get("/tarik/config", authMiddleware, roleMiddleware("admin_bank"), getKonfigurasiPenarikan);

export default router;
