const express = require("express");
const router  = express.Router();
const report  = require("../controllers/reportController");
const { getTimeSpentReport } = require("../controllers/timeTrackingController");

router.get("/overview",               report.reportOverview);
router.get("/user-performance",       report.userPerformance);
router.get("/source-performance",     report.sourcePerformance);
router.get("/leads",                  report.getLeadsReport);
router.get("/export",                 report.exportReports);
router.get("/export-bda-performance", report.exportBDAPerformance);

/* ── TIME SPENT ANALYTICS ── */
router.get("/time-spent", getTimeSpentReport);

module.exports = router;