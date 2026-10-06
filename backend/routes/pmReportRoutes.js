const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/pmReportController");
const protect  = require("../middleware/authMiddleware");
const { requireRole } = protect;

// Cost, timesheet and incident data is management-only. Previously any logged-in
// role (including clients) could call these endpoints directly.
const PM_REPORT_ROLES = ["project_manager", "ceo", "operations_manager"];

router.use(protect, requireRole(...PM_REPORT_ROLES));

router.get("/:projectId/project",   ctrl.getProjectReport);
router.get("/:projectId/cost",      ctrl.getCostReport);
router.get("/:projectId/timesheet", ctrl.getTimesheetReport);
router.get("/:projectId/incidents", ctrl.getIncidentReport);
router.get("/:projectId/export",    ctrl.exportProjectReport);

module.exports = router;
