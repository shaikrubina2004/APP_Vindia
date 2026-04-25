const express = require("express");
const router = express.Router();
const c = require("../controllers/IncidentController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply to every incident route
router.use(authMiddleware);

// ── Roles + Users for dropdowns (must be before /:id) ────────
router.get("/roles", c.getRoles);
router.get("/roles/:roleId/users", c.getUsersByRole);

// ── Stats ─────────────────────────────────────────────────────
router.get("/stats", c.getStats);

// ── Task queue (before /:id) ──────────────────────────────────
// ── Task queue (before /:id) ──────────────────────────────────
router.get("/tasks", c.getAllTasks);
router.post("/tasks/standalone", c.createStandaloneTask); // ← MUST BE FIRST
router.patch("/tasks/:taskId/status", c.updateTaskStatus);
router.delete("/tasks/:taskId", c.deleteTask);
router.post("/tasks/:taskId/comments", c.addTaskComment);
router.post("/tasks/:taskId/photos", c.addTaskPhoto);

// ── Incidents ─────────────────────────────────────────────────
router.get("/", c.getAllIncidents);
router.post("/", c.createIncident);
router.get("/:id", c.getIncidentById);
router.patch("/:id", c.updateIncident);
router.patch("/:id/status", c.updateIncidentStatus);
router.delete("/:id", c.deleteIncident);

// ── Incident sub-resources ────────────────────────────────────
router.post("/:id/comments", c.addIncidentComment);
router.post("/:id/photos", c.addIncidentPhoto);
router.post("/:id/tasks", c.createTasks);
router.get("/:id/tasks", c.getTasksByIncident);

module.exports = router;
