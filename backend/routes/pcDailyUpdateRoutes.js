const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { insertNotification } = require("../controllers/pcNotificationsController");

/* =========================================================
   CREATE DAILY UPDATE
========================================================= */
router.post("/", async (req, res) => {
  try {
    const {
      project_id,
      coordinator_id,
      date,
      day,
      work,
      progress,
      workers,
      absent,
      cementUsed,
      steelUsed,
      materialShort,
      issues,
      severity,
      delayHours,
      delayImpact,
      pending,
      next,
      safety,
      task_updates,
      meetings,
      coord_notes,
      approval_from
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pc_daily_updates 
      (project_id, coordinator_id, date, day, work, progress,
       workers, absent, cement_used, steel_used, material_short,
       issues, severity, delay_hours, delay_impact,
       pending, next, safety,
       task_updates, meetings, coord_notes, approval_from,
       status)
       VALUES (
         $1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,$11,
         $12,$13,$14,$15,
         $16,$17,$18,
         $19,$20,$21,$22,
         'pending'
       )
       RETURNING *`,
      [
        project_id, coordinator_id, date, day, work, progress,
        workers || 0, absent || 0, cementUsed, steelUsed, materialShort,
        issues, severity || "none", delayHours || 0, delayImpact,
        pending, next, safety,
        task_updates || "[]", meetings || "[]", coord_notes || "",
        approval_from || "Project Manager"
      ]
    );
    await insertNotification(
  46,
  "work",
  "New Daily Update",
  "Site engineer submitted update",
  "/project-coordinator/daily",
  "info",
  project_id
);

    // Update project progress
    await pool.query(
      `UPDATE projects SET progress = $1 WHERE id = $2`,
      [progress || 0, project_id]
    );

    // ── Notification trigger ──────────────────────────────
    try {
      const projectResult = await pool.query(
        `SELECT name FROM projects WHERE id = $1`,
        [project_id]
      );
      const projectName = projectResult.rows[0]?.name || `Project #${project_id}`;

      await insertNotification(
        coordinator_id,
        "work",
        "Daily Update Submitted",
        `Update for ${projectName} submitted successfully`,
        "/project-coordinator/daily",
        "ok"
      );
    } catch (notifErr) {
      // Don't fail the main request if notification fails
      console.error("Notification error:", notifErr.message);
    }
    // ─────────────────────────────────────────────────────

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ message: "Error creating update" });
  }
});

/* =========================================================
   GET ALL UPDATES — ALL PROJECTS (for Project Manager)
========================================================= */
router.get("/project/all", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, p.name AS project_name
       FROM pc_daily_updates u
       LEFT JOIN projects p ON u.project_id = p.id
       ORDER BY u.date DESC, u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("FETCH ALL ERROR:", err);
    res.status(500).json({ message: "Error fetching all updates" });
  }
});

/* =========================================================
   GET ALL UPDATES FOR A PROJECT
========================================================= */
router.get("/project/:project_id", async (req, res) => {
  try {
    const { project_id } = req.params;

    const result = await pool.query(
      `SELECT u.*, p.name AS project_name
       FROM pc_daily_updates u
       JOIN projects p ON u.project_id = p.id
       WHERE u.project_id = $1
       ORDER BY u.date DESC`,
      [project_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ message: "Error fetching updates" });
  }
});

/* =========================================================
   UPDATE DAILY UPDATE
========================================================= */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      work, progress, workers, absent, cementUsed, steelUsed,
      materialShort, issues, severity, delayHours, delayImpact,
      pending, next, safety, task_updates, meetings,
      coord_notes, approval_from, project_id
    } = req.body;

    const result = await pool.query(
      `UPDATE pc_daily_updates SET
        work=$1, progress=$2, workers=$3, absent=$4,
        cement_used=$5, steel_used=$6, material_short=$7,
        issues=$8, severity=$9, delay_hours=$10, delay_impact=$11,
        pending=$12, next=$13, safety=$14,
        task_updates=$15, meetings=$16, coord_notes=$17,
        approval_from=$18, status='pending'
       WHERE id=$19
       RETURNING *`,
      [
        work, progress, workers, absent, cementUsed, steelUsed,
        materialShort, issues, severity || "none", delayHours || 0,
        delayImpact, pending, next, safety,
        task_updates || "[]", meetings || "[]", coord_notes || "",
        approval_from || "Project Manager", id
      ]
    );

    if (project_id) {
      await pool.query(
        `UPDATE projects SET progress = $1 WHERE id = $2`,
        [progress || 0, project_id]
      );
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

/* =========================================================
   GET ROLES
========================================================= */
router.get("/roles", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name FROM roles ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error("ROLES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

/* =========================================================
   DELETE
========================================================= */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM pc_daily_updates WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;