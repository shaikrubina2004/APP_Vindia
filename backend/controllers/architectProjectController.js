// controllers/architectProjectController.js

const db = require("../config/db");

/**
 * Get all projects for a specific architect.
 * Includes daily log counts and drawing counts per project.
 *
 * SAFE VERSION:
 * - Validates userId before hitting DB
 * - Catches DNS / connection errors separately with clear messages
 * - Falls back gracefully so the frontend gets a usable error, not a crash
 */
const getArchitectProjects = async (req, res) => {
  const { userId } = req.params;

  // ── 1. Validate input ──────────────────────────────────────────────────────
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing userId param",
    });
  }

  // ── 2. Run query ───────────────────────────────────────────────────────────
  try {
    const query = `
  SELECT  
    p.id, p.name, p.client, p.budget, p.status, p.progress,
    p.location, p.description, p.start_date, p.end_date,
    p.created_at, p.updated_at, p.building_type, p.floors,
    p.plot_size, p.phone, p.client_paid, p.spent,
    p.manager_id, p.site_engineer_id,

    COUNT(DISTINCT dl.id)::int AS daily_log_count,

    COUNT(DISTINCT CASE
      WHEN dl.date = CURRENT_DATE THEN dl.id
    END)::int AS daily_log_today_count,

    (
      SELECT COUNT(*)::int
      FROM architect_drawings ad
      WHERE ad.project_id = p.id
        AND ad.created_by = $1::int
    ) AS drawing_count,

    (
      SELECT COUNT(*)::int
      FROM tasks t
      WHERE t.is_deleted = false
        AND (
          t.project_id = p.id
          OR
          t.incident_id IN (
            SELECT i.id FROM incidents i
            WHERE i.project_id = p.id
              AND i.is_deleted = false
          )
        )
    ) AS task_count,

    (
      SELECT COUNT(*)::int
      FROM incidents i
      WHERE i.project_id = p.id
        AND i.is_deleted = false
    ) AS incident_count

  FROM projects p
  LEFT JOIN architect_daily_logs dl
    ON dl.project_id = p.id
    AND dl.architect_id = $1::int

  WHERE p.architect_id = $1::int

  GROUP BY p.id
  ORDER BY p.updated_at DESC
`;

    const result = await db.query(query, [userId]);

    return res.status(200).json(result.rows);

  } catch (err) {
    // ── 3. Categorise the error so the client knows what happened ────────────

    const isNetworkError =
      err.code === "EAI_AGAIN"      ||  // DNS lookup failure (Supabase unreachable)
      err.code === "ECONNREFUSED"    ||  // DB port not open
      err.code === "ENOTFOUND"       ||  // hostname not found
      err.code === "ETIMEDOUT"       ||  // connection timed out
      err.code === "ECONNRESET";         // connection dropped mid-query

    if (isNetworkError) {
      console.error(
        `[DB NETWORK ERROR] Cannot reach database — ${err.code}: ${err.hostname || err.address || "unknown host"}`
      );
      return res.status(503).json({
        success: false,
        message:
          "Database is temporarily unreachable. " +
          "Check your internet connection and Supabase project status, then retry.",
        code: err.code,
      });
    }

    // Generic DB / query error
    console.error("[DB ERROR] Error fetching architect projects:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch architect projects",
      error: err.message,
    });
  }
};
const getProjectTasks = async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await db.query(`
      SELECT 
        t.*,
        i.title AS incident_title,
        i.incident_no,
        u.name AS assigned_name
      FROM tasks t
      LEFT JOIN incidents i ON i.id = t.incident_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.is_deleted = false
        AND (
          t.project_id = $1
          OR t.incident_id IN (
            SELECT id FROM incidents
            WHERE project_id = $1 AND is_deleted = false
          )
        )
      ORDER BY t.created_at DESC
    `, [projectId]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
  }
};

// ✅ UPDATE module.exports to include both
module.exports = { getArchitectProjects, getProjectTasks };