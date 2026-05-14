const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const {
  createSiteProgress,
  getSiteProgress,
  getSiteProgressById,
  deleteSiteProgress,
} = require("../controllers/siteProgressController");

// CREATE
router.post("/", upload.array("photos"), createSiteProgress);

// GET
router.get("/", getSiteProgress);
router.get("/:id", getSiteProgressById);

// DELETE
router.delete("/:id", deleteSiteProgress);

module.exports = router;