import mysql from "mysql2/promise";
import { migrateAuthSchema } from "./authTables.mjs";

const g = globalThis;

export const pool =
  g.mysqlPool ||
  mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "leaguescore",
    waitForConnections: true,
    connectionLimit: 10,
  });

if (process.env.NODE_ENV !== "production") g.mysqlPool = pool;

// users + password_resets tables khud ban jati hain; purani users table mein role column add ho jata hai
let ready;
export function ensureTables() {
  ready ||= migrateAuthSchema(pool).catch((e) => {
    ready = undefined; // agle request par dobara try ho
    throw e;
  });
  return ready;
}
