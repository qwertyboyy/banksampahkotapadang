import crypto from "node:crypto";
import db from "../config/db.js";

export const hashToken = token => crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(token)).digest("hex");
export const validPassword = value => typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 72;
export const passwordPolicy = field => (req, res, next) => {
  if (!validPassword(req.body?.[field])) return res.status(400).json({ message: "Password minimal 12 karakter dan maksimal 72 byte" });
  next();
};

// Atomic shared counters: limits survive restarts and work across application instances.
export const rateLimit = (scope, max, seconds, key = req => req.ip) => async (req, res, next) => {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const id = hashToken(`${scope}:${key(req)}:${bucket}`);
  try {
    await db.query(`INSERT INTO security_rate_limits (bucket_key, attempts, expires_at) VALUES (?, 1, DATE_ADD(NOW(), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE attempts = attempts + 1`, [id, seconds * 2]);
    const [[row]] = await db.query("SELECT attempts FROM security_rate_limits WHERE bucket_key = ?", [id]);
    if (Number(row.attempts) > max) {
      res.setHeader("Retry-After", String(seconds));
      return res.status(429).json({ message: "Terlalu banyak percobaan. Silakan coba lagi nanti" });
    }
    next();
  } catch { res.status(503).json({ message: "Layanan keamanan sementara tidak tersedia" }); }
};
export const accountKey = req => String(req.body?.identifier || req.body?.email || req.user?.id_user || req.ip).trim().toLowerCase();
export const sensitiveLimits = [rateLimit("auth-ip", 40, 900), rateLimit("auth-account", 10, 900, accountKey)];
export const otpSendLimits = [rateLimit("otp-send-ip", 15, 3600), rateLimit("otp-send-account", 1, 60, accountKey)];

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  const originalJson = res.json.bind(res);
  res.json = body => originalJson(res.statusCode >= 500 ? { message: "Layanan sementara bermasalah. Silakan coba kembali" } : body);
  next();
};

export const auditRequests = (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    res.once("finish", () => {
      // Never record bodies, passwords, PINs, OTPs, tokens or query strings.
      db.query("INSERT INTO security_audit (id_user, id_bank_sampah, method, path, status_code, ip_hash) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user?.id_user || null, req.user?.id_bank_sampah || null, req.method, req.path.slice(0, 255), res.statusCode, hashToken(req.ip || "unknown")])
        .catch(() => console.error("security_audit_write_failed"));
    });
  }
  next();
};

export const ownBank = (req, res, next) => {
  if (req.user.role !== "superadmin" && String(req.params.id) !== String(req.user.id_bank_sampah)) return res.status(403).json({ message: "Akses bank sampah ditolak" });
  next();
};

export const publicError = err => err?.sql || err?.sqlMessage || err?.code || err instanceof TypeError
  ? "Permintaan tidak dapat diproses" : (err?.message || "Permintaan tidak dapat diproses");

export const validateInput = (req, res, next) => {
  if (req.body !== undefined && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) return res.status(400).json({ message: "Format data tidak valid" });
  for (const field of ["identifier", "email", "username", "password", "password_lama", "password_baru", "konfirmasi_password", "pin", "confirm_pin", "token", "otp", "role"]) {
    const value = req.body?.[field];
    if (value !== undefined && (typeof value !== "string" || value.length > 255)) return res.status(400).json({ message: "Format data akun tidak valid" });
  }
  if (req.body?.role !== undefined && !["nasabah", "admin_bank", "superadmin"].includes(req.body.role)) return res.status(400).json({ message: "Peran tidak valid" });
  if (req.body?.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) return res.status(400).json({ message: "Email tidak valid" });
  next();
};
