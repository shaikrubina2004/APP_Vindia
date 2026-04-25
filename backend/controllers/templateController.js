const pool = require("../config/db");

// ─────────────────────────────────────────────
// GET /api/templates
// Get all templates
// ─────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM templates ORDER BY created_at DESC"
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET TEMPLATE ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

// ─────────────────────────────────────────────
// GET /api/templates/:id
// Get template items (flat)
// ─────────────────────────────────────────────
exports.getTemplateItems = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM template_items WHERE template_id = $1 ORDER BY code ASC",
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET TEMPLATE ITEMS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch template items" });
  }
};

// ─────────────────────────────────────────────
// POST /api/templates
// Create new template
// ─────────────────────────────────────────────
exports.createTemplate = async (req, res) => {
  const { code, name, description } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO templates (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code, name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE TEMPLATE ERROR:", err.message);
    res.status(500).json({ error: "Failed to create template" });
  }
};

// ─────────────────────────────────────────────
// POST /api/templates/item
// Add template item (milestone or subtask)
// ─────────────────────────────────────────────
exports.addTemplateItem = async (req, res) => {
  const { template_id, code, name, parent_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO template_items (template_id, code, name, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [template_id, code, name, parent_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ADD TEMPLATE ITEM ERROR:", err.message);
    res.status(500).json({ error: "Failed to add template item" });
  }
};