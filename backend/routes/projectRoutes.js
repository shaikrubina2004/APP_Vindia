const express = require("express");
const router = express.Router();

const {
  createProject,
  getAllProjects,
  getSiteEngineers,
  getManagers, // ✅ ADD
} = require("../controllers/projectController");

// ✅ Routes
router.post("/", createProject);
router.get("/", getAllProjects);
router.get("/site-engineers", getSiteEngineers);
router.get("/managers", getManagers);

module.exports = router;
