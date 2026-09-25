// routes/setorRoutes.js
import express from "express";
import { setorSampah } from "../controllers/setorController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/setor", authMiddleware, roleMiddleware("admin_bank"), setorSampah);

export default router;
