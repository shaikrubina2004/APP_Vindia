const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/teamController");
const protect  = require("../middleware/authMiddleware");

router.get   ("/:projectId",     protect, ctrl.getTeamByProject);
router.post  ("/",               protect, ctrl.addMember);
router.put   ("/:id",            protect, ctrl.updateMember);
router.delete("/:id",            protect, ctrl.deleteMember);
router.post  ("/:id/incidents",  protect, ctrl.logIncident);
router.post  ("/:id/tasks",      protect, ctrl.assignTask);

module.exports = router;