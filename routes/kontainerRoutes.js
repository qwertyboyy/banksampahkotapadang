import express from 'express';
import db from '../config/db.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { moduleActive, positiveId, text } from '../services/kontainerPolicy.js';
import { requestFollowup, updateFollowup } from '../services/kontainerFollowup.js';

const router = express.Router();
const admin = roleMiddleware('superadmin');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const run = handler => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Kode sudah digunakan' });
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Layanan kontainer sementara tidak tersedia' });
  }
};
const getSettings = async (conn = db, lock = false) => {
  const [[settings]] = await conn.query(`SELECT * FROM kontainer_settings WHERE id = 1${lock ? ' FOR UPDATE' : ''}`);
  return settings;
};
const requireActive = async (req, res, next) => {
  try {
    if (!moduleActive(await getSettings())) return res.status(503).json({ code: 'KONTAINER_INACTIVE', message: 'Monitoring kontainer tidak aktif' });
    next();
  } catch { res.status(503).json({ message: 'Layanan kontainer sementara tidak tersedia' }); }
};
const latest = `SELECT k.id, k.kode, k.id_tps, k.aktif, t.nama AS nama_tps,
  t.kode_titik, t.kecamatan, t.latitude, t.longitude, t.keterangan, t.status AS status_tps,
  m.kondisi, m.catatan, m.created_at AS terakhir_dilaporkan,
  f.id AS id_tindak_lanjut, f.status AS status_tindak_lanjut, f.created_at AS diminta_at
  FROM kontainer k JOIN tps t ON t.id = k.id_tps
  LEFT JOIN monitoring_kontainer m ON m.id = (
    SELECT MAX(r.id) FROM monitoring_kontainer r WHERE r.id_kontainer = k.id)
  LEFT JOIN kontainer_tindak_lanjut f ON f.open_unit = k.id`;

router.get('/status', run(async (req, res) => {
  const settings = await getSettings();
  res.json({ active: moduleActive(settings), starts_at: settings?.starts_at, ends_at: settings?.ends_at });
}));
router.get('/publik', requireActive, run(async (req, res) => {
  const params = [];
  let where = " WHERE k.aktif = 1 AND t.status = 'aktif'";
  if (req.query.kecamatan) { where += ' AND t.kecamatan = ?'; params.push(text(req.query.kecamatan, 'Kecamatan', 100)); }
  const [rows] = await db.query(`${latest}${where} ORDER BY t.kecamatan, t.nama, k.kode`, params);
  const ringkasan = { total: rows.length, belum_dilaporkan: 0, kosong: 0, sebagian: 0, penuh: 0, berserakan:0, rusak: 0, bersih:0 };
  rows.forEach(row => ringkasan[row.kondisi || 'belum_dilaporkan']++);
  res.json({ ringkasan, data: rows });
}));

router.use(authMiddleware, roleMiddleware('superadmin', 'lps', 'petugas_truk'));
router.get('/pengaturan', admin, run(async (req, res) => res.json(await getSettings())));
router.put('/pengaturan', admin, run(async (req, res) => {
  const { enabled, starts_at, ends_at } = req.body;
  if (typeof enabled !== 'boolean') fail('enabled harus boolean');
  const parseDate = value => {
    if (value === null) return null;
    if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail('Tanggal harus ISO 8601 dengan zona waktu, atau null');
    return new Date(value);
  };
  const start = parseDate(starts_at), end = parseDate(ends_at);
  if (start && end && end <= start) fail('Tanggal berakhir harus setelah tanggal mulai');
  await db.query('UPDATE kontainer_settings SET enabled = ?, starts_at = ?, ends_at = ?, updated_by = ? WHERE id = 1', [enabled, start, end, req.user.id_user]);
  res.json(await getSettings());
}));

router.use((req, res, next) => req.user.role === 'superadmin' ? next() : requireActive(req, res, next));
router.get('/tindak-lanjut', run(async (req,res) => {
  const page = positiveId(req.query.page || 1);
  const params = [];
  let where = ' WHERE 1=1';
  if (req.query.status) {
    if (!['menunggu','diproses','selesai'].includes(req.query.status)) fail('Status tidak valid');
    if(req.query.status==='menunggu') where += " AND f.status IN ('menunggu','diproses')";
    else {where += ' AND f.status=?'; params.push(req.query.status);}
  }
  const [data] = await db.query(`SELECT f.id,f.id_kontainer,f.status,f.respon_truk,f.jenis_laporan,f.catatan,f.catatan_admin,f.created_at,f.updated_at,f.nama_petugas_truk,f.dikonfirmasi_at,
    k.kode,t.nama AS nama_tps,t.kecamatan,COALESCE(f.nama_petugas,u.nama_lengkap) AS pemohon
    FROM kontainer_tindak_lanjut f JOIN kontainer k ON k.id=f.id_kontainer JOIN tps t ON t.id=k.id_tps
    LEFT JOIN users u ON u.id_user=f.id_pemohon ${where}
    ORDER BY FIELD(f.status,'menunggu','diproses','selesai'),f.id DESC LIMIT 50 OFFSET ?`,[...params,(page-1)*50]);
  res.json({page,data});
}));
router.post('/unit/:id/tindak-lanjut', roleMiddleware('lps'), requireActive, run(async (req,res) => {
  res.status(201).json(await requestFollowup(db,req.user,req.params.id,req.body.catatan,req.body.nama_petugas));
}));
router.patch('/tindak-lanjut/:id', roleMiddleware('petugas_truk'), requireActive, run(async (req,res) => {
  res.json(await updateFollowup(db,req.user,req.params.id,req.body));
}));
router.get('/tindak-lanjut/:id/konfirmasi',run(async(req,res)=>{
  const id=positiveId(req.params.id);
  const page=positiveId(req.query.page || 1);
  const [data]=await db.query('SELECT id,nama_petugas,status,respon_truk,catatan,kondisi_setelah,created_at FROM kontainer_konfirmasi WHERE id_tindak_lanjut=? ORDER BY id DESC LIMIT 50 OFFSET ?',[id,(page-1)*50]);
  res.json({page,data});
}));
router.get('/tps', run(async (req, res) => {
  const [rows] = await db.query('SELECT t.*, (SELECT COUNT(*) FROM kontainer k WHERE k.id_tps = t.id AND k.aktif = 1) AS jumlah_kontainer FROM tps t ORDER BY t.kecamatan, t.nama');
  res.json(rows);
}));
const tpsInput = body => {
  const { latitude, longitude, status } = body;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) fail('Koordinat tidak valid');
  if (!['aktif', 'nonaktif', 'belum_diketahui'].includes(status)) fail('Status TPS tidak valid');
  return [text(body.kode_titik, 'Kode titik', 40), text(body.nama, 'Nama'), text(body.kecamatan, 'Kecamatan', 100), latitude, longitude, body.keterangan == null || body.keterangan === '' ? null : text(body.keterangan, 'Keterangan', 2000), status];
};
router.post('/tps', admin, run(async (req, res) => {
  const [result] = await db.query('INSERT INTO tps (kode_titik,nama,kecamatan,latitude,longitude,keterangan,status) VALUES (?,?,?,?,?,?,?)', tpsInput(req.body));
  res.status(201).json({ id: result.insertId });
}));
router.put('/tps/:id', admin, run(async (req, res) => {
  const [result] = await db.query('UPDATE tps SET kode_titik=?,nama=?,kecamatan=?,latitude=?,longitude=?,keterangan=?,status=? WHERE id=?', [...tpsInput(req.body), positiveId(req.params.id)]);
  if (!result.affectedRows) fail('TPS tidak ditemukan', 404);
  res.json({ message: 'TPS diperbarui' });
}));
router.get('/tps/:id/lps', admin, run(async (req, res) => {
  const [rows] = await db.query('SELECT u.id_user,u.nama_lengkap,u.username FROM tps_lps a JOIN users u ON u.id_user=a.id_user WHERE a.id_tps=?', [positiveId(req.params.id)]);
  res.json(rows);
}));
router.put('/tps/:id/lps', admin, run(async (req, res) => {
  const id = positiveId(req.params.id);
  if (!Array.isArray(req.body.id_users) || req.body.id_users.length > 100) fail('id_users harus array maksimal 100 akun');
  const users = [...new Set(req.body.id_users.map(positiveId))];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[tps]] = await conn.query('SELECT id FROM tps WHERE id=? FOR UPDATE', [id]);
    if (!tps) fail('TPS tidak ditemukan', 404);
    for (const user of users) {
      const [[account]] = await conn.query("SELECT id_user FROM users WHERE id_user=? AND role='lps' AND status_aktif=1 AND status_akun='aktif' FOR UPDATE", [user]);
      if (!account) fail('Penanggung jawab harus akun LPS aktif');
    }
    await conn.query('DELETE FROM tps_lps WHERE id_tps=?', [id]);
    for (const user of users) await conn.query('INSERT INTO tps_lps (id_tps,id_user) VALUES (?,?)', [id,user]);
    await conn.commit();
    res.json({ message: 'Penugasan LPS diperbarui' });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}));
router.get('/unit', run(async (req, res) => {
  const [rows] = await db.query(`${latest} ORDER BY k.id`);
  res.json(rows);
}));
router.post('/unit', admin, run(async (req, res) => {
  const id = positiveId(req.body.id_tps);
  const [[tps]] = await db.query('SELECT id FROM tps WHERE id=?', [id]);
  if (!tps) fail('TPS tidak ditemukan',404);
  const [result] = await db.query('INSERT INTO kontainer (id_tps,kode) VALUES (?,?)', [id,text(req.body.kode,'Kode kontainer',80)]);
  res.status(201).json({ id: result.insertId });
}));
router.patch('/unit/:id', admin, run(async (req, res) => {
  if (typeof req.body.aktif !== 'boolean') fail('aktif harus boolean');
  const [result] = await db.query('UPDATE kontainer SET aktif=? WHERE id=?', [req.body.aktif, positiveId(req.params.id)]);
  if (!result.affectedRows) fail('Kontainer tidak ditemukan',404);
  res.json({ message: 'Status kontainer diperbarui' });
}));
router.get('/unit/:id/laporan', run(async (req, res) => {
  const id = positiveId(req.params.id);
  const [[unit]] = await db.query('SELECT k.id FROM kontainer k WHERE k.id=?',[id]);
  if (!unit) fail('Kontainer tidak ditemukan',404);
  const page = positiveId(req.query.page || 1);
  const [rows] = await db.query('SELECT id,id_kontainer,id_pelapor,nama_petugas,kondisi,catatan,created_at FROM monitoring_kontainer WHERE id_kontainer=? ORDER BY id DESC LIMIT 50 OFFSET ?', [id,(page-1)*50]);
  res.json({ page, data: rows });
}));
router.post('/unit/:id/laporan', roleMiddleware('lps'), requireActive, run(async (req, res) => {
  const id = positiveId(req.params.id);
  if (!['penuh','berserakan'].includes(req.body.kondisi)) fail('Laporan LPS harus penuh atau berserakan');
  const catatan = req.body.catatan == null || req.body.catatan === '' ? null : text(req.body.catatan,'Catatan',2000);
  const namaPetugas = text(req.body.nama_petugas,'Nama petugas',120);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (!moduleActive(await getSettings(conn,true))) fail('Monitoring kontainer tidak aktif',503);
    const [[unit]] = await conn.query('SELECT k.id,k.id_tps,k.aktif,t.status FROM kontainer k JOIN tps t ON t.id=k.id_tps WHERE k.id=? FOR UPDATE', [id]);
    if (!unit) fail('Kontainer tidak ditemukan',404);
    if (!unit.aktif || unit.status !== 'aktif') fail('Kontainer atau TPS tidak aktif');
    const [result] = await conn.query('INSERT INTO monitoring_kontainer (id_kontainer,id_pelapor,kondisi,catatan,nama_petugas) VALUES (?,?,?,?,?)', [id,req.user.id_user,req.body.kondisi,catatan,namaPetugas]);
    await conn.query(`INSERT INTO kontainer_tindak_lanjut (id_kontainer,id_pemohon,catatan,nama_petugas,jenis_laporan)
      VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id_pemohon=VALUES(id_pemohon),catatan=VALUES(catatan),nama_petugas=VALUES(nama_petugas),jenis_laporan=VALUES(jenis_laporan)`,[id,req.user.id_user,catatan,namaPetugas,req.body.kondisi]);
    await conn.commit();
    res.status(201).json({ id: result.insertId, message:'Laporan masuk ke antrean petugas truk' });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}));
export default router;
