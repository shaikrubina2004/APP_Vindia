// ══════════════════════════════════════════════════════════════════════════════
//  seDailyupdatesRoutes.js  (SE Daily Reports)
//  Mounted in server.js as:
//    const seDailyRoutes = require("./routes/seDailyupdatesRoutes");
//    app.use("/api/se-daily-reports", seDailyRoutes);
// ══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();

const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;

const {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  updateReport,
  deleteReport,
} = require("../controllers/dailyUpdatesController");

// Every route requires a valid login. Who may do what (own logs only for the
// Structural Engineer, read-all + approve for Project Manager / CEO) is
// enforced inside the controller using the role from the login token.
router.use(auth);

// ─────────────────────────────────────────────────────────────────────────────
//  ⚠️  ORDER MATTERS:
//  /approve/:id  MUST come before  /:id
//  Otherwise Express matches "approve" as the :id parameter
// ─────────────────────────────────────────────────────────────────────────────

router.get   ("/",             getAllReports);   // GET  reports (SE: own, PM/CEO: all)
router.post  ("/",             createReport);    // POST create / upsert own log by date

// Approve: Project Manager or CEO only (the Structural Engineer cannot approve).
router.put   ("/approve/:id",  requireRole("project_manager", "ceo"), approveReport);

router.get   ("/:id",          getReportById);   // GET  single report
router.put   ("/:id",          updateReport);    // PUT  update own, un-approved report
router.delete("/:id",          deleteReport);    // DELETE own un-approved report (or CEO)

module.exports = router;