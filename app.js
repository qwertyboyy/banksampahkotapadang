import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import config from "./config/env.js";

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: `.env.${env}`,
});

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
import lapMutasiRoutes from "./routes/lapMutasiRoute.js";

const app = express();
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// Routes
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

app.get("/", (req, res) => res.send("API Bank Sampah Running"));

const PORT = config.app.port;

app.listen(PORT, () => {
  console.log(`ENV: ${env}`);
  console.log(`Server running on port ${PORT}`);
  console.log("DB NAME:", process.env.DB_NAME);
});
