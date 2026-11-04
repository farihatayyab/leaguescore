// Player API ka JSON poori tarah documented nahi, isliye jo bhi fields aayein unhein khud group karte hain:
//   profile = naam/position/nationality/foot/height waghera, stats = numbers, tables = arrays (transfers, career waghera)

const SKIP = /^(id|slug|url|name|logo|image|photo|img|picture|avatar|flag|updated|status)$|_(logo|image|photo|url|slug|id)$/i;
const PROFILE = /position|nationality|country|birth|born|^age$|height|weight|foot|shirt|jersey|number|market|value|contract|preferred|team|club|league|competition|nation|retired|short_name/i;

export const prettyKey = (k) =>
  String(k)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/, "ID");

const isNum = (v) =>
  typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) && !/^\d{4}-\d{2}-\d{2}/.test(v));

// Value ko dikhane layak text banata hai (null = dikhana nahi)
export function show(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return Array.isArray(v) ? null : v.name ?? v.title ?? v.label ?? null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  }
  return s;
}

const KNOWN = ["matches", "goals", "assists", "minutes", "shots", "shots_on_target", "key_passes", "dribbles", "tackles", "interceptions", "yellow_cards", "red_cards"];
const WRAPPERS = /^(player|stats|profile|info|details|data|bio)$/i;

export function splitPlayer(raw) {
  const profile = [];
  const stats = [];
  const tables = [];
  const seen = new Set();

  const push = (k, v) => {
    const val = show(v);
    if (val === null) return;
    const label = prettyKey(k);
    if (seen.has(label)) return;
    seen.add(label);
    (PROFILE.test(k) || !isNum(v) ? profile : stats).push({ key: k, label, value: val });
  };

  const table = (k, arr) => {
    if (arr.length && arr.every((x) => x && typeof x === "object" && !Array.isArray(x))) tables.push({ title: prettyKey(k), rows: arr });
  };

  const scan = (obj, depth) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (SKIP.test(k)) continue;
      if (Array.isArray(v)) table(k, v);
      else if (v && typeof v === "object") {
        if (show(v) !== null) push(k, v); // jaise team: { name, logo }
        else if (depth < 2) scan(v, depth + 1);
      } else push(k, v);
    }
  };

  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) table(k, v);
      else if (v && typeof v === "object" && WRAPPERS.test(k)) scan(v, 1);
      else if (v && typeof v === "object") scan({ [k]: v }, 1);
      else if (!SKIP.test(k) && !/^(updated|source|ok|success)$/i.test(k)) push(k, v);
    }
  }

  stats.sort((a, b) => {
    const ia = KNOWN.indexOf(a.key);
    const ib = KNOWN.indexOf(b.key);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return { profile, stats, tables };
}

// Table ke liye columns: pehli row ke scalar fields (max 7)
export function tableCols(rows) {
  const keys = [];
  for (const r of rows.slice(0, 5)) {
    for (const [k, v] of Object.entries(r)) {
      if (SKIP.test(k) && !/^name$/i.test(k)) continue;
      if (show(v) !== null && !keys.includes(k)) keys.push(k);
    }
  }
  return keys.slice(0, 7);
}
