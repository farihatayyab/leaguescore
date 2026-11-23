// users (role ke sath) aur password_resets tables. Ye file app (lib/db.js) aur scripts dono use karte hain,
// isliye .mjs hai. Purani users table par naye columns khud add ho jate hain (migration).
export const USERS_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(190) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL,
    role                ENUM('admin','user') NOT NULL DEFAULT 'user',
    newsletter          TINYINT(1) NOT NULL DEFAULT 1,
    password_changed_at TIMESTAMP NULL DEFAULT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`;

// Purani tables ke liye (columns pehle se hon to error 1060 ignore hota hai)
export const USERS_ALTERS = [
  "ALTER TABLE users ADD COLUMN role ENUM('admin','user') NOT NULL DEFAULT 'user' AFTER password",
  "ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL",
];

// Reset token ka sirf SHA-256 hash save hota hai (raw token sirf email mein jata hai)
export const PASSWORD_RESETS_SQL = `
  CREATE TABLE IF NOT EXISTS password_resets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at    DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    KEY idx_expires (expires_at),
    CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

export async function migrateAuthSchema(db) {
  await db.query(USERS_SQL);
  for (const sql of USERS_ALTERS) {
    try {
      await db.query(sql);
    } catch (e) {
      if (e?.errno !== 1060 && e?.code !== "ER_DUP_FIELDNAME") throw e;
    }
  }
  await db.query(PASSWORD_RESETS_SQL);
}
