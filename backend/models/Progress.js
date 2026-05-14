const pool = require("../config/db");

class Progress {

  static async create(data) {
    const {
      project_id,
      wbs_id,   // 🔥 IMPORTANT
      date,
      zone,
      work_type,
      activity,
      morning_skilled,
      morning_unskilled,
      morning_supervisors,
      sqft_completed,
      sqft_unit,
      evening_description,
      percent_complete,
      planned_percent,
      delay_type,
      remarks,
      photos
    } = data;

    const query = `
      INSERT INTO site_progress (
        project_id,
        wbs_id,
        date,
        zone,
        work_type,
        activity,
        morning_skilled,
        morning_unskilled,
        morning_supervisors,
        sqft_completed,
        sqft_unit,
        evening_description,
        percent_complete,
        planned_percent,
        delay_type,
        remarks,
        photos,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,
        $10,$11,$12,
        $13,$14,$15,$16,$17,
        NOW()
      )
      RETURNING *;
    `;

    const values = [
      project_id,
      wbs_id,   // 🔥 IMPORTANT
      date,
      zone,
      work_type,
      activity,
      morning_skilled,
      morning_unskilled,
      morning_supervisors,
      sqft_completed,
      sqft_unit,
      evening_description,
      percent_complete,
      planned_percent,
      delay_type,
      remarks,
      photos || []
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(`
      SELECT sp.*, p.name AS project_name, w.name AS milestone_name
      FROM site_progress sp
      JOIN projects p ON sp.project_id = p.id
      LEFT JOIN wbs w ON sp.wbs_id = w.id
      ORDER BY sp.created_at DESC
    `);
    return result.rows;
  }

  static async delete(id) {
    await pool.query("DELETE FROM site_progress WHERE id = $1", [id]);
  }

  static async saveMeasurements(progress_id, measurements) {
    for (const m of measurements) {
      await pool.query(
        `INSERT INTO measurements (progress_id, item, qty, unit, status)
         VALUES ($1,$2,$3,$4,$5)`,
        [progress_id, m.item, m.qty, m.unit, m.status]
      );
    }
  }

  static async getMeasurements(progress_id) {
    const result = await pool.query(
      "SELECT * FROM measurements WHERE progress_id = $1",
      [progress_id]
    );
    return result.rows;
  }
}

module.exports = Progress;