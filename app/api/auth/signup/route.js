import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";
import { homeFor } from "@/lib/roles";
import { normalizeEmail, validateEmail, validateName, validatePassword } from "@/lib/validators";
import { limited, clientIp } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const name = String(body?.name ?? "").replace(/\s+/g, " ").trim();
    const email = normalizeEmail(body?.email);
    const password = body?.password;

    const problem = validateName(name) || validateEmail(email) || validatePassword(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    if (limited(`signup:ip:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many sign-ups from this network. Please try again later." }, { status: 429 });
    }

    await ensureTables();
    const [exists] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    let result;
    try {
      // role hamesha 'user': client se role kabhi accept nahi hota. Admin banane ke liye: npm run make-admin
      [result] = await pool.execute(
        "INSERT INTO users (name, email, password, role, newsletter) VALUES (?, ?, ?, 'user', ?)",
        [name, email, hash, body?.newsletter ? 1 : 0]
      );
    } catch (e) {
      if (e?.code === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
      }
      throw e;
    }

    await createSession(result.insertId);
    return NextResponse.json({ user: { name, email, role: "user" }, redirect: homeFor("user") });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong on the server. Please try again later." },
      { status: 500 }
    );
  }
}
