const express = require("express");
const router = express.Router();
const pool = require("../config/db");
// ✅ GET ALL RFIs
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rfis ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ GET SINGLE RFI
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM rfis WHERE id=$1",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ CREATE RFI
router.post("/", async (req, res) => {
  const { project, subject, priority } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO rfis (project, subject, priority, status, date)
       VALUES ($1, $2, $3, 'Pending', NOW())
       RETURNING *`,
      [project, subject, priority]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ UPDATE STATUS
router.put("/:id/status", async (req, res) => {
  const { status } = req.body;

  try {
    await pool.query(
      "UPDATE rfis SET status=$1 WHERE id=$2",
      [status, req.params.id]
    );

    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ ANSWER RFI
router.put("/:id/answer", async (req, res) => {
  const { response } = req.body;

  try {
    const result = await pool.query(
      `UPDATE rfis 
       SET response=$1, status='Answered' 
       WHERE id=$2 
       RETURNING *`,
      [response, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;