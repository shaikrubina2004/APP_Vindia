// controllers/architectProjectController.js

const db = require("../config/db");

/**
 * Get all projects for a specific architect
 * Also fetches daily log counts per project for today and total
 */
const getArchitectProjects = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT
        p.id,
        p.name,
        p.client,
        p.budget,
        p.status,
        p.progress,
        p.location,
        p.description,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        p.building_type,
        p.floors,
        p.plot_size,
        p.phone,
        p.client_paid,
        p.spent,
        p.manager_id,
        p.site_engineer_id,

        -- Total daily logs submitted by this architect for each project
        COUNT(DISTINCT dl.id)::int AS daily_log_count,

        -- Daily logs submitted today
        COUNT(DISTINCT CASE
          WHEN dl.date = CURRENT_DATE THEN dl.id
        END)::int AS daily_log_today_count

      FROM projects p
      LEFT JOIN architect_daily_logs dl
        ON dl.project_id = p.id
        AND dl.architect_id = $1::int

      WHERE p.architect_id = $1::int

      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;

    const result = await db.query(query, [userId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching projects:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch architect projects",
      error: err.message,
    });
  }
};

module.exports = { getArchitectProjects };