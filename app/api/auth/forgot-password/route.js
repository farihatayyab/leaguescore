import { NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { createResetToken } from "@/lib/passwordReset";
import { sendMail, mailConfigured } from "@/lib/mailer";
import { resetPasswordEmail } from "@/lib/emailTemplates";
import { normalizeEmail, validateEmail } from "@/lib/validators";
import { limited, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Hamesha yahi jawab: email registered ho ya na ho, response bilkul same hota hai
const GENERIC = "If an account exists for that email, we've sent a password reset link. Please check your inbox (and spam folder).";

async function deliver(user) {
  const { link, minutes } = await createResetToken(user.id);
  if (!mailConfigured()) {
    console.error("[forgot-password] EMAIL NOT SENT: SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env and restart `npm run dev`.");
    if (process.env.NODE_ENV !== "production") console.log(`[forgot-password] DEV reset link for ${user.email}:\n${link}`);
    return;
  }
  const mail = resetPasswordEmail({ name: user.name, link, minutes });
  const info = await sendMail({ to: user.email, ...mail });
  console.log(`[forgot-password] SMTP accepted mail for user #${user.id}: accepted=${JSON.stringify(info.accepted)} response="${info.response}"`);
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = normalizeEmail(body?.email);
  const bad = validateEmail(email); // sirf format check, registered hai ya nahi ye nahi batata
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  if (limited(`forgot:ip:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }
  // Ek email par spam rokne ke liye: limit cross ho to chupchap wahi generic jawab (mail nahi jati)
  if (limited(`forgot:em:${email}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ message: GENERIC });
  }

  try {
    await ensureTables();
    const [rows] = await pool.execute("SELECT id, name, email FROM users WHERE email = ?", [email]);
    if (rows[0]) {
      // await nahi: mail bhejne ka waqt response mein nazar na aaye (timing se email registered hone ka pata na chale)
      deliver(rows[0]).catch((e) => console.error("[forgot-password] EMAIL FAILED:", e?.code || "", e?.responseCode || "", e?.message || e));
    }
  } catch (err) {
    console.error("forgot-password error:", err);
  }
  return NextResponse.json({ message: GENERIC });
}