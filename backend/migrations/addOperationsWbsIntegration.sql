-- ============================================================
-- FILE: APP_Vindia/backend/migrations/addOperationsWbsIntegration.sql
--
-- Purpose:
--   Connect the existing shared WBS to Material Requests and
--   Purchase Orders without creating a second Operations WBS.
--
-- IMPORTANT:
--   - Existing historical records are NOT automatically assigned a WBS.
--   - New Material Requests created through the updated Site Engineer
--     screen must provide project_id + wbs_id.
--   - Purchase Orders inherit project_id + wbs_id from the approved
--     Material Request on the server.
--   - Run manually. Do NOT add this migration to server startup.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- MATERIAL REQUESTS
-- ------------------------------------------------------------

ALTER TABLE material_requests
  ADD COLUMN IF NOT EXISTS project_id INTEGER
    REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS wbs_id INTEGER
    REFERENCES wbs(id);

CREATE INDEX IF NOT EXISTS idx_material_requests_project_id
  ON material_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_material_requests_wbs_id
  ON material_requests(wbs_id);

-- ------------------------------------------------------------
-- PURCHASE ORDERS
-- ------------------------------------------------------------

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS wbs_id INTEGER
    REFERENCES wbs(id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_wbs_id
  ON purchase_orders(wbs_id);

-- ------------------------------------------------------------
-- DATA-INTEGRITY NOTES
-- ------------------------------------------------------------
-- We intentionally do NOT backfill project_id / wbs_id for historical
-- material_requests or purchase_orders.
--
-- Existing material_requests.project is free text, so guessing a project
-- from its display name could attach a request to the wrong project when
-- names are duplicated or changed.
--
-- The application validates:
--   material_requests.project_id -> projects.id
--   material_requests.wbs_id     -> wbs.id
--   wbs.project_id               = material_requests.project_id
--
-- Purchase orders inherit both values from the approved material request.

COMMIT;
