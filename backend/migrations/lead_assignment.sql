-- Lead assignment + escalation (also applied automatically on server start
-- by utils/leadAssignment.js → ensureLeadAssignmentSchema). Safe to re-run.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_email   TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by      TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_assignee    TEXT;

-- Meta webhook used to write the literal string 'Unassigned'
UPDATE leads SET assigned_to = NULL
 WHERE assigned_to IS NOT NULL AND LOWER(TRIM(assigned_to)) = 'unassigned';

CREATE INDEX IF NOT EXISTS idx_leads_assigned_email ON leads (LOWER(assigned_email));
CREATE INDEX IF NOT EXISTS idx_bda_notif_lead_type  ON bda_notifications (lead_id, type);