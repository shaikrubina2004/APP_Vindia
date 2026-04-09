const express = require("express");
const router = express.Router();
const { createDiary, getDiary } = require("../controllers/siteDiaryController");

router.post("/", createDiary);
router.get("/:projectId", getDiary);

module.exports = router;