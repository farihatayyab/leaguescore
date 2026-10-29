import { dayKey, fmtDay, fmtTime, slugify, todayKey } from "./format";
import { isSport } from "./sports";

// SportScore free API: https://sportscore.com  (~10,000 requests / 24h / IP)
// Shart: site par "Powered by SportScore" ka dofollow link dikhana zaroori hai (Footer.js mein laga hai).
const BASE = process.env.SPORTSCORE_BASE || "https://sportscore.com";
const TTL = Number(process.env.SPORTSCORE_TTL || 60) * 1000; // API khud 60s cache karti hai
const DAILY_LIMIT = Number(process.env.SPORTSCORE_DAILY_LIMIT || 9000); // 10k se thora neeche
const SRC = process.env.SPORTSCORE_SRC || ""; // optional: ?src=your-site

export { SPORTS, isSport } from "./sports";

const g = globalThis;
g.scCache ||= new Map(); // path -> { at, ttl, data }
g.scInflight ||= new Map(); // path -> Promise (ek hi request dobara na jaye)
g.scBudget ||= { day: "", used: 0 };

function takeBudget() {
  const day = new Date().toISOString().slice(0, 10); // UTC din
  if (g.scBudget.day !== day) g.scBudget = { day, used: 0 };
  if (g.scBudget.used >= DAILY_LIMIT) return false;
  g.scBudget.used++;
  if (g.scBudget.used % 250 === 0) {
    console.log(`SportScore API: aaj ${g.scBudget.used}/${DAILY_LIMIT} requests use hui`);
  }
  return true;
}

export const apiUsage = () => ({ ...g.scBudget, limit: DAILY_LIMIT });

async function call(path, ttlFor = () => TTL) {
  const hit = g.scCache.get(path);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data;

  if (g.scInflight.has(path)) return g.scInflight.get(path);

  const job = (async () => {
    if (!takeBudget()) {
      console.warn("SportScore daily limit pohanch gayi, purana cached data use ho raha hai");
      return hit?.data ?? null;
    }
    try {
      const url = `${BASE}${path}${SRC ? `&src=${encodeURIComponent(SRC)}` : ""}`;
      const res = await fetch(url, {
        next: { revalidate: Math.round(TTL / 1000) }, // Next.js Data Cache: SportScore ke 60s edge cache ke sath match
        headers: { Accept: "application/json" },
      });
            if (!res.ok) {
        // 404 = is competition/team ka ye data hai hi nahi (normal baat), isliye sirf warning
        console.warn("SportScore HTTP", res.status, path);
        const notFound = res.status === 404;
        const stale = notFound ? null : hit?.data ?? null;
        // 404 ho to 10 min tak dobara API ko mat chhero, baqi errors par 30 second
        g.scCache.set(path, { at: Date.now(), ttl: notFound ? 10 * 60 * 1000 : 30000, data: stale });
        return stale;
      }
      const data = await res.json();
      g.scCache.set(path, { at: Date.now(), ttl: ttlFor(data), data });
      return data;
    } catch (e) {
      console.error("SportScore fetch failed:", e.message);
      return hit?.data ?? null;
    } finally {
      g.scInflight.delete(path);
    }
  })();

  g.scInflight.set(path, job);
  return job;
}

const LIVE_WORDS = ["live", "inprogress", "in_progress", "in-progress", "playing", "started", "halftime", "ht"];
const DONE_WORDS = ["finished", "ended", "ft", "full_time", "fulltime", "final"];
const SOON_WORDS = ["upcoming", "scheduled", "notstarted", "not_started", "ns"];

function stateOf(status = "") {
  const s = String(status).toLowerCase();
  if (LIVE_WORDS.includes(s)) return "live";
  if (DONE_WORDS.includes(s)) return "finished";
  if (SOON_WORDS.includes(s)) return "scheduled";
  return "other";
}

const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

// "/football/match/<slug>/<id>/"  ->  { slug, id }
function parseUrl(url = "") {
  const parts = url.split("/").filter(Boolean);
  const i = parts.indexOf("match");
  if (i !== -1 && parts[i + 1]) return { slug: parts[i + 1], id: parts[i + 2] || "" };
  return { slug: parts.at(-2) || "", id: parts.at(-1) || "" };
}

export function mapMatch(m, sport) {
  const { slug, id } = parseUrl(m.url);
  const state = stateOf(m.status);
  const hs = num(m.home_score);
  const as = num(m.away_score);
  return {
    sport,
    slug,
    id,
    home: m.home,
    away: m.away,
    homeLogo: m.home_logo || "",
    awayLogo: m.away_logo || "",
    hs,
    as,
    state,
    live: state === "live",
    statusText: m.status_text || "",
    minute: m.live_minute ?? null,
    iso: m.time || "",
    time: fmtTime(m.time),
    day: dayKey(m.time),
    dayLabel: fmtDay(m.time),
    competition: m.competition || "Other",
    compSlug: slugify(m.competition || "other"),
    compLogo: m.competition_logo || "",
  };
}

// Live + recent matches (API max 50 deti hai)
export async function fetchMatches(sport = "football", limit = 50) {
  if (!isSport(sport)) return null;
  const data = await call(`/api/widget/matches/?sport=${sport}&limit=${limit}`);
  if (!data || !Array.isArray(data.matches)) return null;
  return data.matches.map((m) => mapMatch(m, sport)).filter((m) => m.slug);
}

// SportScore ka /matches/ endpoint `date` parameter ignore karta hai (test se confirm: api=50, shown=0).
// Isliye ek hi list (live + recent, max 50) fetch karte hain aur din ke hisaab se alag karte hain.
// Wapas: { matches: us din ke matches, days: [{ key, count }] jin dino ka data maujood hai }
export async function fetchMatchesByDate(sport = "football", date = "", limit = 50) {
  if (!isSport(sport)) return null;
  const day = date || todayKey();
  const all = (await fetchMatches(sport, limit)) || [];

  const counts = {};
  for (const m of all) if (m.day) counts[m.day] = (counts[m.day] || 0) + 1;
  const days = Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return { matches: all.filter((m) => m.day === day), days };
}

// Ek match ki poori detail: timeline, lineups, stats
export async function fetchMatch(sport, slug) {
  if (!isSport(sport) || !/^[a-z0-9-]+$/i.test(slug || "")) return null;
  const data = await call(
    `/api/widget/match/?sport=${sport}&slug=${encodeURIComponent(slug)}`,
    (d) => {
      const st = stateOf(d?.match?.status);
      return st === "live" ? TTL : st === "finished" ? 30 * 60 * 1000 : 5 * 60 * 1000;
    }
  );
  const m = data?.match;
  if (!m) return null;

  const base = mapMatch(m, sport);
  if (!base.slug) base.slug = slug;

  return {
    ...base,
    htHome: num(m.home_ht_score),
    htAway: num(m.away_ht_score),
    incidents: Array.isArray(m.incidents) ? m.incidents : [],
    stats: normStats(m.stats),
    lineups: m.lineups && (m.lineups.home_xi?.length || m.lineups.away_xi?.length) ? m.lineups : null,
    updated: data.updated || "",
  };
}

// stats ka format officially documented nahi, isliye har tarah ka array sambhal lete hain
function normStats(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      label: s?.name ?? s?.label ?? s?.type ?? s?.title ?? "",
      home: s?.home ?? s?.home_value ?? null,
      away: s?.away ?? s?.away_value ?? null,
    }))
    .filter((s) => s.label && s.home !== null && s.away !== null);
}

// ---------------------------------------------------------------------------
// Team / Player / Bracket / Standings / Top scorers
// Team, Player, Bracket ka format live API se check kiya gaya hai.
// Standings aur Top scorers ka format verify nahi hua, isliye unka parser "tolerant" hai.
// ---------------------------------------------------------------------------
const okSlug = (s) => /^[a-z0-9-]+$/i.test(s || "");
const MIN5 = 5 * 60 * 1000;
const MIN30 = 30 * 60 * 1000;

export async function fetchTeam(sport, slug) {
  if (!isSport(sport) || !okSlug(slug)) return null;
  const d = await call(`/api/widget/team/?sport=${sport}&slug=${encodeURIComponent(slug)}&limit=30`, () => MIN5);
  if (!d?.team) return null;
  const squad = d.players || d.squad || d.team.players || [];
  return {
    name: d.team.name,
    logo: d.team.logo || "",
    country: d.team.country || "",
    slug,
    squad: Array.isArray(squad) ? squad : [],
    matches: (d.matches || []).map((m) => mapMatch(m, sport)).filter((m) => m.slug),
  };
}

export async function fetchPlayer(sport, slug) {
  if (!isSport(sport) || !okSlug(slug)) return null;
  const d = await call(`/api/widget/player/?sport=${sport}&slug=${encodeURIComponent(slug)}`, () => MIN30);
  if (!d?.player) return null;
  return { name: d.player.name, logo: d.player.logo || "", slug, stats: d.stats || null };
}

export async function fetchBracket(sport, slug) {
  if (!isSport(sport) || !okSlug(slug)) return null;
  const d = await call(`/api/widget/bracket/?sport=${sport}&slug=${encodeURIComponent(slug)}`, () => MIN30);
  if (!d || !Array.isArray(d.rounds)) return null;
  return { competition: d.competition || "", logo: d.competition_logo || "", rounds: d.rounds };
}

export async function fetchStandings(sport, slug) {
  if (!isSport(sport) || !okSlug(slug)) return null;
  const d = await call(`/api/widget/standings/?sport=${sport}&slug=${encodeURIComponent(slug)}`, () => MIN30);
  return d ? extractTables(d) : null;
}

export async function fetchTopScorers(sport, slug, stat = "goals") {
  if (!isSport(sport) || !okSlug(slug)) return null;
  const s = stat === "assists" ? "assists" : "goals";
  const d = await call(
    `/api/widget/topscorers/?sport=${sport}&slug=${encodeURIComponent(slug)}&limit=20&stat=${s}`,
    () => MIN30
  );
  return d ? extractTables(d) : null;
}

const NAME_KEYS = ["team_name", "team", "player_name", "player", "name"];
const pick = (r, keys) => {
  for (const k of keys) {
    const v = r?.[k];
    if (v !== undefined && v !== null && v !== "") return typeof v === "object" ? v.name ?? null : v;
  }
  return null;
};
const isRows = (a) =>
  Array.isArray(a) &&
  a.length > 0 &&
  a.every((x) => x && typeof x === "object" && !Array.isArray(x)) &&
  a.some((x) => pick(x, NAME_KEYS) !== null);

const COLS = [
  ["pos", "#", ["position", "pos", "rank"]],
  ["p", "P", ["played", "matches_played", "matches", "mp", "p"]],
  ["w", "W", ["won", "wins", "w"]],
  ["d", "D", ["drawn", "draws", "d"]],
  ["l", "L", ["lost", "losses", "l"]],
  ["gf", "GF", ["goals_for", "gf", "scored"]],
  ["ga", "GA", ["goals_against", "ga", "conceded"]],
  ["gd", "GD", ["goal_difference", "goal_diff", "gd"]],
  ["pts", "Pts", ["points", "pts"]],
  ["goals", "Goals", ["goals"]],
  ["assists", "Assists", ["assists"]],
];

function collect(node, title, out, depth = 0) {
  if (node == null || depth > 5) return;
  if (Array.isArray(node)) {
    if (isRows(node)) return void out.push({ title, rows: node });
    node.forEach((n) => collect(n, (n && typeof n === "object" && (n.group || n.title)) || title, out, depth + 1));
    return;
  }
  if (typeof node === "object") {
    const t = typeof node.group === "string" ? node.group : title;
    Object.values(node).forEach((v) => collect(v, t, out, depth + 1));
  }
}

function extractTables(json) {
  const found = [];
  collect(json, "", found);
  return found.map(({ title, rows }) => {
    const mapped = rows.map((r, i) => {
      const playerName = pick(r, ["player_name", "player"]);
      const cells = {};
      for (const [key, , aliases] of COLS) cells[key] = pick(r, aliases);
      if (cells.pos === null) cells.pos = i + 1;
      return {
        name: playerName ?? pick(r, ["team_name", "team", "name"]),
        team: playerName ? pick(r, ["team_name", "team"]) : null,
        logo: r.logo || r.team_logo || r.player_logo || r.image || r.team?.logo || "",
        cells,
      };
    });
    const cols = COLS.filter(([key]) => mapped.some((r) => r.cells[key] !== null && r.cells[key] !== undefined)).map(
      ([key, label]) => ({ key, label })
    );
    return { title: typeof title === "string" ? title : "", cols, rows: mapped };
  });
}