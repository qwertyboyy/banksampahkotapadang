import express from "express";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";
import { getNotifikasiNasabah } from "../controllers/notifikasiController.js";

const router = express.Router();

router.get("/nasabah", authMiddleware, roleMiddleware("nasabah"), getNotifikasiNasabah);

export default router;
