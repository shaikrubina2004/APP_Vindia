const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/teamController");
const authMiddleware = require("../middleware/authMiddleware");
const protect = authMiddleware.protect || authMiddleware;
const requireRole = authMiddleware.requireRole;

if (typeof protect !== "function" || typeof requireRole !== "function") {
  throw new Error("teamRoutes requires protect and requireRole from authMiddleware");
}

// Read-only summary for oversight. Declared before the PM-only gate and before "/:projectId".
// Everything else on this router stays Project Manager / executive only.
router.get("/overview", protect, requireRole("operations_manager", "ceo"), ctrl.getTeamOverview);
// Any signed-in employee: only the projects they belong to (checked inside the controller).
router.get("/my-projects", protect, ctrl.getMyProjectTeams);
// The signed-in user's own team activity (floating widget badge + pop-outs).
router.get("/activity", protect, ctrl.getTeamActivity);
router.post("/activity/seen", protect, ctrl.markTeamActivitySeen);

router.use(protect, requireRole("project_manager", "ceo", "admin", "administrator"));

router.get("/", ctrl.getAllTeam);
router.get("/roster", ctrl.getRoster);
router.post("/import", ctrl.importToTeam);
router.get("/:projectId", ctrl.getTeamByProject);
router.post("/", ctrl.addMember);
router.put("/:id", ctrl.updateMember);
router.delete("/:id", ctrl.deleteMember);
router.post("/:id/incidents", ctrl.logIncident);
router.put("/incidents/:incidentId", ctrl.updateIncident);
router.get("/:id/tasks", ctrl.getTasks);
router.post("/:id/tasks", ctrl.assignTask);
router.put("/tasks/:taskId", ctrl.updateTask);

module.exports = router;
