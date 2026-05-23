import express from "express";

import { transferSaldo } from "../controllers/transferController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/transfer", authMiddleware, transferSaldo);

export default router;
