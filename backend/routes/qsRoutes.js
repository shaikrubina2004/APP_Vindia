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
router.put("/daily-updates/approve/:id", async (req, res) => {
  try {
    const pool = require("../config/db");
    const { id } = req.params;
    // Ensure approved column exists (safe to run multiple times)
    await pool.query(`ALTER TABLE qs_daily_updates ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE`).catch(()=>{});
    const result = await pool.query(
      `UPDATE qs_daily_updates SET approved = true WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("QS approve error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;