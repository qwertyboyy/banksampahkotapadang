import express from "express";
import {
  register, // lama (optional dipertahankan)
  login,
  checkNasabah,
  sendOtp,
  verifyOtp,
  registerFinal,
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ================= AUTH ================= */
router.post("/login", login);

/* ================= REGISTER FLOW BARU ================= */

// 1. cek nasabah (existing atau tidak)
router.post("/check-nasabah", checkNasabah);

// 2. kirim OTP ke email
router.post("/send-otp", sendOtp);

// 3. verifikasi OTP
router.post("/verify-otp", verifyOtp);

// 4. final register (create user + nasabah jika perlu)
router.post("/register-final", registerFinal);
router.post("/register", register);
router.get("/pending", authMiddleware, getPendingUsers);
router.put("/approve/:id_user", authMiddleware, approveUser);
router.put("/reject/:id_user", authMiddleware, rejectUser);

export default router;
