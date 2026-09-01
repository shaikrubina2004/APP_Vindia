const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require("../middleware/authMiddleware");

const {
  createNCR,
  getNCR,
  getNCRById,
  updateNCR,
} = require("../controllers/ncrController");

/* =========================================================
   UPLOAD DIRECTORY
========================================================= */

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================================================
   MULTER
========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const unique =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9);

    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPG, PNG, WEBP and PDF files are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/* =========================================================
   CREATE
========================================================= */

router.post(
  "/",
  authMiddleware,
  upload.array("attachments", 10),
  createNCR
);

/* =========================================================
   GET
========================================================= */

router.get(
  "/",
  authMiddleware,
  getNCR
);

router.get(
  "/:id",
  authMiddleware,
  getNCRById
);

/* =========================================================
   UPDATE
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  updateNCR
);

/* =========================================================
   MULTER ERROR HANDLER
========================================================= */

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      error: err.message,
    });
  }

  next();
});

module.exports = router;