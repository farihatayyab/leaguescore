import { NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  try {
    const id = await getUserId();
    if (!id) return NextResponse.json({ user: null });
    await ensureTables();
    const [rows] = await pool.execute("SELECT name, email FROM users WHERE id = ?", [id]);
    return NextResponse.json({ user: rows[0] || null });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ user: null });
  }
}
