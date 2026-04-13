import express from "express";
import {
  createPengepul,
  getAllPengepul,
  getPengepulById,
  updatePengepul,
  deletePengepul,
} from "../controllers/pengepulController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createPengepul);
router.get("/", getAllPengepul);
router.get("/:id", getPengepulById);
router.put("/:id", updatePengepul);
router.delete("/:id", deletePengepul);

export default router;
