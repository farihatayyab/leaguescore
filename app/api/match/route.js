import { NextResponse } from "next/server";
import { getMatch } from "@/lib/data";
import { isSport } from "@/lib/sportscore";

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const sport = p.get("sport") || "football";
  const slug = p.get("slug") || "";
  if (!isSport(sport) || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const match = await getMatch(sport, slug);
  return NextResponse.json({ match });
}
