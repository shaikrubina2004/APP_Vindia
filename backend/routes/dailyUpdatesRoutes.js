const express = require("express");

const {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  updateReport,
  deleteReport
} = require("../controllers/dailyUpdatesController");

const router = express.Router();

/* ===== CREATE ===== */
router.post("/", createReport);

/* ===== GET ===== */
router.get("/", getAllReports);
router.get("/:id", getReportById);

/* ===== UPDATE ===== */
router.put("/:id", updateReport);

/* ===== APPROVE ===== */
router.put("/approve/:id", approveReport);

/* ===== DELETE ===== */
router.delete("/:id", deleteReport);

module.exports = router;