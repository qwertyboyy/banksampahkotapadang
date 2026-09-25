import "../config/env.js";
import db from "../config/db.js";
import { readFile } from "node:fs/promises";
try {
  for (const filename of ["20260925_create_transfer_saldo.sql", "20260925_security.sql"]) {
    const sql = await readFile(new URL(`../migrations/${filename}`, import.meta.url), "utf8");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) {
      try { await db.query(statement); }
      catch (err) { if (err.code !== "ER_DUP_FIELDNAME") throw err; }
    }
  }
  console.log("Migrasi keamanan selesai");
} finally { await db.end(); }
