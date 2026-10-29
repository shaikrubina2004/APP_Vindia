-- Team Management fixes. Safe to run more than once. Run before deploying the updated controller.

-- 1. Crew hours: pmReportController already reads team_members.hours, now Team Management writes it.
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS hours NUMERIC(8,2) NOT NULL DEFAULT 0;

-- 2. Wage/hours must hold decimals (e.g. 650.50). Only widens a column that is currently an integer type.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'team_members' AND column_name = 'wage'
               AND data_type IN ('smallint', 'integer', 'bigint')) THEN
    ALTER TABLE team_members ALTER COLUMN wage TYPE NUMERIC(12,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'team_members' AND column_name = 'hours'
               AND data_type IN ('smallint', 'integer', 'bigint')) THEN
    ALTER TABLE team_members ALTER COLUMN hours TYPE NUMERIC(8,2);
  END IF;
END $$;

-- 3. tasks_count counted Cancelled tasks as open work (team_management_workflow.sql only excluded Completed).
UPDATE team_members tm
SET tasks_count = COALESCE((
  SELECT COUNT(*)::int FROM team_tasks tt
  WHERE tt.member_id = tm.id AND COALESCE(tt.status, 'Pending') NOT IN ('Completed', 'Cancelled')
), 0);
