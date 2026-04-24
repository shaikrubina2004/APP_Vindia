// controllers/architectProjectController.js

const db = require("../config/db");

/**
 * Get all projects for a specific architect
 */
const getArchitectProjects = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT
        id,
        name,
        client,
        budget,
        status,
        progress,
        location,
        description,
        start_date,
        end_date,
        created_at,
        updated_at,
        building_type,
        floors,
        plot_size,
        phone,
        client_paid,
        spent,
        manager_id,
        site_engineer_id
      FROM projects
      WHERE architect_id = $1
      ORDER BY updated_at DESC
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