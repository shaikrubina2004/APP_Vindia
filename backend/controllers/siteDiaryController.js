const pool = require("../config/db");

exports.createDiary = async (req, res) => {
  try {
    const {
      project_id,
      engineer_id, // ✅ MUST MATCH DB
      weather,
      work_done,
      labour_skilled,
      labour_unskilled,
    } = req.body;

    console.log("Incoming data:", req.body); // 🔥 DEBUG

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
    console.error("DB ERROR:", err.message); // 🔥 IMPORTANT
    res.status(500).json({ error: err.message });
  }
};