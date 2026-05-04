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

<<<<<<< HEAD
    // 🔥 VALIDASI ADMIN
=======
    // validasi role admin_bank
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    if (decoded.role === "admin_bank" && !decoded.id_bank_sampah) {
      return res.status(403).json({
        message: "Admin bank harus memiliki id_bank_sampah",
      });
    }

<<<<<<< HEAD
    // 🔥 VALIDASI NASABAH
    if (decoded.role === "nasabah" && !decoded.id_nasabah) {
      return res.status(403).json({
        message: "Nasabah tidak valid",
      });
    }
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Token invalid or expired",
    });
  }
};
<<<<<<< HEAD

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
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
