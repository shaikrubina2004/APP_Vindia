-- Operations integration compatibility migration.
-- IMPORTANT: this does NOT create a second office_assets table. It extends
-- the existing Office Administration tables already used by this project.
-- Run manually from backend: node migrations/operationsIntegrationCompatibility.sql
-- (or paste into Supabase SQL editor).

BEGIN;

-- Material request audit fields required by the Operations approval workflow.
ALTER TABLE material_requests
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Purchase-order approval/pricing fields.
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(14,2);

-- Existing office_requests table: add Operations fields without dropping the
-- original request_type/requested_by/due_date workflow.
ALTER TABLE office_requests
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS requested_by_name TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS needed_by DATE,
  ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

UPDATE office_requests
SET category = COALESCE(category, request_type),
    needed_by = COALESCE(needed_by, due_date)
WHERE category IS NULL OR needed_by IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='office_requests'::regclass AND conname='office_requests_status_check') THEN
    ALTER TABLE office_requests DROP CONSTRAINT office_requests_status_check;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

ALTER TABLE office_requests
  ADD CONSTRAINT office_requests_status_check
  CHECK (status IN ('pending','approved','rejected','in_progress','completed','cancelled','open','awaiting_approval','resolved','closed'));

-- Existing visitor table: aliases used by the Operations UI, while retaining
-- host_user_id/contact/checked_in_at/checked_out_at for the existing module.
ALTER TABLE office_visitors
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS badge_no TEXT,
  ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ;

UPDATE office_visitors
SET phone = COALESCE(phone, contact),
    check_in = COALESCE(check_in, checked_in_at),
    check_out = COALESCE(check_out, checked_out_at)
WHERE phone IS NULL OR check_in IS NULL OR check_out IS NULL;

-- Existing administrative_assets table: Operations aliases and purchase cost.
ALTER TABLE administrative_assets
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS serial_no TEXT,
  ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

UPDATE administrative_assets
SET name = COALESCE(name, asset_name),
    serial_no = COALESCE(serial_no, serial_number)
WHERE name IS NULL OR serial_no IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='administrative_assets'::regclass AND conname='administrative_assets_status_check') THEN
    ALTER TABLE administrative_assets DROP CONSTRAINT administrative_assets_status_check;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

ALTER TABLE administrative_assets
  ADD CONSTRAINT administrative_assets_status_check
  CHECK (status IN ('available','assigned','maintenance','retired','lost'));

COMMIT;
