-- Per-person team activity feed. The floating "My Project Team" widget reads it to show a badge and
-- pop-out alerts. Safe to run more than once. Run after team_management_roster.sql.
DO $$
DECLARE
  user_type text := 'integer';
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO user_type
      FROM pg_attribute a
     WHERE a.attrelid = 'public.users'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  END IF;
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.team_activity (
       id          SERIAL PRIMARY KEY,
       user_id     %s NOT NULL,
       project_id  INTEGER,
       kind        VARCHAR(20)  NOT NULL DEFAULT ''team'',
       title       VARCHAR(160) NOT NULL,
       description TEXT,
       severity    VARCHAR(20)  NOT NULL DEFAULT ''info'',
       is_seen     BOOLEAN      NOT NULL DEFAULT FALSE,
       created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
     )', user_type);
END $$;

CREATE INDEX IF NOT EXISTS idx_team_activity_user   ON team_activity (user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_unseen ON team_activity (user_id) WHERE is_seen = FALSE;
