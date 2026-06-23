import express from "express";

import { getLokasiDetail, getMaps } from "../controllers/mapsController.js";

const router = express.Router();

router.get("/", getMaps);

router.get("/:id", getLokasiDetail);

export default router;
