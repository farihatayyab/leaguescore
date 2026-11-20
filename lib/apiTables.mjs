// API keys / request logs / attribution violations tables (schema.sql jaisi hi).
// .mjs hai taake scripts/create-api-key.mjs bhi import kar sake.
export const API_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS api_keys (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    key_prefix      VARCHAR(16)  NOT NULL,
    key_hash        CHAR(64)     NOT NULL UNIQUE,
    owner_name      VARCHAR(120) NOT NULL DEFAULT '',
    owner_email     VARCHAR(190) NOT NULL DEFAULT '',
    allowed_domains TEXT NULL,
    status          ENUM('active','suspended','revoked') NOT NULL DEFAULT 'active',
    notes           VARCHAR(255) NOT NULL DEFAULT '',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at    TIMESTAMP NULL DEFAULT NULL,
    KEY idx_prefix (key_prefix)
  )`,
  `CREATE TABLE IF NOT EXISTS api_request_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_key_id  INT NULL,
    key_prefix  VARCHAR(16)  NOT NULL DEFAULT '',
    endpoint    VARCHAR(190) NOT NULL,
    method      VARCHAR(10)  NOT NULL,
    status_code SMALLINT     NOT NULL DEFAULT 0,
    origin      VARCHAR(255) NOT NULL DEFAULT '',
    referer     VARCHAR(500) NOT NULL DEFAULT '',
    caller_host VARCHAR(190) NOT NULL DEFAULT '',
    ip          VARCHAR(64)  NOT NULL DEFAULT '',
    user_agent  VARCHAR(255) NOT NULL DEFAULT '',
    first_party TINYINT(1)   NOT NULL DEFAULT 0,
    flags       VARCHAR(190) NOT NULL DEFAULT '',
    blocked     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_key (api_key_id, created_at),
    KEY idx_host (caller_host, created_at),
    KEY idx_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS attribution_violations (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_key_id  INT NULL,
    key_prefix  VARCHAR(16)  NOT NULL DEFAULT '',
    reason      VARCHAR(60)  NOT NULL,
    page_url    VARCHAR(500) NOT NULL DEFAULT '',
    caller_host VARCHAR(190) NOT NULL DEFAULT '',
    ip          VARCHAR(64)  NOT NULL DEFAULT '',
    user_agent  VARCHAR(255) NOT NULL DEFAULT '',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_host (caller_host, created_at),
    KEY idx_key (api_key_id, created_at)
  )`,
];
