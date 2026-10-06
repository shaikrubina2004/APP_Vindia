BEGIN;

-- Leave records are the source of truth for Time Sheet blocked days.
ALTER TABLE public.leaves
    ADD COLUMN IF NOT EXISTS leave_type TEXT;

-- Backfill the common legacy reason labels without overwriting data already
-- classified by HR.
UPDATE public.leaves
   SET leave_type = CASE
       WHEN LOWER(TRIM(reason)) LIKE '%sick%' THEN 'sick'
       WHEN LOWER(TRIM(reason)) LIKE '%casual%' THEN 'casual'
       WHEN LOWER(TRIM(reason)) LIKE '%earned%' OR LOWER(TRIM(reason)) LIKE '%annual%' THEN 'earned'
       WHEN LOWER(TRIM(reason)) LIKE '%maternity%' THEN 'maternity'
       WHEN LOWER(TRIM(reason)) LIKE '%paternity%' THEN 'paternity'
       WHEN LOWER(TRIM(reason)) LIKE '%unpaid%' OR LOWER(TRIM(reason)) LIKE '%loss of pay%' THEN 'unpaid'
       ELSE COALESCE(NULLIF(LOWER(TRIM(reason)), ''), 'other')
   END
 WHERE leave_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_leaves_employee_status_dates
    ON public.leaves(employee_id, status, from_date, to_date);

COMMIT;
