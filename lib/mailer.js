import nodemailer from "nodemailer";

// SMTP settings .env se (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM)
// .env values ke aas-paas ke quotes / spaces hata deta hai (Google App Password "abcd efgh ijkl mnop" format mein deta hai)
const env = (k) => String(process.env[k] ?? "").trim().replace(/^["']|["']$/g, "").trim();

let transporter;
export function mailConfigured() {
  return !!(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASSWORD"));
}

function getTransport() {
  if (transporter) return transporter;
  const port = Number(env("SMTP_PORT") || 587);
  const secure = env("SMTP_SECURE").toLowerCase() === "true" || port === 465;
  const host = env("SMTP_HOST");
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: env("SMTP_USER"),
      // Gmail App Password mein spaces nahi chahiye
      pass: /gmail\.com$/i.test(host) ? env("SMTP_PASSWORD").replace(/\s+/g, "") : env("SMTP_PASSWORD"),
    },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  if (!mailConfigured()) throw new Error("SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env and restart the server)");
  const user = env("SMTP_USER");
  const from = env("EMAIL_FROM") || `"LeagueScore" <${user}>`;
  const info = await getTransport().sendMail({ from, to, subject, html, text });
  // accepted = SMTP server ne email le li; rejected = server ne mana kar diya
  if (info.rejected?.length) throw new Error(`SMTP rejected recipient(s): ${info.rejected.join(", ")}`);
  return info;
}