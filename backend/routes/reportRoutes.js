const express = require("express");
const router  = express.Router();
const report  = require("../controllers/reportController");

router.get("/overview",           report.reportOverview);
router.get("/user-performance",   report.userPerformance);
router.get("/source-performance", report.sourcePerformance);
router.get("/leads",              report.getLeadsReport);
router.get("/export",             report.exportReports);
router.get("/export-bda-performance", report.exportBDAPerformance);

module.exports = router;