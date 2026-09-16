const pool = require("../config/db");

/* ─────────────────────────────
   HELPER: generate next item code
───────────────────────────── */
const generateItemCode = async (category) => {
  const prefix = (category || "MAT").substring(0, 3).toUpperCase();
  const result = await pool.query(
    `SELECT item_code FROM inventory_items
     WHERE item_code LIKE $1
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}-%`]
  );
  let next = 1;
  if (result.rows.length) {
    const last = result.rows[0].item_code.split("-").pop();
    const n = parseInt(last, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

/* GET /api/inventory/items */
exports.getItems = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const values = [];
    let where = "WHERE 1=1";

    if (status && status !== "all") {
      values.push(status);
      where += ` AND status = $${values.length}`;
    }
    if (category && category !== "all") {
      values.push(category);
      where += ` AND category = $${values.length}`;
    }
    if (search) {
      values.push(`%${search}%`);
      where += ` AND (item_name ILIKE $${values.length} OR item_code ILIKE $${values.length})`;
    }

    const result = await pool.query(
      `SELECT * FROM inventory_items ${where} ORDER BY item_name ASC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET ITEMS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

/* GET /api/inventory/items/:id */
exports.getItemById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM inventory_items WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Item not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET ITEM ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch item" });
  }
};

/* POST /api/inventory/items */
exports.createItem = async (req, res) => {
  try {
    const { item_name, category, unit, description, minimum_stock, maximum_stock } = req.body;

    if (!item_name || !unit) {
      return res.status(400).json({ error: "item_name and unit are required" });
    }

    const item_code = req.body.item_code || (await generateItemCode(category));

    const result = await pool.query(
      `INSERT INTO inventory_items
        (item_code, item_name, category, unit, description, minimum_stock, maximum_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        item_code,
        item_name,
        category || null,
        unit,
        description || null,
        minimum_stock || 0,
        maximum_stock || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE ITEM ERROR:", err.message);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Item code already exists" });
    }
    res.status(500).json({ error: "Failed to create item" });
  }
};

/* PUT /api/inventory/items/:id */
exports.updateItem = async (req, res) => {
  try {
    const { item_name, category, unit, description, minimum_stock, maximum_stock, status } = req.body;

    const result = await pool.query(
      `UPDATE inventory_items SET
         item_name = COALESCE($1, item_name),
         category = COALESCE($2, category),
         unit = COALESCE($3, unit),
         description = COALESCE($4, description),
         minimum_stock = COALESCE($5, minimum_stock),
         maximum_stock = COALESCE($6, maximum_stock),
         status = COALESCE($7, status),
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [item_name, category, unit, description, minimum_stock, maximum_stock, status, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Item not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE ITEM ERROR:", err.message);
    res.status(500).json({ error: "Failed to update item" });
  }
};

/* DELETE /api/inventory/items/:id */
exports.deleteItem = async (req, res) => {
  try {
    const used = await pool.query(
      "SELECT 1 FROM inventory_transactions WHERE item_id = $1 LIMIT 1",
      [req.params.id]
    );
    if (used.rows.length) {
      // Item already has stock history — deactivate instead of hard delete.
      const result = await pool.query(
        "UPDATE inventory_items SET status='inactive', updated_at=NOW() WHERE id=$1 RETURNING *",
        [req.params.id]
      );
      return res.json({ message: "Item has transaction history — marked inactive instead of deleted", item: result.rows[0] });
    }

    const result = await pool.query(
      "DELETE FROM inventory_items WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("DELETE ITEM ERROR:", err.message);
    res.status(500).json({ error: "Failed to delete item" });
  }
};

/* GET /api/inventory/items/low-stock */
exports.getLowStock = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM stock_overview
       WHERE status = 'active' AND total_available_qty <= minimum_stock
       ORDER BY (total_available_qty - minimum_stock) ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("LOW STOCK ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch low stock items" });
  }
};