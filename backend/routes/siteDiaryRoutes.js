const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createDiary,
  getDiary,
  getDiaryById,
  getMilestones,
  getWbs
} = require("../controllers/siteDiaryController");


// ================= IMPORTANT (ORDER MATTERS) =================

// ✅ FIRST: custom routes
router.get("/milestones", authMiddleware, getMilestones);
router.get("/wbs", authMiddleware, getWbs);


// ================= CRUD ROUTES =================

// CREATE
router.post("/", authMiddleware, createDiary);

// GET ALL
router.get("/", authMiddleware, getDiary);

// GET BY ID (⚠️ KEEP LAST)
router.get("/:id", authMiddleware, getDiaryById);


module.exports = router;