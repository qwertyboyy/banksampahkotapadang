import test from 'node:test';
import assert from 'node:assert/strict';
import { requestFollowup, updateFollowup } from '../services/kontainerFollowup.js';

function fixture(options={}) {
  const state={commits:0,rollbacks:0,inserts:0,updates:0,reports:0};
  const conn={
    async beginTransaction(){}, async commit(){state.commits++;}, async rollback(){state.rollbacks++;}, release(){},
    async query(sql,params) {
      if(sql.includes('FROM kontainer_settings')) return [[{enabled:options.disabled ? 0 : 1}]];
      if(sql.includes('FROM kontainer k JOIN tps')) return [[{id:1,id_tps:3,aktif:options.inactive ? 0 : 1,status:'aktif'}]];
      if(sql.includes('FROM monitoring_kontainer')) return [[{kondisi:options.kondisi || 'penuh'}]];
      if(sql.includes('WHERE open_unit')) return [options.duplicate ? [{id:8}] : []];
      if(sql.startsWith('SELECT id_kontainer FROM kontainer_tindak_lanjut')) return [options.missing ? [] : [{id_kontainer:1}]];
      if(sql.startsWith('SELECT id FROM kontainer')) return [[{id:1}]];
      if(sql.startsWith('INSERT INTO monitoring_kontainer')) {if(options.reportFailure)throw new Error('report write failed');state.finalCondition=params[2];state.reports++;return [{insertId:10}];}
      if(sql.startsWith('INSERT INTO')) {state.inserts++;return [{insertId:8}];}
      if(sql.includes('FROM kontainer_tindak_lanjut WHERE id')) return [options.missing ? [] : [{id:8,status:options.status || 'menunggu'}]];
      if(sql.startsWith('UPDATE kontainer_tindak_lanjut')) {state.updates++;return [{affectedRows:1}];}
      throw new Error('Unexpected query');
    }
  };
  return {state,db:{getConnection:async()=>conn}};
}
test('shared LPS followup requires operator name, full state, active module and no open request',async()=>{
  for(const [options,status] of [[{kondisi:'kosong'},400],[{disabled:true},503],[{inactive:true},400],[{duplicate:true},409]]) {
    const {db,state}=fixture(options);
    await assert.rejects(requestFollowup(db,{id_user:7},1,'Perlu diangkut','Petugas uji'),error=>error.status===status);
    assert.equal(state.inserts,0);assert.equal(state.commits,0);assert.equal(state.rollbacks,1);
  }
  const {db,state}=fixture();
  await assert.rejects(requestFollowup(db,{id_user:7},1,'Perlu diangkut'),error=>error.status===400);
  assert.deepEqual(await requestFollowup(db,{id_user:7},1,'Perlu diangkut','Petugas uji'),{id:8,status:'menunggu'});
  assert.equal(state.inserts,1);assert.equal(state.commits,1);
});
test('truck accepts only picked-up or cleaned responses; LPS and admin cannot confirm',async()=>{
  for(const [before,respon] of [['menunggu','diangkut'],['diproses','diangkut'],['menunggu','dibersihkan'],['diproses','dibersihkan']]) {
    const {db,state}=fixture({status:before});
    await updateFollowup(db,{id_user:1,role:'petugas_truk'},8,{respon,catatan_admin:'Catatan lapangan',nama_petugas:'Petugas truk uji'});
    assert.equal(state.updates,1);assert.equal(state.commits,1);
    assert.equal(state.reports,1);assert.equal(state.finalCondition,respon==='diangkut' ? 'kosong' : 'bersih');
  }
  for(const [before,respon] of [['selesai','diangkut'],['selesai','dibersihkan']]) {
    const {db,state}=fixture({status:before});
    await assert.rejects(updateFollowup(db,{id_user:1,role:'petugas_truk'},8,{respon,nama_petugas:'Petugas truk uji',catatan_admin:'Catatan'}),error=>error.status===409);
    assert.equal(state.updates,0);assert.equal(state.rollbacks,1);
  }
  for(const role of ['lps','superadmin']) {
    const {db,state}=fixture();
    await assert.rejects(updateFollowup(db,{id_user:1,role},8,{status:'selesai',nama_petugas:'Nama'}),error=>error.status===403);
    assert.equal(state.updates,0);
  }
  for(const body of [{respon:'diangkut'}, {respon:'invalid',nama_petugas:'Truk'}, {status:'diproses',nama_petugas:'Truk'}]) {
    const {db,state}=fixture();
    await assert.rejects(updateFollowup(db,{id_user:1,role:'petugas_truk'},8,body),error=>error.status===400);
    assert.equal(state.updates,0);
  }
});
test('truck confirmation rolls back if final condition cannot be recorded',async()=>{
  const {db,state}=fixture({reportFailure:true});
  await assert.rejects(updateFollowup(db,{id_user:1,role:'petugas_truk'},8,{respon:'diangkut',nama_petugas:'Petugas truk uji'}),/report write failed/);
  assert.equal(state.commits,0);assert.equal(state.rollbacks,1);
});
