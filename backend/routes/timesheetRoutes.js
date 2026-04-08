const express = require("express");
const router = express.Router();
const pool = require("../config/db");


// =====================================
// ✅ CREATE TIMESHEET
// =====================================
router.post("/", async (req, res) => {
  try {
    const {
      id,
      name,
      email,
      role,
      week,
      status,
      rows,
      leaveHours,
      workingDays,
      type,
      submittedAt,
    } = req.body;

    await pool.query(
      `INSERT INTO timesheets
      (id, name, email, role, week, status, rows, leave_hours, working_days, type, submitted_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        name,
        email,
        role,
        week,
        status,
        JSON.stringify(rows), // ✅ store JSON
        leaveHours,
        workingDays,
        type,
        submittedAt,
      ]
    );

    res.status(201).json({ message: "✅ Timesheet saved successfully" });

  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to save timesheet" });
  }
});


// =====================================
// ✅ GET ALL TIMESHEETS (TEAM VIEW)
// =====================================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM timesheets ORDER BY submitted_at DESC"
    );

    let data = result.rows;

    // ✅ DEMO DATA IF EMPTY
    if (!data || data.length === 0) {
      data = [
        {
          id: 1,
          name: "Sajay Kumar",
          email: "sajaykumar.kp@vindiainfrasec.com",
          week: "6 Apr – 12 Apr 2026",
          status: "Pending",
          leave_hours: 8,
          working_days: 6,
          type: "Labour",
          rows: [],
        },
        {
          id: 2,
          name: "Rahul Sharma",
          email: "rahul@company.com",
          week: "6 Apr – 12 Apr 2026",
          status: "Approved",
          leave_hours: 0,
          working_days: 6,
          type: "Employee",
          rows: [],
        },
      ];
    }

    res.json(data);

  } catch (err) {
    console.error("GET ERROR:", err);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
});


// =====================================
// ✅ GET TIMESHEETS BY USER EMAIL
// =====================================
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      "SELECT * FROM timesheets WHERE email=$1 ORDER BY submitted_at DESC",
      [email]
    );

    let data = result.rows;

    // ✅ DEMO DATA IF EMPTY
    if (!data || data.length === 0) {
      data = [
        {
          id: 1,
          name: "Sajay Kumar",
          email: email,
          week: "6 Apr – 12 Apr 2026",
          status: "Pending",
          leave_hours: 8,
          working_days: 6,
          type: "Labour",
          rows: [],
        },
      ];
    }

    res.json(data);

  } catch (err) {
    console.error("GET USER ERROR:", err);
    res.status(500).json({ error: "Failed to fetch user timesheets" });
  }
});


// =====================================
// ✅ UPDATE STATUS (APPROVE / REJECT)
// =====================================
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      "UPDATE timesheets SET status=$1 WHERE id=$2",
      [status, id]
    );

    res.json({ message: "✅ Status updated" });

  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});


// =====================================
module.exports = router;