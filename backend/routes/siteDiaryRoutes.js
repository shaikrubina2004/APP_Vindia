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
  auth.requireRole("site_engineer"),
  upload.array("attachments"),
  c.createDiary
);

// Get Diaries
router.get(
  "/",
  auth,
  auth.requireRole("site_engineer", "project_manager", "project_coordinator", "ceo"),
  c.getDiary
);

// Review list + approval for the Project Manager / Coordinator / CEO.
// Declared before any "/:id" style route.
router.get("/review", auth, auth.requireRole(...c.DIARY_REVIEW_ROLES), c.getDiaryForReview);
router.put("/approve/:id", auth, auth.requireRole(...c.DIARY_REVIEW_ROLES), c.approveDiary);

// Get Milestones
router.get(
  "/milestones",
  auth,
  auth.requireRole("site_engineer", "project_manager", "project_coordinator", "ceo"),
  c.getMilestones
);

// Get WBS tasks
router.get(
  "/wbs",
  auth,
  auth.requireRole("site_engineer", "project_manager", "project_coordinator", "ceo"),
  c.getWbs
);

module.exports = router;