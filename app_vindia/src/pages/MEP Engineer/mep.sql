-- ============================================================
-- DRAWING MANAGEMENT SCHEMA — CLEANED
--
-- Changes from previous version:
-- 1. Removed project_floors table (handled separately)
-- 2. floor stored as VARCHAR on drawings and daily_logs
-- 3. Removed 'For Review' from drawing_status enum
-- 4. Added missing priority_level enum
-- 5. Removed STATUS_TRANSITIONS dead code (frontend only)
-- 6. Rewrote v_milestone_tracker without project_floors join
-- 7. Removed drawing_type enum values not present in any drawing
--    ('Riser Diagram' kept — valid MEP type)
--
-- Depends on: projects (id INT), users (id INT), incidents (id UUID)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE drawing_discipline AS ENUM ('MEP', 'ARCH', 'STR');

CREATE TYPE drawing_sub_discipline AS ENUM (
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Architectural',
  'Structural'
);

/*
  Status flow:
    Upload            → Issued for Coordination  (auto by trigger)
    Both roles approve→ Approved                 (auto by trigger)
    Architect pushes  → Issued for Construction  (manual API call)
    New version upload→ Superseded               (auto by trigger)
    After construction→ As-Built                 (manual)
*/
CREATE TYPE drawing_status AS ENUM (
  'Issued for Coordination',
  'Approved',
  'Issued for Construction',
  'As-Built',
  'Superseded'
);

CREATE TYPE drawing_type AS ENUM (
  'Layout',
  'Floor Plan',
  'Section',
  'Elevation',
  'Detail',
  'Schematic',
  'Single Line',
  'Routing',
  'Drainage',
  'Foundation',
  'Column Layout',
  'Beam Layout',
  'Slab Detail',
  'Wall Detail',
  'Ceiling Plan',
  'Riser Diagram'
);

/*
  reviewer_status — per-role approval on each drawing version
  NULL    = this role is the owner, cannot approve their own drawing
  Pending = not yet reviewed
*/
CREATE TYPE reviewer_status AS ENUM (
  'Pending',
  'Approved',
  'Approved with Comments',
  'Rejected'
);

CREATE TYPE clash_status AS ENUM (
  'Open',
  'In Progress',
  'Resolved'
);

/*
  priority_level — used by drawing_clashes (and incidents)
  P1 = Critical, P2 = High, P3 = Medium, P4 = Low
*/

CREATE TYPE log_status AS ENUM (
  'Draft',
  'Submitted',
  'Verified'
);

CREATE TYPE work_discipline AS ENUM (
  'Mechanical',
  'Electrical',
  'Plumbing'
);

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE drawing_seq START 1;
CREATE SEQUENCE clash_seq   START 1;

-- ============================================================
-- 1. DRAWINGS
-- One row per drawing — not per version
-- floor stored as plain text (e.g. "Ground Floor", "Level 1")
-- since project_floors is managed separately
-- ============================================================

CREATE TABLE drawings (
  id                 UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_no         TEXT                   NOT NULL UNIQUE,      -- DWG-001

  project_id         INT                    NOT NULL
                       REFERENCES projects(id) ON DELETE RESTRICT,

  name               VARCHAR(255)           NOT NULL,
  discipline         drawing_discipline     NOT NULL,
  sub_discipline     drawing_sub_discipline NOT NULL,
  drawing_number     VARCHAR(100)           NOT NULL,             -- MEP-HVAC-GF-001
  drawing_type       drawing_type           NOT NULL,

  -- plain text floor — matches what project_floors.name would be
  -- e.g. "Ground Floor", "Level 1", "Basement", "All Floors"
 floor_id           UUID                   NOT NULL
                       REFERENCES project_floors(id) ON DELETE RESTRICT,

  -- points to the current latest version
  -- updated automatically by trigger on drawing_versions insert
  current_version_id UUID,

  -- who originally created/uploaded this drawing
  created_by         INT                    NOT NULL
                       REFERENCES users(id) ON DELETE RESTRICT,

  is_deleted         BOOLEAN                NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drawings_project    ON drawings(project_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_drawings_discipline ON drawings(discipline)   WHERE is_deleted = FALSE;
CREATE INDEX idx_drawings_floor      ON drawings(floor_id)     WHERE is_deleted = FALSE;
CREATE INDEX idx_drawings_created_at ON drawings(created_at DESC);

-- Auto-generate drawing_no
CREATE OR REPLACE FUNCTION fn_set_drawing_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.drawing_no IS NULL OR NEW.drawing_no = '' THEN
    NEW.drawing_no := 'DWG-' || LPAD(nextval('drawing_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_drawing_no
  BEFORE INSERT ON drawings
  FOR EACH ROW EXECUTE FUNCTION fn_set_drawing_no();

-- Auto updated_at
CREATE OR REPLACE FUNCTION fn_drawing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_drawing_updated_at
  BEFORE UPDATE ON drawings
  FOR EACH ROW EXECUTE FUNCTION fn_drawing_updated_at();

-- ============================================================
-- 2. DRAWING VERSIONS
-- Every revision — one row per upload
-- ============================================================

CREATE TABLE drawing_versions (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  drawing_id       UUID            NOT NULL
                     REFERENCES drawings(id) ON DELETE CASCADE,

  revision_number  VARCHAR(20)     NOT NULL,
  title            VARCHAR(255)    NOT NULL,
  change_notes     TEXT,

  /*
    Status is auto-set by triggers:
    - INSERT          → 'Issued for Coordination'
    - All approvals   → 'Approved'
    - Architect action→ 'Issued for Construction'  (via API, not trigger)
    - New version in  → 'Superseded'
  */
  status           drawing_status  NOT NULL DEFAULT 'Issued for Coordination',

  file_url         TEXT            NOT NULL,
  file_size        VARCHAR(20),
  file_type        VARCHAR(10),     -- dwg, pdf, rvt, ifc

  is_latest        BOOLEAN         NOT NULL DEFAULT TRUE,

  uploaded_by      INT             NOT NULL
                     REFERENCES users(id) ON DELETE RESTRICT,

  uploaded_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- ── APPROVAL COLUMNS ──────────────────────────────────────
  -- MEP drawing  → arch + str approve  (mep_status  = NULL — owner)
  -- ARCH drawing → mep  + str approve  (arch_status = NULL — owner)
  -- STR drawing  → mep  + arch approve (str_status  = NULL — owner)

  mep_status           reviewer_status   DEFAULT NULL,
  mep_reviewed_by      INT               REFERENCES users(id) ON DELETE SET NULL,
  mep_reviewed_at      TIMESTAMPTZ,
  mep_comments         TEXT,

  arch_status          reviewer_status   DEFAULT NULL,
  arch_reviewed_by     INT               REFERENCES users(id) ON DELETE SET NULL,
  arch_reviewed_at     TIMESTAMPTZ,
  arch_comments        TEXT,

  str_status           reviewer_status   DEFAULT NULL,
  str_reviewed_by      INT               REFERENCES users(id) ON DELETE SET NULL,
  str_reviewed_at      TIMESTAMPTZ,
  str_comments         TEXT,

  -- stamped automatically when all required approvals received
  fully_approved_at           TIMESTAMPTZ,

  -- stamped when Architect issues for construction
  issued_for_construction_at  TIMESTAMPTZ,
  issued_by_user_id           INT REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT uq_drawing_revision UNIQUE (drawing_id, revision_number)
);

CREATE INDEX idx_dv_drawing_id     ON drawing_versions(drawing_id);
CREATE INDEX idx_dv_is_latest      ON drawing_versions(drawing_id)  WHERE is_latest = TRUE;
CREATE INDEX idx_dv_uploaded_at    ON drawing_versions(uploaded_at DESC);
CREATE INDEX idx_dv_status         ON drawing_versions(status)      WHERE is_latest = TRUE;
CREATE INDEX idx_dv_fully_approved ON drawing_versions(fully_approved_at) WHERE fully_approved_at IS NOT NULL;

-- ── On new version insert ────────────────────────────────────
-- 1. Supersede previous latest version
-- 2. Update drawings.current_version_id
-- 3. Initialize approval columns based on discipline
--    (owner column stays NULL)

CREATE OR REPLACE FUNCTION fn_on_new_version_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_disc drawing_discipline;
BEGIN
  SELECT discipline INTO v_disc FROM drawings WHERE id = NEW.drawing_id;

  -- supersede previous latest version
  UPDATE drawing_versions
  SET    is_latest = FALSE,
         status    = 'Superseded'
  WHERE  drawing_id = NEW.drawing_id
    AND  id        <> NEW.id
    AND  is_latest  = TRUE;

  -- update current version pointer
  UPDATE drawings
  SET    current_version_id = NEW.id,
         updated_at         = NOW()
  WHERE  id = NEW.drawing_id;

  -- initialize approval columns
  -- owner column stays NULL — they cannot approve their own drawing
  IF v_disc = 'MEP' THEN
    NEW.mep_status  := NULL;
    NEW.arch_status := 'Pending';
    NEW.str_status  := 'Pending';

  ELSIF v_disc = 'ARCH' THEN
    NEW.arch_status := NULL;
    NEW.mep_status  := 'Pending';
    NEW.str_status  := 'Pending';

  ELSIF v_disc = 'STR' THEN
    NEW.str_status  := NULL;
    NEW.mep_status  := 'Pending';
    NEW.arch_status := 'Pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_new_version_insert
  BEFORE INSERT ON drawing_versions
  FOR EACH ROW EXECUTE FUNCTION fn_on_new_version_insert();

-- ── On approval update ────────────────────────────────────────
-- 1. Stamp reviewed_at for the reviewer that just acted
-- 2. If all required approvals received → fully_approved_at + status = Approved
-- 3. If any rejection → clear fully_approved_at, revert to Issued for Coordination

CREATE OR REPLACE FUNCTION fn_on_approval_update()
RETURNS TRIGGER AS $$
DECLARE
  v_disc     drawing_discipline;
  v_approved BOOLEAN := FALSE;
BEGIN
  SELECT discipline INTO v_disc FROM drawings WHERE id = NEW.drawing_id;

  -- stamp reviewed_at timestamps
  IF NEW.mep_status IS DISTINCT FROM OLD.mep_status
     AND OLD.mep_status = 'Pending' THEN
    NEW.mep_reviewed_at := NOW();
  END IF;

  IF NEW.arch_status IS DISTINCT FROM OLD.arch_status
     AND OLD.arch_status = 'Pending' THEN
    NEW.arch_reviewed_at := NOW();
  END IF;

  IF NEW.str_status IS DISTINCT FROM OLD.str_status
     AND OLD.str_status = 'Pending' THEN
    NEW.str_reviewed_at := NOW();
  END IF;

  -- check if all required approvals are now in
  IF v_disc = 'MEP' THEN
    v_approved := (
      NEW.arch_status IN ('Approved', 'Approved with Comments') AND
      NEW.str_status  IN ('Approved', 'Approved with Comments')
    );
  ELSIF v_disc = 'ARCH' THEN
    v_approved := (
      NEW.mep_status IN ('Approved', 'Approved with Comments') AND
      NEW.str_status IN ('Approved', 'Approved with Comments')
    );
  ELSIF v_disc = 'STR' THEN
    v_approved := (
      NEW.mep_status  IN ('Approved', 'Approved with Comments') AND
      NEW.arch_status IN ('Approved', 'Approved with Comments')
    );
  END IF;

  -- auto approve
  IF v_approved AND NEW.fully_approved_at IS NULL THEN
    NEW.fully_approved_at := NOW();
    NEW.status            := 'Approved';
  END IF;

  -- handle rejection — revert only if not already issued for construction
  IF NEW.mep_status  = 'Rejected'
  OR NEW.arch_status = 'Rejected'
  OR NEW.str_status  = 'Rejected' THEN
    NEW.fully_approved_at := NULL;
    IF NEW.status = 'Approved' THEN
      NEW.status := 'Issued for Coordination';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_approval_update
  BEFORE UPDATE ON drawing_versions
  FOR EACH ROW EXECUTE FUNCTION fn_on_approval_update();

-- Bump parent drawing updated_at on version update
CREATE OR REPLACE FUNCTION fn_dv_bump_parent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drawings SET updated_at = NOW() WHERE id = NEW.drawing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dv_bump_parent
  AFTER UPDATE ON drawing_versions
  FOR EACH ROW EXECUTE FUNCTION fn_dv_bump_parent();

-- FK from drawings → drawing_versions (added after table exists)
ALTER TABLE drawings
  ADD CONSTRAINT fk_drawings_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES drawing_versions(id)
  ON DELETE SET NULL;

-- ============================================================
-- 3. DRAWING NOTIFICATIONS
-- ============================================================

CREATE TABLE drawing_notifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  drawing_version_id  UUID        NOT NULL
                        REFERENCES drawing_versions(id) ON DELETE CASCADE,

  drawing_id          UUID        NOT NULL
                        REFERENCES drawings(id) ON DELETE CASCADE,

  notified_user_id    INT
                        REFERENCES users(id) ON DELETE SET NULL,

  -- role of the person notified: 'mep' | 'arch' | 'str' | 'coord'
  notified_role       VARCHAR(50),

  is_seen             BOOLEAN     NOT NULL DEFAULT FALSE,
  seen_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dn_drawing_version ON drawing_notifications(drawing_version_id);
CREATE INDEX idx_dn_drawing_id      ON drawing_notifications(drawing_id);
CREATE INDEX idx_dn_user_unseen     ON drawing_notifications(notified_user_id) WHERE is_seen = FALSE;
CREATE INDEX idx_dn_role_unseen     ON drawing_notifications(notified_role)    WHERE is_seen = FALSE;

CREATE OR REPLACE FUNCTION fn_notification_seen_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_seen = TRUE AND OLD.is_seen = FALSE THEN
    NEW.seen_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_seen_at
  BEFORE UPDATE ON drawing_notifications
  FOR EACH ROW EXECUTE FUNCTION fn_notification_seen_at();

-- ============================================================
-- 4. DRAWING CLASHES
-- Raised by any non-owner against a drawing from another discipline
-- Backend creates a linked incident on clash creation
-- ============================================================

CREATE TABLE drawing_clashes (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  clash_no        TEXT           NOT NULL UNIQUE,   -- CLH-001

  drawing_id_1    UUID           NOT NULL
                    REFERENCES drawings(id) ON DELETE RESTRICT,
  drawing_id_2    UUID           NOT NULL
                    REFERENCES drawings(id) ON DELETE RESTRICT,

  version_id_1    UUID
                    REFERENCES drawing_versions(id) ON DELETE SET NULL,
  version_id_2    UUID
                    REFERENCES drawing_versions(id) ON DELETE SET NULL,

  -- clash type from frontend: "HVAC vs Structural", "Pipe vs Beam", etc.
  clash_type      VARCHAR(100)   NOT NULL,
  description     TEXT           NOT NULL,
  location        VARCHAR(255),

  priority        priority_level NOT NULL DEFAULT 'P2',
  status          clash_status   NOT NULL DEFAULT 'Open',

  -- backend creates incident on clash creation and writes id back here
  incident_id     UUID
                    REFERENCES incidents(id) ON DELETE SET NULL,

  raised_by       INT            NOT NULL
                    REFERENCES users(id) ON DELETE RESTRICT,

  resolved_by     INT
                    REFERENCES users(id) ON DELETE SET NULL,

  resolved_at     TIMESTAMPTZ,
  is_deleted      BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_diff_drawings CHECK (drawing_id_1 <> drawing_id_2)
);

CREATE INDEX idx_clashes_drawing_1  ON drawing_clashes(drawing_id_1) WHERE is_deleted = FALSE;
CREATE INDEX idx_clashes_drawing_2  ON drawing_clashes(drawing_id_2) WHERE is_deleted = FALSE;
CREATE INDEX idx_clashes_status     ON drawing_clashes(status)       WHERE is_deleted = FALSE;
CREATE INDEX idx_clashes_incident   ON drawing_clashes(incident_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_clashes_raised_by  ON drawing_clashes(raised_by);
CREATE INDEX idx_clashes_created_at ON drawing_clashes(created_at DESC);

CREATE OR REPLACE FUNCTION fn_set_clash_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clash_no IS NULL OR NEW.clash_no = '' THEN
    NEW.clash_no := 'CLH-' || LPAD(nextval('clash_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clash_no
  BEFORE INSERT ON drawing_clashes
  FOR EACH ROW EXECUTE FUNCTION fn_set_clash_no();

CREATE OR REPLACE FUNCTION fn_clash_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clash_updated_at
  BEFORE UPDATE ON drawing_clashes
  FOR EACH ROW EXECUTE FUNCTION fn_clash_updated_at();

CREATE OR REPLACE FUNCTION fn_clash_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status <> 'Resolved' THEN
    NEW.resolved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clash_resolved_at
  BEFORE UPDATE ON drawing_clashes
  FOR EACH ROW EXECUTE FUNCTION fn_clash_resolved_at();

-- ============================================================
-- 5. DAILY LOGS
-- One log per project / floor / discipline / day
-- completion_pct feeds the milestone tracker on the dashboard
-- floor stored as plain text matching drawings.floor
-- ============================================================

CREATE TABLE daily_logs (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id    INT             NOT NULL
                  REFERENCES projects(id) ON DELETE RESTRICT,

  -- plain text floor — "Ground Floor", "Level 1", "Basement" etc.
floor_id      UUID            NOT NULL
                  REFERENCES project_floors(id) ON DELETE RESTRICT,
  discipline    work_discipline NOT NULL,

  log_date      DATE            NOT NULL,

  -- feeds the dashboard milestone tracker
  completion_pct DECIMAL(5,2)  NOT NULL DEFAULT 0
                  CHECK (completion_pct >= 0 AND completion_pct <= 100),

  shift              VARCHAR(20),    -- 'Day' | 'Night'
  workers_deployed   INT,
  materials_used     TEXT,
  activities         TEXT           NOT NULL,
  blockers           TEXT,
  plan_tomorrow      TEXT,

  -- EOD checklist
  coord_checked      BOOLEAN        NOT NULL DEFAULT FALSE,
  structural_checked BOOLEAN        NOT NULL DEFAULT FALSE,
  drawing_checked    BOOLEAN        NOT NULL DEFAULT FALSE,
  incident_checked   BOOLEAN        NOT NULL DEFAULT FALSE,
  photos_uploaded    BOOLEAN        NOT NULL DEFAULT FALSE,

  submitted_by  INT             NOT NULL
                  REFERENCES users(id) ON DELETE RESTRICT,

  status        log_status      NOT NULL DEFAULT 'Draft',
  submitted_at  TIMESTAMPTZ,

  verified_by   INT
                  REFERENCES users(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- one log per floor per discipline per day
  CONSTRAINT uq_daily_log UNIQUE (project_id, floor_id, discipline, log_date)
);

CREATE INDEX idx_dl_project    ON daily_logs(project_id);
CREATE INDEX idx_dl_floor      ON daily_logs(floor_id);
CREATE INDEX idx_dl_log_date   ON daily_logs(log_date DESC);
CREATE INDEX idx_dl_discipline ON daily_logs(discipline);
CREATE INDEX idx_dl_status     ON daily_logs(status);

CREATE OR REPLACE FUNCTION fn_dl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dl_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION fn_dl_updated_at();

CREATE OR REPLACE FUNCTION fn_dl_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Submitted' AND OLD.status = 'Draft' THEN
    NEW.submitted_at := NOW();
  END IF;
  IF NEW.status = 'Verified' AND OLD.status = 'Submitted' THEN
    NEW.verified_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dl_status_timestamps
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION fn_dl_status_timestamps();

-- ============================================================
-- VIEWS
-- ============================================================

-- ── Full Drawing Register ─────────────────────────────────────
-- Powers SharedDrawingPage — one row per drawing with current
-- version, approval status, and clash flag

CREATE VIEW v_drawing_register AS
SELECT
  d.id,
  d.drawing_no,
  d.project_id,
  d.name,
  d.discipline,
  d.sub_discipline,
  d.drawing_number,
  d.drawing_type,
  pf.id    AS floor_id,
  pf.name  AS floor_name, 
  d.created_by,
  d.created_at,
  d.updated_at,

  -- current version fields
  dv.id                         AS version_id,
  dv.revision_number,
  dv.title                      AS version_title,
  dv.status,
  dv.file_url,
  dv.file_size,
  dv.file_type,
  dv.uploaded_at,
  dv.fully_approved_at,
  dv.issued_for_construction_at,

  -- what the frontend status pill shows
  CASE
    WHEN dv.status = 'Issued for Construction' THEN 'Issued for Construction'
    WHEN dv.fully_approved_at IS NOT NULL       THEN 'Approved'
    WHEN dv.mep_status  = 'Rejected'
      OR dv.arch_status = 'Rejected'
      OR dv.str_status  = 'Rejected'           THEN 'Rejected — New Version Required'
    ELSE                                             'Issued for Coordination'
  END AS display_status,

  -- per-reviewer approval status
  dv.mep_status,   dv.mep_reviewed_at,   dv.mep_comments,
  dv.arch_status,  dv.arch_reviewed_at,  dv.arch_comments,
  dv.str_status,   dv.str_reviewed_at,   dv.str_comments,

  -- uploader
  u.id   AS uploaded_by_id,
  u.name AS uploaded_by_name,

  -- clash flag: true if any unresolved clash exists
  EXISTS (
    SELECT 1 FROM drawing_clashes c
    WHERE (c.drawing_id_1 = d.id OR c.drawing_id_2 = d.id)
      AND c.status     <> 'Resolved'
      AND c.is_deleted  = FALSE
  ) AS has_clash,

  (
    SELECT COUNT(*) FROM drawing_clashes c
    WHERE (c.drawing_id_1 = d.id OR c.drawing_id_2 = d.id)
      AND c.status     <> 'Resolved'
      AND c.is_deleted  = FALSE
  ) AS open_clash_count

FROM      drawings         d
JOIN      project_floors   pf ON pf.id = d.floor_id
LEFT JOIN drawing_versions dv ON dv.id = d.current_version_id
LEFT JOIN users            u  ON u.id  = dv.uploaded_by
WHERE     d.is_deleted = FALSE;


-- ── Milestone Tracker


-- ── Milestone Tracker ─────────────────────────────────────────
-- Powers the dashboard milestone tracker
-- Uses daily_logs.floor (plain text) directly
-- Returns latest submitted completion_pct per project/floor/discipline

CREATE VIEW v_milestone_tracker AS
WITH latest_logs AS (
  SELECT DISTINCT ON (project_id, floor_id, discipline)
    project_id,
    floor_id,
    discipline,
    completion_pct,
    log_date,
    submitted_by
  FROM  daily_logs
  WHERE status IN ('Submitted', 'Verified')
  ORDER BY project_id, floor_id, discipline, log_date DESC
)
SELECT
  pf.project_id,
  pf.id                               AS floor_id,
  pf.name                             AS floor_name,
  pf.level_no,
  disc.discipline,
  COALESCE(ll.completion_pct, 0)      AS completion_pct,
  ll.log_date                         AS last_updated,
  ll.submitted_by                     AS last_updated_by,
  CASE
    WHEN COALESCE(ll.completion_pct, 0) = 100 THEN 'done'
    WHEN COALESCE(ll.completion_pct, 0) > 0   THEN 'inprog'
    ELSE                                            'notstart'
  END                                 AS floor_status
FROM project_floors pf
CROSS JOIN (
  VALUES
    ('Mechanical'::work_discipline),
    ('Electrical'::work_discipline),
    ('Plumbing'::work_discipline)
) AS disc(discipline)
LEFT JOIN latest_logs ll
  ON  ll.floor_id   = pf.id
  AND ll.discipline = disc.discipline
  AND ll.project_id = pf.project_id
WHERE pf.is_active = TRUE
ORDER BY pf.project_id, pf.level_no, disc.discipline;


-- ── Clash Detail ──────────────────────────────────────────────
-- Full clash info with both drawing names and linked incident

CREATE VIEW v_clash_detail AS
SELECT
  c.id,
  c.clash_no,
  c.clash_type,
  c.description,
  c.location,
  c.priority,
  c.status,
  c.created_at,
  c.resolved_at,

  d1.id             AS drawing_1_id,
  d1.name           AS drawing_1_name,
  d1.discipline     AS drawing_1_discipline,
  d1.drawing_number AS drawing_1_number,
  pf1.name          AS drawing_1_floor,
  dv1.revision_number AS drawing_1_revision,
  d2.id             AS drawing_2_id,
  d2.name           AS drawing_2_name,
  d2.discipline     AS drawing_2_discipline,
  d2.drawing_number AS drawing_2_number,
  pf2.name          AS drawing_2_floor,
  dv2.revision_number AS drawing_2_revision,

  u.id              AS raised_by_id,
  u.name            AS raised_by_name,

  ur.id             AS resolved_by_id,
  ur.name           AS resolved_by_name,

  i.id              AS incident_id,
  i.incident_no,
  i.status          AS incident_status

FROM      drawing_clashes   c
JOIN      drawings          d1  ON d1.id  = c.drawing_id_1
JOIN      drawings          d2  ON d2.id  = c.drawing_id_2
LEFT JOIN drawing_versions  dv1 ON dv1.id = c.version_id_1
LEFT JOIN drawing_versions  dv2 ON dv2.id = c.version_id_2
JOIN      users             u   ON u.id   = c.raised_by
LEFT JOIN users             ur  ON ur.id  = c.resolved_by
LEFT JOIN incidents         i   ON i.id   = c.incident_id
LEFT JOIN project_floors    pf1 ON pf1.id = d1.floor_id
LEFT JOIN project_floors    pf2 ON pf2.id = d2.floor_id
WHERE     c.is_deleted = FALSE;



-- ── Unseen Notifications ──────────────────────────────────────
-- Powers the notification bell badge count

CREATE VIEW v_unseen_notifications AS
SELECT
  dn.id,
  dn.notified_user_id,
  dn.notified_role,
  dn.created_at,

  d.id          AS drawing_id,
  d.name        AS drawing_name,
  d.discipline,
  pf.name  AS floor_name,

  dv.id               AS version_id,
  dv.revision_number,
  dv.title            AS version_title,

  u.name        AS uploaded_by_name

FROM      drawing_notifications dn
JOIN      drawings              d  ON d.id  = dn.drawing_id
JOIN      drawing_versions      dv ON dv.id = dn.drawing_version_id
JOIN      users                 u  ON u.id  = dv.uploaded_by
JOIN      project_floors    pf ON pf.id = d.floor_id
WHERE     dn.is_seen = FALSE
ORDER BY  dn.created_at DESC;