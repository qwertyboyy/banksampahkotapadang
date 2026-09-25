import dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: new URL(`../.env.${env}`, import.meta.url),
});

const requiredEnv = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`ENV ERROR: ${key} belum diset di .env.${env}`);
  }
});

if (env === "production" && Buffer.byteLength(process.env.JWT_SECRET || "") < 32) {
  throw new Error("JWT_SECRET production harus berupa secret acak minimal 32 byte");
}
for (const key of ["TRANSFER_MAX_AMOUNT", "TRANSFER_DAILY_LIMIT", "TRANSFER_PENDING_LIMIT"]) {
  if (process.env[key] && (!Number.isFinite(Number(process.env[key])) || Number(process.env[key]) <= 0)) throw new Error(`${key} harus berupa angka positif`);
}

export default {
  app: {
    env,
    port: process.env.PORT || 5000,
  },
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
