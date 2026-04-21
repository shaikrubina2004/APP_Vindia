const pool = require("../config/db");

exports.createDiary = async (req, res) => {
  try {
    const engineer_id = req.user?.id; // Extract from auth middleware
    const {
      date,
      shift,
      site,
      zone,
      weather_am,
      weather_pm,
      temp_c,
      work_done,
      plant,
      labour_carpenters,
      labour_steel,
      labour_masons,
      labour_mep,
      labour_general,
      labour_supervisors,
      labour_skilled,
      labour_unskilled,
      labour_total,
      materials,
      issues,
      instructions,
      next_day,
      notes,
    } = req.body;

    if (!engineer_id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!date || !work_done) {
      return res.status(400).json({ error: "date and work_done are required" });
    }

    console.log("Creating diary entry for engineer:", engineer_id);

    const result = await pool.query(
      `INSERT INTO site_diary 
      (engineer_id, date, shift, site, zone, weather_am, weather_pm, temp_c, work_done, plant, 
       labour_carpenters, labour_steel, labour_masons, labour_mep, labour_general, labour_supervisors,
       labour_skilled, labour_unskilled, labour_total, materials, issues, instructions, next_day, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *`,
      [
        engineer_id,
        date,
        shift,
        site,
        zone,
        weather_am,
        weather_pm,
        temp_c,
        work_done,
        plant,
        labour_carpenters,
        labour_steel,
        labour_masons,
        labour_mep,
        labour_general,
        labour_supervisors,
        labour_skilled,
        labour_unskilled,
        labour_total,
        JSON.stringify(materials), // Store as JSON
        issues,
        instructions,
        next_day,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Diary Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getDiary = async (req, res) => {
  try {
    const engineer_id = req.user?.id;

    if (!engineer_id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await pool.query(
      `SELECT * FROM site_diary 
       WHERE engineer_id = $1
       ORDER BY date DESC, created_at DESC`,
      [engineer_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Diary Get Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getDiaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM site_diary WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Diary entry not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Diary Get By ID Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};