import { NextResponse } from "next/server";
import { getMatches, getMatchesByDate } from "@/lib/data";
import { resolveDate } from "@/lib/format";
import { isSport } from "@/lib/sportscore";

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const sport = p.get("sport") || "football";
  if (!isSport(sport)) return NextResponse.json({ error: "Unknown sport" }, { status: 400 });

  const date = p.get("date");
  let matches = date ? (await getMatchesByDate(sport, resolveDate(date))).matches : await getMatches(sport);
  if (p.get("live") === "1") matches = matches.filter((m) => m.live);
  return NextResponse.json({ matches });
}