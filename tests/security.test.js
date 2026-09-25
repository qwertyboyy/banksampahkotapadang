import bcrypt from "bcryptjs";
import { login } from "../controllers/authController.js";
import { registerFinal } from "../controllers/authController.js";
import { hashToken } from "../middlewares/security.js";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validPassword, publicError, ownBank } from "../middlewares/security.js";
import users from "../routes/userRoutes.js";
import auth from "../routes/authRoutes.js";
import banks from "../routes/bankSampahRoutes.js";
import tarik from "../routes/tarikSaldoRoutes.js";
import setor from "../routes/setorRoutes.js";
import nasabah from "../routes/nasabahRoutes.js";
import transfer from "../routes/transferRoutes.js";

process.env.JWT_SECRET = "test-secret-never-used-in-production-123456789";
const response = () => ({ code: 200, body: null, status(code) { this.code=code; return this; }, json(body) { this.body=body; return this; } });

test("session validation rejects revoked, inactive, legacy and deleted accounts", async () => {
  const original = db.query;
  const user = {id_user: 1, role: "admin_bank", id_bank_sampah: 9, status_aktif: 1, status_akun: "aktif", session_version: 2};
  try {
    for (const variant of [null, {...user,status_aktif:0}, {...user,status_akun:"pending"}, {...user,session_version:3}]) {
      db.query=async()=>[variant?[variant]:[]];
      const res=response(); let next=false;
      await authMiddleware({headers:{authorization:`Bearer ${jwt.sign({id_user:1,session_version:2},process.env.JWT_SECRET)}`}},res,()=>next=true);
      assert.equal(next,false);assert.equal(res.code,401);
    }
    db.query=async()=>[[user]];
    const legacy=response();
    await authMiddleware({headers:{authorization:`Bearer ${jwt.sign({id_user:1},process.env.JWT_SECRET)}`}},legacy,()=>assert.fail("legacy token accepted"));
    assert.equal(legacy.code,401);
    const req={headers:{authorization:`Bearer ${jwt.sign({id_user:1,session_version:2,role:"superadmin"},process.env.JWT_SECRET)}`}};
    let allowed=false;await authMiddleware(req,response(),()=>allowed=true);
    assert.equal(allowed,true);assert.equal(req.user.role,"admin_bank");
  } finally {db.query=original;}
});

test("HTTP route authorization blocks anonymous and nasabah admin operations", async () => {
  const original=db.query;
  const user={id_user:1,role:"nasabah",id_bank_sampah:9,id_nasabah:4,status_aktif:1,status_akun:"aktif",session_version:0};
  db.query=async sql=> {
    if (sql.includes("FROM users WHERE")) return [[user]];
    if (sql.startsWith("SELECT id_nasabah FROM nasabah")) return [[{id_nasabah:4}]];
    throw new Error("Unexpected database operation reached: "+sql);
  };
  const app=express();app.use(express.json());app.use("/api",users);app.use("/api/auth",auth);app.use("/api/bank-sampah",banks);app.use("/api",tarik);app.use("/api",setor);app.use("/api/nasabah",nasabah);app.use("/api",transfer);
  const server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const token=jwt.sign({id_user:1,session_version:0},process.env.JWT_SECRET);
  try {
    for (const [method,path] of [["GET","/users"],["POST","/users"],["PUT","/users/1/reset-password"],["DELETE","/users/1"],["POST","/bank-sampah"],["PUT","/bank-sampah/setting/2"],["GET","/nasabah/bank/9"]]) {
      const res=await fetch(base+"/api"+path,{method});assert.equal(res.status,401,method+path);
    }
    for (const [method,path] of [["POST","/tarik"],["POST","/setor"],["PUT","/auth/approve/2"],["PUT","/auth/reject/2"],["POST","/users"],["PUT","/nasabah/2"],["PATCH","/transfer/2/verifikasi"]]) {
      const res=await fetch(base+"/api"+path,{method,headers:{Authorization:`Bearer ${token}`}});assert.equal(res.status,403,method+path);
    }
  } finally {await new Promise(resolve=>server.close(resolve));db.query=original;}
});

test("bank settings reject another tenant; password and error policies",()=> {
  const res=response();ownBank({user:{role:"admin_bank",id_bank_sampah:1},params:{id:2}},res,()=>assert.fail("cross-tenant settings allowed"));assert.equal(res.code,403);
  assert.equal(validPassword("short"),false);assert.equal(validPassword("a".repeat(73)),false);assert.equal(validPassword("a sufficiently long passphrase"),true);
  assert.equal(publicError({code:"ER_BAD_FIELD_ERROR",message:"secret SQL"}),"Permintaan tidak dapat diproses");
});

test("existing-account registration requires OTP proof and remains pending with nasabah role", async () => {
  const original = db.getConnection;
  for (const validOtp of [false,true]) {
    let inserted=false;
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){},query:async(sql,params)=>{
      if (sql.trim().startsWith("SELECT") && sql.includes("FROM verification_tokens")) { assert.ok(params.includes(hashToken("123456"))); assert.match(sql,/FOR UPDATE/);return [validOtp?[{id:1}]:[]]; }
      if (sql.includes("FROM nasabah")) { assert.match(sql,/FOR UPDATE/);return [[{id_nasabah:4}]]; }
      if (sql.includes("INSERT INTO users")) {
        inserted=true;assert.match(sql,/'nasabah'/);assert.equal(params[6],0);assert.equal(params[7],"pending");return [{insertId:20}];
      }
      return [[]];
    }};
    db.getConnection=async()=>conn;
    try {
      const res=response();
      await registerFinal({body:{nama_lengkap:"Test",username:"test",email:"test@example.invalid",password:"a sufficiently long password",id_bank_sampah:9,nomor_rekening:"TEST",is_existing_nasabah:true,role:"superadmin",token:"123456"}},res);
      assert.equal(res.code,validOtp?201:400);assert.equal(inserted,validOtp);
    } finally {db.getConnection=original;}
  }
});

test("admin login returns a token immediately after a correct password", async () => {
  const original = db.query;
  const password = "test-admin-password";
  const hash = await bcrypt.hash(password, 4);
  db.query = async sql => {
    assert.match(sql,/FROM users u/);
    return [[{id_user: 7,role:"admin_bank",id_bank_sampah:9,id_nasabah:null,status_akun:"aktif",status_aktif:1,session_version:3,password_hash:hash,nama_lengkap:"Test Admin"}]];
  };
  try {
    const res=response();
    await login({body:{identifier:"admin",password}},res);
    assert.equal(res.code,200);
    assert.equal(typeof res.body.token,"string");
    assert.equal(res.body.requires_otp,undefined);
    const payload=jwt.verify(res.body.token,process.env.JWT_SECRET);
    assert.equal(payload.role,"admin_bank");
    assert.equal(payload.session_version,3);
  } finally { db.query=original; }
});
