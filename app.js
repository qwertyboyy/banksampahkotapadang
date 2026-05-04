import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import config from "./config/env.js";

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: `.env.${env}`,
});

<<<<<<< HEAD
// Routes
=======
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
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
<<<<<<< HEAD
import lapPenjualanRoutes from "./routes/lapPenjualanRoute.js";
import lapKinerjaRoutes from "./Routes/lapKinerjaRoutes.js";

const app = express();

/**
 * ✅ CORS CONFIG (FIX UTAMA)
 * Jangan pakai "*"
 */
const allowedOrigins = [
  "http://localhost:3000", // frontend local
  "http://127.0.0.1:3000",
  "https://domainlu.com", // frontend production
  "https://www.domainlu.com",
];

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

/**
 * ✅ ROUTES
 */
=======

const app = express();
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// Routes
>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
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
<<<<<<< HEAD
app.use("/api/lap-penjualan", lapPenjualanRoutes);
app.use("/api/lap-kinerja", lapKinerjaRoutes);

/**
 * HEALTH CHECK
 */
app.get("/", (req, res) => res.send("API Bank Sampah Running"));

/**
 * START SERVER
 */
=======

app.get("/", (req, res) => res.send("API Bank Sampah Running"));

>>>>>>> f6dc75d6e632daac388cecfe06da2495908b1a07
const PORT = config.app.port;

app.listen(PORT, () => {
  console.log(`ENV: ${env}`);
  console.log(`Server running on port ${PORT}`);
  console.log("DB NAME:", process.env.DB_NAME);
});
