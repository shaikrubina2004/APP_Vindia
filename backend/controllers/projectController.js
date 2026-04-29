const pool = require("../config/db");
const { insertNotification } = require("./pcNotificationsController");

/**
 * ✅ Create Project
 */
exports.createProject = async (req, res) => {
  try {
    const {
      name,
      client,
      start_date,
      end_date,
      budget,
      manager_id,
      site_engineer_id,
      location,
      description,
      building_type,
      floors,
      plot_size,
      phone,
    } = req.body;

    // ✅ Validation
    if (!name || !client || !budget) {
      return res.status(400).json({
        error: "Name, Client and Budget are required",
      });
    }

    if (phone && phone.length !== 10) {
      return res.status(400).json({
        error: "Phone must be 10 digits",
      });
    }

    // ✅ Create Project
    const result = await pool.query(
      `INSERT INTO projects (
        name, client, start_date, end_date, budget,
        manager_id, site_engineer_id,
        location, description,
        building_type, floors, plot_size, phone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        name,
        client,
        start_date,
        end_date,
        budget,
        manager_id,
        site_engineer_id,
        location || null,
        description || null,
        building_type || null,
        floors || null,
        plot_size || null,
        phone || null,
      ]
    );

    const newProject = result.rows[0];

    // ✅ Get coordinator_id for this project
    const proj = await pool.query(
      `SELECT coordinator_id FROM projects WHERE id = $1`,
      [newProject.id]
    );

    const coordinatorId = proj.rows[0]?.coordinator_id;

    // ✅ Send notification (only if coordinator exists)
    if (coordinatorId) {
      await insertNotification(
        coordinatorId,
        "project",
        "New Project Created",
        `Project "${name}" is created`,
        "/project-coordinator/dashboard", // 👈 better navigation
        "info",
        newProject.id
      );
    }

    // ✅ Response
    res.status(201).json(newProject);

  } catch (err) {
    console.error("🔥 CREATE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get Managers
 */
exports.getManagers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name 
       FROM employees
       WHERE designation = 'Project Manager'`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get Site Engineers
 */
exports.getSiteEngineers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name 
       FROM employees
       WHERE designation = 'Site Engineer'`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get All Projects
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
       ORDER BY p.created_at DESC`
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
      [id]
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
 * ✅ Update Project
 */
exports.updateProject = async (req, res) => {
  const { id } = req.params;

  try {
    const {
      name,
      client,
      start_date,
      end_date,
      budget,
      manager_id,
      site_engineer_id,
      status,
      progress,
      location,
      description,
      building_type,
      floors,
      plot_size,
      phone,
    } = req.body;

    // ✅ Phone validation
    if (phone && phone.length !== 10) {
      return res.status(400).json({
        error: "Phone must be 10 digits",
      });
    }

    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        client = COALESCE($2, client),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        budget = COALESCE($5, budget),
        manager_id = COALESCE($6, manager_id),
        site_engineer_id = COALESCE($7, site_engineer_id),
        status = COALESCE($8, status),
        progress = COALESCE($9, progress),
        location = COALESCE($10, location),
        description = COALESCE($11, description),
        building_type = COALESCE($12, building_type),
        floors = COALESCE($13, floors),
        plot_size = COALESCE($14, plot_size),
        phone = COALESCE($15, phone),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        name,
        client,
        start_date,
        end_date,
        budget,
        manager_id,
        site_engineer_id,
        status,
        progress,
        location,
        description,
        building_type,
        floors,
        plot_size,
        phone,
        id,
      ]
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
      [id]
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
      [status]
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
 * ✅ Total Projects Count
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