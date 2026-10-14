const pool = require("../config/db");
const { insertNotification } = require("./pcNotificationsController");

// ✅ Helper to parse floor string into rows
function parseFloors(floorsString) {
  const floors = [];
  const upper = floorsString.trim().toUpperCase();

  const hasBasement = upper.startsWith("B+");
  const hasRooftop = upper.endsWith("+R");

  const match = upper.match(/G\+(\d+)/);
  const numFloors = match ? parseInt(match[1]) : 0;

  if (hasBasement) {
    floors.push({ name: "Basement", level_no: -1 });
  }

  floors.push({ name: "Ground Floor", level_no: 0 });

  for (let i = 1; i <= numFloors; i++) {
    floors.push({ name: `Level ${i}`, level_no: i });
  }

  if (hasRooftop) {
    floors.push({ name: "Rooftop", level_no: numFloors + 1 });
  }

  return floors;
}

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
      coordinator_id,
      architect_id,
      client_user_id,
      location,
      description,
      building_type,
      floors,
      plot_size,
      phone,
    } = req.body;

    // ✅ Validation
    if (!name || (!client && !client_user_id) || !budget) {
      return res.status(400).json({
        error: "Name, Client and Budget are required",
      });
    }

    // ✅ Client link: when a client account is chosen it must be a real, active
    // CLIENT-role user. The stored `client` label is taken from that account so
    // it can never drift from (or be spoofed against) the linked user.
    let linkedClientId = null;
    let clientLabel = client;
    if (client_user_id !== undefined && client_user_id !== null && client_user_id !== "") {
      const cid = Number(client_user_id);
      if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ error: "Invalid client selected" });
      }
      const clientRow = await pool.query(
        `SELECT u.id, u.name
           FROM users u
           JOIN roles r ON r.id = u.role_id
          WHERE u.id = $1
            AND LOWER(r.code) = 'client'
            AND LOWER(COALESCE(u.status, 'active')) NOT IN ('inactive', 'disabled', 'blocked', 'suspended')`,
        [cid],
      );
      if (!clientRow.rows.length) {
        return res
          .status(400)
          .json({ error: "Selected client is not a valid, active client account" });
      }
      linkedClientId = clientRow.rows[0].id;
      clientLabel = clientRow.rows[0].name;
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
        manager_id, site_engineer_id, coordinator_id,
        architect_id, client_user_id,
        location, description,
        building_type, floors, plot_size, phone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        name,
        clientLabel,
        start_date,
        end_date,
        budget,
        manager_id,
        site_engineer_id,
        coordinator_id || null,
        architect_id || null,
        linkedClientId,
        location || null,
        description || null,
        building_type || null,
        floors || null,
        plot_size || null,
        phone || null,
      ],
    );

    // ✅ Fetch full project with joined fields
    const fullProject = await pool.query(
      `SELECT 
        p.*,
        m.name AS manager_name,
        s.name AS site_engineer_name,
        u.name AS coordinator_name,
        ua.name AS architect_name,
        uc2.name AS client_user_name,
        uc2.email AS client_user_email,
        NULLIF(TRIM(to_jsonb(uc2)->>'company_name'), '') AS client_company_name,
        NULLIF(TRIM(to_jsonb(uc2)->>'contact_person'), '') AS client_contact_person,
        COALESCE(NULLIF(TRIM(to_jsonb(uc2)->>'phone'), ''),
                 NULLIF(TRIM(to_jsonb(uc2)->>'mobile'), ''),
                 NULLIF(TRIM(to_jsonb(uc2)->>'phone_number'), '')) AS client_user_phone
       FROM projects p
       LEFT JOIN employees m ON p.manager_id = m.id
       LEFT JOIN users s ON p.site_engineer_id = s.id
       LEFT JOIN users u ON p.coordinator_id = u.id
       LEFT JOIN users ua ON p.architect_id = ua.id
       LEFT JOIN users uc2 ON p.client_user_id = uc2.id
       WHERE p.id = $1`,
      [result.rows[0].id],
    );

    const newProject = fullProject.rows[0];

    // ✅ Auto-create floors in project_floors table
    if (floors) {
      const floorRows = parseFloors(floors);
      for (const floor of floorRows) {
        await pool.query(
          `INSERT INTO project_floors (project_id, name, level_no, is_active)
           VALUES ($1, $2, $3, true)`,
          [newProject.id, floor.name, floor.level_no],
        );
      }
    }

    // ✅ Send notification to coordinator
    try {
      if (coordinator_id) {
        await insertNotification(
          coordinator_id,
          "project",
          "New Project Created",
          `Project "${name}" is created`,
          "/project-coordinator/dashboard",
          "info",
          newProject.id,
        );
      }
    } catch (notifErr) {
      console.warn("⚠️ Notification failed (non-critical):", notifErr.message);
    }

    // ✅ Response
    res.status(201).json(newProject);
  } catch (err) {
    console.error("🔥 CREATE ERROR FULL:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get Coordinators
 */
exports.getCoordinators = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name 
       FROM users
       WHERE role_id = 33`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
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
       WHERE designation = 'Project Manager'`,
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
       FROM users
       WHERE role_id = 23`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
exports.getArchitects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE LOWER(r.name) LIKE '%architect%'
       ORDER BY u.name`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Client dropdown for the Add Project form. Real client accounts only:
// users whose role code is exactly 'client' (the old `name LIKE '%client%'`
// match could also catch unrelated roles) and that are not disabled.
// company_name / contact_person come from to_jsonb() so this keeps working
// before the optional profile migration has been applied (they are just null).
exports.getClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email,
              NULLIF(TRIM(to_jsonb(u)->>'company_name'), '')   AS company_name,
              NULLIF(TRIM(to_jsonb(u)->>'contact_person'), '') AS contact_person
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE LOWER(r.code) = 'client'
         AND LOWER(COALESCE(u.status, 'active')) NOT IN ('inactive', 'disabled', 'blocked', 'suspended')
       ORDER BY u.name`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * ✅ Get All Projects
 */
exports.getAllProjects = async (req, res) => {
  try {
    // Clients are external users: they may only see the project(s) linked to them.
    // Previously every logged-in role (clients included) received every project,
    // with budgets and other clients' names.
    const clientOnly = req.user?.role === "client";
    // A Site Engineer only sees the project(s) they are assigned to. Previously every
    // engineer got every project, so dropdowns (labour registry, diary, photos...)
    // listed the whole company and nothing told them which site was theirs.
    const engineerOnly = req.user?.role === "site_engineer";
    const scoped = clientOnly || engineerOnly;
    const result = await pool.query(
      `SELECT 
        p.*,
        m.name AS manager_name,
        s.name AS site_engineer_name,
        u.name AS coordinator_name,
        ua.name AS architect_name,
        uc2.name AS client_user_name,
        uc2.email AS client_user_email,
        NULLIF(TRIM(to_jsonb(uc2)->>'company_name'), '') AS client_company_name,
        NULLIF(TRIM(to_jsonb(uc2)->>'contact_person'), '') AS client_contact_person,
        COALESCE(NULLIF(TRIM(to_jsonb(uc2)->>'phone'), ''),
                 NULLIF(TRIM(to_jsonb(uc2)->>'mobile'), ''),
                 NULLIF(TRIM(to_jsonb(uc2)->>'phone_number'), '')) AS client_user_phone
       FROM projects p
       LEFT JOIN employees m ON p.manager_id = m.id
       LEFT JOIN users s ON p.site_engineer_id = s.id
       LEFT JOIN users u ON p.coordinator_id = u.id
       LEFT JOIN users ua ON p.architect_id = ua.id
       LEFT JOIN users uc2 ON p.client_user_id = uc2.id
       ${clientOnly ? "WHERE p.client_user_id = $1" : engineerOnly ? "WHERE p.site_engineer_id = $1" : ""}
       ORDER BY p.created_at DESC`,
      scoped ? [req.user.id] : [],
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch projects" });
  }
};

/**
 * ✅ Projects assigned to the logged-in user — "which site am I on?"
 *   site_engineer       -> projects.site_engineer_id = me
 *   project_manager     -> projects.manager_id (an EMPLOYEE id) -> employees.user_id = me
 *   project_coordinator -> projects.coordinator_id = me
 *   architect           -> projects.architect_id = me
 *   client              -> projects.client_user_id = me
 *   anyone else         -> all projects (CEO, finance, ...)
 * Includes the current phase (first milestone not yet completed) when WBS exists.
 */
exports.getMyProjects = async (req, res) => {
  try {
    const role = req.user?.role;
    const filters = {
      site_engineer: "WHERE p.site_engineer_id = $1",
      project_coordinator: "WHERE p.coordinator_id = $1",
      architect: "WHERE p.architect_id = $1",
      client: "WHERE p.client_user_id = $1",
      project_manager:
        "WHERE p.manager_id IN (SELECT e.id FROM employees e WHERE e.user_id = $1)",
    };
    const where = filters[role] || "";
    const result = await pool.query(
      `SELECT p.id, p.name, p.location, p.status, p.client, p.building_type, p.floors,
              p.start_date, p.end_date,
              m.name AS manager_name, s.name AS site_engineer_name
         FROM projects p
         LEFT JOIN employees m ON p.manager_id = m.id
         LEFT JOIN users s ON p.site_engineer_id = s.id
         ${where}
        ORDER BY p.created_at DESC`,
      where ? [req.user.id] : []
    );

    // Current phase = first top-level WBS milestone that is not complete (best effort).
    let phases = new Map();
    try {
      const ids = result.rows.map((r) => r.id);
      if (ids.length) {
        const ph = await pool.query(
          `SELECT DISTINCT ON (project_id) project_id, name
             FROM wbs
            WHERE project_id = ANY($1) AND parent_id IS NULL
              AND COALESCE(progress, 0) < 100
            ORDER BY project_id, created_at ASC`,
          [ids]
        );
        phases = new Map(ph.rows.map((r) => [r.project_id, r.name]));
      }
    } catch (e) {
      console.error("getMyProjects phase lookup skipped:", e.message);
    }
    return res.json(result.rows.map((r) => ({ ...r, current_phase: phases.get(r.id) || null })));
  } catch (err) {
    console.error("getMyProjects error:", err.message);
    return res.status(500).json({ error: "Failed to fetch your projects" });
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
        s.name AS site_engineer_name,
        u.name AS coordinator_name,
        ua.name AS architect_name,
        uc2.name AS client_user_name,
        uc2.email AS client_user_email,
        NULLIF(TRIM(to_jsonb(uc2)->>'company_name'), '') AS client_company_name,
        NULLIF(TRIM(to_jsonb(uc2)->>'contact_person'), '') AS client_contact_person,
        COALESCE(NULLIF(TRIM(to_jsonb(uc2)->>'phone'), ''),
                 NULLIF(TRIM(to_jsonb(uc2)->>'mobile'), ''),
                 NULLIF(TRIM(to_jsonb(uc2)->>'phone_number'), '')) AS client_user_phone
       FROM projects p
       LEFT JOIN employees m ON p.manager_id = m.id
       LEFT JOIN users s ON p.site_engineer_id = s.id
       LEFT JOIN users u ON p.coordinator_id = u.id
       LEFT JOIN users ua ON p.architect_id = ua.id
       LEFT JOIN users uc2 ON p.client_user_id = uc2.id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 FETCH BY ID ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch project" });
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
      coordinator_id,
      status,
      progress,
      location,
      description,
      building_type,
      floors,
      plot_size,
      phone,
    } = req.body;

    if (phone && phone.length !== 10) {
      return res.status(400).json({ error: "Phone must be 10 digits" });
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
        coordinator_id = COALESCE($8, coordinator_id),
        status = COALESCE($9, status),
        progress = COALESCE($10, progress),
        location = COALESCE($11, location),
        description = COALESCE($12, description),
        building_type = COALESCE($13, building_type),
        floors = COALESCE($14, floors),
        plot_size = COALESCE($15, plot_size),
        phone = COALESCE($16, phone),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [
        name,
        client,
        start_date,
        end_date,
        budget,
        manager_id,
        site_engineer_id,
        coordinator_id,
        status,
        progress,
        location,
        description,
        building_type,
        floors,
        plot_size,
        phone,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 UPDATE ERROR:", err.message);
    return res.status(500).json({ error: "Failed to update project" });
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
      return res.status(404).json({ message: "Project not found" });
    }
    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("🔥 DELETE ERROR:", err.message);
    return res.status(500).json({ error: "Failed to delete project" });
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
    return res.status(500).json({ error: "Failed to filter projects" });
  }
};

/**
 * ✅ Total Projects Count
 */
exports.getTotalProjects = async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM projects`);
    return res.status(200).json({ total: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch project count" });
  }
};