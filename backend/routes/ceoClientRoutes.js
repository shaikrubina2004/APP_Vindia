// backend/routes/ceoClientRoutes.js
// Mounted at /api/ceo/clients (see server.js).
// Every route requires a valid JWT AND the CEO role — enforced server-side.
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  getClients,
  getClientById,
  getClientProjects,
  getClientActivity,
} = require("../controllers/ceoClientController");

router.use(protect);
router.use(requireRole("ceo"));

router.get("/", getClients);
router.get("/:clientId", getClientById);
router.get("/:clientId/projects", getClientProjects);
router.get("/:clientId/activity", getClientActivity);

module.exports = router;