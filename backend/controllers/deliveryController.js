const pool = require("../config/db");

/* ─────────────────────────────
   HELPER: generate delivery code
───────────────────────────── */
const generateDeliveryCode = async () => {
  const result = await pool.query(
    `SELECT delivery_code FROM deliveries ORDER BY id DESC LIMIT 1`
  );
  let next = 1;
  if (result.rows.length) {
    const last = result.rows[0].delivery_code.split("-").pop();
    const n = parseInt(last, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `DEL-${String(next).padStart(4, "0")}`;
};

const attachItems = async (delivery) => {
  const items = await pool.query(
    "SELECT * FROM delivery_items WHERE delivery_id = $1 ORDER BY id",
    [delivery.id]
  );
  return { ...delivery, items: items.rows };
};

/* GET /api/deliveries  ?status=&project_id= */
exports.getDeliveries = async (req, res) => {
  try {
    const { status, project_id } = req.query;
    const values = [];
    let where = "WHERE 1=1";

    if (status && status !== "all") {
      values.push(status);
      where += ` AND d.status = $${values.length}`;
    }
    if (project_id) {
      values.push(project_id);
      where += ` AND d.project_id = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT d.*, p.name AS project_name, v.name AS vendor_name
       FROM deliveries d
       LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN vendors v ON v.id = d.vendor_id
       ${where}
       ORDER BY d.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET DELIVERIES ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch deliveries" });
  }
};

/* GET /api/deliveries/:id */
exports.getDeliveryById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, p.name AS project_name, v.name AS vendor_name
       FROM deliveries d
       LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN vendors v ON v.id = d.vendor_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Delivery not found" });
    res.json(await attachItems(result.rows[0]));
  } catch (err) {
    console.error("GET DELIVERY ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch delivery" });
  }
};

/* POST /api/deliveries
   body: { material_request_id?, project_id, vendor_id, expected_date, remarks, items: [{item_id?, item_name, unit, ordered_qty}] } */
exports.createDelivery = async (req, res) => {
  const client = await pool.connect();
  try {
    const { material_request_id, project_id, vendor_id, expected_date, remarks, items } = req.body;

    if (!project_id || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "project_id and at least one item are required" });
    }

    const userId = req.user?.id;
    const delivery_code = await generateDeliveryCode();

    await client.query("BEGIN");

    const delivery = await client.query(
      `INSERT INTO deliveries
        (delivery_code, material_request_id, project_id, vendor_id, expected_date, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [delivery_code, material_request_id || null, project_id, vendor_id || null, expected_date || null, remarks || null, userId]
    );

    const deliveryId = delivery.rows[0].id;

    for (const it of items) {
      await client.query(
        `INSERT INTO delivery_items (delivery_id, item_id, item_name, unit, ordered_qty)
         VALUES ($1,$2,$3,$4,$5)`,
        [deliveryId, it.item_id || null, it.item_name, it.unit || null, Number(it.ordered_qty || 0)]
      );
    }

    await client.query("COMMIT");

    const items_result = await pool.query("SELECT * FROM delivery_items WHERE delivery_id=$1", [deliveryId]);
    res.status(201).json({ ...delivery.rows[0], items: items_result.rows });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE DELIVERY ERROR:", err.message);
    res.status(500).json({ error: "Failed to create delivery" });
  } finally {
    client.release();
  }
};

/* PUT /api/deliveries/:id/dispatch
   body: { vehicle_number, driver_name, transporter, dispatch_date, dispatched_qtys: [{delivery_item_id, dispatched_qty}] } */
exports.dispatchDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_number, driver_name, transporter, dispatch_date, dispatched_qtys } = req.body;

    const check = await pool.query("SELECT status FROM deliveries WHERE id=$1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "Delivery not found" });
    if (check.rows[0].status !== "scheduled") {
      return res.status(400).json({ error: `Cannot dispatch a delivery with status "${check.rows[0].status}"` });
    }

    if (Array.isArray(dispatched_qtys)) {
      for (const row of dispatched_qtys) {
        await pool.query(
          "UPDATE delivery_items SET dispatched_qty=$1 WHERE id=$2 AND delivery_id=$3",
          [Number(row.dispatched_qty || 0), row.delivery_item_id, id]
        );
      }
    }

    const result = await pool.query(
      `UPDATE deliveries SET
         status='dispatched',
         vehicle_number=$1, driver_name=$2, transporter=$3,
         dispatch_date=COALESCE($4, NOW()::date),
         updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [vehicle_number || null, driver_name || null, transporter || null, dispatch_date || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("DISPATCH ERROR:", err.message);
    res.status(500).json({ error: "Failed to dispatch delivery" });
  }
};

/* PUT /api/deliveries/:id/in-transit */
exports.markInTransit = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query("SELECT status FROM deliveries WHERE id=$1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "Delivery not found" });
    if (check.rows[0].status !== "dispatched") {
      return res.status(400).json({ error: `Cannot mark in-transit from status "${check.rows[0].status}"` });
    }
    const result = await pool.query(
      "UPDATE deliveries SET status='in_transit', updated_at=NOW() WHERE id=$1 RETURNING *",
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("IN TRANSIT ERROR:", err.message);
    res.status(500).json({ error: "Failed to update delivery" });
  }
};

/* PUT /api/deliveries/:id/deliver
   body: { delivery_date, received_by_name, proof_document_url, remarks, delivered_qtys: [{delivery_item_id, delivered_qty, damaged_qty}] } */
exports.markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_date, received_by_name, proof_document_url, remarks, delivered_qtys } = req.body;

    const check = await pool.query("SELECT status FROM deliveries WHERE id=$1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "Delivery not found" });
    if (!["dispatched", "in_transit", "delayed"].includes(check.rows[0].status)) {
      return res.status(400).json({ error: `Cannot mark delivered from status "${check.rows[0].status}"` });
    }

    if (Array.isArray(delivered_qtys)) {
      for (const row of delivered_qtys) {
        await pool.query(
          "UPDATE delivery_items SET delivered_qty=$1, damaged_qty=$2 WHERE id=$3 AND delivery_id=$4",
          [Number(row.delivered_qty || 0), Number(row.damaged_qty || 0), row.delivery_item_id, id]
        );
      }
    }

    const result = await pool.query(
      `UPDATE deliveries SET
         status='delivered',
         receipt_status='pending_receipt',
         delivery_date=COALESCE($1, NOW()::date),
         received_by_name=$2, proof_document_url=$3, remarks=COALESCE($4, remarks),
         updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [delivery_date || null, received_by_name || null, proof_document_url || null, remarks || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("MARK DELIVERED ERROR:", err.message);
    res.status(500).json({ error: "Failed to mark delivered" });
  }
};

/* PUT /api/deliveries/:id/delay   body: { delay_reason, new_eta } */
exports.markDelayed = async (req, res) => {
  try {
    const { id } = req.params;
    const { delay_reason, new_eta } = req.body;
    const result = await pool.query(
      `UPDATE deliveries SET
         status='delayed', delay_reason=$1,
         expected_date=COALESCE($2, expected_date),
         updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [delay_reason || null, new_eta || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Delivery not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("MARK DELAYED ERROR:", err.message);
    res.status(500).json({ error: "Failed to update delivery" });
  }
};

/* PUT /api/deliveries/:id/cancel */
exports.cancelDelivery = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE deliveries SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Delivery not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("CANCEL DELIVERY ERROR:", err.message);
    res.status(500).json({ error: "Failed to cancel delivery" });
  }
};

/* GET /api/deliveries/pending-receipt  (delivered, not yet received by Inventory) */
exports.getPendingReceipts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, p.name AS project_name, v.name AS vendor_name
       FROM deliveries d
       LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN vendors v ON v.id = d.vendor_id
       WHERE d.status = 'delivered' AND d.receipt_status = 'pending_receipt'
       ORDER BY d.delivery_date ASC`
    );
    const withItems = await Promise.all(result.rows.map(attachItems));
    res.json(withItems);
  } catch (err) {
    console.error("PENDING RECEIPTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch pending receipts" });
  }
};

/* GET /api/deliveries/dashboard */
exports.getLogisticsDashboard = async (req, res) => {
  try {
    const kpis = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='scheduled')::int  AS scheduled,
         COUNT(*) FILTER (WHERE status='dispatched')::int AS dispatched,
         COUNT(*) FILTER (WHERE status='in_transit')::int AS in_transit,
         COUNT(*) FILTER (WHERE status='delivered')::int  AS delivered,
         COUNT(*) FILTER (WHERE status='delayed')::int    AS delayed,
         COUNT(*) FILTER (WHERE expected_date = CURRENT_DATE AND status NOT IN ('delivered','cancelled'))::int AS due_today
       FROM deliveries`
    );

    const recent = await pool.query(
      `SELECT d.*, p.name AS project_name, v.name AS vendor_name
       FROM deliveries d
       LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN vendors v ON v.id = d.vendor_id
       ORDER BY d.created_at DESC LIMIT 8`
    );

    res.json({ kpis: kpis.rows[0], recent: recent.rows });
  } catch (err) {
    console.error("LOGISTICS DASHBOARD ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
};