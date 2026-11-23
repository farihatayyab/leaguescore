import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";
import { homeFor } from "@/lib/roles";
import { normalizeEmail, validateEmail } from "@/lib/validators";
import { limited, clientIp } from "@/lib/rateLimit";

// Email na milne par bhi bcrypt chalta hai, taake response time se pata na chale ke email registered hai
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";

    if (validateEmail(email) || !password || password.length > 200) {
      return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
    }
    if (limited(`login:ip:${clientIp(req)}`, 20, 15 * 60 * 1000) || limited(`login:em:${email}`, 8, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
    }

    await ensureTables();
    const [rows] = await pool.execute("SELECT id, name, email, password, role FROM users WHERE email = ?", [email]);
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !ok) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const role = user.role === "admin" ? "admin" : "user";
    await createSession(user.id);
    return NextResponse.json({
      user: { name: user.name, email: user.email, role },
      redirect: homeFor(role),
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { error: "Something went wrong on the server. Please try again later." },
      { status: 500 }
    );
  }
}
