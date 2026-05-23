import express from "express";
import {
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/settingAkunController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();
const uploadProfile = upload("profile");

router.put(
  "/profile",
  authMiddleware,
  uploadProfile.single("foto_profil"),
  updateProfile,
);

router.get("/me", authMiddleware, getMe);

router.put("/password", authMiddleware, updatePassword);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

export default router;
