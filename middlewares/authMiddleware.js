import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Token required" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 VALIDASI ADMIN
    if (decoded.role === "admin_bank" && !decoded.id_bank_sampah) {
      return res.status(403).json({
        message: "Admin bank harus memiliki id_bank_sampah",
      });
    }

    // 🔥 VALIDASI NASABAH
    if (decoded.role === "nasabah" && !decoded.id_nasabah) {
      return res.status(403).json({
        message: "Nasabah tidak valid",
      });
    }
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Token invalid or expired",
    });
  }
};

export const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Akses ditolak",
      });
    }
    next();
  };
};
