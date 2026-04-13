import express from "express";
import {
  getKecamatan,
  getKelurahan,
} from "../controllers/wilayahController.js";

const router = express.Router();

router.get("/kecamatan", getKecamatan);

router.get("/kelurahan/:id_kecamatan", getKelurahan);

export default router;
