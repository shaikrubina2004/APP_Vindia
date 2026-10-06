-- VIndia Infrasec
-- Timesheet audit hardening
-- Run after create_timesheet_foundation_migration_v2.sql

BEGIN;

-- Approval history is an audit trail. Application users must not be able to
-- update or delete historical workflow events.
CREATE OR REPLACE FUNCTION public.prevent_timesheet_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Timesheet approval history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_timesheet_history_no_update ON public.timesheet_approval_history;
CREATE TRIGGER trg_timesheet_history_no_update
BEFORE UPDATE OR DELETE ON public.timesheet_approval_history
FOR EACH ROW
EXECUTE FUNCTION public.prevent_timesheet_history_mutation();

COMMIT;
