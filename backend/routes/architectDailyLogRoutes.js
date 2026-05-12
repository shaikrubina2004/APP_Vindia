const express = require("express");
const router = express.Router();

// ✅ FIX: import getProjectLogs along with the other controllers
const {
  getDailyLog,
  submitDailyLog,
  getProjectLogs,
  getAllLogs,
} = require("../controllers/architectDailyLogController");

router.get("/all", getAllLogs);          // PM: all architects, no params
router.get("/", getDailyLog);
router.get("/history", getProjectLogs);
router.post("/", submitDailyLog);

module.exports = router;