const express = require("express");
const router = express.Router();
const { getArchitects, assignArchitect } = require("../controllers/ArchitectAssignController");

// GET  /api/architect-assign/architects
router.get("/architects", getArchitects);

// PATCH /api/architect-assign/projects/:projectId/assign
router.patch("/projects/:projectId/assign", assignArchitect);

module.exports = router;