const pool = require("../config/db");

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

    const {
      title,
      description,
      severity,
      zone,
      assignedTo,
      immediateAction,
      holdPlaced,
    } = req.body;

    if (!title || !description || !severity) {
      return res.status(400).json({
        error:
          "title, description, and severity are required",
      });
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
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,
          'open',
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        raisedBy,
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

/* =========================================================
   GET ALL NCRs
========================================================= */

exports.getNCR = async (req, res) => {
  try {
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

        ORDER BY ncr.created_at DESC
      `
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
      `,
      [id]
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

    const allowedRoles = [
      "project_manager",
      "site_engineer",
      "quality_manager",
      "ceo",
    ];

    if (!allowedRoles.includes(role)) {
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

    const existing = await pool.query(
      `
        SELECT id
        FROM ncr
        WHERE id = $1
      `,
      [id]
    );

    if (!existing.rows.length) {
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