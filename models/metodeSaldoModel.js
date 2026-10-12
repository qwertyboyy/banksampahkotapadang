import db from "../config/db.js";

export const formatNilai = (value, metode) => metode === "poin" ? `${Number(value || 0).toLocaleString("id-ID")} poin` : `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export async function getMetodeSaldo(idBank, connection = db) {
  const [rows] = await connection.query(
    "SELECT metode_saldo FROM bank_sampah WHERE id_bank_sampah = ?",
    [idBank],
  );
  if (!rows.length) throw Object.assign(new Error("Bank sampah tidak ditemukan"), { status: 404 });
  return rows[0].metode_saldo;
}

export async function requireRupiah(req, res, next) {
  try {
    if (await getMetodeSaldo(req.user.id_bank_sampah) !== "rupiah") {
      return res.status(403).json({ message: "Bank dengan metode poin tidak dapat melakukan penarikan uang" });
    }
    next();
  } catch (error) {
    res.status(error.status || 503).json({ message: error.status ? error.message : "Metode bank gagal dimuat" });
  }
}
