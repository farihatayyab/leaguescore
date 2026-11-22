import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { ensureTvTables, syncSource, deleteSource } from "@/lib/tvguide";

export const maxDuration = 300; // bari EPG file ke liye

const deny = () => NextResponse.json({ error: "Admin only." }, { status: 403 });

// http(s) link ya local file ka path (C:\epg\guide.xml) — sirf .xml / .xml.gz / .gz
function cleanUrl(u) {
  const t = String(u || "").trim().replace(/^"|"$/g, "");
  if (/^https?:\/\//i.test(t)) {
    try {
      return new URL(t).toString().slice(0, 1000);
    } catch {
      return null;
    }
  }
  if (/^(file:\/\/\/|[a-zA-Z]:[\\/]|\/)/.test(t) && /\.(xml|gz)$/i.test(t)) return t.slice(0, 1000);
  return null;
}

// Naya EPG link add karo (aur foran data le aao)
export async function POST(req) {
  if (!(await getAdmin())) return deny();
  await ensureTvTables();
  const b = await req.json();
  const url = cleanUrl(b.url);
  if (!url) return NextResponse.json({ error: "Enter a valid http(s) link or the path of a local .xml / .xml.gz file." }, { status: 400 });
  const [ex] = await pool.query("SELECT id FROM tv_sources WHERE url = ?", [url]);
  if (ex.length) return NextResponse.json({ error: "This link has already been added." }, { status: 409 });
  const name = String(b.name || "").trim().slice(0, 120) || "TV Guide";
  const [ins] = await pool.query("INSERT INTO tv_sources (name, url) VALUES (?, ?)", [name, url]);
  syncSource(ins.insertId).catch(() => {}); // background me chalta hai
  return NextResponse.json({ ok: true, id: ins.insertId, started: true });
}

// { id, action: "sync" } | { id, active: bool } | { id, name, url }
export async function PUT(req) {
  if (!(await getAdmin())) return deny();
  await ensureTvTables();
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  if (b.action === "sync") {
    syncSource(id).catch(() => {});
    return NextResponse.json({ ok: true, started: true });
  }
  if (typeof b.active === "boolean") {
    await pool.query("UPDATE tv_sources SET active = ? WHERE id = ?", [b.active ? 1 : 0, id]);
    return NextResponse.json({ ok: true });
  }
  const url = cleanUrl(b.url);
  const name = String(b.name || "").trim().slice(0, 120);
  if (!url || !name) return NextResponse.json({ error: "A name and a valid link are required." }, { status: 400 });
  await pool.query("UPDATE tv_sources SET name = ?, url = ? WHERE id = ?", [name, url, id]);
  syncSource(id).catch(() => {});
  return NextResponse.json({ ok: true, started: true });
}

export async function DELETE(req) {
  if (!(await getAdmin())) return deny();
  await ensureTvTables();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  try {
    await deleteSource(id);
  } catch (e) {
    return NextResponse.json({ error: `Could not delete: ${e.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}