-- Role-based auth + Forgot Password migration.
-- NOTE: App pehli request par ye sab KHUD kar deti hai (lib/authTables.mjs), isliye ye file sirf manual
-- (phpMyAdmin) use ke liye hai. Agar column pehle se ho to "Duplicate column name" error aayega -- ignore karo.

ALTER TABLE users ADD COLUMN role ENUM('admin','user') NOT NULL DEFAULT 'user' AFTER password;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL;

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
);

-- Pehla admin banane ke liye (apni email likho). Ya terminal se:  npm run make-admin -- you@email.com admin
-- UPDATE users SET role = 'admin' WHERE email = 'you@email.com';
