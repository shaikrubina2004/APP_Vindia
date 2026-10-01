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