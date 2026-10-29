const express = require("express");

const {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  updateReport,
  deleteReport,
  sendToCeo
} = require("../controllers/dailyUpdatesController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Tags every request on this router as Project Manager's own reports, so the
// shared controller can tell them apart from Structural Engineer's
// (seDailyupdatesRoutes.js sets this to "structural_engineer").
router.use((req, _res, next) => { req.reportRole = "project_manager"; next(); });

/* ===== CREATE ===== */
router.post("/", createReport);

/* ===== GET ===== */
router.get("/", getAllReports);
router.get("/:id", getReportById);

/* ===== UPDATE ===== */
router.put("/:id", updateReport);

/* ===== SEND TO CEO ===== */
router.put("/send-to-ceo/:id", protect, sendToCeo);

/* ===== APPROVE ===== */
router.put("/approve/:id", approveReport);

/* ===== DELETE ===== */
router.delete("/:id", deleteReport);

module.exports = router;