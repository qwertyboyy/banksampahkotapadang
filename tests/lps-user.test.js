import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import users from '../routes/userRoutes.js';
import { securityHeaders, validateInput } from '../middlewares/security.js';

test('global input validation accepts LPS creation and editing only through superadmin user routes', async () => {
  const originalQuery = db.query, originalConnection = db.getConnection;
  process.env.JWT_SECRET = 'lps-user-test-local-secret';
  let role = 'superadmin', inserted, activated = false, commits = 0, connections = 0, updated;
  const conn = {
    async beginTransaction() {}, async rollback() {}, release() {}, async commit() { commits++; },
    async query(sql,params) {
      if (sql.startsWith('INSERT INTO users')) { inserted=params;return [{insertId:70}]; }
      if (sql.includes("SET status_akun = 'aktif'")) { activated=true;assert.deepEqual(params,[70]);return [{affectedRows:1}]; }
      throw new Error('Unexpected account write');
    },
  };
  db.getConnection = async () => {connections++;return conn;};
  db.query = async (sql,params) => {
    if (sql.includes('session_version FROM users WHERE')) return [[{id_user:1,role,status_aktif:1,status_akun:'aktif',session_version:0,id_bank_sampah:9}]];
    if (sql.startsWith('UPDATE users')) { updated=params;return [{affectedRows:1}]; }
    return [[]];
  };
  const app=express();app.use(securityHeaders,express.json(),validateInput);app.use('/api',users);
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const url=`http://127.0.0.1:${server.address().port}/api/users`;
  const token=jwt.sign({id_user:1,session_version:0},process.env.JWT_SECRET);
  const body={nama_lengkap:'Petugas pengujian',username:'lps-uji',email:'lps@example.org',password:'PasswordPengujian123',role:'lps',id_bank_sampah:null};
  const request=(data,method='POST',authenticated=true)=>fetch(url+(method==='PUT' ? '/70' : ''),{method,headers:{'Content-Type':'application/json',...(authenticated ? {Authorization:`Bearer ${token}`} : {})},body:JSON.stringify(data)});
  try {
    const created=await request(body);
    assert.equal(created.status,200,JSON.stringify(await created.json()));
    assert.equal(inserted[4],'lps');assert.equal(inserted[5],null);assert.equal(inserted[6],null);
    assert.equal(activated,true);assert.equal(commits,1);
    assert.equal((await request(body,'PUT')).status,200);assert.equal(updated[3],'lps');
    const truck={...body,role:'petugas_truk',username:'truk-uji'};
    assert.equal((await request(truck)).status,200);assert.equal(inserted[4],'petugas_truk');assert.equal(inserted[5],null);
    assert.equal((await request(truck,'PUT')).status,200);assert.equal(updated[3],'petugas_truk');
    const before=connections;
    assert.equal((await request({...body,role:'invalid'})).status,400);
    assert.equal((await request(body,'POST',false)).status,401);
    role='lps';assert.equal((await request(body)).status,403);
    role='petugas_truk';assert.equal((await request(truck)).status,403);
    role='admin_bank';assert.equal((await request(body)).status,403);
    assert.equal(connections,before);
  } finally {
    db.query=originalQuery;db.getConnection=originalConnection;
    await new Promise(resolve=>server.close(resolve));
  }
});
