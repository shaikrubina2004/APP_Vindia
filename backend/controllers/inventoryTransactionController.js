const pool = require("../config/db");
const { notifyRole } = require("./operationsNotificationsController");

/* GET /api/inventory/stock-register  ?project_id= */
exports.getStockRegister = async (req, res) => {
  try {
    const { project_id, low_stock_only } = req.query;
    const values = [];
    let where = "WHERE 1=1";

    if (project_id) {
      values.push(project_id);
      where += ` AND s.project_id = $${values.length}`;
    }
    if (low_stock_only === "true") {
      where += ` AND s.available_qty <= s.minimum_stock`;
    }

    const result = await pool.query(
      `SELECT s.*, p.name AS project_name
       FROM stock_register s
       LEFT JOIN projects p ON p.id = s.project_id
       ${where}
       ORDER BY s.item_name ASC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("STOCK REGISTER ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch stock register" });
  }
};

/* GET /api/inventory/transactions  ?item_id=&project_id=&type= */
exports.getTransactions = async (req, res) => {
  try {
    const { item_id, project_id, transaction_type } = req.query;
    const values = [];
    let where = "WHERE 1=1";

    if (item_id) { values.push(item_id); where += ` AND t.item_id = $${values.length}`; }
    if (project_id) { values.push(project_id); where += ` AND t.project_id = $${values.length}`; }
    if (transaction_type) { values.push(transaction_type); where += ` AND t.transaction_type = $${values.length}`; }

    const result = await pool.query(
      `SELECT t.*, it.item_name, it.item_code, it.unit, p.name AS project_name, u.name AS created_by_name
       FROM inventory_transactions t
       LEFT JOIN inventory_items it ON it.id = t.item_id
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.created_by
       ${where}
       ORDER BY t.created_at DESC
       LIMIT 500`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET TRANSACTIONS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

/* helper: current available qty for item in a project */
const getAvailableQty = async (item_id, project_id) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(quantity),0)::numeric AS qty
     FROM inventory_transactions WHERE item_id=$1 AND project_id=$2`,
    [item_id, project_id]
  );
  return Number(result.rows[0].qty);
};

/* POST /api/inventory/issue   body: { item_id, project_id, quantity, remarks } */
exports.createIssue = async (req, res) => {
  try {
    const { item_id, project_id, quantity, remarks } = req.body;
    const qty = Number(quantity);
    const userId = req.user?.id;

    if (!item_id || !project_id || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: "item_id, project_id and a positive quantity are required" });
    }

    const available = await getAvailableQty(item_id, project_id);
    if (qty > available) {
      return res.status(400).json({ error: `Only ${available} available in stock for this project` });
    }

    const result = await pool.query(
      `INSERT INTO inventory_transactions
         (item_id, project_id, transaction_type, quantity, reference_type, remarks, created_by)
       VALUES ($1,$2,'ISSUE',$3,'MATERIAL_ISSUE',$4,$5)
       RETURNING *`,
      [item_id, project_id, -qty, remarks || null, userId]
    );

    // If this issue dropped stock to/below minimum, alert Inventory Controllers.
    const remaining = available - qty;
    const itemInfo = await pool.query(
      "SELECT item_name, minimum_stock, unit FROM inventory_items WHERE id=$1",
      [item_id]
    );
    if (itemInfo.rows.length && remaining <= Number(itemInfo.rows[0].minimum_stock)) {
      await notifyRole(
        "inventory_controller",
        "low_stock",
        `Low stock: ${itemInfo.rows[0].item_name}`,
        `${remaining} ${itemInfo.rows[0].unit} left — at or below minimum (${itemInfo.rows[0].minimum_stock}).`,
        "/operations/inventory/stock-out",
        remaining <= 0 ? "critical" : "warn",
        project_id
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ISSUE ERROR:", err.message);
    res.status(500).json({ error: "Failed to issue material" });
  }
};

/* POST /api/inventory/return   body: { item_id, project_id, quantity, condition, remarks } */
exports.createReturn = async (req, res) => {
  try {
    const { item_id, project_id, quantity, condition, remarks } = req.body;
    const qty = Number(quantity);
    const userId = req.user?.id;

    if (!item_id || !project_id || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: "item_id, project_id and a positive quantity are required" });
    }

    const note = [condition ? `Condition: ${condition}` : null, remarks].filter(Boolean).join(" — ");

    const result = await pool.query(
      `INSERT INTO inventory_transactions
         (item_id, project_id, transaction_type, quantity, reference_type, remarks, created_by)
       VALUES ($1,$2,'RETURN',$3,'MATERIAL_RETURN',$4,$5)
       RETURNING *`,
      [item_id, project_id, qty, note || null, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("RETURN ERROR:", err.message);
    res.status(500).json({ error: "Failed to record return" });
  }
};

/* POST /api/inventory/transfer   body: { item_id, from_project_id, to_project_id, quantity, remarks } */
exports.createTransfer = async (req, res) => {
  const client = await pool.connect();
  try {
    const { item_id, from_project_id, to_project_id, quantity, remarks } = req.body;
    const qty = Number(quantity);
    const userId = req.user?.id;

    if (!item_id || !from_project_id || !to_project_id || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: "item_id, from_project_id, to_project_id and a positive quantity are required" });
    }
    if (from_project_id === to_project_id) {
      return res.status(400).json({ error: "from_project_id and to_project_id must differ" });
    }

    const available = await getAvailableQty(item_id, from_project_id);
    if (qty > available) {
      return res.status(400).json({ error: `Only ${available} available at the source site` });
    }

    await client.query("BEGIN");

    const out = await client.query(
      `INSERT INTO inventory_transactions
         (item_id, project_id, transaction_type, quantity, reference_type, linked_project_id, remarks, created_by)
       VALUES ($1,$2,'TRANSFER_OUT',$3,'STOCK_TRANSFER',$4,$5,$6)
       RETURNING *`,
      [item_id, from_project_id, -qty, to_project_id, remarks || null, userId]
    );

    const inn = await client.query(
      `INSERT INTO inventory_transactions
         (item_id, project_id, transaction_type, quantity, reference_type, reference_id, linked_project_id, remarks, created_by)
       VALUES ($1,$2,'TRANSFER_IN',$3,'STOCK_TRANSFER',$4,$5,$6,$7)
       RETURNING *`,
      [item_id, to_project_id, qty, out.rows[0].id, from_project_id, remarks || null, userId]
    );

    await client.query(
      "UPDATE inventory_transactions SET reference_id=$1 WHERE id=$2",
      [inn.rows[0].id, out.rows[0].id]
    );

    await client.query("COMMIT");
    res.status(201).json({ out: out.rows[0], in: inn.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("TRANSFER ERROR:", err.message);
    res.status(500).json({ error: "Failed to transfer stock" });
  } finally {
    client.release();
  }
};

/* POST /api/inventory/adjustment   body: { item_id, project_id, quantity_change, reason } */
exports.createAdjustment = async (req, res) => {
  try {
    const { item_id, project_id, quantity_change, reason } = req.body;
    const qty = Number(quantity_change);
    const userId = req.user?.id;

    if (!item_id || !project_id || !Number.isFinite(qty) || qty === 0) {
      return res.status(400).json({ error: "item_id, project_id and a non-zero quantity_change are required" });
    }
    if (!reason) {
      return res.status(400).json({ error: "A reason is required for stock adjustments" });
    }

    const result = await pool.query(
      `INSERT INTO inventory_transactions
         (item_id, project_id, transaction_type, quantity, reference_type, remarks, created_by)
       VALUES ($1,$2,'ADJUSTMENT',$3,'STOCK_ADJUSTMENT',$4,$5)
       RETURNING *`,
      [item_id, project_id, qty, reason, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ADJUSTMENT ERROR:", err.message);
    res.status(500).json({ error: "Failed to record adjustment" });
  }
};

/* GET /api/inventory/dashboard */
exports.getInventoryDashboard = async (req, res) => {
  try {
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS total_items FROM inventory_items WHERE status='active'`
    );

    const stock = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE total_available_qty <= minimum_stock AND total_available_qty > 0)::int AS low_stock,
         COUNT(*) FILTER (WHERE total_available_qty <= 0)::int AS out_of_stock
       FROM stock_overview WHERE status='active'`
    );

    const today = await pool.query(
      `SELECT
         COALESCE(SUM(quantity) FILTER (WHERE transaction_type='RECEIPT' AND created_at::date = CURRENT_DATE),0)::numeric AS received_today,
         COALESCE(-SUM(quantity) FILTER (WHERE transaction_type='ISSUE' AND created_at::date = CURRENT_DATE),0)::numeric AS issued_today
       FROM inventory_transactions`
    );

    const pending = await pool.query(
      `SELECT COUNT(*)::int AS pending_receipts FROM deliveries
       WHERE status='delivered' AND receipt_status='pending_receipt'`
    );

    const lowStockList = await pool.query(
      `SELECT * FROM stock_overview
       WHERE status='active' AND total_available_qty <= minimum_stock
       ORDER BY (total_available_qty - minimum_stock) ASC LIMIT 8`
    );

    res.json({
      total_items: totals.rows[0].total_items,
      low_stock: stock.rows[0].low_stock,
      out_of_stock: stock.rows[0].out_of_stock,
      received_today: today.rows[0].received_today,
      issued_today: today.rows[0].issued_today,
      pending_receipts: pending.rows[0].pending_receipts,
      low_stock_items: lowStockList.rows,
    });
  } catch (err) {
    console.error("INVENTORY DASHBOARD ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
};