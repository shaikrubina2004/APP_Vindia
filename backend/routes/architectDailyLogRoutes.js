const express = require("express");
const router = express.Router();

// ✅ FIX: import getProjectLogs along with the other controllers
const {
  getDailyLog,
  submitDailyLog,
  getProjectLogs,
} = require("../controllers/architectDailyLogController");

router.get("/", getDailyLog);
router.get("/history", getProjectLogs); // ✅ now properly imported
router.post("/", submitDailyLog);

module.exports = router;  