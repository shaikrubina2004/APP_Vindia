const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/pmReportController");
const protect  = require("../middleware/authMiddleware");

router.get("/:projectId/project",   protect, ctrl.getProjectReport);
router.get("/:projectId/cost",      protect, ctrl.getCostReport);
router.get("/:projectId/timesheet", protect, ctrl.getTimesheetReport);
router.get("/:projectId/incidents", protect, ctrl.getIncidentReport);
router.get("/:projectId/export",    protect, ctrl.exportProjectReport);

module.exports = router;