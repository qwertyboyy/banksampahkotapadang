import express from "express";
import {
  getDashboardStats,
  getSetoranChart,
  getJenisSampahChart,
<<<<<<< HEAD
  getChartKeuangan,
  getDashboardNasabah,
  updateProfilNasabah,
  getStatSetorNasabah,
} from "../controllers/dashboardController.js";

import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// ================= ADMIN =================
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware("admin_bank", "superadmin"),
  getDashboardStats,
);

router.get(
  "/chart-setoran",
  authMiddleware,
  roleMiddleware("admin_bank", "superadmin"),
  getSetoranChart,
);

router.get(
  "/chart-jenis-sampah",
  authMiddleware,
  roleMiddleware("admin_bank", "superadmin"),
  getJenisSampahChart,
);

router.get(
  "/chart-keuangan",
  authMiddleware,
  roleMiddleware("admin_bank", "superadmin"),
  getChartKeuangan,
);

// ================= NASABAH =================
router.get(
  "/nasabah",
  authMiddleware,
  roleMiddleware("nasabah"),
  getDashboardNasabah,
);

router.put(
  "/nasabah/profil",
  authMiddleware,
  roleMiddleware("nasabah"),
  updateProfilNasabah,
);

router.get(
  "/nasabah/stat-setor",
  authMiddleware,
  roleMiddleware("nasabah"),
  getStatSetorNasabah,
);
=======
} from "../controllers/dashboardController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stats", authMiddleware, getDashboardStats);
router.get("/chart-setoran", authMiddleware, getSetoranChart);
router.get("/chart-jenis-sampah", authMiddleware, getJenisSampahChart);
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07

export default router;
