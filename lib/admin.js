import { pool, ensureTables } from "./db";
import { getUserId } from "./session";

// Sirf wo user admin hai jiski email .env.local ke ADMIN_EMAILS me ho
export async function getAdmin() {
  const id = await getUserId();
  if (!id) return null;
  await ensureTables();
  const [rows] = await pool.execute("SELECT id, name, email FROM users WHERE id = ?", [id]);
  const u = rows[0];
  if (!u) return null;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(u.email.toLowerCase()) ? u : null;
}