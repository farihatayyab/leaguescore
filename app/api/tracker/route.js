import { NextResponse } from "next/server";
import { fetchTracker, isSport } from "@/lib/sportscore";

// Live tracker data (server-side cache 60s) - browser seedha SportScore ko call nahi karta
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const sport = p.get("sport") || "football";
  const slug = p.get("slug") || "";
  if (!isSport(sport) || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  return NextResponse.json({ tracker: await fetchTracker(sport, slug) });
}
