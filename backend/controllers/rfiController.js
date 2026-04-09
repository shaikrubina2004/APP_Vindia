const pool = require("../config/db");

exports.createRFI = async (req, res) => {
  const { project_id, raised_by, title, description } = req.body;

  const result = await pool.query(
    `INSERT INTO rfi (project_id, raised_by, title, description)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [project_id, raised_by, title, description]
  );

  res.json(result.rows[0]);
};

exports.getRFI = async (req, res) => {
  const result = await pool.query("SELECT * FROM rfi ORDER BY id DESC");
  res.json(result.rows);
};