import db from "../config/db.js";
import { getMetodeSaldo } from "./metodeSaldoModel.js";

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export function validateBarang(data) {
  const harga = Number(data.harga);
  const stok = Number(data.stok);
  if (typeof data.nama_barang !== "string" || !data.nama_barang.trim() || data.nama_barang.length > 120 || typeof data.satuan !== "string" || !data.satuan.trim() || data.satuan.length > 40) throw fail("Nama barang dan satuan wajib diisi");
  if (!Number.isFinite(harga) || harga <= 0 || harga > 9999999999999.99 || Math.abs(harga * 100 - Math.round(harga * 100)) > 0.001) throw fail("Harga harus positif dengan maksimal dua desimal");
  if (data.stok === "" || !Number.isSafeInteger(stok) || stok < 0 || stok > 2147483647) throw fail("Stok harus berupa bilangan bulat nol atau lebih");
  return { nama_barang: data.nama_barang.trim(), satuan: data.satuan.trim(), harga, stok };
}

export async function listBarang(bank, admin) {
  const [rows] = await db.query(`SELECT * FROM etalase_sembako WHERE id_bank_sampah = ? ${admin ? "" : "AND status_aktif = 1"} ORDER BY nama_barang`, [bank]);
  return rows;
}

export async function saveBarang(bank, id, data) {
  const item = validateBarang(data);
  if (id) {
    if (![0, 1].includes(Number(data.status_aktif))) throw fail("Status barang tidak valid");
    const [result] = await db.query("UPDATE etalase_sembako SET nama_barang=?, satuan=?, harga=?, stok=?, status_aktif=? WHERE id_barang=? AND id_bank_sampah=?", [item.nama_barang, item.satuan, item.harga, item.stok, Number(data.status_aktif), id, bank]);
    if (!result.affectedRows) throw fail("Barang tidak ditemukan", 404);
  } else {
    await db.query("INSERT INTO etalase_sembako (id_bank_sampah, nama_barang, satuan, harga, stok) VALUES (?, ?, ?, ?, ?)", [bank, item.nama_barang, item.satuan, item.harga, item.stok]);
  }
}

export async function listPenukaran(bank, nasabah) {
  const [rows] = await db.query(`SELECT p.*, n.nama_nasabah, n.nomor_rekening FROM penukaran_sembako p JOIN nasabah n ON n.id_nasabah=p.id_nasabah WHERE p.id_bank_sampah=? ${nasabah ? "AND p.id_nasabah=?" : ""} ORDER BY p.id_penukaran DESC LIMIT 100`, nasabah ? [bank, nasabah] : [bank]);
  return rows;
}

export async function tukarBarang({ bank, nasabah, barang, jumlah, request_key }) {
  if (!Number.isSafeInteger(Number(jumlah)) || Number(jumlah) <= 0 || Number(jumlah) > 2147483647) throw fail("Jumlah barang harus bilangan bulat positif");
  if (typeof request_key !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(request_key)) throw fail("ID pengajuan penukaran tidak valid");
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const metode = await getMetodeSaldo(bank, conn);
    const [accounts] = await conn.query("SELECT saldo FROM nasabah WHERE id_nasabah=? AND id_bank_sampah=? AND status_aktif=1 FOR UPDATE", [nasabah, bank]);
    if (!accounts.length) throw fail("Rekening tidak aktif", 403);
    const [existing] = await conn.query("SELECT * FROM penukaran_sembako WHERE id_bank_sampah=? AND id_nasabah=? AND request_key=?", [bank, nasabah, request_key]);
    if (existing.length) {
      if (Number(existing[0].id_barang) !== Number(barang) || Number(existing[0].jumlah) !== Number(jumlah)) throw fail("ID pengajuan sudah digunakan untuk penukaran lain", 409);
      await conn.commit();
      return existing[0];
    }
    const [items] = await conn.query("SELECT * FROM etalase_sembako WHERE id_barang=? AND id_bank_sampah=? AND status_aktif=1 FOR UPDATE", [barang, bank]);
    const item = items[0];
    if (!item) throw fail("Barang tidak tersedia", 404);
    if (Number(item.stok) < Number(jumlah)) throw fail("Stok sembako tidak mencukupi", 409);
    const total = Math.round(Number(item.harga) * Number(jumlah) * 100) / 100;
    const before = Number(accounts[0].saldo);
    if (!Number.isFinite(total) || total <= 0 || total > 9999999999999.99) throw fail("Total penukaran tidak valid");
    if (before < total) throw fail("Saldo tidak mencukupi", 409);
    const after = Math.round((before - total) * 100) / 100;
    const [result] = await conn.query("INSERT INTO penukaran_sembako (id_bank_sampah, id_nasabah, id_barang, nama_barang, satuan, jumlah, harga_satuan, total, metode_saldo, request_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [bank, nasabah, barang, item.nama_barang, item.satuan, jumlah, item.harga, total, metode, request_key]);
    await conn.query("UPDATE nasabah SET saldo=? WHERE id_nasabah=? AND id_bank_sampah=?", [after, nasabah, bank]);
    await conn.query("UPDATE etalase_sembako SET stok=stok-? WHERE id_barang=? AND id_bank_sampah=?", [jumlah, barang, bank]);
    await conn.query("INSERT INTO mutasi_saldo (id_bank_sampah, id_nasabah, tipe, referensi_id, referensi_tabel, jumlah, saldo_sebelum, saldo_sesudah) VALUES (?, ?, 'PENUKARAN', ?, 'penukaran_sembako', ?, ?, ?)", [bank, nasabah, result.insertId, total, before, after]);
    await conn.commit();
    return { id_penukaran: result.insertId, total, metode_saldo: metode, saldo_sesudah: after, status: "MENUNGGU" };
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

export async function serahkanBarang(bank, id, admin) {
  const [result] = await db.query("UPDATE penukaran_sembako SET status='DISERAHKAN', admin_id=?, diserahkan_at=NOW() WHERE id_penukaran=? AND id_bank_sampah=? AND status='MENUNGGU'", [admin, id, bank]);
  if (!result.affectedRows) throw fail("Penukaran tidak ditemukan atau sudah diserahkan", 409);
}
