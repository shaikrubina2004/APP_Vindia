-- FILE: backend/migrations/addDiaryApprovalColumns.sql  (idempotent)
-- Run: npm run migrate:diary
-- Lets the Project Manager mark a Site Engineer's daily diary as reviewed.
ALTER TABLE site_engineer_daily_updates
  ADD COLUMN IF NOT EXISTS approved    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_se_daily_updates_project_date ON site_engineer_daily_updates (project_id, report_date DESC);
