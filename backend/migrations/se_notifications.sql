-- FILE PATH: backend/migrations/se_notifications.sql
-- Run once against your Supabase / PostgreSQL database.
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Ensure the notifications table exists with the full schema
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  role        VARCHAR(50)  NOT NULL,          -- e.g. 'structural_engineer'
  type        VARCHAR(50)  NOT NULL,          -- drawing | rfi | incident | boq | task | approval | work
  severity    VARCHAR(20)  DEFAULT 'info',    -- critical | warn | info | ok
  message     TEXT         NOT NULL,          -- short title / headline
  description TEXT,                           -- longer detail line (nullable = falls back to message)
  is_read     BOOLEAN      DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Add description column if an older version of the table is missing it
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Index for fast unread queries per role
CREATE INDEX IF NOT EXISTS idx_notifications_role_unread
  ON notifications (role, is_read, created_at DESC);

-- 4. Optional: seed one test notification so you can verify the bell works
-- INSERT INTO notifications (role, type, severity, message, description)
-- VALUES ('structural_engineer','drawing','info','Test notification','This is a seed row – delete after testing');