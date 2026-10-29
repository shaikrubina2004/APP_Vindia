BEGIN;

CREATE TABLE IF NOT EXISTS public.architect_drawings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  drawing_type VARCHAR(80),
  current_revision VARCHAR(50) NOT NULL DEFAULT 'R1',
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.architect_drawing_revisions (
  id BIGSERIAL PRIMARY KEY,
  drawing_id INTEGER NOT NULL REFERENCES public.architect_drawings(id) ON DELETE CASCADE,
  revision VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (drawing_id, revision)
);

CREATE TABLE IF NOT EXISTS public.architect_drawing_recipients (
  id BIGSERIAL PRIMARY KEY,
  drawing_id INTEGER NOT NULL REFERENCES public.architect_drawings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.architect_drawing_logs (
  id BIGSERIAL PRIMARY KEY,
  drawing_id INTEGER NOT NULL REFERENCES public.architect_drawings(id) ON DELETE CASCADE,
  action VARCHAR(80) NOT NULL,
  stage VARCHAR(100),
  performed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.architect_drawing_requests (
  id BIGSERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  description TEXT,
  due_date DATE,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_architect_drawings_project
  ON public.architect_drawings (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_architect_drawing_revisions_drawing
  ON public.architect_drawing_revisions (drawing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_architect_drawing_recipients_user
  ON public.architect_drawing_recipients (user_id, drawing_id);
CREATE INDEX IF NOT EXISTS idx_architect_drawing_recipients_role
  ON public.architect_drawing_recipients (role, drawing_id);
CREATE INDEX IF NOT EXISTS idx_architect_drawing_requests_seen
  ON public.architect_drawing_requests (seen, created_at DESC);

COMMIT;
