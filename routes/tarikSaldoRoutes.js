// routes/tarikRoutes.js
import express from "express";
import { tarikSaldo } from "../controllers/tarikSaldoController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 WAJIB pakai middleware
router.post("/tarik", authMiddleware, tarikSaldo);

export default router;
