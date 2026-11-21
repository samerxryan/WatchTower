-- Indexes supporting the global activity feed, deadline sweeps and user lookups.

CREATE INDEX idx_activity_created_at ON activity_logs (created_at);
CREATE INDEX idx_activity_actor_created ON activity_logs (actor_id, created_at);
CREATE INDEX idx_projects_due_date ON projects (due_date);
CREATE INDEX idx_users_active_role ON users (is_active, role);
