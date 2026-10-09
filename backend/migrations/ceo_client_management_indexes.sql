-- backend/migrations/ceo_client_management_indexes.sql
-- OPTIONAL. The CEO Client Management feature needs NO schema change
-- (no new tables or columns). These indexes only speed up the per-client
-- lookups as data grows. Safe to run more than once; changes no data.
-- Run in the Supabase SQL editor.

CREATE INDEX IF NOT EXISTS idx_projects_client_user_id ON projects (client_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id     ON invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id     ON payments (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id     ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id     ON expenses (project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_project_id          ON wbs (project_id);