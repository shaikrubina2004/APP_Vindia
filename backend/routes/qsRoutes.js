const express = require("express");
const router = express.Router();
const c = require("../controllers/qsController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply auth to all routes


/* ═══════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════ */
router.get("/dashboard", c.getDashboard);

/* ═══════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════ */
router.get("/notifications", c.getNotifications);

/* ═══════════════════════════════════════════════
   PROJECTS
═══════════════════════════════════════════════ */
router.get("/projects", c.getProjects);

/* ═══════════════════════════════════════════════
   DAILY UPDATES
═══════════════════════════════════════════════ */
router.get("/daily-updates", c.getDailyUpdates);
router.get("/daily-updates/:id", c.getDailyUpdateById);
router.post("/daily-updates", c.createDailyUpdate);
router.patch("/daily-updates/:id", c.updateDailyUpdate);
router.delete("/daily-updates/:id", c.deleteDailyUpdate);

module.exports = router;