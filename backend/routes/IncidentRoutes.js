const express = require("express");
const router = express.Router();
const c = require("../controllers/IncidentController");

// ── Roles + Users for dropdowns (must be before /:id) ───────
router.get("/roles", c.getRoles); // GET /api/incidents/roles
router.get("/roles/:roleId/users", c.getUsersByRole); // GET /api/incidents/roles/:roleId/users

// ── Stats (before /:id) ──────────────────────────────────────
router.get("/stats", c.getStats);

// ── Task queue (before /:id) ─────────────────────────────────
router.get("/tasks", c.getAllTasks);
router.patch("/tasks/:taskId/status", c.updateTaskStatus);
router.delete("/tasks/:taskId", c.deleteTask);
router.post("/tasks/:taskId/comments", c.addTaskComment);

// ── Incidents ────────────────────────────────────────────────
router.get("/", c.getAllIncidents);
router.post("/", c.createIncident);
router.get("/:id", c.getIncidentById);
router.patch("/:id", c.updateIncident);
router.patch("/:id/status", c.updateIncidentStatus);
router.delete("/:id", c.deleteIncident);

// ── Incident sub-resources ───────────────────────────────────
router.post("/:id/comments", c.addIncidentComment);
router.post("/:id/photos", c.addIncidentPhoto);
router.post("/:id/tasks", c.createTasks);
router.get("/:id/tasks", c.getTasksByIncident);

module.exports = router;
