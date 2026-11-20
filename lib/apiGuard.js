import crypto from "crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { API_TABLES_SQL } from "@/lib/apiTables.mjs";
import { withAttribution } from "@/lib/attribution";

// API_KEY_MODE=log (default): sirf log. enforce: third-party ko valid key + allowed domain chahiye.
const enforce = () => (process.env.API_KEY_MODE || "log").toLowerCase() === "enforce";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

export async function apiOptions() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

let tablesReady;
function ensureApiTables() {
  tablesReady ||= (async () => {
    for (const sql of API_TABLES_SQL) await pool.query(sql);
  })().catch((e) => {
    tablesReady = undefined; // agli baar dobara try karo
    throw e;
  });
  return tablesReady;
}

export function clientIp(req) {
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "";
  return ip.slice(0, 64);
}

function hostOf(u) {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function callerInfo(req) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const host = hostOf(origin) || hostOf(referer);
  return { origin, referer, host };
}

// Apni site ke frontend ki calls (same-origin) exempt hain
function isFirstParty(req, callerHost) {
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs === "same-origin") return true;
  const own = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (callerHost && own && callerHost === own) return true;
  const site = hostOf(process.env.SITE_URL || "");
  return !!(callerHost && site && callerHost === site);
}

function domainAllowed(list, host) {
  if (!host) return false;
  const rules = String(list || "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return rules.some((r) => {
    if (r === "*") return true;
    if (r.startsWith("*.")) {
      const base = r.slice(2);
      return host === base || host.endsWith("." + base);
    }
    return host === r || host === "www." + r;
  });
}

async function findKey(raw) {
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const [rows] = await pool.query(
    "SELECT id, key_prefix, allowed_domains, status FROM api_keys WHERE key_hash = ? LIMIT 1",
    [hash]
  );
  return rows[0] || null;
}

async function logRequest(row) {
  try {
    await ensureApiTables();
    await pool.query(
      `INSERT INTO api_request_logs
        (api_key_id, key_prefix, endpoint, method, status_code, origin, referer, caller_host, ip, user_agent, first_party, flags, blocked)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        row.keyId, row.keyPrefix, row.endpoint.slice(0, 190), row.method, row.status,
        row.origin.slice(0, 255), row.referer.slice(0, 500), row.host.slice(0, 190), row.ip,
        row.ua.slice(0, 255), row.firstParty ? 1 : 0, row.flags.join(",").slice(0, 190), row.blocked ? 1 : 0,
      ]
    );
    if (row.keyId) await pool.query("UPDATE api_keys SET last_used_at = NOW() WHERE id = ?", [row.keyId]);
  } catch (e) {
    console.error("[apiGuard] log failed:", e.message);
  }
}

// Embed widget ki attribution violation record karta hai (kabhi throw nahi karta)
export async function recordViolation(req, { reason, pageUrl = "", rawKey = "" }) {
  try {
    await ensureApiTables();
    let key = null;
    if (rawKey) key = await findKey(rawKey).catch(() => null);
    const host = hostOf(pageUrl) || callerInfo(req).host;
    await pool.query(
      `INSERT INTO attribution_violations (api_key_id, key_prefix, reason, page_url, caller_host, ip, user_agent)
       VALUES (?,?,?,?,?,?,?)`,
      [
        key ? key.id : null,
        key ? key.key_prefix : rawKey.slice(0, 12),
        reason, pageUrl.slice(0, 500), host.slice(0, 190), clientIp(req),
        (req.headers.get("user-agent") || "").slice(0, 255),
      ]
    );
  } catch (e) {
    console.error("[apiGuard] violation log failed:", e.message);
  }
}

function reply(body, status, extra) {
  return NextResponse.json(withAttribution(body), { status, headers: { ...CORS, ...extra } });
}

// Route handler ko wrap karta hai: key/domain check, logging, CORS aur response mein attribution (errors mein bhi)
export function withApiGuard(handler) {
  return async function guarded(req, ctx) {
    const { origin, referer, host } = callerInfo(req);
    const firstParty = isFirstParty(req, host);
    const url = new URL(req.url);
    const rawKey = (req.headers.get("x-api-key") || url.searchParams.get("key") || "").trim();

    const flags = [];
    let key = null;
    let keyError = false;

    if (!firstParty) {
      if (!rawKey) flags.push("no_key");
      else {
        try {
          key = await findKey(rawKey);
          if (!key) flags.push("invalid_key");
          else if (key.status !== "active") flags.push("key_" + key.status);
          else if (!domainAllowed(key.allowed_domains, host)) flags.push("domain_not_allowed");
        } catch (e) {
          keyError = true;
          console.error("[apiGuard] key lookup failed:", e.message);
        }
      }
    }

    const log = (status, blocked) =>
      logRequest({
        keyId: key ? key.id : null,
        keyPrefix: key ? key.key_prefix : rawKey.slice(0, 12),
        endpoint: url.pathname, method: req.method, status, origin, referer, host,
        ip: clientIp(req), ua: req.headers.get("user-agent") || "", firstParty, flags, blocked,
      });

    if (enforce() && !firstParty) {
      if (keyError) {
        await log(503, true);
        return reply({ error: "Service temporarily unavailable" }, 503);
      }
      if (flags.length) {
        const status = flags[0] === "no_key" || flags[0] === "invalid_key" ? 401 : 403;
        await log(status, true);
        return reply({ error: "Invalid API key or domain not allowed" }, status);
      }
    }

    let res;
    try {
      res = await handler(req, ctx);
    } catch (e) {
      console.error("[apiGuard] handler error:", e);
      log(500, false);
      return reply({ error: "Internal server error" }, 500);
    }

    log(res.status, false); // response ka intezar nahi

    // JSON response mein attribution jodo, baaki headers/status same rahen
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
    const body = await res.json().catch(() => ({}));
    const cc = res.headers.get("cache-control");
    return reply(body, res.status, cc ? { "Cache-Control": cc } : undefined);
  };
}
