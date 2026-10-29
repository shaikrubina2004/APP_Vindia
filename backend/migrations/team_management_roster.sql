-- Lets a team member be linked to a labour-registry worker or an HR employee, so the same person
-- is never listed twice. Safe to run more than once. Run after team_management_fixes.sql.
DO $$
DECLARE
  emp_type    text;
  worker_type text := 'integer';
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO emp_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.employees'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  IF emp_type IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS employee_id %s', emp_type);
  END IF;

  IF to_regclass('public.workers') IS NOT NULL THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO worker_type
      FROM pg_attribute a
     WHERE a.attrelid = 'public.workers'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  END IF;
  EXECUTE format('ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS worker_id %s', worker_type);
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_members_project_worker
  ON team_members (project_id, worker_id) WHERE worker_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_members_project_employee
  ON team_members (project_id, employee_id) WHERE employee_id IS NOT NULL;
