const pool = require("../config/db");

/**
 * ✅ Create Project
 */
exports.createProject = async (req, res) => {
  console.log("BODY:", req.body);

  try {
    const {
      name,
      client_name,
      start_date,
      end_date,
      budget,
      manager_id,
      site_engineer_id,
      status,
      progress,
    } = req.body;

    // Validation
    if (!name || !client_name || !budget) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "client_name", "budget"],
      });
    }

    const result = await pool.query(
      `INSERT INTO projects
      (name, client_name, start_date, end_date, budget, manager_id, site_engineer_id, status, progress)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        name,
        client_name,
        start_date || null,
        end_date || null,
        budget,
        manager_id || null,
        site_engineer_id || null,
        status || "PENDING",
        progress || 0,
      ],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 CREATE ERROR:", err.message);
    console.error(err.stack);

    return res.status(500).json({
      error: "Failed to create project",
      details: err.message,
    });
  }
};

/**
 * ✅ Get All Projects (for cards UI)
 */
exports.getAllProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        m.name AS manager_name,
        s.name AS site_engineer_name
       FROM projects p
       LEFT JOIN employees m ON p.manager_id = m.id
       LEFT JOIN employees s ON p.site_engineer_id = s.id
       ORDER BY p.created_at DESC`,
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH ERROR:", err.message);
    return res.status(500).json({
      error: "Failed to fetch projects",
    });
  }
};

/**
 * ✅ Get Project By ID
 */
exports.getProjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        m.name AS manager_name,
        s.name AS site_engineer_name
       FROM projects p
       LEFT JOIN employees m ON p.manager_id = m.id
       LEFT JOIN employees s ON p.site_engineer_id = s.id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 FETCH BY ID ERROR:", err.message);
    return res.status(500).json({
      error: "Failed to fetch project",
    });
  }
};

/**
 * ✅ Update Project (status / progress / basic fields)
 */
exports.updateProject = async (req, res) => {
  const { id } = req.params;

  try {
    const {
      name,
      client_name,
      start_date,
      end_date,
      budget,
      manager_id,
      site_engineer_id,
      status,
      progress,
    } = req.body;

    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        client_name = COALESCE($2, client_name),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        budget = COALESCE($5, budget),
        manager_id = COALESCE($6, manager_id),
        site_engineer_id = COALESCE($7, site_engineer_id),
        status = COALESCE($8, status),
        progress = COALESCE($9, progress),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        name,
        client_name,
        start_date,
        end_date,
        budget,
        manager_id,
        site_engineer_id,
        status,
        progress,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 UPDATE ERROR:", err.message);
    return res.status(500).json({
      error: "Failed to update project",
    });
  }
};

/**
 * ✅ Delete Project
 */
exports.deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error("🔥 DELETE ERROR:", err.message);
    return res.status(500).json({
      error: "Failed to delete project",
    });
  }
};

/**
 * ✅ Filter Projects by Status
 */
exports.getProjectsByStatus = async (req, res) => {
  const { status } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM projects WHERE status = $1`,
      [status],
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to filter projects",
    });
  }
};

/**
 * ✅ Dashboard - Total Projects Count
 */
exports.getTotalProjects = async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM projects`);

    return res.status(200).json({
      total: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch project count",
    });
  }
};
