-- ═══════════════════════════════════════════════════════════
-- migration_full_workflow.sql
-- Complete schema for: BOQ → Measurement → QR → CR → Finalise
-- Safe to run multiple times (IF NOT EXISTS / DO $$ blocks)
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. BOQ STATUS ENUM UPDATE
--    New flow: pending_measurement → measurement_submitted
--              → pending_pm → pending_se
--              → finalised | rejected
-- ──────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Add new status values to boqs.status if column is VARCHAR
  -- (if it's an ENUM, alter the enum instead)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='boqs' AND column_name='status'
  ) THEN
    -- boqs table will be created by boqController auto-create
    NULL;
  END IF;
END $$;

-- Add missing columns to boqs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boqs' AND column_name='rejected_reason') THEN
    ALTER TABLE boqs ADD COLUMN rejected_reason TEXT DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boqs' AND column_name='measurement_id') THEN
    ALTER TABLE boqs ADD COLUMN measurement_id INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boqs' AND column_name='labour_rows') THEN
    ALTER TABLE boqs ADD COLUMN labour_rows JSONB NOT NULL DEFAULT '[]';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boqs' AND column_name='material_total') THEN
    ALTER TABLE boqs ADD COLUMN material_total NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boqs' AND column_name='labour_total') THEN
    ALTER TABLE boqs ADD COLUMN labour_total NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 2. MEASUREMENTS TABLE
--    SE submits actual measurements against a BOQ.
--    Each measurement has line items with L × B × H formula.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
  id             SERIAL       PRIMARY KEY,
  ref_no         VARCHAR(30)  UNIQUE,
  boq_id         INTEGER      REFERENCES boqs(id) ON DELETE SET NULL,
  project_id     INTEGER      REFERENCES projects(id) ON DELETE SET NULL,
  milestone_id   INTEGER,
  submitted_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  date           DATE         NOT NULL DEFAULT CURRENT_DATE,
  zone           TEXT         DEFAULT '',
  activity       TEXT         DEFAULT '',
  notes          TEXT         DEFAULT '',
  status         VARCHAR(30)  NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','submitted','approved','rejected')),
  rejected_reason TEXT        DEFAULT '',
  labour_report_id INTEGER,
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 3. MEASUREMENT_ITEMS TABLE
--    One row per material line in the measurement sheet.
--    Net Qty = (Length × Breadth × Height × No.) − Deductions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurement_items (
  id              SERIAL         PRIMARY KEY,
  measurement_id  INTEGER        NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  material        TEXT           NOT NULL,
  unit            VARCHAR(20)    DEFAULT 'sqm',
  -- Dimensions
  no_of_items     NUMERIC(10,3)  DEFAULT 1,
  length          NUMERIC(14,4)  DEFAULT 0,
  breadth         NUMERIC(14,4)  DEFAULT 0,
  height          NUMERIC(14,4)  DEFAULT 0,
  -- Computed
  gross_qty       NUMERIC(14,4)  DEFAULT 0,   -- no × L × B × H
  deductions      NUMERIC(14,4)  DEFAULT 0,
  net_qty         NUMERIC(14,4)  DEFAULT 0,   -- gross − deductions
  -- Reference
  boq_qty         NUMERIC(14,4)  DEFAULT 0,   -- from BOQ for comparison
  remarks         TEXT           DEFAULT '',
  sort_order      INTEGER        DEFAULT 0
);

-- ──────────────────────────────────────────────────────────
-- 4. QUANTITY_REPORTS TABLE
--    QS creates from measurement data.
--    Contains comparison: BOQ qty vs measured qty.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quantity_reports (
  id              SERIAL        PRIMARY KEY,
  boq_id          INTEGER       REFERENCES boqs(id) ON DELETE SET NULL,
  measurement_id  INTEGER       REFERENCES measurements(id) ON DELETE SET NULL,
  project_id      INTEGER       REFERENCES projects(id) ON DELETE SET NULL,
  project_name    VARCHAR(255)  DEFAULT '',
  milestone_id    INTEGER,
  milestone_name  VARCHAR(255)  DEFAULT '',
  -- Items stored as JSONB (material, unit, boq_qty, measured_qty, variance, variance_pct)
  items           JSONB         NOT NULL DEFAULT '[]',
  -- Labour details from BOQ
  labour_items    JSONB         NOT NULL DEFAULT '[]',
  labour_cost     NUMERIC(15,2) DEFAULT 0,
  total_items     INTEGER       DEFAULT 0,
  status          VARCHAR(30)   NOT NULL DEFAULT 'pending_se'
                  CHECK (status IN ('pending_se','approved','rejected')),
  se_comment      TEXT          DEFAULT '',
  rejected_reason TEXT          DEFAULT '',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 5. QUANTITY_REPORT_ITEMS (normalised — optional supplement)
--    Alternative to JSONB items column for complex queries
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quantity_report_items (
  id            SERIAL        PRIMARY KEY,
  qr_id         INTEGER       NOT NULL REFERENCES quantity_reports(id) ON DELETE CASCADE,
  material      TEXT          NOT NULL,
  unit          VARCHAR(20)   DEFAULT 'sqm',
  boq_qty       NUMERIC(14,4) DEFAULT 0,
  measured_qty  NUMERIC(14,4) DEFAULT 0,
  variance      NUMERIC(14,4) GENERATED ALWAYS AS (measured_qty - boq_qty) STORED,
  variance_pct  NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN boq_qty = 0 THEN 0
         ELSE ROUND(((measured_qty - boq_qty) / boq_qty) * 100, 2)
    END
  ) STORED,
  remarks       TEXT          DEFAULT ''
);

-- ──────────────────────────────────────────────────────────
-- 6. LABOUR_REPORT + LABOUR_REPORT_TRADES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labour_report (
  id              SERIAL       PRIMARY KEY,
  date            DATE         NOT NULL,
  shift           VARCHAR(20)  DEFAULT 'day',
  weather         VARCHAR(30)  DEFAULT 'clear',
  notes           TEXT         DEFAULT '',
  total_headcount INT          DEFAULT 0,
  project_id      INT          REFERENCES projects(id) ON DELETE SET NULL,
  milestone_id    INT,
  submitted_by    INT          REFERENCES users(id) ON DELETE SET NULL,
  status          VARCHAR(20)  DEFAULT 'submitted'
                  CHECK (status IN ('submitted','acknowledged','flagged')),
  pm_comment      TEXT         DEFAULT '',
  submitted_at    TIMESTAMPTZ  DEFAULT NOW(),
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labour_report_trades (
  id          SERIAL  PRIMARY KEY,
  report_id   INT     NOT NULL REFERENCES labour_report(id) ON DELETE CASCADE,
  trade       TEXT    NOT NULL,
  count       INT     NOT NULL DEFAULT 0,
  contractor  TEXT    DEFAULT '',
  zone        TEXT    DEFAULT '',
  activity    TEXT    DEFAULT ''
);

-- ──────────────────────────────────────────────────────────
-- 7. INDEXES
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_measurements_boq_id       ON measurements(boq_id);
CREATE INDEX IF NOT EXISTS idx_measurements_project_id   ON measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_measurements_status       ON measurements(status);
CREATE INDEX IF NOT EXISTS idx_measurements_submitted_by ON measurements(submitted_by);
CREATE INDEX IF NOT EXISTS idx_meas_items_meas_id        ON measurement_items(measurement_id);
CREATE INDEX IF NOT EXISTS idx_qr_boq_id                 ON quantity_reports(boq_id);
CREATE INDEX IF NOT EXISTS idx_qr_measurement_id         ON quantity_reports(measurement_id);
CREATE INDEX IF NOT EXISTS idx_qr_status                 ON quantity_reports(status);
CREATE INDEX IF NOT EXISTS idx_qri_qr_id                 ON quantity_report_items(qr_id);
CREATE INDEX IF NOT EXISTS idx_lr_date                   ON labour_report(date);
CREATE INDEX IF NOT EXISTS idx_lr_project                ON labour_report(project_id);
CREATE INDEX IF NOT EXISTS idx_lrt_report_id             ON labour_report_trades(report_id);
CREATE INDEX IF NOT EXISTS idx_boqs_status               ON boqs(status);
CREATE INDEX IF NOT EXISTS idx_boqs_project              ON boqs(project_id);

-- ──────────────────────────────────────────────────────────
-- 8. VERIFY
-- ──────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'boqs','measurements','measurement_items',
    'quantity_reports','quantity_report_items',
    'labour_report','labour_report_trades'
  )
ORDER BY table_name;