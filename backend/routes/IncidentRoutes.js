const express = require("express");
const router = express.Router();
const c = require("../controllers/IncidentController");
const authMiddleware = require("../middleware/authMiddleware");
const { isAssignedProject } = require("../utils/siteEngineerAccess");
const pool = require("../config/db");

// Apply to every incident route
router.use(authMiddleware);
router.use(async (req, res, next) => {
  if (req.user?.role !== "site_engineer") return next();
  try {
    const path = req.path;
    if (path.startsWith("/roles")) return next();
    if (
      req.method === "GET" &&
      ["/", "/tasks", "/stats"].includes(path)
    ) return next();

    let projectId = req.body?.project_id || req.query?.project_id;
    if (!projectId && /^\/tasks\/\d+/.test(path)) {
      const taskId = path.split("/")[2];
      const result = await pool.query(
        `SELECT COALESCE(t.project_id, i.project_id) AS project_id
           FROM tasks t
           LEFT JOIN incidents i ON i.id = t.incident_id
          WHERE t.id = $1 AND t.is_deleted = FALSE`,
        [taskId]
      );
      projectId = result.rows[0]?.project_id;
    } else if (!projectId && /^\/\d+/.test(path)) {
      const incidentId = path.split("/")[1];
      const result = await pool.query(
        "SELECT project_id FROM incidents WHERE id = $1 AND is_deleted = FALSE",
        [incidentId]
      );
      projectId = result.rows[0]?.project_id;
    }

    if (!(await isAssignedProject(req.user.id, projectId))) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this project",
      });
    }
    return next();
  } catch (error) {
    console.error("Incident project access check failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify project access",
    });
  }
});

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
