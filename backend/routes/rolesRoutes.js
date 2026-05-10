const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM roles WHERE is_active = true ORDER BY department_id, name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

module.exports = router;