import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool, ensureTables } from "./db";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const TOKEN_RE = /^[a-f0-9]{64}$/;
export const resetTtlMinutes = () => Math.min(30, Math.max(15, Number(process.env.RESET_TOKEN_TTL_MINUTES) || 30)) // 15-30 minute;

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

// Naya token banata hai. DB mein sirf hash jata hai; purane unused tokens khatam kar deta hai.
export async function createResetToken(userId) {
  await ensureTables();
  const token = crypto.randomBytes(32).toString("hex");
  const minutes = resetTtlMinutes();
  await pool.execute("DELETE FROM password_resets WHERE user_id = ? OR expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)", [userId]);
  await pool.execute(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
    [userId, sha256(token), minutes]
  );
  return { token, minutes, link: `${siteUrl()}/reset-password?token=${token}` };
}

// Sirf check karta hai, token use nahi hota (email scanners link khol dein to bhi token zinda rehta hai)
export async function isResetTokenValid(token) {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return false;
  await ensureTables();
  const [rows] = await pool.execute(
    "SELECT id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
    [sha256(token)]
  );
  return rows.length === 1;
}

// Token ek hi baar chalta hai: UPDATE ... WHERE used_at IS NULL atomic hai, isliye do requests ek sath aayen to bhi sirf ek jeetegi.
export async function resetPasswordWithToken(token, newPassword) {
  if (!(await isResetTokenValid(token))) return { ok: false };
  const hash = await bcrypt.hash(newPassword, 12);
  const th = sha256(token);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [mark] = await conn.execute(
      "UPDATE password_resets SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
      [th]
    );
    if (mark.affectedRows !== 1) {
      await conn.rollback();
      return { ok: false };
    }
    const [rows] = await conn.execute("SELECT user_id FROM password_resets WHERE token_hash = ?", [th]);
    const userId = rows[0].user_id;
    await conn.execute("UPDATE users SET password = ?, password_changed_at = NOW() WHERE id = ?", [hash, userId]);
    await conn.execute("DELETE FROM password_resets WHERE user_id = ? AND token_hash <> ?", [userId, th]);
    await conn.commit();
    const [u] = await pool.execute("SELECT name, email FROM users WHERE id = ?", [userId]);
    return { ok: true, user: u[0] };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}
