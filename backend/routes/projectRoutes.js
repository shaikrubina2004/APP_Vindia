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

// Staff/user directories (site engineers, managers, clients...) are internal data.
const notClient = (req, res, next) =>
  req.user?.role === "client"
    ? res.status(403).json({ message: "Access denied. Insufficient role." })
    : next();

// ✅ Routes
router.post("/", authMiddleware, CAN_CREATE, createProject);
router.get("/", authMiddleware, getAllProjects);
router.get("/site-engineers", authMiddleware, notClient, getSiteEngineers);
router.get("/managers", authMiddleware, notClient, getManagers);
router.get("/coordinators", authMiddleware, notClient, getCoordinators); // ✅ added
router.get("/architects", authMiddleware, notClient, getArchitects);
router.get("/clients", authMiddleware, notClient, getClients);

module.exports = router;