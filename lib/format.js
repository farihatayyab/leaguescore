// Chhote helper functions (server + client dono jagah chalte hain)

export const TZ = "Asia/Karachi";

export const slugify = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

export const dayKey = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }) : "";

export const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: TZ,
      })
    : "";

export const fmtDay = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: TZ })
    : "";

export const fmtFull = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: TZ,
      })
    : "";

// ---------- date tabs ke helpers ----------
export const MAX_DAYS = 14; // aaj se +-14 din; zyada door ki dates par API budget zaya na ho

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// "2026-10-29" + n din  ->  "2026-10-30"
export function shiftDay(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// URL se aayi date ko safe banata hai: galat ya bohat door ho to aaj ki date
export function resolveDate(input) {
  const today = todayKey();
  if (typeof input !== "string" || !DATE_RE.test(input)) return today;
  if (Number.isNaN(new Date(`${input}T00:00:00Z`).getTime())) return today;
  if (input < shiftDay(today, -MAX_DAYS) || input > shiftDay(today, MAX_DAYS)) return today;
  return input;
}
