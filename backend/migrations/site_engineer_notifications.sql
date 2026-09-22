-- FILE PATH: backend/migrations/site_engineer_notifications.sql
-- Per-user notification table for the Site Engineer role, following the
-- same shape as operations_notifications (see operationsNotificationsController.js)
-- rather than the older role-broadcast `notifications` table used by
-- Structural Engineer / QS / MEP / Architect / PC.

CREATE TABLE IF NOT EXISTS site_engineer_notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50)  NOT NULL DEFAULT 'work',
  title       TEXT         NOT NULL,
  description TEXT,
  link        TEXT,
  severity    VARCHAR(20)  NOT NULL DEFAULT 'info',
  project_id  INTEGER,
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_engineer_notifications_user
  ON site_engineer_notifications (user_id, created_at DESC);
