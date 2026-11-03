const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");

router.get("/", async (req, res) => {
  try {
    // department_name is included so a page can build its department list from
    // this ONE call (the Job Openings and Add Employee pages do).
    const result = await pool.query(
      `SELECT r.*, d.name AS department_name
         FROM roles r
         LEFT JOIN departments d ON d.id = r.department_id
        WHERE r.is_active = true
        ORDER BY r.department_id, r.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

module.exports = router;