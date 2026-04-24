// routes/rfiRoutes.js
const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");

// ── GET all RFIs ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.project_id,
        COALESCE(p.name, 'Project #' || r.project_id) AS project,
        r.title       AS subject,
        r.description,
        r.priority,
        r.status,
        r.response,
        COALESCE(e.name, 'Engineer #' || r.raised_by)  AS raised_by,
        r.created_at  AS date
      FROM rfi r
      LEFT JOIN projects  p ON p.id = r.project_id
      LEFT JOIN employees e ON e.id = r.raised_by
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("RFI GET Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET single RFI ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.project_id,
        COALESCE(p.name, 'Project #' || r.project_id) AS project,
        r.title       AS subject,
        r.description,
        r.priority,
        r.status,
        r.response,
        COALESCE(e.name, 'Engineer #' || r.raised_by)  AS raised_by,
        r.created_at  AS date
      FROM rfi r
      LEFT JOIN projects  p ON p.id = r.project_id
      LEFT JOIN employees e ON e.id = r.raised_by
      WHERE r.id = $1
    `, [req.params.id]);

    if (!result.rows.length)
      return res.status(404).json({ error: "RFI not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create RFI ──────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { project, subject, priority } = req.body;

    const result = await pool.query(`
      INSERT INTO rfi
        (project_id, title, description, priority, status, raised_by, created_at)
      VALUES
        (1, $1, $2, $3, 'Pending', 1, NOW())
      RETURNING
        id,
        title      AS subject,
        priority,
        status,
        created_at AS date
    `, [project, subject, priority]);     
    // project name stored in title for now (until project lookup added)

    res.status(201).json({
      ...result.rows[0],
      project,                            // return the name the frontend sent
      raised_by: "Structural Engineer",
    });
  } catch (err) {
    console.error("RFI POST Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update status ────────────────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(`
      UPDATE rfi SET status = $1
      WHERE id = $2
      RETURNING id, status, title AS subject
    `, [status, req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT submit answer ────────────────────────────────────────────────────
router.put("/:id/answer", async (req, res) => {
  try {
    const { response } = req.body;
    const result = await pool.query(`
      UPDATE rfi
      SET response = $1, status = 'Answered'
      WHERE id = $2
      RETURNING id, title AS subject, status, response
    `, [response, req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;