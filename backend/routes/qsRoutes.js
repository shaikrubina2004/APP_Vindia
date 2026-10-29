const express = require("express");
const router = express.Router();
const c = require("../controllers/qsController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;

router.use(authMiddleware);
router.use(requireRole("quantity_surveyor", "project_manager", "site_engineer", "ceo"));
const QS_ONLY = requireRole("quantity_surveyor");

// Apply auth to all routes


/* ═══════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════ */
router.get("/dashboard", requireRole("quantity_surveyor"), c.getDashboard);

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
router.post("/daily-updates", QS_ONLY, c.createDailyUpdate);
router.patch("/daily-updates/:id", QS_ONLY, c.updateDailyUpdate);
router.delete("/daily-updates/:id", QS_ONLY, c.deleteDailyUpdate);
// Approval belongs to the Project Manager (the only screen that calls this). Before, any role the
// router admits — including the QS approving their own update, or a Site Engineer — could approve.
router.put("/daily-updates/approve/:id", requireRole("project_manager", "ceo"), async (req, res) => {
  try {
    const pool = require("../config/db");
    const { id } = req.params;
    // Ensure approved column exists (safe to run multiple times)
    await pool.query(`ALTER TABLE qs_daily_updates ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE`).catch(()=>{});
    const result = await pool.query(
      `UPDATE qs_daily_updates AS qdu
       SET approved = true
       WHERE qdu.id = $1
         AND ($2 <> 'project_manager' OR EXISTS (
           SELECT 1
           FROM projects managed_project
           JOIN employees manager ON manager.id = managed_project.manager_id
           WHERE managed_project.id = qdu.project_id
             AND manager.user_id = $3
         ))
       RETURNING qdu.*`,
      [id, req.user.role, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found or not in a project you manage" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("QS approve error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;