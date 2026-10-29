const pool = require("../config/db");
const { insertArchitectNotification } = require("./architectNotificationsController");

/**
 * GET /api/architect-assign/architects
 * Fetch all active architects.
 * Was: WHERE role_id = 29 — a hardcoded role id that only means "Architect"
 * by coincidence of however roles were seeded in one particular database.
 * Same bug class already found and fixed in projectController.js's
 * getCoordinators/getSiteEngineers — matched by role name instead.
 */
const getArchitects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.status
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE LOWER(r.name) LIKE '%architect%'
       ORDER BY u.name ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("getArchitects error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch architects" });
  }
};

/**
 * PATCH /api/architect-assign/projects/:projectId/assign
 * Body: { architect_id, assignment_data }
 *
 * Rules:
 *  - If project has NO architect_id yet → allow assignment (any architect)
 *  - If project already has architect_id === incoming architect_id → allow UPDATE (same architect editing)
 *  - If project already has a DIFFERENT architect_id → block with 409
 */
const assignArchitect = async (req, res) => {
  const { projectId } = req.params;
  const { architect_id, assignment_data } = req.body;

  if (!architect_id) {
    return res.status(400).json({ success: false, message: "architect_id is required" });
  }

  try {
    // Check project exists
    const projectCheck = await pool.query(
      "SELECT id, architect_id FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const existingArchitectId = projectCheck.rows[0].architect_id;

    // ✅ Block ONLY if assigned to a DIFFERENT architect
    if (existingArchitectId && existingArchitectId !== parseInt(architect_id)) {
      return res.status(409).json({
        success: false,
        message: "This project is already assigned to another architect and cannot be changed.",
      });
    }

    // Check architect exists — same role-name match as getArchitects above.
    const archCheck = await pool.query(
      `SELECT u.id, u.name
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND LOWER(r.name) LIKE '%architect%'`,
      [architect_id]
    );

    if (archCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Architect not found or user is not an architect",
      });
    }

    // ✅ Insert or Update — works for both first-time assign and re-edit by same architect
    const updateResult = await pool.query(
      `UPDATE projects
       SET architect_id    = $1,
           assignment_data = $2,
           updated_at      = NOW()
       WHERE id = $3
       RETURNING *`,
      [architect_id, JSON.stringify(assignment_data), projectId]
    );

    const isUpdate = !!existingArchitectId;

    // Let the architect know they've been assigned — same gap as
    // createProject/updateProject had before (nobody was ever notified of
    // an assignment made through this endpoint).
    try {
      await insertArchitectNotification(
        architect_id,
        "project",
        isUpdate ? "Project assignment updated" : "New project assigned to you",
        `You've been assigned as architect on "${updateResult.rows[0].name}".`,
        "/architect/dashboard",
        "info",
        updateResult.rows[0].id,
      );
    } catch (notifErr) {
      console.warn("⚠️ Architect assignment notification failed (non-critical):", notifErr.message);
    }

    res.json({
      success: true,
      message: isUpdate
        ? `Assignment updated successfully for "${archCheck.rows[0].name}"`
        : `Architect "${archCheck.rows[0].name}" assigned successfully`,
      data: updateResult.rows[0],
    });
  } catch (err) {
    console.error("assignArchitect error:", err);
    res.status(500).json({ success: false, message: "Failed to assign architect" });
  }
};

module.exports = { getArchitects, assignArchitect };