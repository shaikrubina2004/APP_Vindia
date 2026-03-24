const pool = require("../db");

// CREATE PROJECT
exports.createProject = async (req, res) => {
  try {
    const { name, client, budget, manager } = req.body;

    const result = await pool.query(
      `INSERT INTO projects (name, client, budget, manager)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, client, budget, manager]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create project" });
  }
};

// GET PROJECTS
exports.getProjects = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM projects ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};