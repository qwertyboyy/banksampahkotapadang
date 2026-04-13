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

    // validasi role admin_bank
    if (decoded.role === "admin_bank" && !decoded.id_bank_sampah) {
      return res.status(403).json({
        message: "Admin bank harus memiliki id_bank_sampah",
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
