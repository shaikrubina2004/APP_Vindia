const express = require("express");
const router = express.Router();

const {
  getDailyLog,
  submitDailyLog,
} = require("../controllers/architectDailyLogController");

router.get("/", getDailyLog);
router.post("/", submitDailyLog);

module.exports = router;