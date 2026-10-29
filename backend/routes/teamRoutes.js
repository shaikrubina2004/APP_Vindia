const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/teamController");
const protect  = require("../middleware/authMiddleware");
const canManageTeam = protect.requireRole("project_manager", "ceo");

router.get   ("/",               protect, canManageTeam, ctrl.getAllTeam);
router.get   ("/:projectId",     protect, canManageTeam, ctrl.getTeamByProject);
router.post  ("/",               protect, canManageTeam, ctrl.addMember);
router.put   ("/:id",            protect, canManageTeam, ctrl.updateMember);
router.delete("/:id",            protect, canManageTeam, ctrl.deleteMember);
router.post  ("/:id/incidents",  protect, canManageTeam, ctrl.logIncident);
router.post  ("/:id/tasks",      protect, canManageTeam, ctrl.assignTask);

module.exports = router;