-- Keep task history (comments, activity) when a task is deleted.
ALTER TABLE tasks ADD COLUMN deleted_at DATETIME NULL AFTER updated_at;
CREATE INDEX idx_tasks_deleted_at ON tasks (deleted_at);

-- Security audit trail for authentication and administrative actions.
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT NULL,
  action VARCHAR(80) NOT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
