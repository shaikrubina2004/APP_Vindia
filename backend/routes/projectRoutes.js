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

/* ── AUTH ──
   Previously no auth at all — anyone could view every project
   (budgets, clients, timelines) or create a new one with no login.
   Backs the CEO/PM Project Management page: reads open to any
   logged-in user (several roles browse projects), creating a
   project restricted to CEO/Project Manager. */
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const CAN_CREATE = requireRole("ceo", "project_manager");

// ✅ Routes
router.post("/", authMiddleware, CAN_CREATE, createProject);
router.get("/", authMiddleware, getAllProjects);
router.get("/site-engineers", authMiddleware, getSiteEngineers);
router.get("/managers", authMiddleware, getManagers);
router.get("/coordinators", authMiddleware, getCoordinators); // ✅ added
router.get("/architects", authMiddleware, getArchitects);
router.get("/clients", authMiddleware, getClients);

module.exports = router;