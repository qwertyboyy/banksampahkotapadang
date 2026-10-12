import ExcelJS from "exceljs";
import { createHash, randomUUID } from "node:crypto";

export const headers = ["Nama Nasabah", "NIK", "Alamat", "No. HP", "Saldo Awal"];
export const importError = (message, status = 400) => Object.assign(new Error(message), { status });
const key = value => String(value ?? "").trim().toLocaleLowerCase("id-ID");
const money = cents => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2,"0")}`;

function checkArchive(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw importError("File bukan arsip .xlsx yang valid.");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16), size = 0;
  if (count > 300 || count === 0) throw importError("Struktur file terlalu besar. Gunakan template impor.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw importError("Struktur arsip Excel tidak valid.");
    size += buffer.readUInt32LE(offset + 24);
    if (size > 20 * 1024 * 1024) throw importError("Isi file Excel terlalu besar setelah diekstrak.");
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

export function validateDate(value) {
  const parsed = typeof value === "string" ? new Date(value + "T00:00:00Z") : new Date(NaN);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })) throw importError("Tanggal saldo awal tidak valid atau berada di masa depan.");
  return value;
}

function cellValue(cell) {
  if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Error) throw importError("Formula dan sel error tidak diperbolehkan. Gunakan nilai saja.");
  if (cell.value && typeof cell.value === "object") throw importError("Gunakan sel teks atau angka biasa pada template.");
  return cell.value;
}

export async function parseWorkbook(buffer) {
  checkArchive(buffer);
  const book = new ExcelJS.Workbook();
  try { await book.xlsx.load(buffer); } catch { throw importError("File tidak dapat dibaca. Gunakan template Excel .xlsx."); }
  if (book.worksheets.length !== 1) throw importError("File harus berisi satu sheet sesuai template.");
  const sheet = book.worksheets[0];
  if (sheet.rowCount > 2001 || sheet.columnCount > 5) throw importError("Maksimal 2.000 nasabah dan lima kolom sesuai template.");
  if (headers.some((header, i) => key(cellValue(sheet.getCell(1, i + 1))) !== key(header))) throw importError("Header tidak sesuai. Unduh dan gunakan template impor.");
  const rows = [];
  for (let index = 2; index <= sheet.rowCount; index++) {
    const values = headers.map((_, i) => cellValue(sheet.getCell(index, i + 1)));
    if (values.every(value => value === null || value === undefined || value === "")) continue;
    const [name, nik, alamat, phone, saldo] = values;
    const errors = [], warnings = [];
    const text = value => String(value ?? "").trim();
    if (!text(name) || text(name).length > 100) errors.push("Nama wajib diisi, maksimal 100 karakter.");
    if (nik != null && typeof nik !== "string") errors.push("NIK harus berupa teks agar digit tidak berubah.");
    if (phone != null && typeof phone !== "string") errors.push("No. HP harus berupa teks agar nol di depan tetap utuh.");
    if (text(nik).length > 20 || text(phone).length > 20) errors.push("NIK dan No. HP maksimal 20 karakter.");
    if (text(alamat).length > 5000) errors.push("Alamat maksimal 5.000 karakter.");
    if (text(nik) && !/^\d{16}$/.test(text(nik))) warnings.push("NIK bukan 16 digit; nilai asli akan disimpan.");
    const raw = String(saldo ?? "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > 9999999999999.99) errors.push("Saldo wajib angka nonnegatif, maksimal dua desimal, tanpa Rp atau pemisah ribuan.");
    const [whole, fraction = ""] = raw.split(".");
    const cents = errors.some(value => value.startsWith("Saldo")) ? 0 : Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2,"0")));
    rows.push({ baris_excel: index, nama_nasabah: text(name), nik: text(nik) || null, alamat: text(alamat) || null, no_hp: text(phone) || null, saldo: money(cents), cents, errors, warnings });
  }
  if (!rows.length) throw importError("Template belum berisi nasabah.");
  return rows;
}

export async function inspectImport(conn, bankId, buffer, date) {
  if (!/^\d+$/.test(String(bankId)) || Number(bankId) < 1) throw importError("Bank tujuan tidak valid.");
  validateDate(date);
  const [banks] = await conn.query("SELECT id_bank_sampah,kode_bank_sampah,nama_bank_sampah,metode_saldo FROM bank_sampah WHERE id_bank_sampah = ?", [bankId]);
  if (!banks.length) throw importError("Bank sampah tidak ditemukan.", 404);
  if (banks[0].metode_saldo !== "rupiah") throw importError("Impor saldo rupiah hanya tersedia untuk bank dengan metode saldo rupiah.");
  const rows = await parseWorkbook(buffer);
  const [existing] = await conn.query("SELECT nama_nasabah,nik FROM nasabah WHERE id_bank_sampah = ?", [bankId]);
  const names = new Set(existing.map(row => key(row.nama_nasabah)));
  const niks = new Set(existing.filter(row => row.nik).map(row => key(row.nik)));
  const fileNames = new Set(), fileNiks = new Set();
  for (const row of rows) {
    const name = key(row.nama_nasabah), nik = key(row.nik);
    if (names.has(name)) row.errors.push("Nama sudah terdaftar di bank ini. Periksa konflik secara manual.");
    if (nik && niks.has(nik)) row.errors.push("NIK sudah terdaftar di bank ini. Periksa konflik secara manual.");
    if (fileNames.has(name)) row.errors.push("Nama berulang di dalam file.");
    if (nik && fileNiks.has(nik)) row.warnings.push("NIK berulang di dalam file; pastikan nasabah berbeda.");
    fileNames.add(name); if (nik) fileNiks.add(nik);
  }
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const [batches] = await conn.query("SELECT id_impor FROM impor_nasabah WHERE id_bank_sampah = ? AND file_hash = ?", [bankId, fileHash]);
  const totalCents = rows.reduce((total, row) => total + row.cents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents > 999999999999999) throw importError("Total saldo melebihi batas impor.");
  return { bank: banks[0], rows, file_hash: fileHash, tanggal_awal: date, jumlah_nasabah: rows.length, total_saldo: money(totalCents), error_count: rows.filter(row => row.errors.length).length, warning_count: rows.filter(row => row.warnings.length).length, already_imported: !!batches.length };
}

export async function commitImport(conn, { bankId, buffer, date, adminId, filename, previewHash, acceptWarnings }) {
  await conn.beginTransaction();
  try {
    const [banks] = await conn.query("SELECT id_bank_sampah FROM bank_sampah WHERE id_bank_sampah = ? FOR UPDATE", [bankId]);
    if (!banks.length) throw importError("Bank sampah tidak ditemukan.", 404);
    await conn.query("INSERT INTO counter_nasabah (id_bank_sampah,last_nomor_urut) VALUES (?,0) ON DUPLICATE KEY UPDATE id_bank_sampah = id_bank_sampah", [bankId]);
    const [[counter]] = await conn.query("SELECT last_nomor_urut FROM counter_nasabah WHERE id_bank_sampah = ? FOR UPDATE", [bankId]);
    const preview = await inspectImport(conn, bankId, buffer, date);
    if (preview.file_hash !== previewHash) throw importError("File berubah. Lakukan pratinjau kembali.", 409);
    if (preview.already_imported) throw importError("File ini sudah diimpor untuk bank tujuan.", 409);
    if (preview.error_count) throw importError("Ada kesalahan atau konflik data. Perbaiki dan lakukan pratinjau kembali.", 409);
    if (preview.warning_count && !acceptWarnings) throw importError("Konfirmasi bahwa catatan NIK sudah diperiksa.");
    const [[maximum]] = await conn.query("SELECT COALESCE(MAX(nomor_urut),0) AS nomor FROM nasabah WHERE id_bank_sampah = ?", [bankId]);
    let number = Math.max(Number(counter.last_nomor_urut), Number(maximum.nomor));
    if (number + preview.rows.length > 99999) throw importError("Nomor urut rekening melebihi lima digit.");
    const id = randomUUID();
    await conn.query("INSERT INTO impor_nasabah (id_impor,id_bank_sampah,admin_id,file_hash,nama_file,tanggal_awal,jumlah_nasabah,total_saldo) VALUES (?,?,?,?,?,?,?,?)", [id, bankId, adminId, preview.file_hash, filename.slice(0,255), date, preview.jumlah_nasabah, preview.total_saldo]);
    for (const row of preview.rows) {
      number++;
      const rekening = preview.bank.kode_bank_sampah + String(number).padStart(5,"0");
      const [result] = await conn.query("INSERT INTO nasabah (id_bank_sampah,nomor_urut,nomor_rekening,nama_nasabah,nik,alamat,no_hp,saldo,status_aktif) VALUES (?,?,?,?,?,?,?,?,1)", [bankId,number,rekening,row.nama_nasabah,row.nik,row.alamat,row.no_hp,row.saldo]);
      await conn.query("INSERT INTO impor_nasabah_detail (id_impor,baris_excel,id_nasabah,saldo_awal) VALUES (?,?,?,?)", [id,row.baris_excel,result.insertId,row.saldo]);
    }
    await conn.query("UPDATE counter_nasabah SET last_nomor_urut = ? WHERE id_bank_sampah = ?", [number,bankId]);
    await conn.commit();
    return { id_impor: id, jumlah_nasabah: preview.jumlah_nasabah, total_saldo: preview.total_saldo };
  } catch (error) { await conn.rollback(); throw error; }
}
