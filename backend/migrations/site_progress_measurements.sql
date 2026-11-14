ALTER TABLE site_progress
  ADD COLUMN IF NOT EXISTS morning_note TEXT;

CREATE TABLE IF NOT EXISTS site_progress_measurements (
  id SERIAL PRIMARY KEY,
  progress_id INTEGER NOT NULL REFERENCES site_progress(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'sqft',
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_progress_measurements_progress_id
  ON site_progress_measurements(progress_id);
