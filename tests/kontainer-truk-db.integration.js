import assert from 'node:assert/strict';
import db from '../config/db.js';
import {updateFollowup} from '../services/kontainerFollowup.js';

const conn=await db.getConnection();
try {
  await conn.beginTransaction();
  const code=`TEST-TRUK-${Date.now()}`;
  const [tps]=await conn.query("INSERT INTO tps (kode_titik,nama,kecamatan,latitude,longitude,status) VALUES (?,?,'Pengujian',-0.9,100.35,'aktif')",[code,'TPS pengujian rollback']);
  const [unit]=await conn.query('INSERT INTO kontainer (id_tps,kode) VALUES (?,?)',[tps.insertId,code]);
  await conn.query("INSERT INTO monitoring_kontainer (id_kontainer,id_pelapor,kondisi,nama_petugas) VALUES (?,0,'berserakan','LPS pengujian')",[unit.insertId]);
  const sql=`INSERT INTO kontainer_tindak_lanjut (id_kontainer,id_pemohon,catatan,nama_petugas,jenis_laporan) VALUES (?,0,?,'LPS pengujian','berserakan')
    ON DUPLICATE KEY UPDATE catatan=VALUES(catatan),jenis_laporan=VALUES(jenis_laporan)`;
  await conn.query(sql,[unit.insertId,'Laporan awal']);
  await conn.query(sql,[unit.insertId,'Laporan berulang']);
  const [[count]]=await conn.query('SELECT COUNT(*) AS n FROM kontainer_tindak_lanjut WHERE open_unit=?',[unit.insertId]);
  assert.equal(Number(count.n),1);
  const [[ticket]]=await conn.query('SELECT id FROM kontainer_tindak_lanjut WHERE open_unit=?',[unit.insertId]);
  const adapter={getConnection:async()=>({query:conn.query.bind(conn),beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){}})};
  await updateFollowup(adapter,{id_user:0,role:'petugas_truk'},ticket.id,{respon:'dibersihkan',nama_petugas:'Truk pertama',catatan_admin:'Area dibersihkan'});
  const [[cleaned]]=await conn.query('SELECT kondisi FROM monitoring_kontainer WHERE id_kontainer=? ORDER BY id DESC LIMIT 1',[unit.insertId]);
  assert.equal(cleaned.kondisi,'bersih');
  await conn.query(sql,[unit.insertId,'Laporan berikutnya']);
  const [[secondTicket]]=await conn.query('SELECT id FROM kontainer_tindak_lanjut WHERE open_unit=?',[unit.insertId]);
  await updateFollowup(adapter,{id_user:0,role:'petugas_truk'},secondTicket.id,{respon:'diangkut',nama_petugas:'Truk kedua',catatan_admin:'Sampah diangkut'});
  const [history]=await conn.query('SELECT nama_petugas,status,respon_truk FROM kontainer_konfirmasi WHERE id_tindak_lanjut IN (?,?) ORDER BY id',[ticket.id,secondTicket.id]);
  assert.deepEqual(history.map(row=>[row.nama_petugas,row.status,row.respon_truk]),[['Truk pertama','selesai','dibersihkan'],['Truk kedua','selesai','diangkut']]);
  const [[latest]]=await conn.query('SELECT kondisi,nama_petugas FROM monitoring_kontainer WHERE id_kontainer=? ORDER BY id DESC LIMIT 1',[unit.insertId]);
  assert.equal(latest.kondisi,'kosong');assert.equal(latest.nama_petugas,'Truk kedua');
  await assert.rejects(updateFollowup(adapter,{id_user:0,role:'petugas_truk'},ticket.id,{respon:'diangkut',nama_petugas:'Truk ketiga'}),error=>error.status===409);
  await conn.rollback();
  const [[persisted]]=await conn.query('SELECT COUNT(*) AS n FROM tps WHERE kode_titik=?',[code]);
  assert.equal(Number(persisted.n),0);
  console.log('PASS: real DB picked-up/cleaned responses, separate cleanup/empty conditions, queue merging, named history and duplicate completion rejection. Test transaction rolled back.');
} finally {await conn.rollback();conn.release();await db.end();}
