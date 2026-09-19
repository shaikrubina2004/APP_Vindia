-- =====================================================
-- FILE: APP_Vindia/backend/migrations/createProcurementDailyReportsTable.sql
-- Run this once against the Supabase Postgres project.
-- =====================================================

CREATE TABLE IF NOT EXISTS procurement_daily_reports (
  id SERIAL PRIMARY KEY,
  officer_id INTEGER REFERENCES users(id),
  report_date DATE NOT NULL,
  po_followups JSONB DEFAULT '[]',
  vendor_calls JSONB DEFAULT '[]',
  pending_approvals JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (officer_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_procurement_daily_reports_officer_date
  ON procurement_daily_reports(officer_id, report_date);