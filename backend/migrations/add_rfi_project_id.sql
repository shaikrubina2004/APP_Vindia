-- Add durable project linkage for client and staff RFIs.
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS project_id INTEGER;

-- Backfill only unambiguous project-name matches; duplicate names need manual mapping.
UPDATE rfis r
   SET project_id = matches.id
  FROM (
    SELECT LOWER(TRIM(name)) AS project_name, MIN(id) AS id
      FROM projects
     GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) = 1
  ) matches
 WHERE r.project_id IS NULL
   AND LOWER(TRIM(r.project_name)) = matches.project_name;

CREATE INDEX IF NOT EXISTS idx_rfis_project_id ON rfis (project_id);
