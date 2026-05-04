import express from "express";
import * as controller from "../controllers/lapMutasiController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, controller.getMutasi);
router.get("/export/excel", authMiddleware, controller.exportExcel);
router.get("/export/pdf", authMiddleware, controller.exportPDF);

export default router;
