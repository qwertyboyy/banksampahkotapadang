import { sensitiveLimits, otpSendLimits, passwordPolicy } from "../middlewares/security.js";
import express from "express";

import {
  requestResetPassword,
  resetPassword,
} from "../controllers/resetPasswordController.js";

const router = express.Router();

router.post("/forgot-password", ...otpSendLimits, requestResetPassword);

router.post("/reset-password", ...sensitiveLimits, passwordPolicy("password"), resetPassword);

export default router;
