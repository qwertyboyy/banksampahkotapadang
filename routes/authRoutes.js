import { sensitiveLimits, otpSendLimits, passwordPolicy } from "../middlewares/security.js";
import express from "express";
import {
  login,
  logout,
  checkNasabah,
  sendOtp,
  verifyOtp,
  registerFinal,
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/authController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ================= AUTH ================= */
router.post("/logout", authMiddleware, logout);
router.post("/login", ...sensitiveLimits, login);

/* ================= REGISTER FLOW BARU ================= */

// 1. cek nasabah (existing atau tidak)
router.post("/check-nasabah", ...sensitiveLimits, checkNasabah);

// 2. kirim OTP ke email
router.post("/send-otp", ...otpSendLimits, sendOtp);

// 3. verifikasi OTP
router.post("/verify-otp", ...sensitiveLimits, verifyOtp);

// 4. final register (create user + nasabah jika perlu)
router.post("/register-final", ...sensitiveLimits, passwordPolicy("password"), registerFinal);
router.post("/register", ...sensitiveLimits, passwordPolicy("password"), registerFinal);
router.get("/pending", authMiddleware, roleMiddleware("admin_bank", "superadmin"), getPendingUsers);
router.put("/approve/:id_user", authMiddleware, roleMiddleware("admin_bank", "superadmin"), approveUser);
router.put("/reject/:id_user", authMiddleware, roleMiddleware("admin_bank", "superadmin"), rejectUser);

export default router;
