import { NextResponse } from "next/server";
import { recordViolation, clientIp } from "@/lib/apiGuard";

// Embed widget yahan beacon bhejta hai jab attribution hide / delete mili.
// sendBeacon text/plain bhejta hai (preflight nahi), isliye body ko text se parse karte hain.
const hits = new Map(); // ip -> { n, reset }  (log flooding rokne ke liye: 30 / ghanta)

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) hits.set(ip, { n: 1, reset: now + 3_600_000 });
  else if (++h.n > 30) return new NextResponse(null, { status: 204, headers: CORS });

  let body = {};
  try {
    body = JSON.parse(await req.text());
  } catch {}
  await recordViolation(req, {
    reason: String(body.reason || "unknown").replace(/[^a-z0-9_-]/gi, "").slice(0, 60) || "unknown",
    pageUrl: typeof body.page === "string" ? body.page : "",
    rawKey: typeof body.key === "string" ? body.key.slice(0, 80) : "",
  });
  return new NextResponse(null, { status: 204, headers: CORS });
}
