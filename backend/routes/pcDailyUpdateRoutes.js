const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/* =========================================================
   CREATE DAILY UPDATE (Project Coordinator submits)
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
      approvals
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pc_daily_updates 
      (project_id, coordinator_id, date, day, work, progress, workers, absent,
       cement_used, steel_used, material_short, issues, severity,
       delay_hours, delay_impact, pending, next, safety, approvals, status)
       
       VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,
         $9,$10,$11,$12,$13,
         $14,$15,$16,$17,$18,$19,'pending'
       )
       RETURNING *`,
      [
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
        severity || "none",
        delayHours || 0,
        delayImpact,
        pending,
        next,
        safety,
        approvals
      ]
    );

    /* 🔥 AUTO UPDATE PROJECT PROGRESS */
    await pool.query(
      `UPDATE projects 
       SET progress = $1 
       WHERE id = $2`,
      [progress || 0, project_id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ message: "Error creating update" });
  }
});

/* =========================================================
   GET ALL UPDATES (by PROJECT)
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
   UPDATE DAILY UPDATE (Edit & Resubmit)
   ========================================================= */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
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
      approvals,
      project_id // 👈 needed for updating project progress
    } = req.body;

    const result = await pool.query(
      `UPDATE pc_daily_updates SET
        work=$1,
        progress=$2,
        workers=$3,
        absent=$4,
        cement_used=$5,
        steel_used=$6,
        material_short=$7,
        issues=$8,
        severity=$9,
        delay_hours=$10,
        delay_impact=$11,
        pending=$12,
        next=$13,
        safety=$14,
        approvals=$15,
        status='pending'
       WHERE id=$16
       RETURNING *`,
      [
        work,
        progress,
        workers,
        absent,
        cementUsed,
        steelUsed,
        materialShort,
        issues,
        severity || "none",
        delayHours || 0,
        delayImpact,
        pending,
        next,
        safety,
        approvals,
        id
      ]
    );

    /* 🔥 UPDATE PROJECT PROGRESS AGAIN */
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
   DELETE DAILY UPDATE
   ========================================================= */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM pc_daily_updates WHERE id = $1`,
      [id]
    );

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;