CREATE DATABASE IF NOT EXISTS leaguescore;
USE leaguescore;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(190) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  newsletter TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
);
