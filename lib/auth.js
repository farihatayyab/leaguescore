import { pool, ensureTables } from "./db";
import { getSession } from "./session";

// Logged-in user DB se (role bhi DB se, token mein nahi): role badalne par foran asar hota hai.
// Password reset ke baad purane sessions (iat < password_changed_at) invalid ho jate hain.
export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  await ensureTables();
  const [rows] = await pool.execute(
    "SELECT id, name, email, role, created_at, UNIX_TIMESTAMP(password_changed_at) AS pwc FROM users WHERE id = ?",
    [s.uid]
  );
  const u = rows[0];
  if (!u) return null;
  if (u.pwc && s.iat < Number(u.pwc)) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role === "admin" ? "admin" : "user", created_at: u.created_at };
}
