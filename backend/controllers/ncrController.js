const pool = require("../config/db");

exports.createNCR = async (req, res) => {
  const { project_id, raised_by, title, severity } = req.body;

  const result = await pool.query(
    `INSERT INTO ncr (project_id, raised_by, title, severity)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [project_id, raised_by, title, severity]
  );

  res.json(result.rows[0]);
};

exports.getNCR = async (req, res) => {
  const result = await pool.query("SELECT * FROM ncr ORDER BY id DESC");
  res.json(result.rows);
};