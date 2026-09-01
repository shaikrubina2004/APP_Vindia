const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

const controller = require("../controllers/labourController");

const router = express.Router();

/* ========================================
   CREATE UPLOAD FOLDER
======================================== */

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ========================================
   MULTER STORAGE
======================================== */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const unique =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9);

    cb(
      null,
      unique + path.extname(file.originalname)
    );
  },
});

/* ========================================
   FILE FILTER
======================================== */

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only JPG, PNG and PDF files are allowed")
      );
    }
  },
});

/* ========================================
   ROUTES
======================================== */

/*
  GET
  Project Manager + Site Engineer
*/
router.get(
  "/",
  protect,
  requireRole("project_manager", "site_engineer"),
  controller.getWorkers
);

/*
  CREATE
  Site Engineer
*/
router.post(
  "/",
  protect,
  requireRole("site_engineer"),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "id_doc", maxCount: 1 },
  ]),
  controller.createWorker
);

/*
  UPDATE STATUS
  Site Engineer + Project Manager
*/
router.patch(
  "/:id/status",
  protect,
  requireRole("site_engineer", "project_manager"),
  controller.updateStatus
);

/*
  FULL UPDATE
  Site Engineer
*/
router.put(
  "/:id",
  protect,
  requireRole("site_engineer"),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "id_doc", maxCount: 1 },
  ]),
  controller.updateWorker
);

/*
  DELETE
  Project Manager
*/
router.delete(
  "/:id",
  protect,
  requireRole("project_manager"),
  controller.deleteWorker
);

/* ========================================
   ERROR HANDLER
======================================== */

router.use((err, _req, res, _next) => {
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

  return res.status(500).json({
    error: "Internal server error",
  });
});

module.exports = router;