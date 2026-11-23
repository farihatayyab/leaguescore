import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/passwordReset";
import { sendMail, mailConfigured } from "@/lib/mailer";
import { passwordChangedEmail } from "@/lib/emailTemplates";
import { validatePassword } from "@/lib/validators";
import { limited, clientIp } from "@/lib/rateLimit";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";

const INVALID = "This reset link is invalid or has expired. Please request a new one.";

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { token, password, confirmPassword } = body || {};

    if (limited(`reset:ip:${clientIp(req)}`, 15, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
    }
    if (typeof token !== "string" || !token) return NextResponse.json({ error: INVALID }, { status: 400 });

    const problem = validatePassword(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const result = await resetPasswordWithToken(token, password);
    if (!result.ok) return NextResponse.json({ error: INVALID }, { status: 400 });

    await destroySession(); // is browser ka purana login hata do
    if (mailConfigured() && result.user) {
      sendMail({ to: result.user.email, ...passwordChangedEmail({ name: result.user.name }) }).catch((e) =>
        console.error("[reset-password] confirmation mail failed:", e?.message || e)
      );
    }
    return NextResponse.json({ ok: true, message: "Your password has been reset successfully. Please log in with your new password." });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ error: "Something went wrong on the server. Please try again later." }, { status: 500 });
  }
}
