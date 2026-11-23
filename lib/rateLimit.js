// Memory mein rate limit (server restart par reset). true = limit cross ho gayi.
const g = globalThis;
g.rlHits ||= new Map();

export function limited(key, max, windowMs) {
  const now = Date.now();
  const hits = (g.rlHits.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    g.rlHits.set(key, hits);
    return true;
  }
  hits.push(now);
  g.rlHits.set(key, hits);
  if (g.rlHits.size > 5000) g.rlHits.clear();
  return false;
}

export const clientIp = (req) =>
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || "unknown";
