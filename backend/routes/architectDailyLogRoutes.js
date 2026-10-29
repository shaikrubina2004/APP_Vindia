const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const reviewAccess = auth.requireRole("project_manager", "ceo");

// ✅ FIX: import getProjectLogs along with the other controllers
const {
  getDailyLog,
  submitDailyLog,
  getProjectLogs,
  getAllLogs,
} = require("../controllers/architectDailyLogController");

router.get("/all", auth, reviewAccess, getAllLogs);
router.get("/", getDailyLog);
router.get("/history", getProjectLogs);
router.post("/", submitDailyLog);

module.exports = router;