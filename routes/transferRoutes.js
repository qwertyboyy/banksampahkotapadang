import { rateLimit } from "../middlewares/security.js";
import express from "express";

import {
  transferSaldo,
  listTransfers,
  transferNotifications,
  verifyTransfer,
  getTransferPinStatus,
  createTransferPin,
  getTransferRecipient,
} from "../controllers/transferController.js";

import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use("/transfer", authMiddleware);
router.get("/transfer/notifications", roleMiddleware("nasabah"), transferNotifications);
router.get("/transfer", roleMiddleware("admin_bank", "nasabah"), listTransfers);
router.patch("/transfer/:id/verifikasi", roleMiddleware("admin_bank"), verifyTransfer);

router.get("/transfer/pin-status", roleMiddleware("nasabah"), getTransferPinStatus);
router.get("/transfer/recipient", roleMiddleware("nasabah"), getTransferRecipient);
router.post("/transfer/pin", roleMiddleware("nasabah"), rateLimit("pin-create", 5, 900, req => req.user.id_user), createTransferPin);
router.post("/transfer", roleMiddleware("nasabah"), rateLimit("transfer-pin", 5, 900, req => req.user.id_user), transferSaldo);

export default router;
