// ══════════════════════════════════════════════════════════════════════════════
//  Dailyupdatesseroutes.js  (SE Daily Reports)
//  Register in server.js:
//    const seDailyRoutes = require("./routes/Dailyupdatesseroutes");
//    app.use("/api/se-daily-reports", seDailyRoutes);
// ══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();

const {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  updateReport,
  deleteReport,
} = require("../controllers/dailyUpdatesController");

// Optional auth middleware — uncomment if you have one:
// const { protect } = require("../middleware/authMiddleware");
// router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
//  ⚠️  ORDER MATTERS:
//  /approve/:id  MUST come before  /:id
//  Otherwise Express matches "approve" as the :id parameter
// ─────────────────────────────────────────────────────────────────────────────

router.get   ("/",             getAllReports);   // GET  all reports
router.post  ("/",             createReport);    // POST create / upsert by date

router.put   ("/approve/:id",  approveReport);   // ✅ BEFORE /:id  — approve a report

router.get   ("/:id",          getReportById);   // GET  single report
router.put   ("/:id",          updateReport);    // PUT  update report
router.delete("/:id",          deleteReport);    // DELETE report

module.exports = router;