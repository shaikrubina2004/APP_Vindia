const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET DASHBOARD DATA
router.get("/", async (req, res) => {
  try {
    const totalEmployees = await pool.query(
      "SELECT COUNT(*) FROM employees"
    );

    const presentToday = await pool.query(
      "SELECT COUNT(*) FROM attendance WHERE status='Present' AND date=CURRENT_DATE"
    );

    const onLeave = await pool.query(
      "SELECT COUNT(*) FROM leave_requests WHERE status='Approved' AND CURRENT_DATE BETWEEN from_date AND to_date"
    );

    res.json({
      totalEmployees: parseInt(totalEmployees.rows[0].count),
      presentToday: parseInt(presentToday.rows[0].count),
      onLeave: parseInt(onLeave.rows[0].count),
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching dashboard data");
  }
});

module.exports = router;