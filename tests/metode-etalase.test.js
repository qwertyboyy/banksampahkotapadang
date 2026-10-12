import test from "node:test";
import assert from "node:assert/strict";
import db from "../config/db.js";
import { createSetor } from "../models/setorModel.js";
import { createTarik } from "../models/tarikSaldoModel.js";
import { tukarBarang, validateBarang } from "../models/etalaseModel.js";
import express from "express";
import jwt from "jsonwebtoken";
import etalaseRoutes from "../routes/etalaseRoutes.js";
import bankRoutes from "../routes/bankSampahRoutes.js";
import tarikRoutes from "../routes/tarikSaldoRoutes.js";
import BankSampah from "../models/bankSampahModel.js";
import { getSummary } from "../models/lapKeuanganModel.js";

async function withConnection(query, run) {
  const original = db.getConnection;
  const calls = [];
  db.getConnection = async () => ({
    query: async (sql, params) => { calls.push({ sql, params }); return query(sql, params); },
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
  });
  try { await run(calls); } finally { db.getConnection = original; }
}

for (const metode of ["poin", "rupiah"]) {
  test(`setoran ${metode} memakai nilai per kg milik tenant`, async () => {
    await withConnection((sql, params) => {
      if (sql.startsWith("SELECT metode")) { assert.deepEqual(params, [9]); return [[{ metode_saldo: metode }]]; }
      if (sql.startsWith("SELECT harga")) { assert.deepEqual(params, [3, 9]); return [[{ harga_per_kg: 2000, poin_per_kg: 5 }]]; }
      if (sql.startsWith("SELECT saldo")) { assert.deepEqual(params, [1, 9]); return [[{ saldo: "20.00" }]]; }
      return [{ insertId: 4 }];
    }, async calls => {
      const result = await createSetor({ id_bank_sampah: 9, id_nasabah: 1, admin_id: 2, items: [{ id_jenis_sampah: 3, berat: 1.5, subtotal: 999999 }] });
      assert.equal(result.saldo_sesudah, metode === "poin" ? 27.5 : 3020);
      assert.equal(result.metode_saldo, metode);
      assert.ok(calls.includes("commit"));
    });
  });
}
test("bank poin menolak penarikan sebelum mengubah saldo", async () => {
  await withConnection(sql => { assert.match(sql, /^SELECT metode/); return [[{ metode_saldo: "poin" }]]; }, async calls => {
    await assert.rejects(() => createTarik({ id_bank_sampah: 9 }), /tidak dapat melakukan penarikan/);
    assert.ok(calls.includes("rollback"));
    assert.equal(calls.filter(c => c.sql).length, 1);
  });
});

for (const scenario of ["poin", "rupiah", "other-bank", "stock", "balance", "audit", "retry", "key-conflict"]) {
  test(`penukaran: ${scenario}`, async () => {
    await withConnection((sql, params) => {
      if (sql.startsWith("SELECT metode")) return [[{ metode_saldo: scenario === "rupiah" ? "rupiah" : "poin" }]];
      if (sql.startsWith("SELECT saldo")) { assert.deepEqual(params, [1, 9]); return [[{ saldo: scenario === "balance" ? 1 : 50 }]]; }
      if (sql.startsWith("SELECT * FROM penukaran")) return [[...(["retry", "key-conflict"].includes(scenario) ? [{ id_penukaran: 5, id_barang: scenario === "key-conflict" ? 8 : 3, jumlah: 2 }] : [])]];
      if (sql.startsWith("SELECT * FROM etalase")) { assert.deepEqual(params, [3, 9]); return [scenario === "other-bank" ? [] : [{ id_barang: 3, nama_barang: "Beras pengujian", satuan: "paket", harga: 10, stok: scenario === "stock" ? 1 : 5 }]]; }
      if (sql.startsWith("INSERT INTO mutasi") && scenario === "audit") throw new Error("audit failure");
      return [{ insertId: 5, affectedRows: 1 }];
    }, async calls => {
      const run = () => tukarBarang({ bank: 9, nasabah: 1, barang: 3, jumlah: 2, request_key: "test-request-key-123" });
      if (["other-bank", "stock", "balance", "audit", "key-conflict"].includes(scenario)) {
        await assert.rejects(run); assert.ok(calls.includes("rollback")); assert.ok(!calls.includes("commit"));
      } else {
        const result = await run(); assert.ok(calls.includes("commit"));
        const update = calls.find(c => c.sql?.startsWith("UPDATE nasabah"));
        if (scenario === "retry") assert.equal(update, undefined);
        else { assert.deepEqual(update.params, [30, 1, 9]); assert.equal(result.total, 20); assert.equal(result.metode_saldo, scenario); }
      }
      assert.equal(calls.at(-1), "release");
    });
  });
}
test("barang menolak harga/stok tidak valid", () => {
  for (const harga of [0, -1, Infinity, 1.001]) assert.throws(() => validateBarang({ nama_barang: "Beras", satuan: "paket", harga, stok: 2 }));
  for (const stok of [-1, 1.5, ""]) assert.throws(() => validateBarang({ nama_barang: "Beras", satuan: "paket", harga: 1, stok }));
});

test("HTTP etalase and method use session tenant despite forged IDs", async () => {
  const original = db.query;
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-method-tenant-secret";
  let role = "nasabah";
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("FROM users WHERE")) return [[{ id_user: 1, role, id_bank_sampah: 9, id_nasabah: 4, status_akun: "aktif", status_aktif: 1, session_version: 0 }]];
    if (sql.startsWith("SELECT id_nasabah")) return [[{ id_nasabah: 4 }]];
    if (sql.startsWith("SELECT metode")) { assert.deepEqual(params, [9]); return [[{ metode_saldo: "poin" }]]; }
    if (sql.includes("FROM etalase_sembako")) { assert.deepEqual(params, [9]); return [[]]; }
    if (sql.includes("FROM penukaran_sembako")) { assert.deepEqual(params, [9, 4]); return [[]]; }
    throw new Error("Unexpected query: " + sql);
  };
  const app = express(); app.use(express.json()); app.use("/etalase", etalaseRoutes); app.use("/bank-sampah", bankRoutes); app.use("/", tarikRoutes);
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${jwt.sign({ id_user: 1, session_version: 0 }, process.env.JWT_SECRET)}`, "Content-Type": "application/json" };
  try {
    assert.equal((await fetch(`${base}/etalase`)).status, 401);
    for (const route of ["/etalase?id_bank_sampah=88", "/etalase/penukaran?id_bank_sampah=88&id_nasabah=22", "/bank-sampah/metode?id_bank_sampah=88"]) assert.equal((await fetch(base + route, { headers })).status, 200);
    assert.equal((await fetch(`${base}/etalase`, { method: "POST", headers, body: JSON.stringify({ id_bank_sampah: 88 }) })).status, 403);
    role = "admin_bank";
    assert.equal((await fetch(`${base}/tarik`, { method: "POST", headers, body: JSON.stringify({ id_bank_sampah: 88, id_nasabah: 4, jumlah_tarik: 10 }) })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); db.query = original; process.env.JWT_SECRET = secret; }
});
test("bank creation rejects missing/invalid method before database writes", async () => {
  for (const metode_saldo of [undefined, "cash", "POIN"]) await assert.rejects(() => BankSampah.create({ metode_saldo }), /Pilih metode/);
});
test("laporan keuangan tidak menganggap saldo poin sebagai rupiah", async () => {
  const original = db.query;
  db.query = async sql => {
    if (sql.startsWith("SELECT metode")) return [[{ metode_saldo: "poin" }]];
    if (sql.includes("konfigurasi_bank_sampah")) return [[{ minimum_penarikan: 0, penyesuaian_setoran_laporan: 0 }]];
    if (sql.includes("saldo_kas_awal")) return [[{ saldo_awal: 100, tanggal: "2026-10-01" }]];
    if (sql.includes("mutasi_saldo")) return [[{ total_setoran: 500, total_penarikan: 0 }]];
    if (sql.includes("FROM nasabah")) return [[{ total: 500 }]];
    return [[{ total: sql.includes("transaksi_jual") ? 200 : 0 }]];
  };
  try {
    const result = await getSummary(9);
    assert.equal(result.kewajibanNasabah, 0); assert.equal(result.totalSetoran, 0); assert.equal(result.totalPenjualan, 200); assert.equal(result.saldoKas, 300);
  } finally { db.query = original; }
});

test("saldo nasabah rupiah tetap menjadi kewajiban ketika kas awal belum diisi", async () => {
  const original = db.query;
  db.query = async (sql, params) => {
    assert.equal(params[0], 9);
    if (sql.startsWith("SELECT metode")) return [[{ metode_saldo: "rupiah" }]];
    if (sql.includes("konfigurasi_bank_sampah")) return [[{ minimum_penarikan: 0, penyesuaian_setoran_laporan: 0 }]];
    if (sql.includes("saldo_kas_awal")) return [[]];
    if (sql.includes("FROM nasabah")) return [[{ total: "8768708.00" }]];
    throw new Error("Unexpected query");
  };
  try {
    const result = await getSummary(9);
    assert.equal(result.kewajibanNasabah, 8768708);
    assert.equal(result.saldoKas, 0);
    assert.equal(result.totalSetoran, 0);
  } finally { db.query = original; }
});
