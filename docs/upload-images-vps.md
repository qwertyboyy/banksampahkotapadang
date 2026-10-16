# Upload gambar pada VPS dengan CPU KVM generik

Foto profil dan logo bank sampah diproses dengan Jimp (JavaScript) dan decoder
WebP jSquash (WebAssembly). Backend tidak lagi memuat Sharp atau
binary libvips yang mensyaratkan CPU x86-64-v2. Tidak perlu memasang ImageMagick
atau compiler di VPS. Node.js 22 yang digunakan VPS tetap dapat dipakai.

Input JPEG, PNG, dan WebP dibatasi 2 MB dan 16 megapiksel. Foto JPEG mengikuti
orientasi EXIF. Output PNG 500×500, posisi tengah dengan latar transparan,
tanpa memperbesar gambar kecil. File lama tetap dapat diakses pada URL semula.
WebP animasi diperlakukan sebagai gambar statis.

Decoder dijalankan pada worker, maksimal dua upload diproses bersamaan per
proses backend dan batas waktu 15 detik per gambar. Jika sibuk, API mengembalikan
503 agar pengguna dapat mencoba lagi. Pemrosesan JavaScript bisa lebih lambat
daripada Sharp native; uji upload dari ponsel setelah deploy.

## Deploy

Commit perubahan kode beserta **package.json dan package-lock.json** di lokal,
lalu push ke branch deploy. Workflow yang sudah menjalankan `npm ci` dan restart
PM2 dapat dipakai. Workflow `.github/workflows/deploy.yml` otomatis berjalan saat
push ke main dan dapat diulang melalui Actions → Deploy Backend → Run workflow.
Workflow memasang dependensi, menguji upload tanpa native addon, restart PM2,
lalu memeriksa HTTP backend dan handshake Socket.IO pada port 5000. Deploy
berjalan satu per satu dan berhenti jika ada perubahan file tracked di VPS.
Secret VPS_HOST, VPS_USER, VPS_SSH_KEY yang sudah digunakan tetap dipakai.
Tidak ada migrasi database atau perubahan Apache untuk ini.

Untuk deploy manual setelah perubahan tersedia di Git:

```bash
cd /var/www/banksampahkotapadang
git pull --ff-only origin main
npm ci --include=optional
node --no-addons --test tests/upload-image.test.js
pm2 restart banksampah
pm2 logs banksampah --lines 30
```

Jika Git menolak pull karena perubahan lokal, periksa/simpan perubahan itu
terlebih dahulu. Jangan menimpa package-lock.json VPS secara otomatis.
Pastikan direktori uploads dapat ditulis user PM2 seperti sebelumnya.

Pengujian tanpa native addon memastikan jalur pengolahan gambar tidak bergantung
pada binary Sharp. Verifikasi akhir pada CPU VPS tetap dilakukan setelah deploy.

Referensi:
- https://github.com/jimp-dev/jimp
- https://github.com/jamsinclair/jSquash
