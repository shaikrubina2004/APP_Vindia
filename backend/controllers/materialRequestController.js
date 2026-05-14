const pool = require("../config/db");

/* ─────────────────────────────
   HELPER: Calculate total qty
───────────────────────────── */
const calcTotal = (items) => {
  return items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
};

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
   CREATE REQUEST
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

    if (!purpose || !items) {
      return res.status(400).json({
        error: "Purpose and items are required",
      });
    }

    const parsedItems =
      typeof items === "string" ? JSON.parse(items) : items;

    const total_qty = calcTotal(parsedItems);

    const result = await pool.query(
      `INSERT INTO material_requests
      (project, zone, purpose, items, status, required_by, linked_activity, notes, total_qty, delivered_qty, received_qty)
      VALUES ($1,$2,$3,$4,'requested',$5,$6,$7,$8,0,0)
      RETURNING *`,
      [
        project,
        zone,
        purpose,
        JSON.stringify(parsedItems),
        required_by || null,
        linked_activity || null,
        notes || null,
        total_qty,
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

/* ─────────────────────────────
   UPDATE FULL REQUEST (EDIT)
───────────────────────────── */
exports.updateFullRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      project,
      zone,
      purpose,
      items,
      required_by,
      linked_activity,
      notes,
    } = req.body;

    const check = await pool.query(
      "SELECT status FROM material_requests WHERE id=$1",
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (check.rows[0].status === "approved") {
      return res.status(400).json({ error: "Cannot edit approved request" });
    }

    const parsedItems =
      typeof items === "string" ? JSON.parse(items) : items;

    const total_qty = calcTotal(parsedItems);

    const result = await pool.query(
      `UPDATE material_requests
       SET project=$1,
           zone=$2,
           purpose=$3,
           items=$4,
           total_qty=$5,
           required_by=$6,
           linked_activity=$7,
           notes=$8
       WHERE id=$9
       RETURNING *`,
      [
        project,
        zone,
        purpose,
        JSON.stringify(parsedItems),
        total_qty,
        required_by,
        linked_activity,
        notes,
        id,
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
};

/* ─────────────────────────────
   DELETE REQUEST
───────────────────────────── */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      "SELECT status FROM material_requests WHERE id=$1",
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }

    if (check.rows[0].status === "approved") {
      return res.status(400).json({ error: "Cannot delete approved request" });
    }

    await pool.query("DELETE FROM material_requests WHERE id=$1", [id]);

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
};

/* ─────────────────────────────
   ADD DELIVERY
───────────────────────────── */
exports.addDelivery = async (req, res) => {
  try {
    const { request_id, qty } = req.body;

    if (qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    await pool.query(
      `UPDATE material_requests
       SET delivered_qty = delivered_qty + $1
       WHERE id = $2`,
      [qty, request_id]
    );

    res.json({ message: "Delivery updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────
   RECEIVE MATERIAL
───────────────────────────── */
exports.receiveMaterial = async (req, res) => {
  try {
    const { request_id, qty } = req.body;

    if (qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    await pool.query(
      `UPDATE material_requests
       SET received_qty = received_qty + $1,
           status = CASE
             WHEN received_qty + $1 >= total_qty THEN 'delivered'
             ELSE status
           END
       WHERE id = $2`,
      [qty, request_id]
    );

    res.json({ message: "Material received updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};