import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

export async function GET() {
  try {
    const u = await getCurrentUser();
    if (!u) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { name: u.name, email: u.email, role: u.role, home: homeFor(u.role) } });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ user: null });
  }
}
