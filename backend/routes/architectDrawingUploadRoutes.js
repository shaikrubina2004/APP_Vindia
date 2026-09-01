// backend/routes/architectDrawingUploadRoutes.js

const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/authMiddleware");

/* ========================================
   POST /api/architect-drawings/upload
======================================== */

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const fileUrl =
      `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${req.file.filename}`;

    return res.json({
      success: true,
      url: fileUrl,
      file_name: req.file.originalname,
    });
  }
);

module.exports = router;