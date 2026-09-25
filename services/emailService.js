import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";
import "../config/env.js";

export function emailSettings(env = process.env) {
  const user = env.SMTP_USER || env.EMAIL_USER;
  // Never reuse another account's legacy password after changing SMTP_USER.
  const pass = env.SMTP_PASS || env.SMTP_PASSWORD || ((!env.SMTP_USER || env.SMTP_USER === env.EMAIL_USER) ? env.EMAIL_PASS : undefined);
  const host = env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(env.SMTP_PORT || 465);
  const secure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE === "true"
    : env.SMTP_SECURITY ? env.SMTP_SECURITY.toUpperCase() === "SSL" : port === 465;
  if (!user || !pass) throw new Error("Kredensial SMTP belum dikonfigurasi");
  if (host === "smtp.gmail.com" && user.toLowerCase().endsWith("@gmail.com") && pass.replace(/ /g, "").length !== 16) {
    throw new Error("SMTP_PASS Gmail harus berisi App Password 16 karakter dari akun SMTP_USER");
  }
  if (![465, 587].includes(port) || secure !== (port === 465)) throw new Error("Gunakan SMTP 465 dengan SSL atau 587 dengan STARTTLS");
  const address = env.EMAIL_FROM_ADDRESS || user;
  const replyTo = env.EMAIL_REPLY_TO || address;
  for (const value of [address, replyTo]) {
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value)) throw new Error("Alamat pengirim email tidak valid");
  }
  return {
    transport: {
      host, port, secure, requireTLS: !secure,
      auth: { user, pass },
      tls: {
        minVersion: "TLSv1.2", rejectUnauthorized: true,
        servername: host,
        ...(env.SMTP_CA_FILE ? { ca: readFileSync(env.SMTP_CA_FILE) } : {}),
      },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
      disableFileAccess: true, disableUrlAccess: true,
    },
    from: { name: env.EMAIL_FROM_NAME || env.FROM_NAME || "Bank Sampah DLH Kota Padang", address },
    replyTo,
  };
}

export async function sendEmail({ to, subject, text, html }) {
  const settings = emailSettings();
  const transporter = nodemailer.createTransport(settings.transport);
  // SMTP credentials authenticate the account; From is a separately authorized sender.
  // Diagnose the actual process sending mail without logging OTPs, passwords or recipients.
  console.info("[SMTP] sending", JSON.stringify({
    environment: process.env.NODE_ENV || "development",
    host: settings.transport.host,
    account: settings.transport.auth.user,
    from: settings.from.address,
  }));
  const result = await transporter.sendMail({ from: settings.from, replyTo: settings.replyTo, to, subject, text, html });
  console.info("[SMTP] accepted", JSON.stringify({ messageId: result.messageId }));
  return result;
}

export async function verifyEmailConnection() {
  const settings = emailSettings();
  await nodemailer.createTransport(settings.transport).verify();
}
