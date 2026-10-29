// routes/labourReportRoutes.js
// Controller exports: create, getAll, getOne, updateStatus, remove

const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const ctrl    = require("../controllers/labourReportController");

router.get("/", auth, ctrl.getAll);

// Used by Measurement page
router.get(
  "/measurement/:id",
  auth,
  auth.requireRole("site_engineer", "project_manager", "quantity_surveyor", "ceo"),
  ctrl.getMeasurementSource
);

// Get a single Labour Report
router.get("/:id", auth, auth.requireRole("site_engineer", "project_manager", "quantity_surveyor", "ceo"), ctrl.getOne);

// Create Labour Report
router.post("/", auth, auth.requireRole("site_engineer"), ctrl.create);

// Update Status
router.patch("/:id", auth, auth.requireRole("project_manager"), ctrl.updateStatus);

// Delete
router.delete("/:id", auth, ctrl.remove);

module.exports = router;