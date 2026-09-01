const express = require("express");
const router = express.Router();
const multer = require("multer");

const auth = require("../middleware/authMiddleware");
const c = require("../controllers/siteDiaryController");

/* ── MULTER SETUP ── */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP and PDF files are allowed"));
    }
  },
});

/* ── ROUTES ── */

// Create Diary
router.post(
  "/",
  auth,
  upload.array("attachments"),
  c.createDiary
);

// Get Diaries
router.get(
  "/",
  auth,
  c.getDiary
);

// Get Milestones
router.get(
  "/milestones",
  auth,
  c.getMilestones
);

// Get WBS tasks
router.get(
  "/wbs",
  auth,
  c.getWbs
);

module.exports = router;