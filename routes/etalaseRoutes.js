import express from "express";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";
import { getMetodeSaldo } from "../models/metodeSaldoModel.js";
import { listBarang, saveBarang, listPenukaran, tukarBarang, serahkanBarang } from "../models/etalaseModel.js";

const router = express.Router();
router.use(authMiddleware, roleMiddleware("admin_bank", "nasabah"));
const handle = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "Etalase gagal diproses. Coba lagi." }); }
};
router.get("/", handle(async (req, res) => {
  const bank = req.user.id_bank_sampah;
  const [data, metode_saldo] = await Promise.all([listBarang(bank, req.user.role === "admin_bank"), getMetodeSaldo(bank)]);
  res.json({ data, metode_saldo });
}));
router.get("/penukaran", handle(async (req, res) => res.json({ data: await listPenukaran(req.user.id_bank_sampah, req.user.role === "nasabah" ? req.user.id_nasabah : null) })));
router.post("/", roleMiddleware("admin_bank"), handle(async (req, res) => {
  await saveBarang(req.user.id_bank_sampah, null, req.body);
  res.status(201).json({ message: "Barang ditambahkan" });
}));
router.put("/:id", roleMiddleware("admin_bank"), handle(async (req, res) => {
  await saveBarang(req.user.id_bank_sampah, req.params.id, req.body);
  res.json({ message: "Barang diperbarui" });
}));
router.post("/penukaran", roleMiddleware("nasabah"), handle(async (req, res) => {
  res.status(201).json(await tukarBarang({ bank: req.user.id_bank_sampah, nasabah: req.user.id_nasabah, barang: req.body.id_barang, jumlah: req.body.jumlah, request_key: req.body.request_key }));
}));
router.post("/penukaran/:id/serahkan", roleMiddleware("admin_bank"), handle(async (req, res) => {
  await serahkanBarang(req.user.id_bank_sampah, req.params.id, req.user.id_user);
  res.json({ message: "Penyerahan sembako dicatat" });
}));
export default router;
