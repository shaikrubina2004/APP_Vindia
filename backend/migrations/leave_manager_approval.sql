BEGIN;

ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_comment TEXT;

CREATE INDEX IF NOT EXISTS idx_leaves_reviewed_by
  ON public.leaves(reviewed_by);

COMMIT;
