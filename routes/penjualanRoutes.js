import express from "express";
import { createTransaksiJual } from "../controllers/penjualanController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createTransaksiJual);

export default router;
