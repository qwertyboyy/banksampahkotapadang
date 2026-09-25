import test from "node:test";
import assert from "node:assert/strict";
import { emailSettings } from "../services/emailService.js";
const credentials = { SMTP_USER: "account@gmail.com", SMTP_PASS: "test-placeholder" };
test("SMTP login and alias sender are independent", () => {
  const settings = emailSettings({...credentials, EMAIL_FROM_ADDRESS: "alias@example.org", EMAIL_FROM_NAME: "DLH"});
  assert.equal(settings.transport.auth.user, "account@gmail.com");
  assert.deepEqual(settings.from, { name: "DLH", address: "alias@example.org" });
  assert.equal(settings.replyTo,"alias@example.org");
  assert.equal(settings.transport.secure,true);
});
test("port 587 requires STARTTLS and certificate validation", () => {
  const {transport} = emailSettings({...credentials,SMTP_PORT:"587",SMTP_SECURE:"false"});
  assert.equal(transport.requireTLS,true);assert.equal(transport.tls.rejectUnauthorized,true);
  assert.throws(()=>emailSettings({...credentials,SMTP_PORT:"465",SMTP_SECURE:"false"}));
});
test("legacy credentials still work; invalid sender is rejected", () => {
  const settings=emailSettings({EMAIL_USER:"old@example.org",EMAIL_PASS:"test-placeholder"});
  assert.equal(settings.from.address,"old@example.org");
  assert.throws(()=>emailSettings({...credentials,EMAIL_FROM_ADDRESS:"alias@example.org\r\nBcc: injected@example.org"}));
  assert.throws(()=>emailSettings({}));
});

test("changing SMTP account cannot reuse another account's password", () => {
  assert.throws(() => emailSettings({ SMTP_USER: "new@gmail.com", EMAIL_USER: "old@gmail.com", EMAIL_PASS: "old-placeholder" }), /Kredensial/);
  assert.equal(emailSettings({ SMTP_USER: "same@gmail.com", EMAIL_USER: "same@gmail.com", EMAIL_PASS: "same-placeholder" }).transport.auth.user, "same@gmail.com");
});

test("Gmail rejects a password that is not a 16-character App Password", () => {
  assert.throws(() => emailSettings({SMTP_USER:"account@gmail.com",SMTP_PASS:"twelvechars!"}),/16 karakter/);
});

test("Zimbra STARTTLS supports existing environment field names without disabling certificate checks", () => {
  const {transport,from}=emailSettings({ SMTP_HOST:"mail.padang.go.id",SMTP_PORT:"587",SMTP_SECURITY:"STARTTLS",SMTP_USER:"user@padang.go.id",SMTP_PASSWORD:"new-rotated-secret",SMTP_VERIFY_SSL:"false",FROM_NAME:"DLH" });
  assert.equal(transport.secure,false);
  assert.equal(transport.requireTLS,true);
  assert.equal(transport.tls.rejectUnauthorized,true);
  assert.equal(from.address,"user@padang.go.id");
  assert.equal(from.name,"DLH");
});
