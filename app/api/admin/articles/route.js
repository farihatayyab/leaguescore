import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { ensureNewsTables } from "@/lib/news";
import { slugify } from "@/lib/format";

const deny = () => NextResponse.json({ error: "Admin only." }, { status: 403 });

async function uniqueSlug(title) {
  let base = slugify(title).slice(0, 120) || "news";
  if (base === "category") base = "category-news";
  let s = base;
  for (let i = 2; ; i++) {
    const [r] = await pool.query("SELECT 1 FROM news_articles WHERE slug = ?", [s]);
    if (!r.length) return s;
    s = `${base}-${i}`;
  }
}

function clean(b) {
  const title = (b.title || "").trim().slice(0, 255);
  const img = (b.image_url || "").trim().slice(0, 500);
  return {
    title,
    summary: (b.summary || "").trim().slice(0, 500),
    body: b.body || "",
    image_url: /^(https?:\/\/|\/)/.test(img) ? img : "",
    category_id: Number(b.category_id) || null,
    is_top: b.is_top ? 1 : 0,
    is_editor_pick: b.is_editor_pick ? 1 : 0,
    published: b.published === false ? 0 : 1,
  };
}

// ek article (edit form ke liye, body ke sath)
export async function GET(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const id = Number(new URL(req.url).searchParams.get("id"));
  const [rows] = await pool.query("SELECT * FROM news_articles WHERE id = ?", [id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ article: rows[0] });
}

export async function POST(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const d = clean(await req.json());
  if (!d.title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  const slug = await uniqueSlug(d.title);
  await pool.query(
    `INSERT INTO news_articles (title, slug, summary, body, image_url, category_id, is_top, is_editor_pick, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.title, slug, d.summary, d.body, d.image_url, d.category_id, d.is_top, d.is_editor_pick, d.published]
  );
  return NextResponse.json({ ok: true, slug });
}

export async function PUT(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const b = await req.json();
  const d = clean(b);
  if (!b.id || !d.title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  await pool.query(
    `UPDATE news_articles SET title=?, summary=?, body=?, image_url=?, category_id=?, is_top=?, is_editor_pick=?, published=?
     WHERE id=?`,
    [d.title, d.summary, d.body, d.image_url, d.category_id, d.is_top, d.is_editor_pick, d.published, Number(b.id)]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!(await getAdmin())) return deny();
  await ensureNewsTables();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  await pool.query("DELETE FROM news_articles WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}