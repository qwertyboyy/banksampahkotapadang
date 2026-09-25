import express from "express";
import { createTransaksiJual } from "../controllers/penjualanController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin_bank"), createTransaksiJual);

export default router;
