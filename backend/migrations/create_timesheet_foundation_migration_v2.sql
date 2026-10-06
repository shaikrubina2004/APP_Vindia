
BEGIN;

DO $$
DECLARE
    emp_type  text;
    task_type text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod) INTO emp_type
      FROM pg_attribute a
     WHERE a.attrelid = 'public.employees'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

    SELECT format_type(a.atttypid, a.atttypmod) INTO task_type
      FROM pg_attribute a
     WHERE a.attrelid = 'public.tasks'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

    IF emp_type IS NULL THEN
        RAISE EXCEPTION 'public.employees.id not found - create the employees table first';
    END IF;
    IF task_type IS NULL THEN
        RAISE EXCEPTION 'public.tasks.id not found - create the tasks table first';
    END IF;

    -- Reporting line used for approvals: employees.manager_id -> employees.id
    EXECUTE format(
        'ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS manager_id %s REFERENCES public.employees(id) ON DELETE SET NULL',
        emp_type
    );
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id)';

    -- One timesheet per employee per Monday-Sunday week
    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS public.timesheets (
            id                BIGSERIAL PRIMARY KEY,
            employee_id       %1$s NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
            week_start        DATE NOT NULL,
            week_end          DATE NOT NULL,
            status            TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','submitted','under_review','changes_requested',
                                                'resubmitted','approved','rejected','reopened')),
            employee_comment  TEXT,
            submitted_at      TIMESTAMPTZ,
            approved_by       %1$s REFERENCES public.employees(id) ON DELETE SET NULL,
            approved_at       TIMESTAMPTZ,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT timesheets_week_range CHECK (week_end = week_start + 6),
            CONSTRAINT timesheets_employee_week_uniq UNIQUE (employee_id, week_start)
        )$f$, emp_type);

    -- Hours per day per project / WBS / task allocation
    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS public.timesheet_entries (
            id              BIGSERIAL PRIMARY KEY,
            timesheet_id    BIGINT NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
            work_date       DATE NOT NULL,
            project_id      INTEGER,
            wbs_id          INTEGER,
            task_id         %1$s,
            regular_hours   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (regular_hours  BETWEEN 0 AND 24),
            overtime_hours  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overtime_hours BETWEEN 0 AND 24),
            leave_hours     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (leave_hours    BETWEEN 0 AND 24),
            leave_type      TEXT,
            description     TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT timesheet_entries_day_max CHECK (regular_hours + overtime_hours + leave_hours <= 24),
            CONSTRAINT timesheet_entries_leave_type CHECK (leave_hours = 0 OR leave_type IS NOT NULL)
        )$f$, task_type);

    -- Append-only workflow trail (protected by timesheet_audit_hardening.sql)
    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS public.timesheet_approval_history (
            id            BIGSERIAL PRIMARY KEY,
            timesheet_id  BIGINT NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
            action        TEXT NOT NULL
                          CHECK (action IN ('submitted','under_review','changes_requested',
                                            'resubmitted','approved','rejected','reopened')),
            action_by     %1$s NOT NULL REFERENCES public.employees(id),
            comment       TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )$f$, emp_type);
END
$$;

CREATE INDEX IF NOT EXISTS idx_timesheets_week            ON public.timesheets (week_start);
CREATE INDEX IF NOT EXISTS idx_timesheets_status          ON public.timesheets (status);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_sheet    ON public.timesheet_entries (timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project  ON public.timesheet_entries (project_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_history_sheet    ON public.timesheet_approval_history (timesheet_id, created_at);

COMMIT;
