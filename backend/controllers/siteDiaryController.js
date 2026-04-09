const pool = require("../config/db");

exports.createDiary = async (req, res) => {
  try {
    const {
      project_id,
      engineer_id,
      weather,
      work_done,
      labour_skilled,
      labour_unskilled,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO site_diary 
      (project_id, engineer_id, weather, work_done, labour_skilled, labour_unskilled)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        project_id,
        engineer_id,
        weather,
        work_done,
        labour_skilled,
        labour_unskilled,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json("Error creating diary");
  }
};

exports.getDiary = async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM site_diary WHERE project_id=$1 ORDER BY created_at DESC",
    [req.params.projectId]
  );

  res.json(result.rows);
};