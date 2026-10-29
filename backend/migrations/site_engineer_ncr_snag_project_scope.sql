BEGIN;

CREATE TABLE IF NOT EXISTS public.ncr (
  id SERIAL PRIMARY KEY,
  raised_by INTEGER,
  project_id INTEGER,
  title VARCHAR(255),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  zone VARCHAR(255),
  assigned_to INTEGER,
  immediate_action TEXT,
  hold_placed BOOLEAN DEFAULT FALSE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium';
ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS immediate_action TEXT;
ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS hold_placed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.ncr ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.ncr
   SET title = LEFT(description, 255)
 WHERE title IS NULL AND description IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'ncr'
       AND column_name = 'priority'
  ) THEN
    EXECUTE 'UPDATE public.ncr SET severity = COALESCE(NULLIF(priority, ''''), ''medium'') WHERE severity = ''medium''';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'ncr'
       AND column_name = 'holdPlaced'
  ) THEN
    EXECUTE 'UPDATE public.ncr SET hold_placed = COALESCE(NULLIF(hold_placed, FALSE), "holdPlaced", FALSE)';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ncr_project_created
  ON public.ncr (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.snags (
  id SERIAL PRIMARY KEY,
  snag_number VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  zone VARCHAR(255),
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  drawing_ref VARCHAR(255),
  grid_ref VARCHAR(255),
  due_date DATE,
  project_id INTEGER,
  raised_by INTEGER,
  raised_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  assigned_to INTEGER,
  assigned_name VARCHAR(255),
  linked_rfi INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS snag_number VARCHAR(50);
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS zone VARCHAR(255);
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'medium';
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS drawing_ref VARCHAR(255);
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS grid_ref VARCHAR(255);
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS raised_by INTEGER;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS raised_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open';
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS assigned_name VARCHAR(255);
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS linked_rfi INTEGER;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_snags_project_id ON public.snags (project_id);

COMMIT;
