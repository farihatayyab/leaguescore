import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { ensureMessagesTable } from "@/lib/messages";

const deny = () => NextResponse.json({ error: "Admin only." }, { status: 403 });

// { id, read: true/false } ya { all: true } = sab read mark karo
export async function PUT(req) {
  if (!(await getAdmin())) return deny();
  await ensureMessagesTable();
  const b = await req.json();
  if (b.all) {
    await pool.query("UPDATE contact_messages SET is_read = 1 WHERE is_read = 0");
    return NextResponse.json({ ok: true });
  }
  if (!b.id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  await pool.query("UPDATE contact_messages SET is_read = ? WHERE id = ?", [b.read === false ? 0 : 1, Number(b.id)]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!(await getAdmin())) return deny();
  await ensureMessagesTable();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  await pool.query("DELETE FROM contact_messages WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
