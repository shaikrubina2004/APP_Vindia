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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM material_requests
       WHERE created_by = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET ERROR:", err.message);
    res.status(500).json({
      error: "Failed to fetch requests",
    });
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
    const userId = req.user?.id;

if (!userId) {
  return res.status(401).json({
    error: "User not authenticated",
  });
}

    const parsedItems =
      typeof items === "string" ? JSON.parse(items) : items;

    const total_qty = calcTotal(parsedItems);

    const result = await pool.query(
      `INSERT INTO material_requests
      (
  project,
  zone,
  purpose,
  items,
  status,
  required_by,
  linked_activity,
  notes,
  total_qty,
  delivered_qty,
  received_qty,
  created_by
)
VALUES ($1,$2,$3,$4,'requested',$5,$6,$7,$8,0,0,$9)
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
        userId,
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
/* ─────────────────────────────
   UPDATE STATUS
───────────────────────────── */
exports.updateRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Only Procurement / PM workflow statuses belong here.
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Use approved or rejected.",
      });
    }

    const check = await pool.query(
      `SELECT id, status
       FROM material_requests
       WHERE id = $1`,
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Request not found",
      });
    }

    const currentStatus = check.rows[0].status;

    // Approval/rejection is allowed only while request is pending.
    if (currentStatus !== "requested") {
      return res.status(400).json({
        error: `Cannot change status from "${currentStatus}" to "${status}"`,
      });
    }

    const result = await pool.query(
      `UPDATE material_requests
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    return res.json(result.rows[0]);

  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update status",
    });
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

    if (check.rows[0].status !== "requested") {
  return res.status(400).json({
    error: "Only requested material requests can be edited",
  });
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

    if (check.rows[0].status !== "requested") {
  return res.status(400).json({
    error: "Only requested material requests can be deleted",
  });
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

    const deliveryQty = Number(qty);

    if (
      !request_id ||
      !Number.isFinite(deliveryQty) ||
      deliveryQty <= 0
    ) {
      return res.status(400).json({
        error: "Valid request_id and delivery quantity are required",
      });
    }

    const check = await pool.query(
      `SELECT
         id,
         status,
         total_qty,
         delivered_qty,
         received_qty
       FROM material_requests
       WHERE id = $1`,
      [request_id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Material request not found",
      });
    }

    const request = check.rows[0];

    // Delivery can happen only after approval.
    if (request.status !== "approved") {
      return res.status(400).json({
        error: "Material can be delivered only after the request is approved",
      });
    }

    const totalQty = Number(request.total_qty || 0);
    const deliveredQty = Number(request.delivered_qty || 0);

    const remainingToDeliver = Math.max(
      0,
      totalQty - deliveredQty
    );

    if (remainingToDeliver <= 0) {
      return res.status(400).json({
        error: "The full requested quantity has already been delivered",
      });
    }

    if (deliveryQty > remainingToDeliver) {
      return res.status(400).json({
        error: `Only ${remainingToDeliver} quantity remains to be delivered`,
      });
    }

    const newDeliveredQty = deliveredQty + deliveryQty;

    const result = await pool.query(
      `UPDATE material_requests
       SET delivered_qty = $1
       WHERE id = $2
       RETURNING *`,
      [newDeliveredQty, request_id]
    );

    return res.json({
      message: "Delivery updated",
      request: result.rows[0],
    });

  } catch (err) {
    console.error("ADD DELIVERY ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update delivery",
    });
  }
};

/* ─────────────────────────────
   RECEIVE MATERIAL
───────────────────────────── */
exports.receiveMaterial = async (req, res) => {
  try {
    const { request_id, qty } = req.body;

    const receiveQty = Number(qty);

    if (!request_id || !Number.isFinite(receiveQty) || receiveQty <= 0) {
      return res.status(400).json({
        error: "Valid request_id and quantity are required",
      });
    }

    const check = await pool.query(
      `SELECT
         id,
         status,
         total_qty,
         delivered_qty,
         received_qty
       FROM material_requests
       WHERE id = $1`,
      [request_id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Material request not found",
      });
    }

    const request = check.rows[0];

    // Site Engineer can receive only after approval.
    if (request.status !== "approved") {
      return res.status(400).json({
        error: "Material can be received only after the request is approved",
      });
    }

    const totalQty = Number(request.total_qty || 0);
    const deliveredQty = Number(request.delivered_qty || 0);
    const receivedQty = Number(request.received_qty || 0);

    const remainingToReceive = Math.max(
      0,
      deliveredQty - receivedQty
    );

    if (remainingToReceive <= 0) {
      return res.status(400).json({
        error: "No delivered quantity is available to receive",
      });
    }

    if (receiveQty > remainingToReceive) {
      return res.status(400).json({
        error: `Only ${remainingToReceive} quantity is available to receive`,
      });
    }

    const newReceivedQty = receivedQty + receiveQty;

    const newStatus =
      newReceivedQty >= totalQty
        ? "delivered"
        : "approved";

    const result = await pool.query(
      `UPDATE material_requests
       SET received_qty = $1,
           status = $2
       WHERE id = $3
       RETURNING *`,
      [
        newReceivedQty,
        newStatus,
        request_id,
      ]
    );

    res.json({
      message: "Material received updated",
      request: result.rows[0],
    });

  } catch (err) {
    console.error("RECEIVE MATERIAL ERROR:", err.message);

    res.status(500).json({
      error: "Failed to receive material",
    });
  }
};