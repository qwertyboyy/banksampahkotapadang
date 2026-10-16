import '../config/env.js';
import db from '../config/db.js';
import { readFile } from 'node:fs/promises';
import { text } from '../services/kontainerPolicy.js';

let conn;
try {
  const rows = JSON.parse(await readFile(new URL('../data/tps-padang-2025.json', import.meta.url), 'utf8'));
  const codes = new Set();
  for (const row of rows) {
    text(row.kode_titik, 'Kode titik', 40);
    text(row.nama, 'Nama');
    text(row.kecamatan, 'Kecamatan', 100);
    if (codes.has(row.kode_titik)) throw new Error(`Kode titik duplikat: ${row.kode_titik}`);
    codes.add(row.kode_titik);
    if (!Number.isFinite(row.latitude) || Math.abs(row.latitude) > 90 || !Number.isFinite(row.longitude) || Math.abs(row.longitude) > 180 || !Number.isInteger(row.jumlah_kontainer) || row.jumlah_kontainer < 0 || row.jumlah_kontainer > 100 || !['aktif','nonaktif','belum_diketahui'].includes(row.status)) throw new Error(`Data TPS tidak valid: ${row.kode_titik}`);
  }
  conn = await db.getConnection();
  await conn.beginTransaction();
  let imported = 0;
  for (const row of rows) {
    const [result] = await conn.query('INSERT IGNORE INTO tps (kode_titik,nama,kecamatan,latitude,longitude,keterangan,status) VALUES (?,?,?,?,?,?,?)', [row.kode_titik,row.nama,row.kecamatan,row.latitude,row.longitude,row.keterangan,row.status]);
    // Re-running an import must not overwrite operational edits or recreate retired units.
    if (!result.affectedRows) continue;
    imported++;
    for (let index = 1; index <= row.jumlah_kontainer; index++) {
      await conn.query('INSERT INTO kontainer (id_tps,kode) VALUES (?,?)', [result.insertId,`TPS-${row.kode_titik}-${String(index).padStart(2,'0')}`]);
    }
  }
  await conn.commit();
  console.log(`${imported} TPS baru diimpor. Kode unit bersifat internal; cocokkan dengan unit lapangan. Status sumber kosong disimpan sebagai belum_diketahui.`);
} catch (error) {
  if (conn) await conn.rollback();
  throw error;
} finally { conn?.release(); await db.end(); }
