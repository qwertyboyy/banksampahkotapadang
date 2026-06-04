import express from "express";

import {
  transferSaldo,
  getTransferPinStatus,
  createTransferPin,
  getTransferRecipient,
} from "../controllers/transferController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/transfer/pin-status", authMiddleware, getTransferPinStatus);
router.get("/transfer/recipient", authMiddleware, getTransferRecipient);
router.post("/transfer/pin", authMiddleware, createTransferPin);
router.post("/transfer", authMiddleware, transferSaldo);

export default router;
