const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/pmReportController");
const protect  = require("../middleware/authMiddleware");
const { requireRole } = protect;
const pool = require("../config/db");

// Cost, timesheet and incident data is management-only. Previously any logged-in
// role (including clients) could call these endpoints directly.
const PM_REPORT_ROLES = ["project_manager", "ceo", "operations_manager"];

router.use(protect, requireRole(...PM_REPORT_ROLES));

const requireManagedProject = async (req, res, next) => {
  if (req.user.role !== "project_manager" && req.params.projectId === "null") {
    return next();
  }

  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  if (req.user.role !== "project_manager") {
    return next();
  }

  try {
    const { rows } = await pool.query(
      `SELECT 1
       FROM projects p
       JOIN employees e ON e.id = p.manager_id
       WHERE p.id = $1 AND e.user_id = $2`,
      [projectId, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Project not found or not managed by you" });
    }
    return next();
  } catch (err) {
    console.error("PM report project access check failed:", err);
    return res.status(500).json({ error: "Unable to verify project access" });
  }
};

router.use("/:projectId", requireManagedProject);

router.get("/:projectId/project",   ctrl.getProjectReport);
router.get("/:projectId/cost",      ctrl.getCostReport);
router.get("/:projectId/timesheet", ctrl.getTimesheetReport);
router.get("/:projectId/incidents", ctrl.getIncidentReport);
router.get("/:projectId/export",    ctrl.exportProjectReport);

module.exports = router;
