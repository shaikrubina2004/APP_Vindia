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

const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;

router.use(auth);
router.use(requireRole("quantity_surveyor", "project_manager", "site_engineer", "ceo"));
const WRITE_ROLES = requireRole("quantity_surveyor", "project_manager", "ceo");
const REVIEW_ROLES = requireRole("site_engineer", "project_manager", "ceo");

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

router.post("/create", WRITE_ROLES, createReport);
router.put("/approve/:id", REVIEW_ROLES, approveReport);  // PUT  SE approves  → approved + auto-finalise BOQ if CR also approved
router.put("/reject/:id",  REVIEW_ROLES, rejectReport);   // PUT  SE rejects   → rejected + se_comment

router.get   ("/",    getAllReports);        // GET  all reports  (?projectId=&status=)
router.post  ("/",    WRITE_ROLES, createReport);        // POST create quantity report
router.get   ("/:id", getReportById);       // GET  single report
router.put   ("/:id", WRITE_ROLES, updateReport);        // PUT  edit & resubmit
router.delete("/:id", WRITE_ROLES, deleteReport);        // DELETE report

module.exports = router;