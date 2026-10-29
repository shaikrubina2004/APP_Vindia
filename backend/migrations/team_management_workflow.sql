-- Team Management workflow extension. Run manually against the correct database before deploying the updated controller.
-- Intentionally does not create or modify the main `incidents` table.

ALTER TABLE team_incidents
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS due_date DATE NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL;

ALTER TABLE team_tasks
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Keep the denormalized count aligned with active tasks.
UPDATE team_members tm
SET tasks_count = COALESCE((
  SELECT COUNT(*)::int FROM team_tasks tt
  WHERE tt.member_id = tm.id AND COALESCE(tt.status, 'Pending') <> 'Completed'
), 0);

CREATE INDEX IF NOT EXISTS idx_team_incidents_member_created
  ON team_incidents (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_incidents_status_due
  ON team_incidents (status, due_date);
CREATE INDEX IF NOT EXISTS idx_team_tasks_member_status_due
  ON team_tasks (member_id, status, due_date);
