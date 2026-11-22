import fs from "node:fs";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { pool } from "./db";
import { TZ, shiftDay } from "./format";
import { createXmltvParser } from "./xmltv.mjs";

export const PROG_PER_PAGE = 20; // channel page par ek page me kitne programmes
const KEEP_DAYS = 7; // aaj se kitne din aage tak ka data rakhna hai
const MAX_BYTES = Number(process.env.TV_EPG_MAX_MB || 2048) * 1024 * 1024;
const REFRESH_HOURS = Number(process.env.TV_REFRESH_HOURS || 6);

const nowTs = () => Math.floor(Date.now() / 1000);

// ---------------------------------------------------------------- tables
let ready;
export function ensureTvTables() {
  ready ||= (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tv_sources (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(120) NOT NULL DEFAULT '',
        url             VARCHAR(1000) NOT NULL,
        active          TINYINT(1) NOT NULL DEFAULT 1,
        last_attempt_at BIGINT NULL,
        last_synced_at  BIGINT NULL,
        last_status     VARCHAR(255) NOT NULL DEFAULT '',
        channel_count   INT NOT NULL DEFAULT 0,
        programme_count INT NOT NULL DEFAULT 0,
        created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tv_channels (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        source_id INT NOT NULL,
        xid       VARCHAR(190) NOT NULL,
        name      VARCHAR(190) NOT NULL,
        icon      VARCHAR(500) NOT NULL DEFAULT '',
        UNIQUE KEY uq_src_xid (source_id, xid),
        KEY idx_name (name)
      ) DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tv_programmes (
        id          BIGINT AUTO_INCREMENT PRIMARY KEY,
        channel_id  INT NOT NULL,
        start_ts    BIGINT NOT NULL,
        stop_ts     BIGINT NOT NULL,
        title       VARCHAR(255) NOT NULL,
        subtitle    VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NULL,
        category    VARCHAR(120) NOT NULL DEFAULT '',
        icon        VARCHAR(500) NOT NULL DEFAULT '',
        KEY idx_ch_start (channel_id, start_ts),
        KEY idx_stop (stop_ts)
      ) DEFAULT CHARSET=utf8mb4`);
  })();
  return ready;
}

// ---------------------------------------------------------------- timezone helpers
function tzOffsetSec(ms, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value])
  );
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / 1000;
}

// "2026-11-21" ka midnight (TZ me) unix seconds me
export function dayStartTs(key) {
  const guess = Date.parse(`${key}T00:00:00Z`) / 1000;
  let ts = guess - tzOffsetSec(guess * 1000, TZ);
  ts = guess - tzOffsetSec(ts * 1000, TZ);
  return ts;
}
export const todayKeyTz = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const tsToIso = (ts) => new Date(ts * 1000).toISOString();

// ---------------------------------------------------------------- sync (XML -> MySQL)
const running = (globalThis.__tvSyncing ||= new Set());
const cancelled = (globalThis.__tvCancel ||= new Set()); // sources whose sync must stop (e.g. being deleted)
const ctls = (globalThis.__tvCtl ||= new Map()); // source id -> AbortController of the running download

const IDLE_SEC = Number(process.env.TV_EPG_IDLE_SEC || 120); // itni der data na aaye to ruk jao
const TIMEOUT_SEC = Number(process.env.TV_EPG_TIMEOUT_SEC || 10800); // kul max waqt (3 ghante)
const BATCH = 20000; // itne programmes jama hone par database me save
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "VLC/3.0.20 LibVLC/3.0.20",
  "Mozilla/5.0 LeagueScore-TVGuide/1.0",
];
const isHttp = (u) => /^https?:\/\//i.test(u);

// URL ya local file ko tukdon me parhta hai, parse karta hai aur har BATCH programmes par onBatch() bulata hai
async function downloadAndParse(url, win, { id, onProgress, onBatch }) {
  const ctl = new AbortController();
  if (id) ctls.set(id, ctl);
  let reason = "";
  let got = 0;
  let idle;
  const stop = (r) => {
    reason = r;
    ctl.abort();
  };
  const total = setTimeout(() => stop(`the ${TIMEOUT_SEC}s total time limit was reached`), TIMEOUT_SEC * 1000);
  const poke = () => {
    clearTimeout(idle);
    idle = setTimeout(() => stop(`no data received from the server for ${IDLE_SEC}s`), IDLE_SEC * 1000);
  };
  const streams = [];
  ctl.signal.addEventListener("abort", () => streams.forEach((s) => s.destroy(new Error("aborted"))));

  try {
    poke();
    let src;
    let gz;
    if (isHttp(url)) {
      // Some EPG servers answer 403 to unknown clients, so retry with a few common User-Agents.
      let res;
      for (const ua of USER_AGENTS) {
        res = await fetch(url, {
          headers: {
            "User-Agent": ua,
            Accept: "application/xml,text/xml,application/gzip,*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br", // compressed data downloads faster
          },
          signal: ctl.signal,
          cache: "no-store",
        });
        if (res.status !== 401 && res.status !== 403) break;
        try { await res.body?.cancel(); } catch {}
      }
      if (!res.ok) {
        throw new Error(
          res.status === 403 || res.status === 401
            ? `The EPG server refused access (HTTP ${res.status}). The link may have expired, hit its download limit, or block servers. Download the file in your browser and add its local path instead.`
            : `The EPG server returned HTTP ${res.status}.`
        );
      }
      src = Readable.fromWeb(res.body);
      gz = /\.gz(\?|$)/i.test(new URL(url).pathname) || `${res.headers.get("content-type") || ""}`.toLowerCase().includes("gzip");
    } else {
      src = fs.createReadStream(url.replace(/^file:\/\/\/?/i, ""));
      gz = /\.gz$/i.test(url);
    }
    streams.push(src);
    let stream = src;
    if (gz) {
      const gunzip = zlib.createGunzip();
      streams.push(gunzip);
      src.on("error", (e) => gunzip.destroy(e));
      stream = src.pipe(gunzip);
    }

    const parser = createXmltvParser(win);
    const dec = new TextDecoder("utf-8");
    for await (const ch of stream) {
      poke();
      got += ch.length;
      if (got > MAX_BYTES) throw new Error(`The EPG file is larger than ${Math.round(MAX_BYTES / 1048576)} MB (raise TV_EPG_MAX_MB in .env)`);
      parser.push(dec.decode(ch, { stream: true }));
      onProgress?.(got);
      if (parser.size() >= BATCH) await onBatch(parser.take());
    }
    if (ctl.signal.aborted) throw new Error("aborted");
    parser.push(dec.decode());
    const last = parser.end();
    await onBatch({ channels: last.channels, programmes: last.programmes });
    return { sawTv: last.sawTv };
  } catch (e) {
    if (ctl.signal.aborted) {
      throw new Error(`Download stopped: ${reason} (${(got / 1048576).toFixed(1)} MB received). The server is too slow — download the file in your browser and add its local path in the admin panel.`);
    }
    throw e;
  } finally {
    if (id) ctls.delete(id);
    clearTimeout(total);
    clearTimeout(idle);
  }
}

// Rows ko chhote batches me insert karo (MySQL max_allowed_packet se bachne ke liye)
async function insertBatched(db, sql, rows, stop) {
  let batch = [];
  let size = 0;
  let total = 0;
  const flush = async () => {
    if (stop?.()) throw new Error("Sync cancelled");
    if (!batch.length) return;
    await db.query(sql, [batch]);
    total += batch.length;
    batch = [];
    size = 0;
  };
  for (const r of rows) {
    batch.push(r);
    size += r.reduce((a, v) => a + (typeof v === "string" ? v.length * 2 : 8), 40);
    if (batch.length >= 500 || size > 300_000) await flush();
  }
  await flush();
  return total;
}

const CH_SQL = "INSERT IGNORE INTO tv_channels (source_id, xid, name, icon) VALUES ?";
const PR_SQL = "INSERT INTO tv_programmes (channel_id, start_ts, stop_ts, title, subtitle, description, category, icon) VALUES ?";

// db = pool ya transaction wali connection. chIds: xid -> channel id (cache)
async function saveBatch(db, id, chIds, { channels, programmes }) {
  const stop = () => cancelled.has(id);
  if (channels.length) await insertBatched(db, CH_SQL, channels.map((c) => [id, c.xid, c.name, c.icon]), stop);
  const declared = new Set(channels.map((c) => c.xid));
  const missing = [...new Set([...declared, ...programmes.map((p) => p.xid)])].filter((x) => !chIds.has(x));
  if (missing.length) {
    const undeclared = missing.filter((x) => !declared.has(x));
    if (undeclared.length) await insertBatched(db, CH_SQL, undeclared.map((x) => [id, x, x, ""]), stop);
    for (let i = 0; i < missing.length; i += 1000) {
      const [rows] = await db.query("SELECT id, xid FROM tv_channels WHERE source_id = ? AND xid IN (?)", [id, missing.slice(i, i + 1000)]);
      for (const r of rows) chIds.set(r.xid, r.id);
    }
  }
  function* rows() {
    for (const p of programmes) {
      const cid = chIds.get(p.xid);
      if (cid) yield [cid, p.start, p.stop, p.title, p.subtitle, p.description, p.category, p.icon];
    }
  }
  return insertBatched(db, PR_SQL, rows(), stop);
}

export async function syncSource(id) {
  await ensureTvTables();
  id = Number(id);
  if (running.has(id)) return { ok: false, error: "A sync for this source is already running." };
  const [[src]] = await pool.query("SELECT * FROM tv_sources WHERE id = ?", [id]);
  if (!src) return { ok: false, error: "Source not found." };

  cancelled.delete(id);
  running.add(id);
  const setStatus = (t) => pool.query("UPDATE tv_sources SET last_status = ? WHERE id = ?", [t, id]).catch(() => {});
  await pool.query("UPDATE tv_sources SET last_attempt_at = ?, last_status = 'syncing: downloading…' WHERE id = ?", [nowTs(), id]);

  // Pehli baar (koi data nahi): data download ke saath saath save hota hai, to website par jaldi dikhne lagta hai.
  // Dobara sync: purana data tab tak rehta hai jab tak naya poora na aa jaye.
  const progressive = !src.programme_count;
  let conn;
  try {
    const from = dayStartTs(todayKeyTz());
    const to = dayStartTs(shiftDay(todayKeyTz(), KEEP_DAYS));
    const chIds = new Map();
    let saved = 0;
    let mb = 0;
    const all = { channels: [], programmes: [] };

    if (progressive) {
      // pichla adhoora data (agar koi ho) saaf karo
      await pool.query("DELETE p FROM tv_programmes p JOIN tv_channels c ON c.id = p.channel_id WHERE c.source_id = ?", [id]);
      await pool.query("DELETE FROM tv_channels WHERE source_id = ?", [id]);
    }

    let lastMb = -1;
    const { sawTv } = await downloadAndParse(src.url, { from, to }, {
      id,
      onProgress: (n) => {
        mb = Math.floor(n / 1048576);
        if (mb !== lastMb && mb % 5 === 0) {
          lastMb = mb;
          setStatus(`syncing: ${mb} MB downloaded, ${saved} programmes saved…`);
        }
      },
      onBatch: async (b) => {
        if (progressive) {
          saved += await saveBatch(pool, id, chIds, b);
          await pool.query("UPDATE tv_sources SET programme_count = ?, channel_count = ? WHERE id = ?", [saved, chIds.size, id]);
        } else {
          all.channels.push(...b.channels);
          all.programmes.push(...b.programmes);
        }
      },
    });
    if (!sawTv) throw new Error("This does not look like a valid XMLTV/EPG file (no <tv> tag found)");

    if (!progressive) {
      if (!all.channels.length) throw new Error("No channels found in the file");
      await setStatus(`syncing: saving ${all.programmes.length} programmes…`);
      conn = await pool.getConnection();
      await conn.beginTransaction();
      await conn.query("DELETE p FROM tv_programmes p JOIN tv_channels c ON c.id = p.channel_id WHERE c.source_id = ?", [id]);
      await conn.query("DELETE FROM tv_channels WHERE source_id = ?", [id]);
      saved = await saveBatch(conn, id, new Map(), all);
      await conn.commit();
    }

    if (!saved) throw new Error("No programmes found for the next 7 days in this file");
    const [[cnt]] = await pool.query("SELECT COUNT(*) AS n FROM tv_channels WHERE source_id = ?", [id]);
    await pool.query(
      "UPDATE tv_sources SET last_synced_at = ?, last_status = 'ok', channel_count = ?, programme_count = ? WHERE id = ?",
      [nowTs(), cnt.n, saved, id]
    );
    return { ok: true, channels: cnt.n, programmes: saved };
  } catch (e) {
    await conn?.rollback().catch(() => {});
    const msg = (e?.message || "Sync fail").slice(0, 250);
    if (!cancelled.has(id)) await setStatus(`error: ${msg}`);
    return { ok: false, error: msg };
  } finally {
    conn?.release();
    running.delete(id);
  }
}

// Visitors ke liye: data purana ho to background me refresh (page ko rokta nahi)
export async function autoRefresh() {
  try {
    await ensureTvTables();
    const [rows] = await pool.query(
      "SELECT id FROM tv_sources WHERE active = 1 AND (last_attempt_at IS NULL OR last_attempt_at < ?)",
      [nowTs() - REFRESH_HOURS * 3600]
    );
    for (const r of rows) syncSource(r.id).catch(() => {});
  } catch {}
}

// ---------------------------------------------------------------- admin
export async function listSources() {
  await ensureTvTables();
  const [rows] = await pool.query("SELECT * FROM tv_sources ORDER BY id DESC");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    active: !!r.active,
    last_synced_at: r.last_synced_at ? tsToIso(Number(r.last_synced_at)) : null,
    last_status: r.last_status,
    channel_count: r.channel_count,
    programme_count: r.programme_count,
    syncing: running.has(r.id),
  }));
}

// ---------------------------------------------------------------- frontend
// ---- TV-listing grid: channels (page by page) x half-hour time slots
export const PER_PAGE = 20; // channels per page on /tv-guide
export const SLOT_MIN = 30; // minutes per column
export const SLOTS = 6; // columns shown (3 hours)
const slotSec = SLOT_MIN * 60;

export const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "sports", label: "Sports", match: ["sport"] },
  { key: "movies", label: "Movies", match: ["movie", "film"] },
  { key: "family", label: "Family", match: ["family", "kids", "child", "cartoon", "animat"] },
  { key: "news", label: "News", match: ["news"] },
];

export function parseFavs(v) {
  return [...new Set(String(v || "").split(",").map((x) => parseInt(x, 10)).filter((n) => n > 0))].slice(0, 200);
}

// Earliest start / latest stop of all stored programmes (cached for a minute)
let rangeCache = { t: 0, v: null };
async function dataRange() {
  if (Date.now() - rangeCache.t < 60_000) return rangeCache.v;
  const [[r]] = await pool.query(
    "SELECT MIN(p.start_ts) AS a, MAX(p.stop_ts) AS b FROM tv_programmes p JOIN tv_channels c ON c.id = p.channel_id JOIN tv_sources s ON s.id = c.source_id WHERE s.active = 1"
  );
  rangeCache = { t: Date.now(), v: r?.a ? { from: tsToIso(Number(r.a)), to: tsToIso(Number(r.b)) } : null };
  return rangeCache.v;
}

export async function getGrid({ page = 1, q = "", cat = "all", at = 0, favs = [] } = {}) {
  await ensureTvTables();
  autoRefresh();
  const now = nowTs();
  const today = todayKeyTz();

  // window start: requested time (or now), snapped to a slot and kept inside the data range
  const min = dayStartTs(today);
  const max = Math.max(min, dayStartTs(shiftDay(today, KEEP_DAYS)) - slotSec * SLOTS);
  let start = Math.floor((Number(at) > 0 ? Number(at) : now) / slotSec) * slotSec;
  start = Math.min(Math.max(start, min), max);
  const end = start + slotSec * SLOTS;

  const where = ["s.active = 1"];
  const params = [];
  const onlyFavs = cat === "favorites";
  if (onlyFavs) {
    where.push("c.id IN (?)");
    params.push(favs.length ? favs : [0]);
  } else {
    let sub = "SELECT 1 FROM tv_programmes p WHERE p.channel_id = c.id AND p.start_ts < ? AND p.stop_ts > ?";
    const sp = [end, start];
    const tab = CATEGORY_TABS.find((t) => t.key === cat && t.match);
    if (tab) {
      sub += ` AND (${tab.match.map(() => "p.category LIKE ?").join(" OR ")})`;
      sp.push(...tab.match.map((k) => `%${k}%`));
    }
    where.push(`EXISTS (${sub})`);
    params.push(...sp);
  }
  if (q) {
    where.push("c.name LIKE ?");
    params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
  }
  const base = `FROM tv_channels c JOIN tv_sources s ON s.id = c.source_id WHERE ${where.join(" AND ")}`;
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n ${base}`, params);
  const total = Number(n);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  page = Math.min(Math.max(1, page), pages);

  // favourites float to the top of the list
  const pin = !onlyFavs && favs.length ? "(c.id IN (?)) DESC, " : "";
  const [chs] = await pool.query(
    `SELECT c.id, c.name, c.icon ${base} ORDER BY ${pin}(c.icon = "") ASC, c.name LIMIT ? OFFSET ?`,
    [...params, ...(pin ? [favs] : []), PER_PAGE, (page - 1) * PER_PAGE]
  );

  const favSet = new Set(favs);
  const items = chs.map((c) => ({ ...c, fav: favSet.has(c.id), programmes: [] }));
  if (items.length) {
    const [progs] = await pool.query(
      `SELECT channel_id, start_ts, stop_ts, title, category FROM tv_programmes
       WHERE channel_id IN (?) AND start_ts < ? AND stop_ts > ? ORDER BY start_ts`,
      [items.map((c) => c.id), start + 12 * 3600, start]
    );
    const by = new Map(items.map((c) => [c.id, c]));
    const span = end - start;
    for (const p of progs) {
      const a = Math.max(Number(p.start_ts), start);
      const b = Math.min(Number(p.stop_ts), end);
      by.get(p.channel_id)?.programmes.push({
        title: p.title,
        category: p.category,
        start: tsToIso(Number(p.start_ts)),
        stop: tsToIso(Number(p.stop_ts)),
        left: ((a - start) / span) * 100,
        width: ((b - a) / span) * 100,
        cutL: Number(p.start_ts) < start,
        cutR: Number(p.stop_ts) > end,
        live: Number(p.start_ts) <= now && Number(p.stop_ts) > now,
      });
    }
  }

  const slots = Array.from({ length: SLOTS }, (_, i) => ({
    iso: tsToIso(start + i * slotSec),
    now: now >= start + i * slotSec && now < start + (i + 1) * slotSec,
  }));
  const days = Array.from({ length: KEEP_DAYS }, (_, i) => shiftDay(today, i));
  const times = Array.from({ length: 48 }, (_, i) => ({ off: i * slotSec, iso: tsToIso(min + i * slotSec) }));
  const [[meta]] = await pool.query("SELECT MAX(last_synced_at) AS t FROM tv_sources WHERE active = 1");
  const range = await dataRange();
  return {
    range, items, total, page, pages, slots, start, end, now, min, max, days, times,
    dayStarts: Object.fromEntries(days.map((d) => [d, dayStartTs(d)])),
    selDay: new Date(start * 1000).toLocaleDateString("en-CA", { timeZone: TZ }),
    prev: Math.max(min, start - slotSec * 4),
    next: Math.min(max, start + slotSec * 4),
    updated: meta?.t ? tsToIso(Number(meta.t)) : null,
  };
}

// Ek channel ka ek din ka schedule (page by page)
export async function getChannelDay(id, dayKey, page = 1) {
  await ensureTvTables();
  autoRefresh();
  const [[ch]] = await pool.query(
    "SELECT c.id, c.name, c.icon FROM tv_channels c JOIN tv_sources s ON s.id = c.source_id WHERE c.id = ? AND s.active = 1",
    [Number(id)]
  );
  if (!ch) return null;

  const today = todayKeyTz();
  const [[mx]] = await pool.query("SELECT MAX(stop_ts) AS t FROM tv_programmes WHERE channel_id = ?", [ch.id]);
  const lastKey = mx?.t ? new Date(Number(mx.t) * 1000 - 1000).toLocaleDateString("en-CA", { timeZone: TZ }) : today;
  const days = [];
  for (let i = 0; i < KEEP_DAYS && shiftDay(today, i) <= (lastKey > today ? lastKey : today); i++) days.push(shiftDay(today, i));

  if (!days.includes(dayKey)) dayKey = days[0] || today;
  const a = dayStartTs(dayKey);
  const b = dayStartTs(shiftDay(dayKey, 1));
  const [[{ n }]] = await pool.query(
    "SELECT COUNT(*) AS n FROM tv_programmes WHERE channel_id = ? AND start_ts >= ? AND start_ts < ?",
    [ch.id, a, b]
  );
  const total = Number(n);
  const pages = Math.max(1, Math.ceil(total / PROG_PER_PAGE));

  // Aaj ke din default page wo ho jisme abhi chal raha programme hai
  const now = nowTs();
  if (!page && dayKey === today) {
    const [[bf]] = await pool.query(
      "SELECT COUNT(*) AS n FROM tv_programmes WHERE channel_id = ? AND start_ts >= ? AND stop_ts <= ?",
      [ch.id, a, now]
    );
    page = Math.floor(Number(bf.n) / PROG_PER_PAGE) + 1;
  }
  page = Math.min(Math.max(1, page || 1), pages);

  const [rows] = await pool.query(
    `SELECT start_ts, stop_ts, title, subtitle, description, category FROM tv_programmes
     WHERE channel_id = ? AND start_ts >= ? AND start_ts < ? ORDER BY start_ts LIMIT ? OFFSET ?`,
    [ch.id, a, b, PROG_PER_PAGE, (page - 1) * PROG_PER_PAGE]
  );
  return {
    channel: ch,
    days,
    day: dayKey,
    page,
    pages,
    total,
    items: rows.map((r) => ({
      start: tsToIso(Number(r.start_ts)),
      stop: tsToIso(Number(r.stop_ts)),
      title: r.title,
      subtitle: r.subtitle,
      description: r.description || "",
      category: r.category,
      live: Number(r.start_ts) <= now && Number(r.stop_ts) > now,
      past: Number(r.stop_ts) <= now,
    })),
  };
}

// Totals for the admin dashboard
export async function tvSummary() {
  const sources = await listSources();
  return {
    sources,
    active: sources.filter((x) => x.active).length,
    channels: sources.reduce((a, x) => a + x.channel_count, 0),
    programmes: sources.reduce((a, x) => a + x.programme_count, 0),
    syncing: sources.some((x) => x.syncing),
    lastSync: sources.map((x) => x.last_synced_at).filter(Boolean).sort().pop() || null,
  };
}


// Stop a running sync (if any) and wait until it has released its database locks.
export async function cancelSync(id) {
  id = Number(id);
  if (!running.has(id)) return;
  cancelled.add(id);
  ctls.get(id)?.abort();
  for (let i = 0; i < 240 && running.has(id); i++) await new Promise((r) => setTimeout(r, 500));
}

// Delete a source with all its channels and programmes (in chunks, so no long database locks).
export async function deleteSource(id) {
  await ensureTvTables();
  id = Number(id);
  await cancelSync(id);
  cancelled.add(id);
  try {
    for (;;) {
      const [r] = await pool.query(
        "DELETE FROM tv_programmes WHERE channel_id IN (SELECT id FROM tv_channels WHERE source_id = ?) LIMIT 20000",
        [id]
      );
      if (!r.affectedRows) break;
    }
    await pool.query("DELETE FROM tv_channels WHERE source_id = ?", [id]);
    await pool.query("DELETE FROM tv_sources WHERE id = ?", [id]);
  } finally {
    cancelled.delete(id);
  }
}