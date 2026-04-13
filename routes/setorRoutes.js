// routes/setorRoutes.js
import express from "express";
import { setorSampah } from "../controllers/setorController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/setor", authMiddleware, setorSampah);

export default router;
