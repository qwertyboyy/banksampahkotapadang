# SMTP OTP melalui Zimbra Padang

OTP registrasi dan reset password memakai backend/services/emailService.js.
Konfigurasi development, staging, dan production disiapkan untuk akun domain resmi pada mail.padang.go.id port 587 STARTTLS.

Isi **password SMTP baru yang sudah dirotasi** langsung pada SMTP_PASS di backend/.env.development untuk uji lokal dan backend/.env.production pada VPS. Jangan kirim password lewat chat atau commit ke Git.

```dotenv
SMTP_HOST=mail.padang.go.id
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dislingkunganhidup@padang.go.id
SMTP_PASS=ISI_PASSWORD_BARU_SECARA_LOKAL
EMAIL_FROM_ADDRESS=dislingkunganhidup@padang.go.id
EMAIL_FROM_NAME="Dinas Lingkungan Hidup Kota Padang"
EMAIL_REPLY_TO=dislingkunganhidup@padang.go.id
```

Aplikasi juga menerima SMTP_SECURITY=STARTTLS, SMTP_PASSWORD dan FROM_NAME untuk kompatibilitas konfigurasi Python lama. SMTP_VERIFY_SSL=false sengaja tidak dipakai karena menonaktifkan pemeriksaan identitas server. Jika sertifikat menggunakan CA internal, minta file PEM dari pengelola server dan set SMTP_CA_FILE ke path file tersebut. Backend tetap memeriksa sertifikat dan nama host.

Dari folder backend, jalankan `npm.cmd run smtp:verify` pada Windows atau `npm run smtp:verify` pada Linux. Perintah hanya menguji koneksi dan login; belum mengirim email. Restart backend setelah mengubah environment. Untuk uji pengiriman, minta OTP baru lewat aplikasi dan periksa pengirim serta waktu email yang diterima.

Kesalahan EAUTH berarti server menolak akun atau password. Kesalahan sertifikat/TLS memerlukan pemeriksaan CA atau nama host oleh pengelola mail. Jangan gunakan password yang pernah dikirim di percakapan; rotasi dulu pada server Zimbra, lalu pasang yang baru di environment lokal dan VPS.

Perubahan SMTP ini tidak memerlukan migrasi database tambahan.
