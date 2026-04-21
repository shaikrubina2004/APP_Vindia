// backend/routes/progressRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createProgress,
  getProgress,
  getProgressById,
  updateProgress,
  deleteProgress,
} = require("../controllers/progressController");

/* ===== CREATE ===== */
router.post("/", authMiddleware, createProgress);

/* ===== GET ===== */
router.get("/", getProgress);
router.get("/:id", getProgressById);

/* ===== UPDATE ===== */
router.put("/:id", authMiddleware, updateProgress);

/* ===== DELETE ===== */
router.delete("/:id", authMiddleware, deleteProgress);

module.exports = router;