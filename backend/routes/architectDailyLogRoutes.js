const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createDailyLog,
  getDailyLogsByArchitect
} = require("../controllers/architectDailyLogController");

// upload
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({
    file_url: `/uploads/${req.file.filename}`,
    file_name: req.file.originalname,
    file_type: req.file.mimetype
  });
});

// main log
router.post("/daily-log", createDailyLog);

router.get("/:userId/daily-log", getDailyLogsByArchitect);

module.exports = router;