// In-memory fake MySQL: sirf wahi queries jo auth code chalata hai.
import { fake } from "./clock.mjs";
const db = (globalThis.__db ||= { users: [], resets: [], nextUser: 1, nextReset: 1 });
const sec = () => Math.floor(fake.now() / 1000);
const dt = (s) => s; // DATETIME ko seconds mein rakhte hain

function run(sql, p = []) {
  const q = sql.replace(/\s+/g, " ").trim();
  if (/^(CREATE|ALTER) TABLE/i.test(q)) return [{}];

  // ---- users ----
  if (q.startsWith("SELECT id, name, email, password, role FROM users WHERE email = ?"))
    return [db.users.filter((u) => u.email === p[0])];
  if (q.startsWith("SELECT id FROM users WHERE email = ?")) return [db.users.filter((u) => u.email === p[0]).map((u) => ({ id: u.id }))];
  if (q.startsWith("SELECT id, name, email FROM users WHERE email = ?")) return [db.users.filter((u) => u.email === p[0])];
  if (q.startsWith("SELECT name, email FROM users WHERE id = ?")) return [db.users.filter((u) => u.id === p[0])];
  if (q.startsWith("SELECT id, name, email, role, created_at, UNIX_TIMESTAMP(password_changed_at) AS pwc FROM users WHERE id = ?"))
    return [db.users.filter((u) => u.id === p[0]).map((u) => ({ ...u, pwc: u.password_changed_at ?? null }))];
  if (q.startsWith("INSERT INTO users")) {
    if (db.users.some((u) => u.email === p[1])) { const e = new Error("dup"); e.code = "ER_DUP_ENTRY"; throw e; }
    const u = { id: db.nextUser++, name: p[0], email: p[1], password: p[2], role: "user", newsletter: p[3], password_changed_at: null, created_at: new Date(fake.now()) };
    db.users.push(u);
    return [{ insertId: u.id, affectedRows: 1 }];
  }
  if (q.startsWith("UPDATE users SET password = ?, password_changed_at = NOW() WHERE id = ?")) {
    const u = db.users.find((x) => x.id === p[1]);
    u.password = p[0]; u.password_changed_at = sec();
    return [{ affectedRows: 1 }];
  }

  // ---- password_resets ----
  if (q.startsWith("DELETE FROM password_resets WHERE user_id = ? OR expires_at <")) {
    const before = db.resets.length;
    db.resets = db.resets.filter((r) => !(r.user_id === p[0] || r.expires_at < sec() - 86400));
    return [{ affectedRows: before - db.resets.length }];
  }
  if (q.startsWith("INSERT INTO password_resets")) {
    if (db.resets.some((r) => r.token_hash === p[1])) throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
    db.resets.push({ id: db.nextReset++, user_id: p[0], token_hash: p[1], expires_at: sec() + p[2] * 60, used_at: null });
    return [{ insertId: db.nextReset - 1, affectedRows: 1 }];
  }
  if (q.startsWith("SELECT id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()"))
    return [db.resets.filter((r) => r.token_hash === p[0] && r.used_at === null && r.expires_at > sec())];
  if (q.startsWith("UPDATE password_resets SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()")) {
    const r = db.resets.find((x) => x.token_hash === p[0] && x.used_at === null && x.expires_at > sec());
    if (r) r.used_at = sec();
    return [{ affectedRows: r ? 1 : 0 }];
  }
  if (q.startsWith("SELECT user_id FROM password_resets WHERE token_hash = ?")) return [db.resets.filter((r) => r.token_hash === p[0])];
  if (q.startsWith("DELETE FROM password_resets WHERE user_id = ? AND token_hash <> ?")) {
    db.resets = db.resets.filter((r) => !(r.user_id === p[0] && r.token_hash !== p[1]));
    return [{}];
  }
  throw new Error("fake DB: unsupported SQL -> " + q);
}

const conn = {
  execute: async (s, p) => run(s, p),
  query: async (s, p) => run(s, p),
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
};
export default { createPool: () => ({ ...conn, getConnection: async () => conn }) };
