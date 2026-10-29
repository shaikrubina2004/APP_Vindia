const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/pmReportController");
const protect  = require("../middleware/authMiddleware");
const { requireRole } = protect;
const pool = require("../config/db");

const PM_REPORT_ROLES = ["project_manager", "ceo", "operations_manager"];
router.use(protect, requireRole(...PM_REPORT_ROLES));

// Validate every project-scoped report/export request before controller queries run.
router.param("projectId", async (req, res, next, rawProjectId) => {
  const projectId = Number(rawProjectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: "A valid projectId is required" });
  }
  try {
    if (req.user.role === "project_manager") {
      const result = await pool.query(
        `SELECT 1 FROM projects p JOIN employees e ON e.id = p.manager_id
         WHERE p.id = $1 AND e.user_id = $2 LIMIT 1`,
        [projectId, req.user.id]
      );
      if (!result.rows.length) return res.status(403).json({ error: "You do not have access to this project" });
    }
    req.reportProjectId = projectId;
    next();
  } catch (err) {
    console.error("PM report project authorization failed:", err.message);
    res.status(500).json({ error: "Unable to verify project access" });
  }
});

router.get("/:projectId/project",   ctrl.getProjectReport);
router.get("/:projectId/cost",      ctrl.getCostReport);
router.get("/:projectId/timesheet", ctrl.getTimesheetReport);
router.get("/:projectId/incidents", ctrl.getIncidentReport);
router.get("/:projectId/export",    ctrl.exportProjectReport);
module.exports = router;
