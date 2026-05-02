const express = require("express");
const router = express.Router();

const {
  createProject,
  getAllProjects,
  getSiteEngineers,
  getManagers,
  getCoordinators, // ✅ added
} = require("../controllers/projectController");

// ✅ Routes
router.post("/", createProject);
router.get("/", getAllProjects);
router.get("/site-engineers", getSiteEngineers);
router.get("/managers", getManagers);
router.get("/coordinators", getCoordinators); // ✅ added

module.exports = router;
