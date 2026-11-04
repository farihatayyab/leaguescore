import { pool } from "./db";

let ready;
export function ensureMessagesTable() {
  ready ||= pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      kind       VARCHAR(20)  NOT NULL DEFAULT 'contact',
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(190) NOT NULL DEFAULT '',
      subject    VARCHAR(150) NOT NULL DEFAULT '',
      category   VARCHAR(60)  NOT NULL DEFAULT '',
      message    TEXT         NOT NULL,
      ip         VARCHAR(64)  NOT NULL DEFAULT '',
      is_read    TINYINT(1)   NOT NULL DEFAULT 0,
      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_created (created_at)
    )`);
  return ready;
}

export async function listMessages(limit = 200) {
  await ensureMessagesTable();
  const [rows] = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC, id DESC LIMIT ?", [limit]);
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}
