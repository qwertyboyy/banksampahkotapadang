import '../config/env.js';
import db from '../config/db.js';
import { readFile } from 'node:fs/promises';

try {
  const [[column]] = await db.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
  if (!column) throw new Error('Kolom users.role tidak ditemukan');
  const missingRoles=['lps','petugas_truk'].filter(role=>!column.Type.includes(`'${role}'`));
  if (column.Type.startsWith('enum(') && missingRoles.length) {
    const type = column.Type.slice(0, -1) + ',' + missingRoles.map(role=>`'${role}'`).join(',') + ')';
    const nullable = column.Null === 'YES' ? 'NULL' : 'NOT NULL';
    const defaultValue = column.Default == null ? '' : ` DEFAULT ${db.escape(column.Default)}`;
    await db.query(`ALTER TABLE users MODIFY COLUMN role ${type} ${nullable}${defaultValue}`);
  } else if (!column.Type.startsWith('enum(') && !/^(var)?char\(/.test(column.Type)) {
    throw new Error('Tipe users.role belum didukung, periksa skema sebelum migrasi');
  }
  for (const file of ['20261016_kontainer.sql', '20261016_tindak_lanjut_kontainer.sql', '20261017_kontainer_petugas.sql', '20261017_kontainer_truk.sql', '20261017_kontainer_respon.sql']) {
    const sql = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
      try { await db.query(statement); }
      catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
    }
  }
  console.log('Migrasi kontainer selesai. Modul default nonaktif; pengaturan yang sudah ada dipertahankan.');
} finally { await db.end(); }
