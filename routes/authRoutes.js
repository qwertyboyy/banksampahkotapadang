import express from "express";
<<<<<<< HEAD
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

=======
import { register, login } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
export default router;
