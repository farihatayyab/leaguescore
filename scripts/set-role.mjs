// Usage (Node 20+):
//   node --env-file=.env scripts/set-role.mjs user@email.com admin     (admin banao)
//   node --env-file=.env scripts/set-role.mjs user@email.com user      (wapas normal user)
//   node --env-file=.env scripts/set-role.mjs --list                   (sab admins dekho)
import mysql from "mysql2/promise";
import { migrateAuthSchema } from "../lib/authTables.mjs";

const [a, b] = process.argv.slice(2);
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "leaguescore",
});
await migrateAuthSchema(db);

if (a === "--list") {
  const [rows] = await db.query("SELECT id, name, email FROM users WHERE role = 'admin'");
  console.table(rows);
} else if (a && ["admin", "user"].includes(b)) {
  const [r] = await db.execute("UPDATE users SET role = ? WHERE email = ?", [b, a.trim().toLowerCase()]);
  console.log(r.affectedRows ? `OK: ${a} ab "${b}" hai.` : `Is email ka koi user nahi mila: ${a} (pehle website par sign up karo).`);
  process.exitCode = r.affectedRows ? 0 : 1;
} else {
  console.error("Usage: node --env-file=.env scripts/set-role.mjs user@email.com admin|user   (ya --list)");
  process.exitCode = 1;
}
await db.end();
