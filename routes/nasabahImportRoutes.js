import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";
import { headers, inspectImport, commitImport, importError } from "../services/nasabahImportService.js";

const router = express.Router();
router.use(authMiddleware, roleMiddleware("superadmin"));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 5, fieldSize: 8192 } }).single("file");
const receiveFile = (req, res, next) => upload(req, res, error => {
  if (error) return res.status(400).json({ message: "Unggah satu file .xlsx maksimal 2 MB." });
  if (!req.file || !req.file.originalname.toLowerCase().endsWith(".xlsx")) return res.status(400).json({ message: "Gunakan file .xlsx sesuai template." });
  next();
});
const handleError = (res, error) => {
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Data sudah terdaftar. Lakukan pratinjau kembali." });
  if (!error.status) console.error("Impor nasabah gagal:", error.code || error.name);
  return res.status(error.status || 500).json({ message: error.status ? error.message : "Impor gagal. Periksa migrasi database dan coba kembali." });
};

router.get("/template", async (req, res) => {
  try {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Nasabah");
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column, index) => { column.width = [30,24,40,24,22][index]; });
    sheet.getColumn(2).numFmt = "@";
    sheet.getColumn(4).numFmt = "@";
    sheet.getColumn(5).numFmt = "0.00";
    res.setHeader("Content-Disposition", 'attachment; filename="template-impor-nasabah.xlsx"');
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(Buffer.from(await book.xlsx.writeBuffer()));
  } catch (error) { handleError(res, error); }
});

router.post("/:bankId/preview", receiveFile, async (req, res) => {
  try {
    const preview = await inspectImport(db, req.params.bankId, req.file.buffer, req.body.tanggal_awal);
    const token = jwt.sign({ purpose: "nasabah_import", admin_id: req.user.id_user, bank_id: req.params.bankId, file_hash: preview.file_hash, date: preview.tanggal_awal }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "30m" });
    res.json({ ...preview, preview_token: token });
  } catch (error) { handleError(res, error); }
});

router.post("/:bankId/confirm", receiveFile, async (req, res) => {
  let conn;
  try {
    let payload;
    try { payload = jwt.verify(req.body.preview_token, process.env.JWT_SECRET, { algorithms: ["HS256"] }); }
    catch { throw importError("Pratinjau kedaluwarsa atau tidak valid. Lakukan pratinjau kembali.", 409); }
    if (payload.purpose !== "nasabah_import" || payload.admin_id !== req.user.id_user || payload.bank_id !== req.params.bankId || payload.date !== req.body.tanggal_awal) throw importError("Pratinjau tidak sesuai bank, tanggal, atau akun.", 409);
    conn = await db.getConnection();
    const result = await commitImport(conn, { bankId: req.params.bankId, buffer: req.file.buffer, date: payload.date, adminId: req.user.id_user, filename: req.file.originalname, previewHash: payload.file_hash, acceptWarnings: req.body.accept_warnings === "true" });
    res.status(201).json(result);
  } catch (error) { handleError(res, error); }
  finally { conn?.release(); }
});

router.get("/:bankId/history", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id_impor,nama_file,tanggal_awal,jumlah_nasabah,total_saldo,created_at FROM impor_nasabah WHERE id_bank_sampah = ? ORDER BY created_at DESC LIMIT 50", [req.params.bankId]);
    res.json({ data: rows });
  } catch (error) { handleError(res, error); }
});
export default router;
