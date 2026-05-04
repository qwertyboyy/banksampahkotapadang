export const createTransaksi = async (data, conn) => {
  const { id_bank_sampah, id_pengepul, tanggal, total_harga, catatan } = data;

  const [result] = await conn.query(
    `INSERT INTO transaksi_jual
     (id_bank_sampah, id_pengepul, tanggal, total_harga, catatan)
     VALUES (?, ?, ?, ?, ?)`,
    [id_bank_sampah, id_pengepul, tanggal, total_harga, catatan],
  );

  return result.insertId;
};

export const createDetail = async (
  details,
  id_penjualan,
  id_bank_sampah,
  conn,
) => {
  if (!details || details.length === 0) {
    throw new Error("DETAIL KOSONG");
  }

  const query = `
    INSERT INTO detail_jual
    (id_penjualan, id_bank_sampah, nama_barang_pengepul, id_kategori, berat, harga_per_kg, subtotal)
    VALUES ?
  `;

  const values = details.map((d) => [
    id_penjualan,
    id_bank_sampah,
    d.nama_barang_pengepul,
    d.id_kategori,
    d.berat,
    d.harga_per_kg,
    d.subtotal,
  ]);

  console.log("DETAIL VALUES:", values);

  await conn.query(query, [values]);
};
