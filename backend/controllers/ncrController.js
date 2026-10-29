const pool = require("../config/db");
const {
  getAssignedProjectIds,
  getManagedProjectIds,
  isAssignedProject,
  isManagedProject,
} = require("../utils/siteEngineerAccess");

const NCR_MANAGE_ROLES = new Set([
  "project_manager",
  "site_engineer",
  "quality_manager",
  "ceo",
]);

async function getProjectScope(req) {
  if (req.user?.role === "site_engineer") {
    return getAssignedProjectIds(req.user.id);
  }
  if (req.user?.role === "project_manager") {
    return getManagedProjectIds(req.user.id);
  }
  return null;
}

async function canManageProject(req, projectId) {
  if (req.user?.role === "site_engineer") {
    return isAssignedProject(req.user.id, projectId);
  }
  if (req.user?.role === "project_manager") {
    return isManagedProject(req.user.id, projectId);
  }
  return true;
}

/* =========================================================
   FORMAT NCR FOR FRONTEND
========================================================= */

const formatNCR = (row) => ({
  ...row,

  refNo: `NCR-${String(row.id).padStart(3, "0")}`,

  createdAt: row.created_at,

  assignedTo: row.assigned_to,

  assignedToName:
    row.assigned_to_name || null,

  immediateAction:
    row.immediate_action || "",

  holdPlaced:
    Boolean(row.hold_placed),

  raisedBy:
    row.raised_by,

  raisedByName:
    row.raised_by_name || null,
});

/* =========================================================
   CREATE NCR
========================================================= */

exports.createNCR = async (req, res) => {
  try {
    const raisedBy = req.user?.id;

    if (!raisedBy) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }
    if (!NCR_MANAGE_ROLES.has(req.user.role)) {
      return res.status(403).json({ error: "Your role cannot create NCRs." });
    }

    const {
      project_id,
      title,
      description,
      severity,
      zone,
      assignedTo,
      immediateAction,
      holdPlaced,
    } = req.body;

    const projectId = Number(project_id);
    if (!Number.isInteger(projectId) || projectId <= 0 ||
        typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim() ||
        !severity) {
      return res.status(400).json({
        error:
          "project_id, title, description, and severity are required",
      });
    }
    if (assignedTo && (!Number.isInteger(Number(assignedTo)) || Number(assignedTo) <= 0)) {
      return res.status(400).json({ error: "assignedTo must be a valid user ID." });
    }
    if (!(await canManageProject(req, projectId))) {
      return res.status(403).json({ error: "You cannot create an NCR for this project." });
    }

    const allowedSeverity = [
      "low",
      "medium",
      "high",
      "critical",
    ];

    if (!allowedSeverity.includes(severity)) {
      return res.status(400).json({
        error: "Invalid severity",
      });
    }

    const attachments = (req.files || []).map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`,
    }));

    const result = await pool.query(
      `
        INSERT INTO ncr
        (
          raised_by,
          project_id,
          title,
          description,
          severity,
          zone,
          assigned_to,
          immediate_action,
          hold_placed,
          attachments,
          status,
          created_at,
          updated_at
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,
          'open',
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        raisedBy,
        projectId,
        title.trim(),
        description.trim(),
        severity,
        zone || null,
        assignedTo ? Number(assignedTo) : null,
        immediateAction || null,
        String(holdPlaced) === "true",
        JSON.stringify(attachments),
      ]
    );

    return res.status(201).json(
      formatNCR(result.rows[0])
    );
  } catch (err) {
    console.error("NCR CREATE ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

exports.getProjectOptions = async (req, res) => {
  try {
    const scope = await getProjectScope(req);
    if (scope && !scope.length) return res.json([]);
    const result = await pool.query(
      `SELECT id, name
         FROM projects
        WHERE status IS DISTINCT FROM 'Archived'
          AND ($1::INTEGER[] IS NULL OR id = ANY($1::INTEGER[]))
        ORDER BY name`,
      [scope]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("NCR project options error:", err);
    res.status(500).json({ error: "Failed to load NCR projects." });
  }
};

/* =========================================================
   GET ALL NCRs
========================================================= */

exports.getNCR = async (req, res) => {
  try {
    const scope = await getProjectScope(req);
    if (scope && !scope.length) return res.json([]);
    const result = await pool.query(
      `
        SELECT
          ncr.*,
          raised_user.name AS raised_by_name,
          assigned_user.name AS assigned_to_name
        FROM ncr

        LEFT JOIN users raised_user
          ON raised_user.id = ncr.raised_by

        LEFT JOIN users assigned_user
          ON assigned_user.id = ncr.assigned_to

        ${scope ? "WHERE ncr.project_id = ANY($1::INTEGER[])" : ""}
        ORDER BY ncr.created_at DESC
      `,
      scope ? [scope] : []
    );

    return res.json(
      result.rows.map(formatNCR)
    );
  } catch (err) {
    console.error("NCR GET ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   GET NCR BY ID
========================================================= */

exports.getNCRById = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = await getProjectScope(req);
    if (scope && !scope.length) {
      return res.status(404).json({ error: "NCR not found" });
    }

    const result = await pool.query(
      `
        SELECT
          ncr.*,
          raised_user.name AS raised_by_name,
          assigned_user.name AS assigned_to_name
        FROM ncr

        LEFT JOIN users raised_user
          ON raised_user.id = ncr.raised_by

        LEFT JOIN users assigned_user
          ON assigned_user.id = ncr.assigned_to

        WHERE ncr.id = $1
          ${scope ? "AND ncr.project_id = ANY($2::INTEGER[])" : ""}
      `,
      scope ? [id, scope] : [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "NCR not found",
      });
    }

    return res.json(
      formatNCR(result.rows[0])
    );
  } catch (err) {
    console.error(
      "NCR GET BY ID ERROR:",
      err
    );

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   UPDATE NCR
========================================================= */

exports.updateNCR = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    if (!NCR_MANAGE_ROLES.has(role)) {
      return res.status(403).json({
        error: "You are not authorized to update NCRs",
      });
    }

    const { id } = req.params;

    const {
      status,
      response,
      corrective_action,
      assignedTo,
      assigned_to,
      holdPlaced,
      hold_placed,
    } = req.body;

    const finalAssignedTo =
      assignedTo !== undefined
        ? assignedTo
        : assigned_to;

    const finalHoldPlaced =
      holdPlaced !== undefined
        ? holdPlaced
        : hold_placed;

    const allowedStatuses = [
      "open",
      "in_progress",
      "closed",
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        error: "Invalid NCR status",
      });
    }

    const existing = await pool.query("SELECT project_id FROM ncr WHERE id = $1", [id]);

    if (!existing.rows.length || !(await canManageProject(req, existing.rows[0].project_id))) {
      return res.status(404).json({
        error: "NCR not found",
      });
    }

    const result = await pool.query(
      `
        UPDATE ncr
        SET
          status = COALESCE($1, status),
          response = COALESCE($2, response),
          corrective_action =
            COALESCE($3, corrective_action),
          assigned_to =
            COALESCE($4, assigned_to),
          hold_placed =
            COALESCE($5, hold_placed),
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        status || null,
        response || null,
        corrective_action || null,

        finalAssignedTo !== undefined &&
        finalAssignedTo !== ""
          ? Number(finalAssignedTo)
          : null,

        finalHoldPlaced !== undefined
          ? String(finalHoldPlaced) === "true"
          : null,

        id,
      ]
    );

    return res.json(
      formatNCR(result.rows[0])
    );
  } catch (err) {
    console.error(
      "NCR UPDATE ERROR:",
      err
    );

    return res.status(500).json({
      error: err.message,
    });
  }
};