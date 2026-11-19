const express = require("express");
const router  = express.Router();
const report  = require("../controllers/reportController");
const analytics = require("../controllers/reportAnalyticsController");
const { requireRole } = require("../middleware/requireRole");

/* ── Reports & Analytics (CEO) — handlers live in reportAnalyticsController ── */
router.get("/overview",           requireRole("ceo"), analytics.reportOverview);
router.get("/user-performance",   requireRole("ceo"), analytics.userPerformance);
router.get("/source-performance", requireRole("ceo"), analytics.sourcePerformance);
router.get("/filter-options",     requireRole("ceo"), analytics.filterOptions);
router.get("/time-spent",         requireRole("ceo"), analytics.getTimeSpentReport);

/* ── Marketing spend per source (drives cost-per-lead) ── */
router.get("/source-spend",       requireRole("ceo"), analytics.getSourceSpend);
router.post("/source-spend",      requireRole("ceo"), analytics.saveSourceSpend);
router.delete("/source-spend/:id", requireRole("ceo"), analytics.deleteSourceSpend);

/* ── Lists & exports (unchanged) ── */
router.get("/leads",                  requireRole("ceo"), report.getLeadsReport);
router.get("/export",                 requireRole("ceo"), report.exportReports);
router.get("/export-bda-performance", requireRole("ceo"), report.exportBDAPerformance);

module.exports = router;