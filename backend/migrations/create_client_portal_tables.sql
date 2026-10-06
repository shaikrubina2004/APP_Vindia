-- Client portal tables (idempotent). The backend also creates these on first use,
-- so running this file is optional - it is here so the schema is visible and reviewable.

CREATE TABLE IF NOT EXISTS client_notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER      NOT NULL,
  type         VARCHAR(40)  NOT NULL DEFAULT 'info',
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  link         VARCHAR(255),
  severity     VARCHAR(20)  NOT NULL DEFAULT 'info',
  reference_id INTEGER,
  project_id   INTEGER,
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_notifications_user
  ON client_notifications (user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS project_approvals (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER      NOT NULL,
  title             VARCHAR(255) NOT NULL,
  category          VARCHAR(60)  NOT NULL DEFAULT 'statutory',
  issued_by         VARCHAR(255),
  reference_no      VARCHAR(120),
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('approved','pending','upcoming','rejected')),
  issued_date       DATE,
  valid_until       DATE,
  validity_note     VARCHAR(120),
  description       TEXT,
  document_url      TEXT,
  visible_to_client BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by        INTEGER,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_approvals_project ON project_approvals (project_id);
