import express from "express";

import {
  requestResetPassword,
  resetPassword,
} from "../controllers/resetPasswordController.js";

const router = express.Router();

router.post("/forgot-password", requestResetPassword);

router.post("/reset-password", resetPassword);

export default router;
