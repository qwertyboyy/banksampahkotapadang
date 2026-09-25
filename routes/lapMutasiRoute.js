import express from "express";
import * as controller from "../controllers/lapMutasiController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("admin_bank"), controller.getMutasi);
router.get("/export/excel", authMiddleware, roleMiddleware("admin_bank"), controller.exportExcel);
router.get("/export/pdf", authMiddleware, roleMiddleware("admin_bank"), controller.exportPDF);

export default router;
