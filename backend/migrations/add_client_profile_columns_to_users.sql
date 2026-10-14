-- backend/migrations/add_client_profile_columns_to_users.sql
-- Standalone, idempotent migration for the CEO "Create Client" feature.
--
-- WHY: a client is a row in `users` with the `client` role (no separate clients
-- table). The CEO form captures contact person, phone, company name, address,
-- GSTIN and notes, and `users` has no confirmed columns for them.
--
-- Only nullable TEXT columns are added; nothing is dropped, renamed or rewritten,
-- and existing rows (employees, other roles) are untouched. If your `users` table
-- already has `phone` (or `mobile` / `phone_number`) that column is reused and
-- no extra phone column is created.
--
-- Run (from /backend):
--   node scripts/runSqlMigration.js migrations/add_client_profile_columns_to_users.sql
-- or paste into the Supabase SQL editor. Then RESTART the backend (the Client
-- Management list caches the users column list on first request).

ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address        TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes          TEXT;

DO $phone$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'users'
      AND column_name IN ('phone', 'mobile', 'phone_number')
  ) THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
  END IF;
END
$phone$;

-- Optional speed-up for the duplicate-email check (safe to run repeatedly).
CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));