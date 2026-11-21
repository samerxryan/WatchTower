-- Authentication sessions, notification preferences, and structured notification payloads
-- BigInt identifiers are used consistently across the schema.

ALTER TABLE users
  ADD COLUMN notification_prefs JSON NULL AFTER preferred_theme;

ALTER TABLE notifications
  ADD COLUMN payload JSON NULL AFTER message;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  last_used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_sessions_token (token_hash),
  INDEX idx_user_sessions_user_active (user_id, revoked_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reset_tokens_user_active
  ON password_reset_tokens (user_id, used_at, expires_at);
