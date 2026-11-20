import { dayKey, fmtDay, fmtTime, shiftDay, slugify, todayKey } from "./format";
import { isSport } from "./sports";
import { readRawCountry, resolveCountry, teamCountry, withFallback } from "./countries";

// SportScore free API: https://sportscore.com  (~10,000 requests / 24h / IP)
// Shart: site par "Powered by SportScore" ka dofollow link dikhana zaroori hai (Footer.js mein laga hai).
const BASE = process.env.SPORTSCORE_BASE || "https://sportscore.com";
const TTL = Number(process.env.SPORTSCORE_TTL || 60) * 1000; // API khud 60s cache karti hai
const DAILY_LIMIT = Number(process.env.SPORTSCORE_DAILY_LIMIT || 9000); // 10k se thora neeche
const SRC = process.env.SPORTSCORE_SRC || ""; // optional: ?src=your-site

// Doc: /api/v1/fixtures/?sport=&date=&limit=200  (date ke hisaab se 200 tak fixtures)
const FIXTURES_ON = process.env.SPORTSCORE_FIXTURES !== "off"; // "off" = purana widget feed
const FIXTURES_LIMIT = 200;
const DATE_PARAM = process.env.SPORTSCORE_DATE_PARAM || "date";
// Agar ek din mein 200 se zyada fixtures hon: docs se pagination parameter confirm karke yahan likho
// (misal: PAGE_PARAM=page, PAGE_MODE=page  ya  PAGE_PARAM=offset, PAGE_MODE=offset). Khali = pagination band.
const PAGE_PARAM = process.env.SPORTSCORE_PAGE_PARAM || "";
const PAGE_MODE = process.env.SPORTSCORE_PAGE_MODE || "page";
const MAX_PAGES = 3;

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

// Alag alag dates ki wajah se cache barhta rehta hai: 400 se upar purani entries hata do
function pruneCache() {
  if (g.scCache.size <= 400) return;
  const old = [...g.scCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, g.scCache.size - 300);
  for (const [k] of old) g.scCache.delete(k);
}

export const apiUsage = () => ({ ...g.scBudget, limit: DAILY_LIMIT });

async function call(path, ttlFor = () => TTL, revalidate = Math.round(TTL / 1000)) {
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
        next: { revalidate }, // Next.js Data Cache (live = 60s, purani dates = lambi muddat)
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
      pruneCache();
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

// Status alag alag API endpoints par alag likha aata hai (live / 1H / HT / FT / NS ...), isliye tolerant mapping
const LIVE_WORDS = ["live", "inprogress", "in_progress", "in-progress", "inplay", "in_play", "playing", "started", "halftime", "half_time", "ht", "1h", "2h", "et", "extra_time", "break"];
const DONE_WORDS = ["finished", "ended", "ft", "full_time", "fulltime", "final", "complete", "completed", "closed", "aet", "pen", "after_pen", "after_et"];
const SOON_WORDS = ["upcoming", "scheduled", "notstarted", "not_started", "not-started", "ns", "pending", "tbd", "created"];
const OTHER_WORDS = ["postponed", "cancelled", "canceled", "suspended", "abandoned", "interrupted", "delayed", "walkover"];

function stateOf(status = "") {
  const s = String(status ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (OTHER_WORDS.some((w) => s.includes(w))) return "other";
  if (LIVE_WORDS.includes(s) || s.includes("live") || s.includes("inplay")) return "live";
  if (DONE_WORDS.includes(s) || s.includes("finish") || s.includes("complete")) return "finished";
  if (SOON_WORDS.includes(s) || s.includes("schedule") || s.includes("upcoming") || s.includes("not_started")) return "scheduled";
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
    // normalized country: kabhi undefined nahi (khali string = UI suffix chhupa deta hai)
    ...withFallback(resolveCountry(m, m.competition), slugify(m.competition || "other"), m.competition),
    homeCountry: teamCountry(m.home_country),
    awayCountry: teamCountry(m.away_country),
    round: String(m.round ?? "").trim(),
  };
}

// ---------------------------------------------------------------------------
// Country enrichment: jin competitions ka country API/naam se nahi mila, unki team API se country lo.
// Result g.compCountry mein cache hota hai (mila to hamesha, na mila to 30 min), taake API budget bache.
// ---------------------------------------------------------------------------
g.compCountry ||= new Map(); // "sport:compSlug" -> { at, info | null }
const ENRICH_PER_CALL = 20; // ek request mein max itni lookups

async function enrichCountries(list, sport) {
  if (!Array.isArray(list) || !list.length) return list;
  const need = new Map(); // key -> sample match
  for (const m of list) {
    if (m.country || m.international) continue; // country pehle se hai -> fetchTeam nahi
    const key = `${sport}:${m.compSlug}`;
    const hit = g.compCountry.get(key);
    if (hit && (hit.info || Date.now() - hit.at < 30 * 60 * 1000)) continue;
    if (!need.has(key)) need.set(key, m);
  }
  await Promise.all(
    [...need.entries()].slice(0, ENRICH_PER_CALL).map(async ([key, m]) => {
      let info = null;
      for (const name of [m.home, m.away]) {
        const t = await fetchTeam(sport, slugify(name));
        if (t?.country) {
          const r = resolveCountry({ country: t.country }, m.competition);
          if (r.country) {
            info = { country: r.country, countryCode: r.countryCode, countryFlag: r.countryFlag };
            break;
          }
        }
      }
      g.compCountry.set(key, { at: Date.now(), info });
    })
  );
  return list.map((m) => {
    if (m.country || m.international) return m;
    const info = g.compCountry.get(`${sport}:${m.compSlug}`)?.info;
    return info ? { ...m, ...info } : m;
  });
}

// Live + recent matches (API max 50 deti hai)
export async function fetchMatches(sport = "football", limit = 50) {
  if (!isSport(sport)) return null;
  const data = await call(`/api/widget/matches/?sport=${sport}&limit=${limit}`);
  if (!data || !Array.isArray(data.matches)) return null;
  return enrichCountries(data.matches.map((m) => mapMatch(m, sport)).filter((m) => m.slug), sport);
}

// ---------------------------------------------------------------------------
// Date ke hisaab se matches  ->  /api/v1/fixtures/?sport=&date=&limit=200  (guide section 4-5)
// Fixtures ka JSON format official docs mein verify karna hai, isliye parser tolerant hai
// (array ya { fixtures | matches | data }) aur galat/khali format par purana widget feed fallback hai.
// ---------------------------------------------------------------------------
const text = (v) => (v && typeof v === "object" ? v.name ?? v.title ?? v.long ?? v.short ?? "" : v ?? "");
const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");

// Fixture row (kisi bhi shakal ka) -> wohi shape jo mapMatch() samajhta hai
function normalizeFixture(f, sport) {
  if (!f || typeof f !== "object") return null;
  const id = first(f.id, f.match_id, f.fixture_id, "");
  const slug = first(f.slug, f.match_slug, "");
  let url = first(f.url, f.link, f.match_url, f.path, "");
  if (!url && slug) url = `/${sport}/match/${slug}/${id}/`;
  const st = first(f.status?.short, f.status?.type, f.status, f.state, "");
  return {
    url,
    home: text(first(f.home, f.home_team, f.homeTeam, f.teams?.home, f.team1)),
    away: text(first(f.away, f.away_team, f.awayTeam, f.teams?.away, f.team2)),
    home_logo: first(f.home_logo, f.home_team?.logo, f.homeTeam?.logo, f.teams?.home?.logo, ""),
    away_logo: first(f.away_logo, f.away_team?.logo, f.awayTeam?.logo, f.teams?.away?.logo, ""),
    home_score: first(f.home_score, f.score?.home, f.scores?.home, f.goals?.home, f.home_team?.score),
    away_score: first(f.away_score, f.score?.away, f.scores?.away, f.goals?.away, f.away_team?.score),
    status: typeof st === "object" ? text(st) : st,
    status_text: first(f.status_text, f.status?.long, f.status?.text, f.status?.description, ""),
    live_minute: first(f.live_minute, f.minute, f.elapsed, f.status?.elapsed, null),
    time: first(f.time, f.start_time, f.starts_at, f.kickoff, f.datetime, f.date, ""),
    competition: text(first(f.competition, f.league, f.tournament, "")),
    competition_logo: first(f.competition_logo, f.competition?.logo, f.league?.logo, f.tournament?.logo, ""),
    // country: raw fixture ke saare mumkina fields (country / category / area ...) mapMatch ko pass karo
    country: readRawCountry(f) ?? undefined,
    home_country: first(f.home_country, f.home_team?.country, f.homeTeam?.country, f.teams?.home?.country, ""),
    away_country: first(f.away_country, f.away_team?.country, f.awayTeam?.country, f.teams?.away?.country, ""),
    round: text(first(f.round, f.round_name, f.round_info, f.stage, f.week, "")),
  };
}

// Response array ya fixtures/matches/data object ho sakta hai (guide section 5)
function rowsOf(json) {
  if (Array.isArray(json)) return json;
  const r = json?.fixtures ?? json?.matches ?? json?.data ?? json?.results;
  return Array.isArray(r) ? r : null;
}

// Din purana ho to response bohat der tak cache hota hai (finished data nahi badalta)
function ttlForUtcDate(key) {
  const today = new Date().toISOString().slice(0, 10);
  if (key > today) return 10 * 60 * 1000; // aane wale din: schedule kam badalta hai
  if (key === today) return TTL; // aaj (UTC): live
  if (key === shiftDay(today, -1)) return 5 * 60 * 1000; // kal: raat ke late matches khatam ho rahe hon
  return 6 * 60 * 60 * 1000; // is se purana: finished
}

// Ek UTC date + ek sport: max 200 fixtures (+ optional pagination)
async function fetchFixturesUtc(sport, utcDate) {
  const ttl = ttlForUtcDate(utcDate);
  const sec = Math.round(ttl / 1000);
  let out = [];
  let capped = false;
  for (let page = 1; page <= (PAGE_PARAM ? MAX_PAGES : 1); page++) {
    let path = `/api/v1/fixtures/?sport=${sport}&${DATE_PARAM}=${utcDate}&limit=${FIXTURES_LIMIT}`;
    if (page > 1) path += `&${PAGE_PARAM}=${PAGE_MODE === "offset" ? (page - 1) * FIXTURES_LIMIT : page}`;
    const json = await call(path, () => ttl, sec);
    const rows = rowsOf(json);
    if (!rows) return out.length ? { rows: out, capped } : null; // pehle page par hi format galat/error -> null
    out = out.concat(rows);
    if (rows.length < FIXTURES_LIMIT) return { rows: out, capped: false };
    capped = true; // poora page bhara aaya: shayad aur bhi hon
  }
  return { rows: out, capped };
}

function uniqueByMatch(list) {
  const seen = new Set();
  return list.filter((m) => {
    const k = `${m.slug}-${m.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Purana tareeqa: widget feed (live + recent, max 50) ko din ke hisaab se chhaanta hai
async function widgetByDate(sport, day, limit = 50) {
  const all = (await fetchMatches(sport, limit)) || [];
  const counts = {};
  for (const m of all) if (m.day) counts[m.day] = (counts[m.day] || 0) + 1;
  const days = Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return { matches: all.filter((m) => m.day === day), days, truncated: false, source: "widget" };
}

// Wapas: { matches, days, truncated, source }
//  - matches: Asia/Karachi ke is din ke saare matches
//  - days: sirf widget fallback mein bharta hai (jin dino ka data maujood hai)
//  - truncated: true = API ne 200 ki limit tak bheja, shayad kuch matches reh gaye
export async function fetchMatchesByDate(sport = "football", date = "", limit = 50) {
  if (!isSport(sport)) return null;
  const day = date || todayKey();
  if (!FIXTURES_ON) return widgetByDate(sport, day, limit);

  // Karachi (UTC+5) ka ek din = UTC ke 2 din (pichli raat 19:00 se), isliye D-1 aur D dono fetch karke
  // dayKey() se sirf Karachi ke din ke matches rakhte hain. Dono responses alag cache hote hain.
  const [prev, cur] = await Promise.all([fetchFixturesUtc(sport, shiftDay(day, -1)), fetchFixturesUtc(sport, day)]);
  if (!prev && !cur) return widgetByDate(sport, day, limit); // fixtures endpoint ne kuch na diya -> fallback

  const rows = [...(prev?.rows || []), ...(cur?.rows || [])];
  const mapped = rows
    .map((r) => normalizeFixture(r, sport))
    .filter(Boolean)
    .map((r) => mapMatch(r, sport))
    .filter((m) => m.slug && m.home && m.away);

  // rows aayi lekin ek bhi parse na hui = format alag hai -> fallback, aur console mein batao
  if (rows.length && !mapped.length) {
    console.warn("SportScore fixtures: format samajh nahi aaya, widget feed use ho raha hai. Sample:", JSON.stringify(rows[0]).slice(0, 300));
    return widgetByDate(sport, day, limit);
  }

  const matches = await enrichCountries(uniqueByMatch(mapped).filter((m) => m.day === day), sport);
  const truncated = Boolean(prev?.capped || cur?.capped);
  return { matches, days: [], truncated, source: "fixtures" };
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
  return { name: d.player.name, logo: d.player.logo || "", slug, stats: d.stats || null, raw: d };
}

// Live match tracker (/api/widget/tracker/): format official docs mein nahi, isliye raw JSON wapas hota hai
export async function fetchTracker(sport, slug) {
  if (!isSport(sport) || !okSlug(slug)) return null;
  return call(`/api/widget/tracker/?sport=${sport}&slug=${encodeURIComponent(slug)}`, () => TTL);
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