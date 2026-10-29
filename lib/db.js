import mysql from "mysql2/promise";

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

// users table agar nahi hai to khud bana deta hai
let ready;
export function ensureTables() {
  ready ||= pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(190) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      newsletter TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  return ready;
}
