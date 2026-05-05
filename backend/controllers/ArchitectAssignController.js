const pool = require("../config/db");

/**
 * GET /api/architect-assign/architects
 * Fetch all active users with role_id = 29 (Architect)
 */
const getArchitects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, status
       FROM users
       WHERE role_id = 29
       ORDER BY name ASC`
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

    // Check architect exists with role_id = 29
    const archCheck = await pool.query(
      "SELECT id, name FROM users WHERE id = $1 AND role_id = 29",
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