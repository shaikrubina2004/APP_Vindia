const express = require("express");
const router  = express.Router();
const report  = require("../controllers/reportController");
const { getTimeSpentReport } = require("../controllers/timeTrackingController");
const { requireRole } = require("../middleware/requireRole");

router.get("/overview",               requireRole("ceo"), report.reportOverview);
router.get("/user-performance",       requireRole("ceo"), report.userPerformance);
router.get("/source-performance",     requireRole("ceo"), report.sourcePerformance);
router.get("/leads",                  requireRole("ceo"), report.getLeadsReport);
router.get("/export",                 requireRole("ceo"), report.exportReports);
router.get("/export-bda-performance", requireRole("ceo"), report.exportBDAPerformance);

/* ── TIME SPENT ANALYTICS — now CEO only too ── */
router.get("/time-spent", requireRole("ceo"), getTimeSpentReport);

module.exports = router;