// Explicit opt-in script. All writes target connection-local TEMPORARY tables.
import "../config/env.js";
import assert from "node:assert/strict";
import db from "../config/db.js";
import Transfer from "../models/transferModel.js";
import { consumeResetToken } from "../models/resetPasswordModel.js";
import { hashToken, rateLimit } from "../middlewares/security.js";

const conn = await db.getConnection();
const originalQuery = db.query;
const originalConnection = db.getConnection;
const adapter = {query: conn.query.bind(conn), execute: conn.execute.bind(conn), beginTransaction: conn.beginTransaction.bind(conn), commit: conn.commit.bind(conn), rollback: conn.rollback.bind(conn), release() {}};
try {
  const schemas = {
    nasabah: "id_nasabah BIGINT PRIMARY KEY, id_bank_sampah INT, nomor_urut INT, nomor_rekening VARCHAR(25), nama_nasabah VARCHAR(100), saldo DECIMAL(15,2), status_aktif INT",
    transfer_saldo: "id_transfer BIGINT AUTO_INCREMENT PRIMARY KEY, id_bank_sampah INT, id_pengirim BIGINT, id_penerima BIGINT, nominal DECIMAL(15,2), status VARCHAR(20) DEFAULT 'MENUNGGU', request_key VARCHAR(100), rejection_reason VARCHAR(500), admin_id BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, verified_at TIMESTAMP NULL, UNIQUE (id_pengirim,request_key)",
    mutasi_saldo: "id_mutasi BIGINT AUTO_INCREMENT PRIMARY KEY, id_bank_sampah INT, id_nasabah BIGINT, tipe VARCHAR(30), jumlah DECIMAL(15,2), saldo_sebelum DECIMAL(15,2), saldo_sesudah DECIMAL(15,2), referensi_tabel VARCHAR(50), referensi_id BIGINT, admin_id BIGINT",
    users: "id_user BIGINT PRIMARY KEY,nama_lengkap VARCHAR(150),username VARCHAR(100),email VARCHAR(150),password_hash VARCHAR(255),role VARCHAR(20),status_aktif INT,status_akun VARCHAR(20),session_version INT DEFAULT 0",
    verification_tokens: "id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(150),token VARCHAR(64),purpose VARCHAR(30),expired_at DATETIME",
    security_rate_limits: "bucket_key CHAR(64) PRIMARY KEY,attempts INT,expires_at DATETIME",
  };
  for (const [table, columns] of Object.entries(schemas)) await conn.query(`CREATE TEMPORARY TABLE ${table} (${columns}) ENGINE=InnoDB`);
  db.query = conn.query.bind(conn); db.getConnection = async () => adapter;
  await conn.query("INSERT INTO nasabah (id_nasabah,id_bank_sampah,nomor_urut,nomor_rekening,nama_nasabah,saldo,status_aktif) VALUES (1,9,1,'TEST-1','Test Sender',1000,1),(2,9,2,'TEST-2','Test Receiver',200,1)");
  const input = {pengirim:{id_nasabah:1},penerima:{id_nasabah:2},nominal:40,id_bank_sampah:9,request_key:"test_request_key_01"};
  const request = await Transfer.transferSaldo(input);
  assert.equal(request.status,"MENUNGGU");
  assert.equal((await Transfer.transferSaldo(input)).id_transfer,request.id_transfer);
  await assert.rejects(()=>Transfer.transferSaldo({...input,nominal:41}),/transfer berbeda/);
  let [[count]]=await conn.query("SELECT COUNT(*) AS n FROM transfer_saldo");assert.equal(count.n,1);
  let [[sender]]=await conn.query("SELECT saldo FROM nasabah WHERE id_nasabah=1");assert.equal(Number(sender.saldo),1000);
  await assert.rejects(()=>Transfer.verifyTransfer({id_transfer:request.id_transfer,id_bank_sampah:8,admin_id:10,status:"DISETUJUI"}),/tidak ditemukan/);
  await Transfer.verifyTransfer({id_transfer:request.id_transfer,id_bank_sampah:9,admin_id:10,status:"DISETUJUI"});
  const [balances]=await conn.query("SELECT saldo FROM nasabah ORDER BY id_nasabah");assert.deepEqual(balances.map(r=>Number(r.saldo)),[960,240]);
  [[count]]=await conn.query("SELECT COUNT(*) AS n FROM mutasi_saldo");assert.equal(count.n,2);
  await assert.rejects(()=>Transfer.verifyTransfer({id_transfer:request.id_transfer,id_bank_sampah:9,admin_id:10,status:"DISETUJUI"}),/sudah diverifikasi/);
  assert.equal((await Transfer.transferSaldo(input)).status,"DISETUJUI");
  console.log("PASS: idempotency, tenant isolation, pending balances, approval, duplicate approval, audit rows");

  const second=await Transfer.transferSaldo({...input,request_key:"test_request_key_02"});
  await assert.rejects(()=>Transfer.verifyTransfer({id_transfer:second.id_transfer,id_bank_sampah:9,admin_id:10,status:"DITOLAK"}),/Alasan/);
  await Transfer.verifyTransfer({id_transfer:second.id_transfer,id_bank_sampah:9,admin_id:10,status:"DITOLAK",rejection_reason:"Rekening perlu dikonfirmasi"});
  [[sender]]=await conn.query("SELECT saldo FROM nasabah WHERE id_nasabah=1");assert.equal(Number(sender.saldo),960);
  await conn.query("UPDATE nasabah SET status_aktif=0 WHERE id_nasabah=2");
  await assert.rejects(()=>Transfer.transferSaldo({...input,request_key:"test_request_key_03"}),/tidak aktif/);
  await conn.query("UPDATE nasabah SET status_aktif=1 WHERE id_nasabah=2");
  const third=await Transfer.transferSaldo({...input,request_key:"test_request_key_03"});
  await conn.query("UPDATE nasabah SET saldo=10 WHERE id_nasabah=1");
  await assert.rejects(()=>Transfer.verifyTransfer({id_transfer:third.id_transfer,id_bank_sampah:9,admin_id:10,status:"DISETUJUI"}),/tidak mencukupi/);
  const [[pending]]=await conn.query("SELECT status FROM transfer_saldo WHERE id_transfer=?",[third.id_transfer]);assert.equal(pending.status,"MENUNGGU");
  console.log("PASS: rejection reason, inactive recipient, insufficient balance rollback");

  await conn.query("INSERT INTO users (id_user,nama_lengkap,username,email,password_hash,role,status_aktif,status_akun,session_version) VALUES (10,'Test','test','test@example.invalid','oldhash','admin_bank',1,'aktif',0)");
  await conn.query("INSERT INTO verification_tokens (email,token,purpose,expired_at) VALUES ('test@example.invalid',?,'reset_password',DATE_ADD(NOW(),INTERVAL 5 MINUTE))",[hashToken("654321")]);
  assert.equal(await consumeResetToken({email:"test@example.invalid",token:"wrong",password_hash:"newhash"}),false);
  assert.equal(await consumeResetToken({email:"test@example.invalid",token:"654321",password_hash:"newhash"}),true);
  assert.equal(await consumeResetToken({email:"test@example.invalid",token:"654321",password_hash:"thirdhash"}),false);
  const [[user]]=await conn.query("SELECT * FROM users WHERE id_user=10");assert.equal(user.session_version,1);assert.equal(user.password_hash,"newhash");
  console.log("PASS: reset OTP single-use and password reset session revocation");

  const limiter=rateLimit("integration",2,60);
  for(let i=0;i<3;i++) {
    let passed=false;const res={code:200,setHeader(){},status(n){this.code=n;return this;},json(){}};
    await limiter({ip:"127.0.0.1"},res,()=>passed=true);
    assert.equal(passed,i<2);if(i===2)assert.equal(res.code,429);
  }
  console.log("PASS: database-backed rate limit");
} finally {
  db.query=originalQuery; db.getConnection=originalConnection;
  // Destroying the connection removes all temporary tables, including on failure.
  conn.destroy(); await db.end();
}
