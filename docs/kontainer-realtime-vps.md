# Realtime kontainer di VPS

Backend menjalankan Express dan Socket.IO pada port yang sama (default 5000).
Namespace `/kontainer`, transport path `/socket.io/`. Browser memakai origin dari
`VITE_API_URL`, sama dengan API. Tidak perlu port publik tambahan.

Setiap POST/PUT/PATCH/DELETE kontainer yang sukses mengirim `kontainer:changed`
tanpa payload. Transaksi selesai sebelum respons sukses. Browser mengambil ulang
data lewat API; autentikasi dan pembatasan role tetap di API. Tidak ada event socket
untuk menulis laporan. Nama petugas dan catatan tidak disiarkan melalui socket.

Browser mengambil ulang data setelah tersambung/reconnect, kembali ke tab, dan
setiap 30 detik sebagai cadangan. Perubahan tanggal mulai/akhir otomatis terdeteksi
oleh pemeriksaan cadangan (maksimal sekitar 30 detik pada tab aktif).

## Deploy

1. Unggah perubahan backend dan frontend beserta package-lock.json masing-masing.
2. Di direktori backend: `npm ci --omit=dev`. Restart service backend yang sudah
   digunakan (PM2 atau systemd) dengan NODE_ENV=production. Gunakan **satu proses**
   backend/fork mode untuk implementasi ini.
3. Di frontend, pastikan `.env.production` berisi URL API HTTPS yang benar, misalnya:

   ```dotenv
   VITE_API_URL=https://api.banksampah.dlh.padang.go.id
   ```

   Jalankan `npm ci` lalu `npm run build`, dan pasang isi `dist` pada document root
   frontend seperti deployment sebelumnya. Variabel Vite ditanam saat build.
4. Untuk Apache **2.4.47 atau lebih baru**, aktifkan modul proxy. Perintah berikut
   untuk Ubuntu/Debian; cek versi dengan `apache2 -v`:

   ```bash
   sudo a2enmod proxy proxy_http
   ```

   Tambahkan blok berikut **di dalam VirtualHost HTTPS domain API** (port 443),
   sebelum aturan `ProxyPass / ...` jika ada. Pertahankan konfigurasi SSL dan API
   yang sudah ada. Sesuaikan port jika backend tidak memakai 5000:

   ```apache
   ProxyRequests Off
   ProxyTimeout 75
   ProxyPass "/socket.io/" "http://127.0.0.1:5000/socket.io/" upgrade=websocket timeout=75
   ProxyPassReverse "/socket.io/" "http://127.0.0.1:5000/socket.io/"
   ```

   Path ini melayani HTTP polling sekaligus upgrade WebSocket. Pasang di konfigurasi
   VirtualHost, bukan `.htaccess`. Jika Apache lebih lama dari 2.4.47, gunakan
   `proxy_wstunnel` dan `rewrite` dengan konfigurasi berikut sebagai pengganti:

   ```bash
   sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
   ```

   ```apache
   ProxyRequests Off
   ProxyTimeout 75
   RewriteEngine On
   RewriteCond %{HTTP:Upgrade} websocket [NC]
   RewriteCond %{HTTP:Connection} upgrade [NC]
   RewriteRule ^/?socket\.io/(.*)$ ws://127.0.0.1:5000/socket.io/$1 [P,L]
   ProxyPass "/socket.io/" "http://127.0.0.1:5000/socket.io/" timeout=75
   ProxyPassReverse "/socket.io/" "http://127.0.0.1:5000/socket.io/"
   ```

5. Jalankan `sudo apache2ctl configtest`. Jika hasilnya `Syntax OK`, jalankan
   `sudo systemctl restart apache2` saat pertama mengaktifkan modul; untuk perubahan
   VirtualHost berikutnya cukup `sudo systemctl reload apache2`. Pada RHEL/AlmaLinux,
   nama binary/service umumnya `httpd`; aktifkan modul lewat konfigurasi distribusi.
6. Buka dashboard publik dan akun LPS/truk pada browser terpisah. Kirim laporan,
   pastikan warna berubah di browser lain tanpa refresh, lalu konfirmasi penanganan.
   Uji juga toggle modul, restart backend/reconnect, dan koneksi ponsel.

Origin frontend harus tercantum pada `allowedOrigins` di backend/app.js. Saat ini
domain produksi yang didukung adalah `https://banksampah.dlh.padang.go.id`.
Jika domain VPS berbeda, perbarui allowlist dan build URL API sesuai domain aktual.

Untuk diagnosis handshake:

```bash
curl 'https://api.banksampah.dlh.padang.go.id/socket.io/?EIO=4&transport=polling'
```

Respons yang benar diawali `0` dan JSON berisi `sid`. Di DevTools Network,
koneksi WebSocket yang berhasil upgrade mendapat status 101. Jika upgrade gagal,
Socket.IO dapat tetap bekerja lewat HTTP polling; pastikan akhirnya transport
WebSocket berfungsi pada uji VPS.

Beberapa worker/PM2 cluster memerlukan shared adapter (misalnya Redis) dan sticky
sessions untuk HTTP polling. Jangan menambah jumlah worker tanpa konfigurasi itu.
Perubahan langsung melalui SQL tidak memicu event; pemeriksaan 30 detik tetap
mengambil kondisi terbaru.

Referensi: https://socket.io/docs/v4/reverse-proxy/
dan https://socket.io/docs/v4/using-multiple-nodes/
serta https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html
