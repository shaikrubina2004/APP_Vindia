// backend/routes/progressRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware, authMiddleware.requireRole(
  "site_engineer",
  "project_manager",
  "quantity_surveyor",
  "ceo"
));
const {
  createProgress,
  getProgress,
  getProgressById,
  updateProgress,
  deleteProgress,
} = require("../controllers/progressController");

/* ===== CREATE ===== */
router.post("/", createProgress);

/* ===== GET ===== */
router.get("/", getProgress);
router.get("/:id", getProgressById);

/* ===== UPDATE ===== */
router.put("/:id", updateProgress);

/* ===== DELETE ===== */
router.delete("/:id", deleteProgress);

module.exports = router;