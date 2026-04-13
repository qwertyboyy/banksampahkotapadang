import express from "express";
import {
  getDashboardStats,
  getSetoranChart,
  getJenisSampahChart,
} from "../controllers/dashboardController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stats", authMiddleware, getDashboardStats);
router.get("/chart-setoran", authMiddleware, getSetoranChart);
router.get("/chart-jenis-sampah", authMiddleware, getJenisSampahChart);

export default router;
