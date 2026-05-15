import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getNotifikasiNasabah } from "../controllers/notifikasiController.js";

const router = express.Router();

router.get("/nasabah", authMiddleware, getNotifikasiNasabah);

export default router;
