import db from "../config/db.js";
import { readFile } from "node:fs/promises";

try {
  const sql = await readFile(new URL("../migrations/20261012_import_nasabah.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await db.query(statement);
  console.log("Migrasi impor nasabah selesai");
} finally { await db.end(); }
