import express from "express";
import {
  getBankSampah,
  createBankSampah,
  updateBankSampah,
  deleteBankSampah,
  generateKodeBankSampah,
} from "../controllers/bankSampahController.js";

const router = express.Router();

router.get("/", getBankSampah);
router.post("/", createBankSampah);
router.put("/:id", updateBankSampah);
router.delete("/:id", deleteBankSampah);
router.get("/generate-kode/:id_kecamatan", generateKodeBankSampah);

export default router;
