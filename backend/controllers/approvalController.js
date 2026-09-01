// backend/controllers/approvalController.js

const pool = require("../config/db");
const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

/* =========================================================
   ALLOWED REVIEWER ROLES
========================================================= */

const REVIEWER_ROLES = [
  "project_manager",
  "quantity_surveyor",
  "qc_engineer",
  "architect",
  "ceo",
];

/* =========================================================
   CREATE APPROVAL
   Site Engineer / other users create an approval
========================================================= */

exports.createApproval = async (req, res) => {
  try {

    console.log("========== APPROVAL UPLOAD DEBUG ==========");
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    console.log("============================================");

    const {
      type,
      title,
      description,
      zone,
      activity,
      linked_task,
      linked_rfi,
      linked_diary,
      qty_completed,
      qty_unit,
      assign_to_role,
    } = req.body;

    const uploadedAttachments = (req.files || []).map((file) => ({
      name: file.originalname,
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    }));

    const submittedBy = req.user?.id;

    if (!submittedBy) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!type || !title || !assign_to_role) {
      return res.status(400).json({
        success: false,
        message: "type, title and assign_to_role are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO approvals (
        type,
        title,
        description,
        zone,
        activity,
        linked_task,
        linked_rfi,
        linked_diary,
        qty_completed,
        qty_unit,
        assign_to_role,
        submitted_by,
        status,
        attachments,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        'pending',
        $13,
        NOW(),
        NOW()
      )
      RETURNING *
      `,
      [
        type,
        title,
        description || null,
        zone || null,
        activity || null,
        linked_task || null,
        linked_rfi || null,
        linked_diary || null,
        qty_completed || null,
        qty_unit || null,
        assign_to_role,
        submittedBy,
        JSON.stringify(uploadedAttachments), // ✅ FIX: pg needs a JSON string for jsonb columns
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE APPROVAL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create approval",
    });
  }
};


/* =========================================================
   GET ALL APPROVALS
   Mainly for admin/CEO/general register
========================================================= */

exports.getApprovals = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.*,
        u.name AS submitted_by_name
      FROM approvals a
      LEFT JOIN users u
        ON u.id = a.submitted_by
      ORDER BY a.created_at DESC
      `
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("GET APPROVALS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approvals",
    });
  }
};


/* =========================================================
   GET MY APPROVALS

   Example:
   Project Manager:
   assign_to_role = "project_manager"

   QC:
   assign_to_role = "qc_engineer"

   QS:
   assign_to_role = "quantity_surveyor"
========================================================= */

exports.getMyApprovals = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);

    if (!role) {
      return res.status(401).json({
        success: false,
        message: "User role not found",
      });
    }

    if (!REVIEWER_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "This role cannot review approvals",
      });
    }

    const result = await pool.query(
      `
      SELECT
        a.*,
        u.name AS submitted_by_name
      FROM approvals a
      LEFT JOIN users u
        ON u.id = a.submitted_by
      WHERE a.assign_to_role = $1
      ORDER BY
        CASE
          WHEN a.status = 'pending' THEN 0
          WHEN a.status = 'revision' THEN 1
          ELSE 2
        END,
        a.created_at DESC
      `,
      [role]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("GET MY APPROVALS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned approvals",
    });
  }
};


/* =========================================================
   GET SINGLE APPROVAL

   Reviewer can only see an approval assigned to
   their role.
========================================================= */

exports.getApprovalById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = String(req.user?.role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const result = await pool.query(
      `
      SELECT
        a.*,
        u.name AS submitted_by_name
      FROM approvals a
      LEFT JOIN users u
        ON u.id = a.submitted_by
      WHERE a.id = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Approval not found",
      });
    }

    const approval = result.rows[0];

    /*
      Only allow:
      - assigned reviewer
      - CEO
    */

    if (
      approval.assign_to_role !== role &&
      role !== "ceo"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to review this approval",
      });
    }

    return res.json({
      success: true,
      data: approval,
    });
  } catch (err) {
    console.error("GET APPROVAL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approval",
    });
  }
};


/* =========================================================
   REVIEW APPROVAL

   Actions:
   approved
   rejected
   revision
========================================================= */

exports.reviewApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      rejection_reason,
    } = req.body;

    const reviewerRole = normalizeRole(req.user?.role);

    const reviewerId = req.user?.id;

    if (!reviewerId || !reviewerRole) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    /* -----------------------------------------
       Validate status
    ----------------------------------------- */

    const allowedStatuses = [
      "approved",
      "rejected",
      "revision",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Use approved, rejected or revision.",
      });
    }

    /* -----------------------------------------
       Check reviewer role
    ----------------------------------------- */

    if (!REVIEWER_ROLES.includes(reviewerRole)) {
      return res.status(403).json({
        success: false,
        message: "This role cannot review approvals",
      });
    }

    /* -----------------------------------------
       Get approval
    ----------------------------------------- */

    const existing = await pool.query(
      `
      SELECT *
      FROM approvals
      WHERE id = $1
      `,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Approval not found",
      });
    }

    const approval = existing.rows[0];

    /* -----------------------------------------
       Check assignment
    ----------------------------------------- */

    if (
      approval.assign_to_role !== reviewerRole &&
      reviewerRole !== "ceo"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not assigned to review this approval",
      });
    }

    /* -----------------------------------------
       Only pending/revision approvals can be
       reviewed again.
    ----------------------------------------- */

    if (
      approval.status !== "pending" &&
      approval.status !== "revision"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Approval is already ${approval.status}`,
      });
    }

    /* -----------------------------------------
       Rejection requires a reason
    ----------------------------------------- */

    if (
      status === "rejected" &&
      !String(rejection_reason || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required",
      });
    }

    /* -----------------------------------------
       Revision also requires explanation
    ----------------------------------------- */

    if (
      status === "revision" &&
      !String(rejection_reason || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please explain what needs to be revised",
      });
    }

    /* -----------------------------------------
       Update
    ----------------------------------------- */

    const result = await pool.query(
      `
      UPDATE approvals
      SET
        status = $1,
        rejection_reason = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [
        status,
        rejection_reason?.trim() || null,
        id,
      ]
    );

    return res.json({
      success: true,
      message:
        status === "approved"
          ? "Approval approved successfully"
          : status === "rejected"
          ? "Approval rejected successfully"
          : "Revision requested successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("REVIEW APPROVAL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to review approval",
    });
  }
};