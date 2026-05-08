const pool = require("../config/db");

// ✅ GET ALL
exports.getSnags = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM snags ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching snags" });
  }
};

// ✅ CREATE (Architect)
exports.createSnag = async (req, res) => {
  try {
    const { title, description, zone, priority, due_date } = req.body;

    const result = await pool.query(
      `INSERT INTO snags (title, description, zone, priority, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, zone, priority, due_date]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating snag" });
  }
};

// ✅ UPDATE (Site Engineer / Architect)
exports.updateSnag = async (req, res) => {
  try {
    const id = req.params.id;

    const fields = Object.keys(req.body);
    const values = Object.values(req.body);

    const setQuery = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

    await pool.query(
      `UPDATE snags SET ${setQuery} WHERE id = $${fields.length + 1}`,
      [...values, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating snag" });
  }
};