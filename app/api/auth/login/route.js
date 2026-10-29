import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req) {
  try {
    await ensureTables();
    const { email, password } = await req.json();
    const [rows] = await pool.execute(
      "SELECT id, name, email, password FROM users WHERE email = ?",
      [(email || "").toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { error: "Something went wrong on the server. Please try again later." },
      { status: 500 }
    );
  }
}