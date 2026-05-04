import express from "express";
import {
  getDashboardStats,
  getSetoranChart,
  getJenisSampahChart,
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

export default router;
