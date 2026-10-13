-- =====================================================================
-- FILE: APP_Vindia/backend/migrations/operationsSchema.sql
--
-- Logistics / Inventory / Goods-Receipt schema — IDEMPOTENT (safe to re-run).
--   Run:  cd backend && npm run migrate:ops
--
-- WHY: deliveries, delivery_items, goods_receipts, goods_receipt_items,
-- inventory_items, inventory_transactions and the views stock_register /
-- stock_overview were created by hand in Supabase and never committed, so a
-- fresh database (new developer, staging, CI) could not run the app. This file
-- reconstructs them from what the code reads/writes. It only ADDS what is
-- missing and never alters or drops existing columns, data or views.
--
-- RUN ORDER on a brand-new database:
--   1. migrations/createPurchaseOrdersTables.sql
--   2. migrations/operationsSchema.sql                      (this file)
--   3. node migrations/createOfficeAdministrationTables.js
--   4. migrations/operationsIntegrationCompatibility.sql    (extends office + PO/material-request columns)
--   5. migrations/operationsRolesAndDepartment.sql          (five roles, department 3)
--
-- Office tables are NOT created here on purpose: the Office Administration
-- module already owns office_requests / office_visitors / administrative_assets.
-- Depends on: users, projects, vendors, material_requests, purchase_orders.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3. INVENTORY — item master + append-only stock ledger
--    Stock is NEVER stored as a number; it is SUM(quantity) over the ledger.
--    quantity is signed: receipts/returns/transfer-in > 0, issues/transfer-out < 0.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
  id             SERIAL PRIMARY KEY,
  item_code      TEXT UNIQUE NOT NULL,
  item_name      TEXT NOT NULL,
  category       TEXT,
  unit           TEXT NOT NULL,
  description    TEXT,
  minimum_stock  NUMERIC NOT NULL DEFAULT 0,
  maximum_stock  NUMERIC,
  status         TEXT NOT NULL DEFAULT 'active',      -- active | inactive
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id                 SERIAL PRIMARY KEY,
  item_id            INTEGER NOT NULL REFERENCES inventory_items(id),
  project_id         INTEGER REFERENCES projects(id),
  transaction_type   TEXT NOT NULL,   -- RECEIPT | ISSUE | RETURN | TRANSFER_OUT | TRANSFER_IN | ADJUSTMENT
  quantity           NUMERIC NOT NULL,
  reference_type     TEXT,            -- GOODS_RECEIPT | MATERIAL_ISSUE | MATERIAL_RETURN | STOCK_TRANSFER | STOCK_ADJUSTMENT
  reference_id       INTEGER,         -- GRN id, material_request id (issues), paired txn id (transfers)
  linked_project_id  INTEGER REFERENCES projects(id),
  remarks            TEXT,
  created_by         INTEGER REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_txn_item_project ON inventory_transactions (item_id, project_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_created      ON inventory_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_txn_type         ON inventory_transactions (transaction_type);


-- ---------------------------------------------------------------------
-- 4. LOGISTICS — deliveries
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliveries (
  id                   SERIAL PRIMARY KEY,
  delivery_code        TEXT UNIQUE NOT NULL,
  material_request_id  INTEGER REFERENCES material_requests(id),
  purchase_order_id    INTEGER REFERENCES purchase_orders(id),
  project_id           INTEGER REFERENCES projects(id),
  vendor_id            INTEGER REFERENCES vendors(id),
  status               TEXT NOT NULL DEFAULT 'scheduled',
                       -- scheduled | dispatched | in_transit | delivered | delayed | cancelled
  receipt_status       TEXT NOT NULL DEFAULT 'not_received',
                       -- not_received | pending_receipt | received
  expected_date        DATE,
  dispatch_date        DATE,
  delivery_date        DATE,
  vehicle_number       TEXT,
  driver_name          TEXT,
  transporter          TEXT,
  received_by_name     TEXT,
  proof_document_url   TEXT,
  delay_reason         TEXT,
  remarks              TEXT,
  created_by           INTEGER REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Older hand-made copies of the table may lack some of these — add if missing.
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS purchase_order_id   INTEGER REFERENCES purchase_orders(id),
  ADD COLUMN IF NOT EXISTS receipt_status      TEXT DEFAULT 'not_received',
  ADD COLUMN IF NOT EXISTS delay_reason        TEXT,
  ADD COLUMN IF NOT EXISTS proof_document_url  TEXT,
  ADD COLUMN IF NOT EXISTS received_by_name    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS delivery_items (
  id              SERIAL PRIMARY KEY,
  delivery_id     INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES inventory_items(id),
  item_name       TEXT NOT NULL,
  unit            TEXT,
  ordered_qty     NUMERIC NOT NULL DEFAULT 0,
  dispatched_qty  NUMERIC NOT NULL DEFAULT 0,
  delivered_qty   NUMERIC NOT NULL DEFAULT 0,
  damaged_qty     NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status   ON deliveries (status);
CREATE INDEX IF NOT EXISTS idx_deliveries_po       ON deliveries (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_expected ON deliveries (expected_date);
CREATE INDEX IF NOT EXISTS idx_delivery_items_del  ON delivery_items (delivery_id);


-- ---------------------------------------------------------------------
-- 5. GOODS RECEIPTS (Logistics -> Inventory hand-off)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goods_receipts (
  id           SERIAL PRIMARY KEY,
  grn_code     TEXT UNIQUE NOT NULL,
  delivery_id  INTEGER NOT NULL REFERENCES deliveries(id),
  project_id   INTEGER REFERENCES projects(id),
  received_by  INTEGER REFERENCES users(id),
  remarks      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                SERIAL PRIMARY KEY,
  goods_receipt_id  INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  delivery_item_id  INTEGER REFERENCES delivery_items(id),
  item_id           INTEGER NOT NULL REFERENCES inventory_items(id),
  ordered_qty       NUMERIC NOT NULL DEFAULT 0,
  delivered_qty     NUMERIC NOT NULL DEFAULT 0,
  accepted_qty      NUMERIC NOT NULL DEFAULT 0,
  damaged_qty       NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_grn_delivery  ON goods_receipts (delivery_id);
CREATE INDEX IF NOT EXISTS idx_gri_grn       ON goods_receipt_items (goods_receipt_id);


-- ---------------------------------------------------------------------
-- 6. STOCK VIEWS — created ONLY if they do not already exist, so the
--    production definitions are never overwritten.
--    stock_register : available qty per item per project
--    stock_overview : total available qty per item (all projects)
-- ---------------------------------------------------------------------
DO $views$
BEGIN
  IF to_regclass('stock_register') IS NULL THEN
    EXECUTE $sr$
      CREATE VIEW stock_register AS
      SELECT it.id            AS item_id,
             it.item_code,
             it.item_name,
             it.category,
             it.unit,
             it.minimum_stock,
             it.maximum_stock,
             it.status,
             t.project_id,
             COALESCE(SUM(t.quantity), 0)::numeric AS available_qty
      FROM inventory_items it
      JOIN inventory_transactions t ON t.item_id = it.id
      GROUP BY it.id, t.project_id
    $sr$;
  END IF;

  IF to_regclass('stock_overview') IS NULL THEN
    EXECUTE $so$
      CREATE VIEW stock_overview AS
      SELECT it.id            AS item_id,
             it.item_code,
             it.item_name,
             it.category,
             it.unit,
             it.minimum_stock,
             it.maximum_stock,
             it.status,
             COALESCE((SELECT SUM(t.quantity)
                       FROM inventory_transactions t
                       WHERE t.item_id = it.id), 0)::numeric AS total_available_qty
      FROM inventory_items it
    $so$;
  END IF;
END
$views$;


