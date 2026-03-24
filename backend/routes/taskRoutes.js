const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasksByProject
} = require("../controllers/taskController");

router.post("/", createTask);
router.get("/:projectId", getTasksByProject);

module.exports = router;