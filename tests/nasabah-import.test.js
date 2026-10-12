import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import express from "express";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import router from "../routes/nasabahImportRoutes.js";
import { headers, parseWorkbook, validateDate, inspectImport, commitImport } from "../services/nasabahImportService.js";

async function workbook(rows, titles = headers) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Nasabah");
  sheet.addRow(titles); rows.forEach(row => sheet.addRow(row));
  return Buffer.from(await book.xlsx.writeBuffer());
}
const sample = ["Nasabah Uji", "1371084811920001", "RT 01", "082388505097", 3192];
const date = "2026-01-01";

test("template mempertahankan NIK, nol telepon dan saldo", async () => {
  const [row] = await parseWorkbook(await workbook([sample]));
  assert.equal(row.nik, sample[1]); assert.equal(row.no_hp, sample[3]); assert.equal(row.saldo,"3192.00"); assert.deepEqual(row.errors,[]);
});
test("saldo negatif, NIK angka dan telepon angka ditolak", async () => {
  const [row] = await parseWorkbook(await workbook([["A",1234567890123456,"",8211,-3]]));
  assert.equal(row.errors.length,3);
});
test("NIK kurang digit adalah catatan, formula dan header salah ditolak", async () => {
  const [row] = await parseWorkbook(await workbook([["A","123","","08211",12.34]]));
  assert.equal(row.warnings.length,1); assert.equal(row.saldo,"12.34");
  await assert.rejects(parseWorkbook(await workbook([[...sample.slice(0,4),{formula:"1+1",result:2}]])), /Formula/);
  await assert.rejects(parseWorkbook(await workbook([sample],["Nama"])), /Header/);
  await assert.rejects(parseWorkbook(Buffer.from("invalid")), /valid/);
});
test("tanggal wajib tanggal nyata dan bukan masa depan", () => {
  for (const value of ["2026-02-30","2026-99-99","2099-01-01",null]) assert.throws(() => validateDate(value), error => error.status===400);
});

function connection({ existing = [], imported = false, failDetail = false } = {}) {
  const calls = [];
  return {
    calls,
    beginTransaction: async () => calls.push("begin"), commit: async () => calls.push("commit"), rollback: async () => calls.push("rollback"),
    query: async (sql, params) => {
      calls.push({sql,params});
      if (sql.includes("FROM bank_sampah")) return [[{id_bank_sampah:9,kode_bank_sampah:"08211",nama_bank_sampah:"Pondok Permai",metode_saldo:"rupiah"}]];
      if (sql.startsWith("SELECT last_nomor")) return [[{last_nomor_urut:1}]];
      if (sql.startsWith("SELECT COALESCE(MAX")) return [[{nomor:4}]];
      if (sql.startsWith("SELECT nama_nasabah")) { assert.equal(Number(params[0]),9); return [existing]; }
      if (sql.startsWith("SELECT id_impor")) return [imported?[{id_impor:"old"}]:[]];
      if (sql.startsWith("INSERT INTO impor_nasabah_detail") && failDetail) throw new Error("write failed");
      return [{insertId:101}];
    },
  };
}
test("pratinjau memisahkan konflik tenant dari catatan NIK file", async () => {
  const conn=connection({existing:[{nama_nasabah:"nasabah uji",nik:null}]});
  const preview=await inspectImport(conn,9,await workbook([sample,["B",sample[1],"","",1]]),date);
  assert.equal(preview.error_count,1);assert.equal(preview.warning_count,1);assert.equal(preview.total_saldo,"3193.00");
});
test("impor menyimpan saldo awal dan counter secara atomik tanpa transaksi setor", async () => {
  const buffer=await workbook([sample]);const conn=connection();
  const preview=await inspectImport(conn,9,buffer,date);
  const result=await commitImport(conn,{bankId:9,buffer,date,adminId:2,filename:"nasabah.xlsx",previewHash:preview.file_hash});
  assert.equal(result.total_saldo,"3192.00"); assert.ok(conn.calls.includes("commit"));
  const insert=conn.calls.find(call=>call.sql?.startsWith("INSERT INTO nasabah"));
  assert.equal(insert.params[2],"0821100005");assert.equal(insert.params[7],"3192.00");
  assert.ok(conn.calls.some(call=>call.sql?.startsWith("INSERT INTO impor_nasabah_detail")));
  assert.ok(!conn.calls.some(call=>call.sql?.includes("transaksi_setor")));
});
test("file berulang, file berubah dan kegagalan tulis menghasilkan rollback", async () => {
  const buffer=await workbook([sample]);const preview=await inspectImport(connection(),9,buffer,date);
  for (const scenario of [{imported:true},{failDetail:true},{}]) {
    const conn=connection(scenario);
    await assert.rejects(commitImport(conn,{bankId:9,buffer,date,adminId:2,filename:"a.xlsx",previewHash:Object.keys(scenario).length?preview.file_hash:"changed"}));
    assert.ok(conn.calls.includes("rollback"));assert.ok(!conn.calls.includes("commit"));
  }
});
test("catatan NIK memerlukan persetujuan dan bank poin ditolak", async () => {
  const buffer=await workbook([["A","123",null,null,1]]);
  const conn=connection();const preview=await inspectImport(conn,9,buffer,date);
  await assert.rejects(commitImport(conn,{bankId:9,buffer,date,adminId:2,filename:"a.xlsx",previewHash:preview.file_hash}), /Konfirmasi/);
  assert.ok(conn.calls.includes("rollback"));
  const poin={query:async()=>[[{metode_saldo:"poin"}]]};
  await assert.rejects(inspectImport(poin,9,buffer,date), /rupiah/);
});
test("endpoint impor menolak admin bank, nasabah dan tanpa autentikasi", async () => {
  const original=db.query;
  let role="admin_bank";
  db.query=async sql=>sql.includes("FROM users") ? [[{id_user:2,role,id_bank_sampah:9,id_nasabah:1,status_akun:"aktif",status_aktif:1,session_version:0}]] : [[{id_nasabah:1}]];
  const app=express();app.use("/impor",router);
  const server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
  try {
    const url=`http://127.0.0.1:${server.address().port}/impor/template`;
    assert.equal((await fetch(url)).status,401);
    const token=jwt.sign({id_user:2,session_version:0},process.env.JWT_SECRET);
    assert.equal((await fetch(url,{headers:{Authorization:`Bearer ${token}`}})).status,403);
    role="nasabah";
    assert.equal((await fetch(url,{headers:{Authorization:`Bearer ${token}`}})).status,403);
    role="superadmin";
    const preview=jwt.sign({purpose:"nasabah_import",admin_id:2,bank_id:"8",file_hash:"hash",date},process.env.JWT_SECRET);
    const form=new FormData();form.append("file",new Blob([await workbook([sample])]),"a.xlsx");form.append("tanggal_awal",date);form.append("preview_token",preview);
    const confirm=await fetch(url.replace("template","9/confirm"),{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
    assert.equal(confirm.status,409);assert.match((await confirm.json()).message,/tidak sesuai bank/);
  } finally { db.query=original;await new Promise(resolve=>server.close(resolve)); }
});
