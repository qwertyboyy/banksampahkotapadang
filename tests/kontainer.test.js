import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import routes from '../routes/kontainerRoutes.js';
import { securityHeaders } from '../middlewares/security.js';
import { moduleActive, positiveId } from '../services/kontainerPolicy.js';
import { readFile } from 'node:fs/promises';

test('monitoring period includes start and excludes end, disabled overrides schedule', () => {
  const now = new Date('2026-10-16T00:00:00Z');
  assert.equal(moduleActive({ enabled: 1, starts_at: now }, now), true);
  assert.equal(moduleActive({ enabled: 1, ends_at: now }, now), false);
  assert.equal(moduleActive({ enabled: 0 }, now), false);
  assert.equal(moduleActive({ enabled: 1, starts_at: '2026-10-17T00:00:00Z' }, now), false);
  assert.equal(moduleActive(undefined, now), false);
  for (const id of ['0', '-1', '1 OR 1=1', '1.5', '9007199254740992']) assert.throws(() => positiveId(id));
});

test('TPS source preserves location counts and unknown source status', async () => {
  const rows = JSON.parse(await readFile(new URL('../data/tps-padang-2025.json', import.meta.url), 'utf8'));
  assert.equal(rows.length, 143);
  assert.equal(new Set(rows.map(row => row.kode_titik)).size, 143);
  assert.equal(new Set(rows.map(row => row.kecamatan)).size, 11);
  assert.equal(rows.filter(row => row.status === 'belum_diketahui').length, 1);
  assert.equal(rows.find(row => row.kode_titik === '1').jumlah_kontainer, 3);
});

test('shared LPS can report across TPS; settings and shutdown remain protected', async () => {
  const original = db.query, originalConnection = db.getConnection;
  process.env.JWT_SECRET = 'kontainer-test-secret-local-only';
  let role = 'lps', enabled = 1, writes = 0,queued=0,queueFailure=false,commits=0,rollbacks=0;
  const user = () => ({ id_user: 7, role, id_bank_sampah: null, status_aktif: 1, status_akun: 'aktif', session_version: 0 });
  const query = async (sql, params) => {
    if (sql.includes('FROM users WHERE')) return [[user()]];
    if (sql.includes('FROM kontainer_settings')) return [[{ enabled, starts_at: null, ends_at: null }]];
    if (sql.startsWith('UPDATE kontainer_settings')) { writes++; enabled = Number(params[0]); return [{ affectedRows: 1 }]; }
    if (sql.includes('FROM kontainer k JOIN tps t') && sql.includes('FOR UPDATE')) return [[{id:1,id_tps:3,aktif:1,status:'aktif'}]];
    if (sql.startsWith('INSERT INTO monitoring_kontainer')) { assert.equal(params[4],'Petugas uji');writes++; return [{insertId:99}]; }
    if(sql.startsWith('INSERT INTO kontainer_tindak_lanjut')) {if(queueFailure) throw new Error('queue unavailable');queued++;assert(['penuh','berserakan'].includes(params[4]));return [{insertId:9}];}
    if (sql.startsWith('SELECT k.id, k.kode')) {
      assert.equal(sql.includes('tps_lps'),false);
      return [[{id:1,kondisi:null}]];
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  db.query = query;
  db.getConnection = async () => ({ query, beginTransaction:async()=>{}, commit:async()=>{commits++;}, rollback:async()=>{rollbacks++;}, release(){} });
  const app = express(); app.use(securityHeaders); app.use(express.json()); app.use('/api/kontainer', routes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/kontainer`;
  const token = jwt.sign({id_user:7,session_version:0},process.env.JWT_SECRET);
  const request = (path, method='GET', body, authenticated=true) => fetch(base+path, {method, headers:{'Content-Type':'application/json',...(authenticated ? {Authorization:`Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
  try {
    assert.equal((await request('/pengaturan','GET',null,false)).status,401);
    assert.equal((await request('/pengaturan','PUT',{enabled:false,starts_at:null,ends_at:null})).status,403);
    assert.equal(writes,0);
    assert.equal((await request('/tindak-lanjut/1','PATCH',{status:'diproses'})).status,403);
    assert.equal((await request('/unit')).status,200);
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'penuh'})).status,400);
    assert.equal(writes,0);
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'penuh',nama_petugas:'Petugas uji'})).status,201);
    assert.equal(writes,1);
    assert.equal(queued,1);
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'berserakan',nama_petugas:'Petugas uji'})).status,201);
    assert.equal(queued,2);
    const committed=commits;queueFailure=true;
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'penuh',nama_petugas:'Petugas uji'})).status,500);
    assert.equal(commits,committed);assert.equal(rollbacks,1);queueFailure=false;
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'invalid'})).status,400);
    const publicResult = await request('/publik','GET',null,false);
    assert.equal(publicResult.status,200);
    assert.equal((await publicResult.json()).ringkasan.belum_dilaporkan,1);
    role='petugas_truk';
    assert.equal((await request('/unit')).status,200);
    assert.equal((await request('/pengaturan')).status,403);
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'penuh',nama_petugas:'Petugas uji'})).status,403);
    assert.equal((await request('/tindak-lanjut/1','PATCH',{status:'selesai'})).status,400);
    role='superadmin';
    assert.equal((await request('/tindak-lanjut/1','PATCH',{status:'selesai',nama_petugas:'Admin'})).status,403);
    assert.equal((await request('/unit/1/tindak-lanjut','POST',{})).status,403);
    assert.equal((await request('/pengaturan','PUT',{enabled:true,starts_at:null,ends_at:'invalid'})).status,400);
    assert.equal((await request('/pengaturan','PUT',{enabled:false,starts_at:null,ends_at:null})).status,200);
    const inactive = await request('/publik','GET',null,false);
    assert.equal(inactive.status,503);
    assert.deepEqual(await inactive.json(),{code:'KONTAINER_INACTIVE',message:'Monitoring kontainer tidak aktif'});
    assert.equal((await request('/unit/1/laporan','POST',{kondisi:'kosong'})).status,403);
    assert.equal((await request('/pengaturan')).status,200);
    role='lps';
    assert.equal((await request('/unit')).status,503);
    role='admin_bank';
    assert.equal((await request('/unit')).status,403);
  } finally {
    db.query=original; db.getConnection=originalConnection;
    await new Promise(resolve=>server.close(resolve));
  }
});
