import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

try {
  const [[account]]=await db.query("SELECT id_user,session_version FROM users WHERE role='lps' AND status_aktif=1 AND status_akun='aktif' ORDER BY id_user LIMIT 1");
  assert(account,'Perlu akun LPS aktif untuk integrasi');
  const token=jwt.sign({id_user:account.id_user,session_version:Number(account.session_version)},process.env.JWT_SECRET,{expiresIn:'1m'});
  const base=process.env.KONTAINER_TEST_API || 'http://localhost:5000/api/kontainer';
  const [[expected]]=await db.query('SELECT (SELECT COUNT(*) FROM kontainer) AS unit, (SELECT COUNT(*) FROM tps) AS tps');
  for(const [endpoint,count] of [['unit',expected.unit],['tps',expected.tps]]) {
    const response=await fetch(`${base}/${endpoint}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(5000)});
    assert.equal(response.status,200,`${endpoint}: modul harus aktif untuk pengujian ini`);
    const data=await response.json();assert.equal(data.length,Number(count));
    console.log(`PASS: shared LPS reads all ${data.length} ${endpoint} without assignment filtering`);
  }
  const [reportColumns]=await db.query("SHOW COLUMNS FROM monitoring_kontainer WHERE Field='nama_petugas'");
  const [requestColumns]=await db.query("SHOW COLUMNS FROM kontainer_tindak_lanjut WHERE Field='nama_petugas'");
  assert.equal(reportColumns.length,1);assert.equal(requestColumns.length,1);
  console.log('PASS: operator-name schema present; integration uses read-only requests');
} finally {await db.end();}
