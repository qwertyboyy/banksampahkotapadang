import express from "express";
import {
  getBankSampah,
  createBankSampah,
  updateBankSampah,
  deleteBankSampah,
  generateKodeBankSampah,
<<<<<<< HEAD
  getSettingBankSampah,
  updateSettingBankSampah,
} from "../controllers/bankSampahController.js";

import upload from "../middlewares/upload.js";

=======
} from "../controllers/bankSampahController.js";

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
const router = express.Router();

router.get("/", getBankSampah);
router.post("/", createBankSampah);
router.put("/:id", updateBankSampah);
router.delete("/:id", deleteBankSampah);
router.get("/generate-kode/:id_kecamatan", generateKodeBankSampah);
<<<<<<< HEAD
router.get("/setting/:id", getSettingBankSampah);
router.put("/setting/:id", upload.single("logo"), updateSettingBankSampah);
=======

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
export default router;
