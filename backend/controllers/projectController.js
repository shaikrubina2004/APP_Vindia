const pool = require("../config/db");
const { insertNotification } = require("./pcNotificationsController");
const { insertNotification: insertSiteEngineerNotification } = require("./siteEngineerNotificationsController");
const { insertArchitectNotification } = require("./architectNotificationsController");
const { insertNotification: insertOperationsNotification } = require("./operationsNotificationsController");
const { notifyClientUser } = require("../utils/clientNotifications");

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
        manager_id, site_engineer_id, coordinator_id,
        architect_id, client_user_id,
        location, description,
        building_type, floors, plot_size, phone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        name,
        client,
        start_date,
        end_date,
        budget,
        manager_id,
        site_engineer_id,
        coordinator_id || null,
        architect_id || null,
        client_user_id || null,
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
        uc2.name AS client_user_name
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

    // ✅ Let everyone who was just assigned to this project know.
    // Previously only the coordinator was notified here — the Site Engineer,
    // Project Manager, Architect and Client all got nothing when a new
    // project was created and assigned to them, with no way to find out
    // short of someone telling them or stumbling across it in a project list.
    try {
      if (coordinator_id) {
        await insertNotification(
          coordinator_id,
          "project",
          "New project assigned to you",
          `You've been assigned as coordinator on "${name}".`,
          "/project-coordinator/dashboard",
          "info",
          newProject.id,
        );
      }

      // site_engineer_id and architect_id reference users.id directly.
      if (site_engineer_id) {
        await insertSiteEngineerNotification(
          site_engineer_id,
          "project",
          "New project assigned to you",
          `You've been assigned as site engineer on "${name}".`,
          "/site-engineer/dashboard",
          "info",
          newProject.id,
        );
      }
      if (architect_id) {
        await insertArchitectNotification(
          architect_id,
          "project",
          "New project assigned to you",
          `You've been assigned as architect on "${name}".`,
          "/architect/dashboard",
          "info",
          newProject.id,
        );
      }

      // manager_id references employees.id, not users.id — resolve the
      // actual login account before notifying.
      if (manager_id) {
        const mgr = await pool.query(
          `SELECT user_id FROM employees WHERE id = $1`,
          [manager_id]
        );
        const managerUserId = mgr.rows[0]?.user_id;
        if (managerUserId) {
          await insertOperationsNotification(
            managerUserId,
            "project",
            "New project assigned to you",
            `You've been assigned as project manager on "${name}".`,
            "/project-manager/dashboard",
            "info",
            newProject.id,
            "project_manager",
          );
        }
      }

      if (client_user_id) {
        await notifyClientUser(client_user_id, {
          type: "project",
          title: "Your project is set up",
          description: `"${name}" has been created and is now active.`,
          link: "/client/dashboard",
          severity: "info",
          projectId: newProject.id,
        });
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
    // Was: WHERE role_id = 33 — a hardcoded role id that only happened to
    // mean "Project Coordinator" in whichever database this was written
    // against. role_id values come from whatever order roles were seeded
    // in, so this could silently return the wrong people (or nobody) on
    // any other environment. Matched by role name instead, same pattern
    // as getArchitects/getClients below.
    const result = await pool.query(
      `SELECT u.id, u.name
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE LOWER(r.name) LIKE '%coordinator%'
       ORDER BY u.name`,
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
    // Was: WHERE role_id = 23 — same hardcoded-id problem as getCoordinators
    // above. Matched by role name instead.
    const result = await pool.query(
      `SELECT u.id, u.name
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE LOWER(r.name) LIKE '%site engineer%' OR LOWER(r.name) LIKE '%site_engineer%'
       ORDER BY u.name`,
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

exports.getClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE LOWER(r.name) LIKE '%client%'
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
        uc2.name AS client_user_name
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
              p.start_date, p.end_date, p.description, p.phone, p.plot_size, p.budget, p.progress,
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
        uc2.name AS client_user_name
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
      client_user_id,
      status,
      progress,
      location,
      description,
      building_type,
      floors,
      plot_size,
      phone,
    } = req.body;
    // architect_id is deliberately NOT accepted here — ArchitectAssignController's
    // assignArchitect endpoint already owns that field and enforces a safety rule
    // (can't silently reassign an architect already on the project without a 409).
    // Accepting it here too would let this endpoint bypass that rule.

    if (phone && phone.length !== 10) {
      return res.status(400).json({ error: "Phone must be 10 digits" });
    }

    // Read the current assignment before overwriting it, so we only notify
    // the people who are actually NEWLY assigned by this update — not
    // everyone already on the project, every time any field is edited.
    const before = await pool.query(
      `SELECT manager_id, site_engineer_id, coordinator_id, client_user_id FROM projects WHERE id = $1`,
      [id]
    );
    const prev = before.rows[0] || {};

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
        client_user_id = COALESCE($9, client_user_id),
        status = COALESCE($10, status),
        progress = COALESCE($11, progress),
        location = COALESCE($12, location),
        description = COALESCE($13, description),
        building_type = COALESCE($14, building_type),
        floors = COALESCE($15, floors),
        plot_size = COALESCE($16, plot_size),
        phone = COALESCE($17, phone),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $18
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
        client_user_id,
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

    const updated = result.rows[0];

    // Notify only the roles whose assignment actually changed, same
    // reasoning as createProject — previously nobody was ever told about a
    // reassignment, new or existing project alike.
    try {
      if (site_engineer_id && String(site_engineer_id) !== String(prev.site_engineer_id)) {
        await insertSiteEngineerNotification(
          site_engineer_id,
          "project",
          "New project assigned to you",
          `You've been assigned as site engineer on "${updated.name}".`,
          "/site-engineer/dashboard",
          "info",
          updated.id,
        );
      }
      if (coordinator_id && String(coordinator_id) !== String(prev.coordinator_id)) {
        await insertNotification(
          coordinator_id,
          "project",
          "New project assigned to you",
          `You've been assigned as coordinator on "${updated.name}".`,
          "/project-coordinator/dashboard",
          "info",
          updated.id,
        );
      }
      if (manager_id && String(manager_id) !== String(prev.manager_id)) {
        const mgr = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [manager_id]);
        const managerUserId = mgr.rows[0]?.user_id;
        if (managerUserId) {
          await insertOperationsNotification(
            managerUserId,
            "project",
            "New project assigned to you",
            `You've been assigned as project manager on "${updated.name}".`,
            "/project-manager/dashboard",
            "info",
            updated.id,
            "project_manager",
          );
        }
      }
      if (client_user_id && String(client_user_id) !== String(prev.client_user_id)) {
        await notifyClientUser(client_user_id, {
          type: "project",
          title: "You've been linked to a project",
          description: `You now have access to "${updated.name}" in your client portal.`,
          link: "/client/dashboard",
          severity: "info",
          projectId: updated.id,
        });
      }
    } catch (notifErr) {
      console.warn("⚠️ Reassignment notification failed (non-critical):", notifErr.message);
    }

    return res.status(200).json(updated);
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