const express = require("express");
const router = express.Router();

const {
  createProject,
  getAllProjects,
  getSiteEngineers,
  getManagers,
  getCoordinators,
  getArchitects,
  getClients,
} = require("../controllers/projectController");

// ✅ Routes
router.post("/", createProject);
router.get("/", getAllProjects);
router.get("/site-engineers", getSiteEngineers);
router.get("/managers", getManagers);
router.get("/coordinators", getCoordinators); // ✅ added
router.get("/architects", getArchitects);
router.get("/clients", getClients);

module.exports = router;
