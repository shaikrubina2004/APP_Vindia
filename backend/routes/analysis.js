const express = require("express");
const router = express.Router();
const pool = require("../config/db"); // ✅ corrected

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, project_name, type, status, created_at FROM analysis ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;