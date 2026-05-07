const express = require("express");
const router = express.Router();

const { getArchitectProjects, getProjectTasks } = require("../controllers/architectProjectController");

router.get("/:userId/projects", getArchitectProjects);
router.get("/projects/:projectId/tasks", getProjectTasks);  // ← already here

module.exports = router;  