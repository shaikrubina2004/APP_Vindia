// ══════════════════════════════════════════════════════════════════════════════
//  quantityReportRoutes.js
//
//  Register in server.js:
//    const quantityReportRoutes = require("./routes/quantityReportRoutes");
//    app.use("/api/quantity-report", quantityReportRoutes);
//
// ══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();

const {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  approveReport,
  rejectReport,
  deleteReport,
} = require("../controllers/quantityReportController");

// Optional auth middleware — uncomment if you have one:
// const { protect } = require("../middleware/authMiddleware");
// router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
//  ⚠️  ORDER MATTERS:
//  /approve/:id and /reject/:id MUST come BEFORE /:id
//  Otherwise Express matches "approve" / "reject" as the :id parameter
// ─────────────────────────────────────────────────────────────────────────────

router.put("/approve/:id", approveReport);  // PUT  SE approves  → approved + auto-finalise BOQ if CR also approved
router.put("/reject/:id",  rejectReport);   // PUT  SE rejects   → rejected + se_comment

router.get   ("/",    getAllReports);        // GET  all reports  (?projectId=&status=)
router.post  ("/",    createReport);        // POST create quantity report
router.get   ("/:id", getReportById);       // GET  single report
router.put   ("/:id", updateReport);        // PUT  edit & resubmit
router.delete("/:id", deleteReport);        // DELETE report

module.exports = router;