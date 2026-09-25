import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";
import { ownBank } from "../middlewares/security.js";
import express from "express";
import {
  getBankSampah,
  createBankSampah,
  updateBankSampah,
  deleteBankSampah,
  generateKodeBankSampah,
  getSettingBankSampah,
  updateSettingBankSampah,
} from "../controllers/bankSampahController.js";

import upload from "../middlewares/upload.js";
const uploadLogo = upload("logo");

const router = express.Router();

router.get("/", getBankSampah);
router.post("/", authMiddleware, roleMiddleware("superadmin"), createBankSampah);
router.put("/:id", authMiddleware, roleMiddleware("superadmin"), updateBankSampah);
router.delete("/:id", authMiddleware, roleMiddleware("superadmin"), deleteBankSampah);
router.get("/generate-kode/:id_kecamatan", authMiddleware, roleMiddleware("superadmin"), generateKodeBankSampah);
router.get("/setting/:id", authMiddleware, roleMiddleware("superadmin", "admin_bank"), ownBank, getSettingBankSampah);
router.put("/setting/:id", authMiddleware, roleMiddleware("superadmin", "admin_bank"), ownBank, uploadLogo.single("logo"), updateSettingBankSampah);
export default router;
