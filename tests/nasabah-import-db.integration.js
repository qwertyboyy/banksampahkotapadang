import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import db from "../config/db.js";
import { headers, inspectImport, commitImport } from "../services/nasabahImportService.js";

const temporaryDDL = sql => sql.split("\n").filter(line => !line.trim().startsWith("CONSTRAINT")).join("\n").replace(/,\s*\)/g,")").replace(/CREATE TABLE(?: IF NOT EXISTS)?/, "CREATE TEMPORARY TABLE");
const conn = await db.getConnection();
try {
  for (const table of ["bank_sampah", "nasabah", "counter_nasabah"]) {
    const [[ddl]] = await conn.query("SHOW CREATE TABLE " + table);
    await conn.query(temporaryDDL(ddl["Create Table"]));
  }
  const migration = await readFile(new URL("../migrations/20261012_import_nasabah.sql", import.meta.url), "utf8");
  for (const sql of migration.split(";").map(value => value.trim()).filter(Boolean)) await conn.query(temporaryDDL(sql));
  const [definition] = await conn.query("SHOW COLUMNS FROM bank_sampah");
  const columns = definition.filter(column => column.Null === "NO" && column.Default === null && !column.Extra.includes("auto_increment")).map(column => column.Field);
  const values = columns.map(name => name === "kode_bank_sampah" ? "08211" : name === "nama_bank_sampah" ? "Uji Impor" : name === "metode_saldo" ? "rupiah" : name.startsWith("id_") || name.includes("urut") ? 9 : "test");
  for (const [name, value] of [["id_bank_sampah",9],["metode_saldo","rupiah"]]) if (!columns.includes(name)) { columns.push(name); values.push(value); }
  await conn.query(`INSERT INTO bank_sampah (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, values);
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Nasabah");
  sheet.addRow(headers);
  sheet.addRow(["Uji Satu","1371084811920001","RT 01","082388505097",3192]);
  sheet.addRow(["Uji Dua",null,null,null,10.25]);
  const buffer = Buffer.from(await book.xlsx.writeBuffer()), date = "2026-01-01";
  const preview = await inspectImport(conn,9,buffer,date);
  await commitImport(conn,{bankId:9,buffer,date,adminId:1,filename:"uji.xlsx",previewHash:preview.file_hash});
  const [[sum]] = await conn.query("SELECT COUNT(*) AS count,SUM(saldo) AS saldo FROM nasabah");
  assert.equal(sum.count,2); assert.equal(sum.saldo,"3202.25");
  const repeated = await inspectImport(conn,9,buffer,date);
  assert.equal(repeated.already_imported,true);
  await assert.rejects(commitImport(conn,{bankId:9,buffer,date,adminId:1,filename:"uji.xlsx",previewHash:preview.file_hash}), /sudah diimpor/);
  const [[counter]] = await conn.query("SELECT last_nomor_urut FROM counter_nasabah WHERE id_bank_sampah=9");
  assert.equal(counter.last_nomor_urut,2);
  console.log("PASS: impor dan saldo terverifikasi pada tabel sementara MySQL; impor ulang ditolak; database asli tidak diubah.");
} finally { conn.release(); await db.end(); }
