import express from "express";
import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";
import {
  approveNasabahAccount,
  getNasabahAccounts,
  getPendingNasabahAccounts,
  rejectNasabahAccount,
  resetNasabahPassword,
} from "../controllers/adminNasabahAccountController.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("admin_bank"));

router.get("/", getNasabahAccounts);
router.get("/pending", getPendingNasabahAccounts);
router.patch("/:id_user/approve", approveNasabahAccount);
router.patch("/:id_user/reject", rejectNasabahAccount);
router.patch("/:id_user/reset-password", resetNasabahPassword);

export default router;
