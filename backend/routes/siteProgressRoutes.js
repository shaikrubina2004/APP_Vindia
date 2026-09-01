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
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
});

/* ================= ROUTES ================= */

/* CREATE */
router.post(
  "/",
  authMiddleware,
  upload.array("photos", 10),
  createSiteProgress
);

/* GET ALL */
router.get(
  "/",
  authMiddleware,
  getSiteProgress
);

/* GET BY ID */
router.get(
  "/:id",
  authMiddleware,
  getSiteProgressById
);

/* DELETE */
router.delete(
  "/:id",
  authMiddleware,
  deleteSiteProgress
);

/* ================= MULTER ERROR HANDLER ================= */

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
});

module.exports = router;