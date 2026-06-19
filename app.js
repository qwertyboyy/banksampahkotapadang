import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import config from "./config/env.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: `.env.${env}`,
});

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import bankSampahRoutes from "./routes/bankSampahRoutes.js";
import wilayahRoutes from "./routes/wilayahRoutes.js";
import nasabahRoutes from "./routes/nasabahRoutes.js";
import sampahRoutes from "./routes/sampahRoutes.js";
import setorRoutes from "./routes/setorRoutes.js";
import tarikSaldoRoutes from "./routes/tarikSaldoRoutes.js";
import pengepulRoutes from "./routes/pengepulRoutes.js";
import penjualanRoutes from "./routes/penjualanRoutes.js";
import riwayatTransaksi from "./routes/riwayatRoute.js";
import lapMutasiRoutes from "./routes/lapMutasiRoute.js";
import lapSaldoRoutes from "./routes/lapSaldoRoutes.js";
import lapPenjualanRoutes from "./routes/lapPenjualanRoute.js";
import lapKinerjaRoutes from "./routes/lapKinerjaRoutes.js";
import notifikasiRoutes from "./routes/notifikasiRoutes.js";
import resetPasswordRoutes from "./routes/resetPasswordRoutes.js";
import settingAkunRoutes from "./routes/settingAkunRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";

const app = express();

/**
 * ✅ CORS CONFIG (FIX UTAMA)
 * Jangan pakai "*"
 */
const allowedOrigins = [
  "http://localhost:5000", // frontend local
  "https://api.banksampah.dlh.padang.go.id",
  "https://banksampah.dlh.padang.go.id", // frontend production
  "http://localhost:5173",
  "http://localhost:8081",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(
  cors({
    origin: function (origin, callback) {
      // allow request tanpa origin (postman / mobile app)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"), false);
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * ✅ ROUTES
 */
app.use("/api/auth", authRoutes);
app.use("/api/", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bank-sampah", bankSampahRoutes);
app.use("/api/wilayah", wilayahRoutes);
app.use("/api/nasabah", nasabahRoutes);
app.use("/api/jenis-sampah", sampahRoutes);
app.use("/api/", setorRoutes);
app.use("/api/", tarikSaldoRoutes);
app.use("/api/pengepul", pengepulRoutes);
app.use("/api/penjualan", penjualanRoutes);
app.use("/api/lap-mutasi", lapMutasiRoutes);
app.use("/api/lap-saldo", lapSaldoRoutes);
app.use("/api/riwayat", riwayatTransaksi);
app.use("/api/lap-penjualan", lapPenjualanRoutes);
app.use("/api/lap-kinerja", lapKinerjaRoutes);
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api", resetPasswordRoutes);
app.use("/api/account", settingAkunRoutes);
app.use("/api/", transferRoutes);
/**
 * HEALTH CHECK
 */
app.get("/", (req, res) => res.send("API Bank Sampah Running"));
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Ukuran file maksimal 2MB",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
});

/**
 * START SERVER
 */
const PORT = config.app.port;

app.listen(PORT, () => {
  console.log(`ENV: ${env}`);
  console.log(`Server running on port ${PORT}`);
  console.log("DB NAME:", process.env.DB_NAME);
});
