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

const router = express.Router();

router.get("/", getBankSampah);
router.post("/", createBankSampah);
router.put("/:id", updateBankSampah);
router.delete("/:id", deleteBankSampah);
router.get("/generate-kode/:id_kecamatan", generateKodeBankSampah);
router.get("/setting/:id", getSettingBankSampah);
router.put("/setting/:id", upload.single("logo"), updateSettingBankSampah);
export default router;
