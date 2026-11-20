// Usage (Node 20+):
//   node --env-file=.env scripts/create-api-key.mjs "Owner Name" owner@email.com "example.com,*.example.org"
// Raw key sirf ek baar dikhti hai; DB mein sirf SHA-256 hash + prefix save hota hai.
import crypto from "crypto";
import mysql from "mysql2/promise";
import { API_TABLES_SQL } from "../lib/apiTables.mjs";

const [name = "", email = "", domains = ""] = process.argv.slice(2);
if (!name) {
  console.error('Usage: node --env-file=.env scripts/create-api-key.mjs "Owner Name" email "domain1,*.domain2"');
  process.exit(1);
}
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "leaguescore",
});
for (const sql of API_TABLES_SQL) await db.query(sql);
const raw = "ls_live_" + crypto.randomBytes(24).toString("hex");
const hash = crypto.createHash("sha256").update(raw).digest("hex");
await db.query(
  "INSERT INTO api_keys (key_prefix, key_hash, owner_name, owner_email, allowed_domains) VALUES (?,?,?,?,?)",
  [raw.slice(0, 12), hash, name, email, domains]
);
console.log("\nAPI key (abhi copy kar lo, dobara nahi dikhegi):\n  " + raw + "\n");
await db.end();
