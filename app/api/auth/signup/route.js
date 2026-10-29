import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req) {
  try {
    await ensureTables();
    const { name, email, password, newsletter } = await req.json();

    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || (password || "").length < 6) {
      return NextResponse.json(
        { error: "Please enter your name, a valid email and a password of at least 6 characters." },
        { status: 400 }
      );
    }

    const mail = email.toLowerCase();
    const [exists] = await pool.execute("SELECT id FROM users WHERE email = ?", [mail]);
    if (exists.length) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password, newsletter) VALUES (?, ?, ?, ?)",
      [name.trim(), mail, hash, newsletter ? 1 : 0]
    );

    await createSession(result.insertId);
    return NextResponse.json({ user: { name: name.trim(), email: mail } });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong on the server. Please try again later." },
      { status: 500 }
    );
  }
}