import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { ensureNewsTables } from "@/lib/news";
import { slugify } from "@/lib/format";

const deny = () => NextResponse.json({ error: "Admin only." }, { status: 403 });

export async function POST(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const { name } = await req.json();
  const n = (name || "").trim().slice(0, 80);
  if (!n) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const slug = slugify(n) || "category";
  const [ex] = await pool.query("SELECT id FROM news_categories WHERE slug = ?", [slug]);
  if (ex.length) return NextResponse.json({ error: "This category already exists." }, { status: 409 });
  const [mx] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM news_categories");
  await pool.query("INSERT INTO news_categories (name, slug, sort_order) VALUES (?, ?, ?)", [n, slug, mx[0].n]);
  return NextResponse.json({ ok: true });
}

// { id, name } = rename   |   { order: [id, id, ...] } = naya order
export async function PUT(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const body = await req.json();
  if (Array.isArray(body.order)) {
    for (let i = 0; i < body.order.length; i++) {
      await pool.query("UPDATE news_categories SET sort_order = ? WHERE id = ?", [i, Number(body.order[i])]);
    }
    return NextResponse.json({ ok: true });
  }
  const n = (body.name || "").trim().slice(0, 80);
  if (!body.id || !n) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  await pool.query("UPDATE news_categories SET name = ? WHERE id = ?", [n, Number(body.id)]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  await pool.query("UPDATE news_articles SET category_id = NULL WHERE category_id = ?", [id]);
  await pool.query("DELETE FROM news_categories WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}