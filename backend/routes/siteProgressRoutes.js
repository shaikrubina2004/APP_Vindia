const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");

const authMiddleware = require("../middleware/authMiddleware");

const {
  createSiteProgress,
  getSiteProgress,
  getSiteProgressById,
  deleteSiteProgress,
} = require("../controllers/siteProgressController");

/* ================= MULTER CONFIG ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/* ================= ROUTES ================= */

// ✅ CREATE (with auth + file upload)
router.post(
  "/",
  authMiddleware,
  upload.array("photos", 10),
  createSiteProgress
);

// ✅ GET ALL
router.get("/", getSiteProgress);

// ✅ GET BY ID
router.get("/:id", getSiteProgressById);

// ✅ DELETE
router.delete("/:id", authMiddleware, deleteSiteProgress);

module.exports = router;