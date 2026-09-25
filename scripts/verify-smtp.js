import { emailSettings, verifyEmailConnection } from "../services/emailService.js";
let settings;
try {
  settings = emailSettings();
} catch (err) {
  console.error("Konfigurasi SMTP tidak valid:", err.message);
  process.exit(1);
}
console.log(`Menguji ${settings.transport.host}:${settings.transport.port} sebagai ${settings.transport.auth.user}; From: ${settings.from.address}`);
const timeout = setTimeout(() => {
  console.error("SMTP tidak merespons dalam 15 detik. Periksa koneksi ke host dan port SMTP.");
  process.exit(1);
}, 15000);
try {
  await verifyEmailConnection();
  console.log("Koneksi dan login SMTP berhasil. Alamat From dan masuknya email ke inbox belum diuji.");
} catch (err) {
  const code = err.code || "CONFIG_ERROR";
  console.error(`Verifikasi SMTP gagal: ${code}${err.responseCode ? ` (SMTP ${err.responseCode})` : ""}`);
  if (code === "EAUTH") console.error("Akun SMTP atau App Password ditolak oleh server SMTP. Pastikan host sesuai dengan akun dan App Password dibuat untuk akun itu.");
  else if (["ETIMEDOUT", "ECONNECTION", "ENETUNREACH", "EACCES"].includes(code)) console.error("Koneksi ke server SMTP terhalang atau host/port salah. Periksa firewall/VPN dan coba port 587 dengan STARTTLS.");
  else if (["ESOCKET", "ETLS"].includes(code)) console.error("Periksa sertifikat TLS, host SMTP, dan jaringan. Jangan menonaktifkan verifikasi sertifikat.");
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
