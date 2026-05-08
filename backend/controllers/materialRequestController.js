const pool = require("../config/db");

/* ─────────────────────────────
   GET ALL REQUESTS
───────────────────────────── */
exports.getRequests = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM material_requests ORDER BY created_at DESC"
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

/* ─────────────────────────────
   CREATE REQUEST (Improved)
───────────────────────────── */
exports.createRequest = async (req, res) => {
  try {
    const {
      project,
      zone,
      purpose,
      items,
      required_by,
      linked_activity,
      notes,
    } = req.body;

    // ✅ Basic validation
    if (!purpose || !items) {
      return res.status(400).json({
        error: "Purpose and items are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO material_requests 
      (project, zone, purpose, items, status, required_by, linked_activity, notes)
      VALUES ($1,$2,$3,$4,'requested',$5,$6,$7)
      RETURNING *`,
      [
        project,
        zone,
        purpose,
        typeof items === "string" ? items : JSON.stringify(items),
        required_by || null,
        linked_activity || null,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("POST ERROR:", err.message);
    res.status(500).json({ error: "Failed to create request" });
  }
};

/* ─────────────────────────────
   UPDATE STATUS
───────────────────────────── */
exports.updateRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected", "delivered"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE material_requests 
       SET status=$1 
       WHERE id=$2 
       RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).json({ error: "Failed to update status" });
  }
};