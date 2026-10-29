BEGIN;

CREATE TABLE IF NOT EXISTS public.qs_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  type VARCHAR(50) NOT NULL DEFAULT 'task',
  title VARCHAR(255) NOT NULL,
  message TEXT DEFAULT '',
  severity VARCHAR(20) DEFAULT 'info',
  reference_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.qs_notifications
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS reference_id INTEGER,
  ADD COLUMN IF NOT EXISTS user_id INTEGER;

CREATE TABLE IF NOT EXISTS public.qs_notification_reads (
  notification_id INTEGER NOT NULL
    REFERENCES public.qs_notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_qs_notification_reads_user
  ON public.qs_notification_reads (user_id, notification_id);

COMMIT;
