import { moduleActive, positiveId, text } from './kontainerPolicy.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export async function requestFollowup(db, user, unitId, note, operatorName) {
  const id = positiveId(unitId);
  const catatan = note == null || note === '' ? null : text(note, 'Catatan', 2000);
  const namaPetugas = text(operatorName,'Nama petugas',120);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[settings]] = await conn.query('SELECT * FROM kontainer_settings WHERE id=1 FOR UPDATE');
    if (!moduleActive(settings)) fail('Monitoring kontainer tidak aktif',503);
    const [[unit]] = await conn.query('SELECT k.id,k.id_tps,k.aktif,t.status FROM kontainer k JOIN tps t ON t.id=k.id_tps WHERE k.id=? FOR UPDATE',[id]);
    if (!unit) fail('Kontainer tidak ditemukan',404);
    if (!unit.aktif || unit.status !== 'aktif') fail('Kontainer atau TPS tidak aktif');
    const [[report]] = await conn.query('SELECT kondisi FROM monitoring_kontainer WHERE id_kontainer=? ORDER BY id DESC LIMIT 1',[id]);
    if (!['penuh','berserakan'].includes(report?.kondisi)) fail('Laporkan kondisi penuh atau berserakan terlebih dahulu');
    const [[existing]] = await conn.query('SELECT id FROM kontainer_tindak_lanjut WHERE open_unit=?',[id]);
    if (existing) fail('Permintaan untuk kontainer ini masih menunggu atau sedang diproses',409);
    const [result] = await conn.query('INSERT INTO kontainer_tindak_lanjut (id_kontainer,id_pemohon,catatan,nama_petugas,jenis_laporan) VALUES (?,?,?,?,?)',[id,user.id_user,catatan,namaPetugas,report.kondisi]);
    await conn.commit();
    return { id:result.insertId, status:'menunggu' };
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}

export async function updateFollowup(db, user, requestId, body) {
  const id = positiveId(requestId);
  if(user.role !== 'petugas_truk') fail('Konfirmasi hanya dapat dilakukan petugas truk',403);
  if (!['diangkut','dibersihkan'].includes(body.respon)) fail('Pilih sudah diangkut atau sudah dibersihkan');
  const kondisiSetelah=body.respon==='diangkut' ? 'kosong' : 'bersih';
  const namaPetugas=text(body.nama_petugas,'Nama petugas truk',120);
  const catatan = body.catatan_admin == null || body.catatan_admin === '' ? null : text(body.catatan_admin,'Catatan admin',2000);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[settings]]=await conn.query('SELECT * FROM kontainer_settings WHERE id=1 FOR UPDATE');
    if(!moduleActive(settings)) fail('Monitoring kontainer tidak aktif',503);
    const [[target]]=await conn.query('SELECT id_kontainer FROM kontainer_tindak_lanjut WHERE id=?',[id]);
    if(!target) fail('Permintaan tidak ditemukan',404);
    const [[unit]]=await conn.query('SELECT id FROM kontainer WHERE id=? FOR UPDATE',[target.id_kontainer]);
    if(!unit) fail('Kontainer tidak ditemukan',404);
    const [[request]] = await conn.query('SELECT id,status FROM kontainer_tindak_lanjut WHERE id=? FOR UPDATE',[id]);
    if (!request) fail('Permintaan tidak ditemukan',404);
    if(request.status==='selesai') fail('Laporan ini sudah dikonfirmasi selesai. Muat ulang data.',409);
    await conn.query('UPDATE kontainer_tindak_lanjut SET status=?,catatan_admin=?,updated_by=?,nama_petugas_truk=?,dikonfirmasi_at=NOW(),respon_truk=? WHERE id=?',['selesai',catatan,user.id_user,namaPetugas,body.respon,id]);
    await conn.query('INSERT INTO kontainer_konfirmasi (id_tindak_lanjut,id_user,nama_petugas,status,catatan,kondisi_setelah,respon_truk) VALUES (?,?,?,?,?,?,?)',[id,user.id_user,namaPetugas,'selesai',catatan,kondisiSetelah,body.respon]);
    await conn.query('INSERT INTO monitoring_kontainer (id_kontainer,id_pelapor,kondisi,catatan,nama_petugas) VALUES (?,?,?,?,?)',[unit.id,user.id_user,kondisiSetelah,catatan || (body.respon==='diangkut' ? 'Sudah diangkut' : 'Sudah dibersihkan'),namaPetugas]);
    await conn.commit();
    return { id, status:'selesai',respon:body.respon };
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}
