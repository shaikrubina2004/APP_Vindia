const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/* GET ALL SNAGS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM snags ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching snags" });
  }
});

/* CREATE SNAG */
router.post("/", async (req, res) => {
  const {
    title,
    description,
    zone,
    priority,
    drawing_ref,
    grid_ref,
    due_date
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO snags 
      (title, description, zone, priority, drawing_ref, grid_ref, due_date, raised_by, raised_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        title,
        description,
        zone,
        priority,
        drawing_ref,
        grid_ref,
        due_date,
        "architect",                // ✅ FIX
        new Date()                 // ✅ FIX
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("CREATE SNAG ERROR:", err.message); // 👈 IMPORTANT
    res.status(500).json({ message: "Error creating snag" });
  }
});

/* UPDATE SNAG */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, resolution_notes, resolved_at, closed_at } = req.body;

  const result = await pool.query(
    `UPDATE snags
     SET status = $1,
         resolution_notes = COALESCE($2, resolution_notes),
         resolved_at = COALESCE($3, resolved_at),
         closed_at = COALESCE($4, closed_at)
     WHERE id = $5
     RETURNING *`,
    [status, resolution_notes, resolved_at, closed_at, id]
  );

  res.json(result.rows[0]);
});

module.exports = router;