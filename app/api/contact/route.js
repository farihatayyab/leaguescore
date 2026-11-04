import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureMessagesTable } from "@/lib/messages";

// Spam rokne ke liye: ek IP se 1 ghante mein 5 messages (memory mein; server restart par reset)
const g = globalThis;
g.contactHits ||= new Map();
const WINDOW = 60 * 60 * 1000;
const MAX_HITS = 5;

function limited(ip) {
  const now = Date.now();
  const hits = (g.contactHits.get(ip) || []).filter((t) => now - t < WINDOW);
  if (hits.length >= MAX_HITS) return true;
  hits.push(now);
  g.contactHits.set(ip, hits);
  if (g.contactHits.size > 2000) g.contactHits.clear();
  return false;
}

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // honeypot bhara ho to bot hai: chupchap "ok" bol do, save mat karo
  if (body.website) return NextResponse.json({ ok: true, message: "Thank you! Your message has been sent." });

  const kind = body.kind === "feedback" ? "feedback" : "contact";
  const name = clean(body.name, 100);
  const email = clean(body.email, 190);
  const subject = clean(body.subject, 150);
  const category = clean(body.category, 60);
  const message = String(body.message ?? "").replace(/\r/g, "").trim().slice(0, 4000);

  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (email ? !EMAIL_RE.test(email) : kind === "contact") {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (kind === "contact" && !subject) return NextResponse.json({ error: "Please enter a subject." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Your message is too short." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  try {
    await ensureMessagesTable();
    await pool.execute(
      "INSERT INTO contact_messages (kind, name, email, subject, category, message, ip) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [kind, name, email, subject, category, message, ip.slice(0, 64)]
    );
  } catch (e) {
    console.error("contact save failed:", e.message);
    return NextResponse.json({ error: "Could not save your message right now. Please try again later." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: kind === "feedback" ? "Thank you for your feedback!" : "Thank you! We have received your message and will reply by email.",
  });
}
