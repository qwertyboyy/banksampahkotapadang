# Backend monitoring kontainer

Modul menggunakan akun `superadmin` sebagai admin DLH, role `lps` untuk pelaporan, dan `petugas_truk` untuk konfirmasi penanganan.
Role LPS digunakan sebagai akun bersama yang dapat mengakses seluruh TPS tanpa penugasan per akun.
Laporan dan permintaan wajib menyertakan nama_petugas (string, maksimal 120 karakter). Identitas akun tetap dicatat server; nama petugas merupakan isian pelapor dan belum diverifikasi.
Pelaporan dilakukan per unit kontainer. Foto laporan belum termasuk tahap backend ini.

## Instalasi

Jalankan dari direktori backend dengan konfigurasi environment tujuan:

```sh
npm run migrate:kontainer
npm run import:tps
```

Migrasi menambahkan role `lps` tanpa menghapus role lama. Modul baru default nonaktif.
Impor menggunakan `data/tps-padang-2025.json`, hasil konversi CSV TPS RESMI 2025 dari pengguna.
Impor berulang melewati TPS yang kode titiknya sudah ada, sehingga perubahan operasional tetap tersimpan.
Jumlah unit awal mengikuti CSV. Kode `TPS-{kode_titik}-{nomor_unit}` adalah kode internal yang perlu dicocokkan dengan unit fisik.
TPS Terminal Koto Lalang (136) memiliki status sumber kosong dan disimpan sebagai `belum_diketahui`.

## Autentikasi

Gunakan `POST /api/auth/login` yang sudah ada, lalu header `Authorization: Bearer <token>`.
Superadmin membuat akun LPS dan truk melalui `POST /api/users` dengan nama_lengkap, username, email, password dan role lps/petugas_truk tanpa id_bank_sampah.
Akun petugas yang dibuat superadmin langsung berstatus aktif. Nonaktifkan akun melalui endpoint pengelolaan user yang sudah ada.
Penugasan mengacu pada id_user, bukan nama akun.

## Endpoint

Semua path berikut berawalan `/api/kontainer`.

| Method | Path | Akses | Fungsi |
|---|---|---|---|
| GET | /status | Publik | Masa aktif dan status efektif modul |
| GET | /publik?kecamatan=KOTO%20TANGAH | Publik saat aktif | Ringkasan dan kondisi terbaru unit di TPS aktif |
| GET | /pengaturan | Superadmin | Pengaturan modul |
| PUT | /pengaturan | Superadmin | Mengubah aktif/nonaktif dan periode |
| GET | /tps | Superadmin, LPS, truk | Semua TPS |
| POST | /tps | Superadmin | Membuat TPS |
| PUT | /tps/:id | Superadmin | Memperbarui data lengkap TPS |
| GET | /tps/:id/lps | Superadmin | Data penugasan lama, tidak membatasi akses LPS bersama |
| PUT | /tps/:id/lps | Superadmin | Kompatibilitas data penugasan lama, tidak dipakai UI baru |
| GET | /unit | Superadmin, LPS, truk | Seluruh unit dan laporan terakhir |
| POST | /unit | Superadmin | Menambah unit dengan id_tps dan kode |
| PATCH | /unit/:id | Superadmin | Mengubah aktif dengan nilai boolean |
| GET | /unit/:id/laporan?page=1 | Superadmin, LPS, truk | Riwayat, 50 laporan per halaman |
| POST | /unit/:id/laporan | LPS saat aktif | Melaporkan penuh/berserakan dan membuat antrean truk |

Saat modul ditutup, API publik dan seluruh akses modul LPS/truk mengembalikan 503 dengan `code: KONTAINER_INACTIVE`.
Superadmin tetap dapat mengelola data dan membaca arsip, tetapi tidak dapat mengirim laporan saat modul ditutup.
Penutupan tidak menghapus data atau menonaktifkan akun pengguna.
GET /publik tidak menampilkan identitas akun pelapor. Kondisi null berarti belum ada laporan, bukan kosong.
Ringkasan mengikuti filter kecamatan. `terakhir_dilaporkan` harus ditampilkan frontend agar pembaca mengetahui umur laporan.

Pengaturan PUT memakai body lengkap. Gunakan ISO 8601 dengan zona waktu; null berarti tanpa batas pada sisi tersebut.
Batas mulai inklusif dan batas akhir eksklusif. Untuk mengakhiri pada akhir hari WIB, gunakan awal hari berikutnya.

```json
{
  "enabled": true,
  "starts_at": "2026-10-16T00:00:00+07:00",
  "ends_at": "2026-11-16T00:00:00+07:00"
}
```

Tanggal di atas hanya contoh, tidak diaktifkan otomatis. Body penugasan: `{"id_users":[7,8]}`; array kosong mencabut semua penugasan TPS.
Body laporan: `{"kondisi":"penuh","catatan":"Perlu pengangkutan","nama_petugas":"Nama petugas lapangan"}`.
Laporan LPS menerima kondisi penuh atau berserakan; kondisi kosong/sebagian dicatat oleh konfirmasi selesai petugas truk. Data kondisi rusak lama tetap dapat dibaca. Catatan opsional, maksimal 2000 karakter.
Waktu laporan dan identitas pelapor diisi server. Riwayat laporan tidak dapat diedit atau dihapus melalui modul ini.

Body TPS memakai kode_titik (string), nama, kecamatan, latitude dan longitude (number), keterangan (opsional), status (aktif/nonaktif/belum_diketahui).
Jumlah kontainer dihitung dari unit aktif, bukan kolom yang diedit terpisah.
Nonaktifkan unit melalui PATCH dan TPS melalui PUT; arsip laporan tetap tersedia.

Frontend `/kontainer` akan menggunakan API publik ini pada tahap berikutnya. Endpoint backend tidak membuat halaman frontend otomatis.

## Laporan LPS dan konfirmasi truk

Jalankan ulang `npm run migrate:kontainer` untuk menambahkan tabel kontainer_tindak_lanjut. Status aktif modul yang sudah ada dipertahankan.

- `POST /api/kontainer/unit/:id/laporan`: hanya LPS. Body kondisi penuh/berserakan, nama_petugas wajib, catatan opsional. Laporan dan antrean truk dibuat dalam satu transaksi. Laporan berulang digabung pada antrean terbuka tanpa menghapus riwayat monitoring atau konfirmasi.
- `POST /api/kontainer/unit/:id/tindak-lanjut`: endpoint kompatibilitas untuk LPS, mensyaratkan laporan terakhir penuh/berserakan dan tidak ada antrean terbuka. UI baru tidak memerlukannya.
- `GET /api/kontainer/tindak-lanjut?status=menunggu&page=1`: superadmin, LPS, dan petugas truk melihat seluruh antrean. Status opsional menunggu/diproses/selesai, 50 hasil per halaman. Memuat jenis_laporan, pemohon LPS, nama_petugas_truk, serta dikonfirmasi_at.
- `PATCH /api/kontainer/tindak-lanjut/:id`: hanya petugas_truk saat modul aktif. Body respon wajib diangkut/dibersihkan, nama_petugas wajib, catatan_admin opsional. Keduanya menutup laporan sebagai selesai, dengan respon_truk yang tersimpan terpisah. Diangkut menghasilkan kondisi kosong; dibersihkan menghasilkan kondisi bersih. Body tidak memerlukan status atau kondisi_setelah. Konfirmasi ulang pada laporan yang selesai menghasilkan 409. Field catatan_admin dipertahankan untuk kompatibilitas dan menyimpan catatan petugas truk.
- `GET /api/kontainer/tindak-lanjut/:id/konfirmasi?page=1`: riwayat nama petugas, status, catatan, kondisi akhir, dan waktu setiap konfirmasi. Akses superadmin/LPS/truk; 50 hasil per halaman.

Antrean dan konfirmasi ditampilkan di aplikasi. Tidak mengirim pesan melalui layanan eksternal. Superadmin tetap mengelola periode modul serta data induk, tetapi tidak mengonfirmasi penanganan truk.
Indeks unik open_unit mencegah dua permintaan menunggu/diproses pada unit yang sama, termasuk saat ada permintaan bersamaan.
Konfirmasi menulis kondisi kosong/bersih sesuai respons truk ke riwayat monitoring dalam transaksi yang sama dengan penutupan antrean dan pencatatan kontainer_konfirmasi. Kegagalan salah satu operasi membatalkan seluruh konfirmasi. GET status=menunggu mencakup data menunggu dan diproses lama; riwayat lama tetap dipertahankan.
API unit/publik menyertakan status_tindak_lanjut dan diminta_at untuk penanda peta, tanpa identitas pemohon dan catatan admin.
GPS diproses di frontend. Backend tidak menerima atau menyimpan koordinat HP.
# Pembaruan realtime

Socket.IO mengirim sinyal tanpa payload setelah mutasi kontainer sukses. Panduan
deploy Apache/VPS dan batasan satu proses ada di [kontainer-realtime-vps.md](kontainer-realtime-vps.md).

