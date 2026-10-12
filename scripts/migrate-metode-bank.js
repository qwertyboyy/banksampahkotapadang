import "../config/env.js";
import db from "../config/db.js";
import { readFile } from "node:fs/promises";

try {
  const sql = await readFile(new URL("../migrations/20261008_metode_bank.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) {
    try { await db.query(statement); }
    catch (error) { if (error.code !== "ER_DUP_FIELDNAME") throw error; }
  }
  console.log("Migrasi metode bank dan etalase selesai");
} finally { await db.end(); }
