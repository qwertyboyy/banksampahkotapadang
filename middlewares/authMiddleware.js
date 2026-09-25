import jwt from "jsonwebtoken";
import db from "../config/db.js";

export const authMiddleware = async (req, res, next) => {
  const match = /^Bearer ([^ ]+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ message: "Silakan login kembali" });
  let decoded;
  try { decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] }); }
  catch { return res.status(401).json({ message: "Sesi tidak valid atau kedaluwarsa" }); }
  try {
    const [rows] = await db.query(`SELECT id_user, role, id_bank_sampah, id_nasabah, status_akun, status_aktif, session_version FROM users WHERE id_user = ?`, [decoded.id_user]);
    const user = rows[0];
    if (!user || user.status_akun !== "aktif" || Number(user.status_aktif) !== 1 || decoded.session_version !== Number(user.session_version)) {
      return res.status(401).json({ message: "Sesi berakhir. Silakan login kembali" });
    }
    if (!["superadmin", "admin_bank", "nasabah"].includes(user.role) || (user.role !== "superadmin" && !user.id_bank_sampah)) return res.status(403).json({ message: "Akses ditolak" });
    if (user.role === "nasabah") {
      const [accounts] = await db.query("SELECT id_nasabah FROM nasabah WHERE id_nasabah = ? AND id_bank_sampah = ? AND status_aktif = 1", [user.id_nasabah, user.id_bank_sampah]);
      if (!accounts.length) return res.status(403).json({ message: "Rekening tidak aktif" });
    }
    req.user = user;
    next();
  } catch { res.status(503).json({ message: "Layanan autentikasi sementara tidak tersedia" }); }
};

export const roleMiddleware = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ message: "Akses ditolak" });
  next();
};
