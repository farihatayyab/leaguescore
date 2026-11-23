// SMTP test: asli error dikhata hai (galat password, blocked login, wrong port, waghera).
// Usage:  npm run test-mail -- apni@gmail.com
import nodemailer from "nodemailer";

const env = (k) => String(process.env[k] ?? "").trim().replace(/^["']|["']$/g, "").trim();
const to = process.argv[2] || env("SMTP_USER");
const host = env("SMTP_HOST"), user = env("SMTP_USER");
const port = Number(env("SMTP_PORT") || 587);
const pass = /gmail\.com$/i.test(host) ? env("SMTP_PASSWORD").replace(/\s+/g, "") : env("SMTP_PASSWORD");

console.log({ host, port, user, passwordSet: !!pass, passwordLength: pass.length, from: env("EMAIL_FROM") || `(SMTP_USER) ${user}`, to });
if (!host || !user || !pass) {
  console.error("\nSMTP_HOST / SMTP_USER / SMTP_PASSWORD .env mein khali hain. Bharo, phir dobara chalao.");
  process.exit(1);
}
if (/gmail\.com$/i.test(host) && pass.length !== 16) console.warn("\nWARNING: Gmail App Password 16 characters ka hota hai (spaces ke baghair). Normal Gmail password kaam nahi karta.\n");

const secure = env("SMTP_SECURE").toLowerCase() === "true" || port === 465;
const t = nodemailer.createTransport({ host, port, secure, requireTLS: !secure, auth: { user, pass }, connectionTimeout: 15000 });
try {
  await t.verify();
  console.log("1) SMTP login OK");
  const info = await t.sendMail({
    from: env("EMAIL_FROM") || `"LeagueScore" <${user}>`,
    to,
    subject: "LeagueScore SMTP test",
    text: "Agar ye email mil gayi to SMTP settings sahi hain.",
  });
  console.log("2) Bhej di:", { accepted: info.accepted, rejected: info.rejected, response: info.response });
  console.log("\nInbox aur Spam dono dekho:", to);
} catch (e) {
  console.error("\nFAILED:", e.code || "", e.responseCode || "", e.message);
  if (e.responseCode === 535 || /Invalid login|Username and Password not accepted/i.test(e.message))
    console.error("-> Password galat. Gmail ke liye: Google Account -> Security -> 2-Step Verification ON -> App passwords se naya 16-char password banao.");
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ESOCKET/.test(e.code || e.message))
    console.error("-> Server tak connection nahi bana: SMTP_HOST/SMTP_PORT check karo (Gmail: smtp.gmail.com, 587, SMTP_SECURE=false) ya firewall/antivirus/VPN.");
  process.exit(1);
}