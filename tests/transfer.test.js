import test from "node:test";
import assert from "node:assert/strict";
import db from "../config/db.js";
import Transfer from "../models/transferModel.js";

for (const scenario of ["approve", "reject", "duplicate", "other-bank", "insufficient", "audit-failure"]) {
  test(scenario, async () => {
    const calls = [];
    const original = db.getConnection;
    const conn = {
      beginTransaction: async () => calls.push("begin"),
      commit: async () => calls.push("commit"),
      rollback: async () => calls.push("rollback"),
      release: () => calls.push("release"),
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith("SELECT *")) {
          assert.equal(params[1], 9);
          return [scenario === "other-bank" ? [] : [{id_pengirim: 1, id_penerima: 2, nominal: "40.00", status: scenario === "duplicate" ? "DISETUJUI" : "MENUNGGU"}]];
        }
        if (sql.startsWith("SELECT COALESCE")) return [[{total: 0}]];
        if (sql.startsWith("SELECT id_nasabah")) return [[{id_nasabah: 1, saldo: scenario === "insufficient" ? "10.00" : "100.00"}, {id_nasabah: 2, saldo: "20.00"}]];
        if (sql.includes("INSERT INTO mutasi_saldo") && scenario === "audit-failure") throw new Error("audit failed");
        return [{affectedRows: 1}];
      },
    };
    db.getConnection = async () => conn;
    try {
      const run = () => Transfer.verifyTransfer({id_transfer: 3, id_bank_sampah: 9, admin_id: 4, rejection_reason: "Data perlu diperbaiki", status: scenario === "reject" ? "DITOLAK" : "DISETUJUI"});
      if (["approve", "reject"].includes(scenario)) {
        await run(); assert.ok(calls.includes("commit"));
        const updates = calls.filter(c => c.sql?.startsWith("UPDATE nasabah"));
        assert.equal(updates.length, scenario === "approve" ? 2 : 0);
        if (scenario === "approve") assert.deepEqual(updates.map(c => c.params), [[60, 1], [60, 2]]);
        assert.equal(calls.filter(c => c.sql?.includes("INSERT INTO mutasi_saldo")).length, scenario === "approve" ? 2 : 0);
      } else {
        await assert.rejects(run); assert.ok(calls.includes("rollback")); assert.ok(!calls.includes("commit"));
      }
      assert.equal(calls.at(-1), "release");
    } finally { db.getConnection = original; }
  });
}
test("invalid amounts and missing request key fail before opening a transaction", async () => {
  for (const nominal of [NaN, Infinity, -1, 0, 0.001, 1000001]) await assert.rejects(() => Transfer.transferSaldo({nominal}));
  await assert.rejects(() => Transfer.transferSaldo({nominal: 40}), /ID pengajuan/);
});
test("PIN creation cannot overwrite an existing PIN", async () => {
  const original = db.query;
  db.query = async sql => { assert.match(sql, /pin_transaksi_hash IS NULL/); return [{affectedRows: 0}]; };
  try { await assert.rejects(() => Transfer.setTransferPin(1, "123456"), /PIN sudah dibuat/); }
  finally { db.query = original; }
});
