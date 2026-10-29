import { pool } from "./db";

let ready;
export function ensureNewsTables() {
  ready ||= (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news_categories (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(80) NOT NULL,
        slug       VARCHAR(100) NOT NULL UNIQUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news_articles (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        title          VARCHAR(255) NOT NULL,
        slug           VARCHAR(200) NOT NULL UNIQUE,
        summary        VARCHAR(500) NOT NULL DEFAULT '',
        body           MEDIUMTEXT,
        image_url      VARCHAR(500) NOT NULL DEFAULT '',
        category_id    INT NULL,
        is_top         TINYINT(1) NOT NULL DEFAULT 0,
        is_editor_pick TINYINT(1) NOT NULL DEFAULT 0,
        published      TINYINT(1) NOT NULL DEFAULT 1,
        views          INT NOT NULL DEFAULT 0,
        created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_cat (category_id),
        KEY idx_created (created_at)
      )`);
    const [c] = await pool.query("SELECT COUNT(*) AS n FROM news_categories");
    if (!c[0].n) {
      const defaults = ["Football", "Tennis", "Cricket", "Basketball"];
      for (let i = 0; i < defaults.length; i++) {
        await pool.query("INSERT INTO news_categories (name, slug, sort_order) VALUES (?, ?, ?)", [
          defaults[i],
          defaults[i].toLowerCase(),
          i,
        ]);
      }
    }
  })();
  return ready;
}

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const COLS = `a.id, a.title, a.slug, a.summary, a.image_url, a.category_id, a.is_top, a.is_editor_pick,
  a.published, a.views, a.created_at, c.name AS cat_name, c.slug AS cat_slug`;
const FROM = `FROM news_articles a LEFT JOIN news_categories c ON c.id = a.category_id`;
const norm = (r) => ({ ...r, created_at: new Date(r.created_at).toISOString() });

async function list(where = "1=1", params = [], limit = 12, order = "a.created_at DESC") {
  const [rows] = await pool.query(
    `SELECT ${COLS} ${FROM} WHERE a.published = 1 AND ${where} ORDER BY ${order} LIMIT ?`,
    [...params, limit]
  );
  return rows.map(norm);
}

export async function getCategories() {
  await ensureNewsTables();
  const [rows] = await pool.query("SELECT id, name, slug, sort_order FROM news_categories ORDER BY sort_order, id");
  return rows;
}

export async function getMostRead(limit = 5) {
  await ensureNewsTables();
  return list("1=1", [], limit, "a.views DESC, a.created_at DESC");
}

export async function getHome() {
  const cats = await getCategories();
  let top = await list("a.is_top = 1", [], 4);
  if (!top.length) top = await list("1=1", [], 4);
  const byCat = (
    await Promise.all(cats.map(async (cat) => ({ cat, items: await list("a.category_id = ?", [cat.id], 4) })))
  ).filter((x) => x.items.length);
  const more = await list("1=1", [], 12);
  const editors = await list("a.is_editor_pick = 1", [], 4);
  const mostRead = await getMostRead(5);
  return { cats, top, byCat, more, editors, mostRead };
}

export async function getCategoryPage(slug, limit = 25) {
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return null;
  const rows = await list("a.category_id = ?", [cat.id], limit + 1);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  // "Top News" tick wali news hero banegi, warna sab se nayi
  const hero = items.find((a) => a.is_top) || items[0] || null;
  const rest = hero ? items.filter((a) => a.id !== hero.id) : [];
  return { cats, cat, hero, rest, hasMore, mostRead: await getMostRead(5) };
}

// /news/all: sab published news (page by page) + har category me kitni news hain
export async function getAllNewsPage(limit = 25) {
  const cats = await getCategories();
  const rows = await list("1=1", [], limit + 1);
  const [cnt] = await pool.query(
    "SELECT category_id, COUNT(*) AS n FROM news_articles WHERE published = 1 GROUP BY category_id"
  );
  const counts = Object.fromEntries(cnt.map((r) => [r.category_id, Number(r.n)]));
  return {
    cats: cats.map((c) => ({ ...c, n: counts[c.id] || 0 })),
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    mostRead: await getMostRead(5),
  };
}

export async function searchNews(q) {
  await ensureNewsTables();
  const like = `%${q}%`;
  return list("(a.title LIKE ? OR a.summary LIKE ?)", [like, like], 40);
}

export async function getArticle(slug) {
  await ensureNewsTables();
  const [rows] = await pool.query(
    `SELECT a.*, c.name AS cat_name, c.slug AS cat_slug ${FROM} WHERE a.slug = ? AND a.published = 1`,
    [slug]
  );
  return rows[0] ? norm(rows[0]) : null;
}

export async function bumpViews(id) {
  await pool.query("UPDATE news_articles SET views = views + 1 WHERE id = ?", [id]);
}

// admin: sab articles (unpublished bhi)
export async function adminArticles() {
  await ensureNewsTables();
  const [rows] = await pool.query(`SELECT ${COLS} ${FROM} ORDER BY a.created_at DESC LIMIT 200`);
  return rows.map(norm);
}

export async function adminStats() {
  await ensureNewsTables();
  const [[t]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(published = 1), 0) AS published,
            COALESCE(SUM(published = 0), 0) AS drafts,
            COALESCE(SUM(views), 0) AS views
     FROM news_articles`
  );
  const [[c]] = await pool.query("SELECT COUNT(*) AS n FROM news_categories");
  return {
    total: Number(t.total),
    published: Number(t.published),
    drafts: Number(t.drafts),
    views: Number(t.views),
    categories: Number(c.n),
  };
}

export async function adminArticle(id) {
  await ensureNewsTables();
  const [rows] = await pool.query("SELECT * FROM news_articles WHERE id = ?", [Number(id)]);
  const r = rows[0];
  if (!r) return null;
  return {
    ...r,
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
  };
}