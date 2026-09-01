// backend/routes/sitephotosRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/sitephotosController");

/* ========================================
   MULTER CONFIG
======================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },

  filename: (req, file, cb) => {
    const unique =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9);

    cb(null, unique + path.extname(file.originalname));
  },
});

/* ========================================
   FILE FILTER
======================================== */

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Only image and video files are allowed"),
      false
    );
  }
};

/* ========================================
   UPLOAD CONFIG
======================================== */

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

/* ========================================
   ROUTES
======================================== */

/* GET ALL PHOTOS */
router.get(
  "/",
  authMiddleware,
  controller.getPhotos
);

/* UPLOAD PHOTO */
router.post(
  "/",
  authMiddleware,
  upload.single("photo"),
  controller.uploadPhotos
);

/* SHARE PHOTO */
router.post(
  "/share",
  authMiddleware,
  controller.sharePhoto
);

/* DOWNLOAD PHOTOS AS ZIP */
router.get(
  "/download-set",
  authMiddleware,
  controller.downloadSet
);

/* DELETE PHOTO */
router.delete(
  "/:id",
  authMiddleware,
  controller.deletePhoto
);

/* ========================================
   ERROR HANDLER
======================================== */

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