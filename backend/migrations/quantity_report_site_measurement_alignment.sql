BEGIN;

-- The live workflow is:
-- Site Engineer -> site_measurements -> QS quantity_reports -> SE approval.
-- Keep legacy measurements/measurement_id columns for historical data, but
-- make site_measurement_id the authoritative source for new reports.

CREATE TABLE IF NOT EXISTS public.site_measurements (
    id                SERIAL PRIMARY KEY,
    boq_id            INTEGER NOT NULL,
    project_id        INTEGER NOT NULL,
    project_name      VARCHAR(255) NOT NULL DEFAULT '',
    milestone_id      INTEGER NOT NULL,
    milestone_name    VARCHAR(255) NOT NULL DEFAULT '',
    labour_report_id  INTEGER,
    daily_diary_id    INTEGER,
    submitted_by      VARCHAR(255) NOT NULL DEFAULT 'Site Engineer',
    submitted_at      TIMESTAMPTZ DEFAULT NOW(),
    date              DATE NOT NULL DEFAULT CURRENT_DATE,
    zone              VARCHAR(255) NOT NULL DEFAULT '',
    activity          VARCHAR(255) NOT NULL DEFAULT '',
    notes             TEXT DEFAULT '',
    items             JSONB NOT NULL DEFAULT '[]'::jsonb,
    status            VARCHAR(20) NOT NULL DEFAULT 'submitted',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_measurements
    ADD COLUMN IF NOT EXISTS labour_report_id INTEGER,
    ADD COLUMN IF NOT EXISTS daily_diary_id INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'submitted';

ALTER TABLE public.quantity_reports
    ADD COLUMN IF NOT EXISTS site_measurement_id INTEGER,
    ADD COLUMN IF NOT EXISTS generated_from TEXT DEFAULT 'measurement',
    ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS measurement_date DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'quantity_reports_site_measurement_id_fkey'
    ) THEN
        ALTER TABLE public.quantity_reports
            ADD CONSTRAINT quantity_reports_site_measurement_id_fkey
            FOREIGN KEY (site_measurement_id)
            REFERENCES public.site_measurements(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_measurements_project_id
    ON public.site_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_site_measurements_status
    ON public.site_measurements(status);
CREATE INDEX IF NOT EXISTS idx_qr_site_measurement_id
    ON public.quantity_reports(site_measurement_id);

COMMIT;
