// ══════════════════════════════════════════════════════════════════════════════
//  dailyUpdatesController.js
//  Handles all SE Daily Report CRUD + check-in + approve
//
//  Who can do what (from the LOGGED-IN user's role in the login token):
//    structural_engineer : create / edit / delete ONLY their own, un-approved logs
//    project_manager, ceo: read all logs and approve them
//    anyone else         : no access
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");

// ── Auto-create / upgrade table on startup ────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS se_daily_reports (
        id             SERIAL       PRIMARY KEY,
        project_name   VARCHAR(255),
        date           DATE         NOT NULL,
        overall_status VARCHAR(50)  NOT NULL DEFAULT 'on-track',
        submitted_by   VARCHAR(255)          DEFAULT 'Structural Engineer',
        data           JSONB                 DEFAULT '{}',
        approved       BOOLEAN               DEFAULT FALSE,
        created_at     TIMESTAMP             DEFAULT NOW(),
        updated_at     TIMESTAMP             DEFAULT NOW()
      );
      ALTER TABLE se_daily_reports ADD COLUMN IF NOT EXISTS user_id     INTEGER;
      ALTER TABLE se_daily_reports ADD COLUMN IF NOT EXISTS approved_by INTEGER;
      ALTER TABLE se_daily_reports ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_se_daily_date     ON se_daily_reports (date);
      CREATE INDEX IF NOT EXISTS idx_se_daily_approved ON se_daily_reports (approved);
      CREATE INDEX IF NOT EXISTS idx_se_daily_user     ON se_daily_reports (user_id);
    `);
    console.log("✅ se_daily_reports table ready");
  } catch (err) {
    console.error("❌ se_daily_reports table setup failed:", err.message);
  }
})();

// ── Who is calling? (from the verified login token, never from the client) ───
const roleOf = (req) =>
  String(req.user?.role || "").toLowerCase().replace(/[\s-]+/g, "_");
const isSE = (req) => roleOf(req) === "structural_engineer";
const isCeo = (req) => roleOf(req) === "ceo";
const canReview = (req) => ["project_manager", "ceo"].includes(roleOf(req));
const sameUser = (a, b) => String(a) === String(b);

// A log belongs to the SE who filed it. Older logs saved before this change
// have no owner (user_id is NULL); the first SE to open one claims it.
const seOwns = (req, row) => row.user_id == null || sameUser(row.user_id, req.user.id);

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRow(r) {
  return {
    id:       r.id,
    approved: r.approved,
    date:     r.date ? r.date.toISOString().split("T")[0] : null,
    data: {
      ...(r.data || {}),
      date: r.date ? r.date.toISOString().split("T")[0] : null,
    },
  };
}

// The submitter's real name, looked up server-side from the logged-in user.
async function serverName(userId) {
  try {
    const r = await pool.query(
      `SELECT COALESCE(e.name, u.name) AS name
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    return r.rows[0]?.name || null;
  } catch (err) {
    console.error("serverName lookup failed:", err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL  —  GET /api/se-daily-reports
//  SE: their own logs.  Project Manager / CEO: every log.
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllReports = async (req, res) => {
  try {
    let result;
    if (isSE(req)) {
      result = await pool.query(
        `SELECT id, project_name, date, overall_status, submitted_by, data, approved, user_id
         FROM se_daily_reports
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY date DESC`,
        [req.user.id]
      );
    } else if (canReview(req)) {
      result = await pool.query(
        `SELECT id, project_name, date, overall_status, submitted_by, data, approved, user_id
         FROM se_daily_reports
         ORDER BY date DESC`
      );
    } else {
      return res.status(403).json({ error: "You are not allowed to view these reports" });
    }
    res.json(result.rows.map(formatRow));
  } catch (err) {
    console.error("getAllReports:", err.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ONE  —  GET /api/se-daily-reports/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM se_daily_reports WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    const row = result.rows[0];

    const allowed = canReview(req) || (isSE(req) && seOwns(req, row));
    if (!allowed) {
      return res.status(403).json({ error: "You are not allowed to view this report" });
    }

    res.json(formatRow(row));
  } catch (err) {
    console.error("getReportById:", err.message);
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE  —  POST /api/se-daily-reports
//  Upserts by date for the LOGGED-IN SE, so check-in and log filing both work
//  safely without touching another engineer's log.
// ══════════════════════════════════════════════════════════════════════════════
exports.createReport = async (req, res) => {
  try {
    if (!isSE(req)) {
      return res.status(403).json({ error: "Only a Structural Engineer can file a daily log" });
    }

    const {
      project_name   = "",
      date,
      overall_status = "on-track",
      data           = {},
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const userId = req.user.id;
    const submitted_by =
      (await serverName(userId)) || req.body.submitted_by || "Structural Engineer";

    // This user's own log for the date (or an old un-owned one), own first.
    const existing = await pool.query(
      `SELECT id, data, approved
       FROM se_daily_reports
       WHERE date = $1 AND (user_id = $2 OR user_id IS NULL)
       ORDER BY (user_id IS NULL) ASC
       LIMIT 1`,
      [date, userId]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].approved) {
        return res.status(409).json({ error: "This log is already approved and cannot be changed" });
      }

      // Merge new data into existing record (don't overwrite checkIn if already set)
      const existingData  = existing.rows[0].data || {};
      const mergedData    = { ...existingData, ...data };

      // Preserve existing checkIn if new request doesn't have one
      if (existingData.checkIn && !data.checkIn) {
        mergedData.checkIn = existingData.checkIn;
      }

      const result = await pool.query(
        `UPDATE se_daily_reports
         SET project_name   = COALESCE(NULLIF($1,''), project_name),
             overall_status = $2,
             submitted_by   = COALESCE(NULLIF($3,''), submitted_by),
             data           = $4,
             user_id        = COALESCE(user_id, $6),
             updated_at     = NOW()
         WHERE id = $5
         RETURNING id, date, approved`,
        [project_name, overall_status, submitted_by, JSON.stringify(mergedData), existing.rows[0].id, userId]
      );
      const r = result.rows[0];
      return res.status(200).json({
        message:  "Report updated",
        id:       r.id,
        date:     r.date ? r.date.toISOString().split("T")[0] : null,
        approved: r.approved,
      });
    }

    // Insert new
    const result = await pool.query(
      `INSERT INTO se_daily_reports (project_name, date, overall_status, submitted_by, data, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, date, approved`,
      [project_name, date, overall_status, submitted_by, JSON.stringify(data), userId]
    );
    const r = result.rows[0];
    res.status(201).json({
      message:  "Report created",
      id:       r.id,
      date:     r.date ? r.date.toISOString().split("T")[0] : null,
      approved: r.approved,
    });
  } catch (err) {
    console.error("createReport:", err.message);
    res.status(500).json({ error: "Failed to save report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  UPDATE  —  PUT /api/se-daily-reports/:id
//  Only the SE who owns the log, and only until it is approved.
// ══════════════════════════════════════════════════════════════════════════════
exports.updateReport = async (req, res) => {
  try {
    if (!isSE(req)) {
      return res.status(403).json({ error: "Only a Structural Engineer can edit a daily log" });
    }

    const { id } = req.params;
    const { project_name, date, overall_status, data } = req.body;

    const found = await pool.query(
      "SELECT id, user_id, approved FROM se_daily_reports WHERE id = $1",
      [id]
    );
    if (!found.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    const row = found.rows[0];

    if (!seOwns(req, row)) {
      return res.status(403).json({ error: "You can only edit your own logs" });
    }
    if (row.approved) {
      return res.status(409).json({ error: "This log is already approved and cannot be changed" });
    }

    const submitted_by = await serverName(req.user.id);

    const result = await pool.query(
      `UPDATE se_daily_reports
       SET project_name   = COALESCE($1, project_name),
           date           = COALESCE($2, date),
           overall_status = COALESCE($3, overall_status),
           submitted_by   = COALESCE($4, submitted_by),
           data           = COALESCE($5, data),
           user_id        = COALESCE(user_id, $7),
           updated_at     = NOW()
       WHERE id = $6
       RETURNING id, date, approved`,
      [project_name, date, overall_status, submitted_by,
       data ? JSON.stringify(data) : null, id, req.user.id]
    );
    const r = result.rows[0];
    res.json({
      message:  "Report updated",
      id:       r.id,
      date:     r.date ? r.date.toISOString().split("T")[0] : null,
      approved: r.approved,
    });
  } catch (err) {
    console.error("updateReport:", err.message);
    res.status(500).json({ error: "Failed to update report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  APPROVE  —  PUT /api/se-daily-reports/approve/:id
//  Project Manager or CEO only. ⚠️ Must be registered BEFORE /:id in the router
// ══════════════════════════════════════════════════════════════════════════════
exports.approveReport = async (req, res) => {
  try {
    if (!canReview(req)) {
      return res.status(403).json({ error: "Only a Project Manager or the CEO can approve a log" });
    }

    const result = await pool.query(
      `UPDATE se_daily_reports
       SET approved = TRUE, approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, approved`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ message: "Report approved", id: result.rows[0].id });
  } catch (err) {
    console.error("approveReport:", err.message);
    res.status(500).json({ error: "Failed to approve report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE  —  DELETE /api/se-daily-reports/:id
//  The SE who owns an un-approved log, or the CEO.
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteReport = async (req, res) => {
  try {
    const found = await pool.query(
      "SELECT id, user_id, approved FROM se_daily_reports WHERE id = $1",
      [req.params.id]
    );
    if (!found.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    const row = found.rows[0];

    const ownerDeleting = isSE(req) && seOwns(req, row) && !row.approved;
    if (!ownerDeleting && !isCeo(req)) {
      return res.status(403).json({ error: "You are not allowed to delete this report" });
    }

    await pool.query("DELETE FROM se_daily_reports WHERE id = $1", [req.params.id]);
    res.json({ message: "Report deleted", id: row.id });
  } catch (err) {
    console.error("deleteReport:", err.message);
    res.status(500).json({ error: "Failed to delete report" });
  }
};

// ─── Safety net ──────────────────────────────────────────────────────────────
// Every handler reads the logged-in user from req.user, set by the auth
// middleware in seDailyupdatesRoutes.js. If a route is ever mounted without
// it, answer 401 instead of crashing the server.
Object.keys(exports).forEach((name) => {
  const handler = exports[name];
  if (typeof handler !== "function") return;
  exports[name] = (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authenticated. Replace seDailyupdatesRoutes.js too." });
    }
    return handler(req, res, next);
  };
});