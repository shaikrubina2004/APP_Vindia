-- =====================================================
-- FILE: APP_Vindia/backend/migrations/createPurchaseOrdersTables.sql
-- Run this once against the Supabase Postgres project.
-- Depends on: vendors, projects, users, material_requests (all already exist).
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_code TEXT UNIQUE NOT NULL,
  material_request_id INTEGER REFERENCES material_requests(id),
  vendor_id INTEGER REFERENCES vendors(id),
  project_id INTEGER REFERENCES projects(id),
  status TEXT DEFAULT 'issued',  -- issued, partially_fulfilled, fulfilled, cancelled
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  unit TEXT,
  ordered_qty NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_material_request_id
  ON purchase_orders(material_request_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id
  ON purchase_order_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON purchase_orders(status);

-- =====================================================
-- PENDING — DO NOT RUN YET
-- Only run this once the Logistics module's `deliveries` table actually
-- exists. As of this audit (Sept 2026), `deliveries` is not in the schema.
-- =====================================================
-- ALTER TABLE deliveries ADD COLUMN purchase_order_id INTEGER REFERENCES purchase_orders(id);