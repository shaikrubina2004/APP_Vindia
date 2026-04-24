const express = require("express");
const router = express.Router();

const { getArchitectProjects } = require("../controllers/architectProjectController");

// ❌ REMOVE "architect" here
router.get("/:userId/projects", getArchitectProjects);

module.exports = router;