-- FILE PATH: backend/migrations/rfi_system.sql
-- Run ONCE in Supabase SQL editor

CREATE TABLE IF NOT EXISTS rfis (
  id               SERIAL PRIMARY KEY,
  subject          VARCHAR(255)  NOT NULL,
  description      TEXT,
  priority         VARCHAR(20)   DEFAULT 'medium',
  status           VARCHAR(30)   DEFAULT 'open',
  raised_by_role   VARCHAR(60)   NOT NULL,
  raised_by_name   VARCHAR(120),
  raised_by_id     INTEGER,
  assigned_to_role VARCHAR(60)   NOT NULL,
  project_name     VARCHAR(200),
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfi_responses (
  id              SERIAL PRIMARY KEY,
  rfi_id          INTEGER      NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,
  responder_role  VARCHAR(60)  NOT NULL,
  responder_name  VARCHAR(120),
  responder_id    INTEGER,
  message         TEXT         NOT NULL,
  file_url        VARCHAR(500),
  file_name       VARCHAR(255),
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfis_assigned ON rfis (assigned_to_role, status);
CREATE INDEX IF NOT EXISTS idx_rfis_raised   ON rfis (raised_by_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfi_responses ON rfi_responses (rfi_id, created_at ASC);