// backend/controllers/threeDModelController.js
const pool = require("../config/db");
const { insertThreeDNotification } = require("./threeDNotificationsController");
const { insertArchitectNotification } = require("./architectNotificationsController");

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const VALID_STATUSES = ["draft", "pending_review", "approved", "rejected"];

function isConnectionError(err) {
  return (
    err.code === "EAI_AGAIN" ||
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND" ||
    err.message?.includes("getaddrinfo")
  );
}

async function handleDbError(res, err, fallbackMsg = "Something went wrong") {
  console.error("[3D Model DB Error]", err.code, err.message);
  if (isConnectionError(err)) {
    return res.status(503).json({ error: "Database unavailable. Please try again shortly.", code: "DB_UNREACHABLE" });
  }
  return res.status(500).json({ error: err.message || fallbackMsg });
}

const SELECT_MODEL = `
  SELECT
    m.*,
    p.name         AS project_name,
    d.name         AS drawing_name,
    creator.name   AS created_by_name,
    reviewer.name  AS reviewed_by_name
  FROM three_d_models m
  LEFT JOIN projects p          ON p.id = m.project_id
  LEFT JOIN architect_drawings d ON d.id = m.drawing_id
  LEFT JOIN users creator       ON creator.id = m.created_by
  LEFT JOIN users reviewer      ON reviewer.id = m.reviewed_by
`;

/* ─────────────────────────────────────────────
   GET /api/3d-models
   3D Visualizer -> only their own models
   Architect / CEO -> all models (optionally filter by project)
───────────────────────────────────────────── */
exports.getModels = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { status, project_id } = req.query;

    const clauses = [];
    const vals = [];

    if (role === "3d_visualizer") {
      vals.push(userId);
      clauses.push(`m.created_by = $${vals.length}`);
    }
    // architect, ceo, admin-type roles see everything (read-only for architect unless owner)

    if (status && VALID_STATUSES.includes(status)) {
      vals.push(status);
      clauses.push(`m.status = $${vals.length}`);
    }
    if (project_id) {
      vals.push(project_id);
      clauses.push(`m.project_id = $${vals.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `${SELECT_MODEL} ${where} ORDER BY m.updated_at DESC`,
      vals
    );

    res.json({ success: true, models: rows });
  } catch (err) {
    handleDbError(res, err, "Failed to fetch models");
  }
};

/* ─────────────────────────────────────────────
   GET /api/3d-models/:id
───────────────────────────────────────────── */
exports.getModelById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`${SELECT_MODEL} WHERE m.id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: "Model not found" });

    const model = rows[0];
    const { role, id: userId } = req.user;

    // A visualizer may only view their own models; architect/ceo may view all
    if (role === "3d_visualizer" && model.created_by !== userId) {
      return res.status(403).json({ error: "You do not have access to this model" });
    }

    const history = await pool.query(
      `SELECT v.*, u.name AS created_by_name
       FROM three_d_model_versions v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.model_id = $1
       ORDER BY v.version DESC`,
      [id]
    );

    res.json({ success: true, model, history: history.rows });
  } catch (err) {
    handleDbError(res, err, "Failed to fetch model");
  }
};

/* ─────────────────────────────────────────────
   POST /api/3d-models
   3D Visualizer creates a draft model
───────────────────────────────────────────── */
exports.createModel = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== "3d_visualizer" && role !== "ceo") {
      return res.status(403).json({ error: "Only 3D Visualizers can create models" });
    }

    const {
      title, description, project_id, drawing_id,
      file_name, file_url, file_type, file_size, notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!file_url) {
      return res.status(400).json({ error: "A model file must be uploaded before creating the model" });
    }

    const { rows } = await pool.query(
      `INSERT INTO three_d_models
        (title, description, project_id, drawing_id, created_by,
         file_name, file_url, file_type, file_size, version, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'draft',$10)
       RETURNING *`,
      [
        title.trim(), description || null,
        project_id || null, drawing_id || null, userId,
        file_name || null, file_url, file_type || null,
        file_size || null, notes || null,
      ]
    );

    const model = rows[0];

    await pool.query(
      `INSERT INTO three_d_model_versions (model_id, version, file_name, file_url, file_type, status, note, created_by)
       VALUES ($1,1,$2,$3,$4,'draft',$5,$6)`,
      [model.id, file_name || null, file_url, file_type || null, notes || null, userId]
    );

    res.status(201).json({ success: true, model });
  } catch (err) {
    handleDbError(res, err, "Failed to create model");
  }
};

/* ─────────────────────────────────────────────
   PATCH /api/3d-models/:id
   Owner (visualizer) edits a draft/rejected model.
   If a new file is attached, bumps the version and
   resets status back to draft.
───────────────────────────────────────────── */
exports.updateModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const existing = await pool.query("SELECT * FROM three_d_models WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Model not found" });
    const model = existing.rows[0];

    if (model.created_by !== userId && role !== "ceo") {
      return res.status(403).json({ error: "You can only edit your own models" });
    }
    if (!["draft", "rejected"].includes(model.status) && role !== "ceo") {
      return res.status(400).json({ error: "Only draft or rejected models can be edited" });
    }

    const {
      title, description, project_id, drawing_id,
      file_name, file_url, file_type, file_size, notes,
    } = req.body;

    const isNewFile = !!file_url && file_url !== model.file_url;
    const nextVersion = isNewFile ? (model.version || 1) + 1 : model.version;
    const nextStatus = isNewFile ? "draft" : model.status;

    const { rows } = await pool.query(
      `UPDATE three_d_models SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        project_id = COALESCE($3, project_id),
        drawing_id = COALESCE($4, drawing_id),
        file_name = COALESCE($5, file_name),
        file_url = COALESCE($6, file_url),
        file_type = COALESCE($7, file_type),
        file_size = COALESCE($8, file_size),
        notes = COALESCE($9, notes),
        version = $10,
        status = $11,
        architect_feedback = CASE WHEN $11 = 'draft' THEN architect_feedback ELSE architect_feedback END,
        updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        title || null, description ?? null, project_id || null, drawing_id || null,
        file_name || null, file_url || null, file_type || null, file_size || null,
        notes ?? null, nextVersion, nextStatus, id,
      ]
    );

    if (isNewFile) {
      await pool.query(
        `INSERT INTO three_d_model_versions (model_id, version, file_name, file_url, file_type, status, note, created_by)
         VALUES ($1,$2,$3,$4,$5,'draft',$6,$7)`,
        [id, nextVersion, file_name || null, file_url, file_type || null, notes || null, userId]
      );
    }

    res.json({ success: true, model: rows[0] });
  } catch (err) {
    handleDbError(res, err, "Failed to update model");
  }
};

/* ─────────────────────────────────────────────
   POST /api/3d-models/:id/submit
   Visualizer submits draft/rejected model for review
───────────────────────────────────────────── */
exports.submitModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    const existing = await pool.query("SELECT * FROM three_d_models WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Model not found" });
    const model = existing.rows[0];

    if (model.created_by !== userId) {
      return res.status(403).json({ error: "You can only submit your own models" });
    }
    if (!["draft", "rejected"].includes(model.status)) {
      return res.status(400).json({ error: "Only draft or rejected models can be submitted" });
    }

    const { rows } = await pool.query(
      `UPDATE three_d_models
       SET status = 'pending_review', submitted_at = NOW(), architect_feedback = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    const updated = rows[0];

    // Notify the project's architect that a model is waiting on their review.
    if (updated.project_id) {
      try {
        const proj = await pool.query(
          "SELECT architect_id FROM projects WHERE id = $1",
          [updated.project_id]
        );
        const architectId = proj.rows[0]?.architect_id;
        if (architectId) {
          // Goes into the architect's own notifications table/bell (already wired up).
          await insertArchitectNotification(
            architectId,
            "design",
            `New 3D model submitted: ${updated.title}`,
            `A 3D model was submitted for your review.`,
            "/architect/3d-models",
            "info",
            updated.id
          );
        }
      } catch (notifyErr) {
        console.error("submitModel notify error:", notifyErr.message);
      }
    }

    res.json({ success: true, model: updated });
  } catch (err) {
    handleDbError(res, err, "Failed to submit model");
  }
};

/* ─────────────────────────────────────────────
   POST /api/3d-models/:id/approve
   Architect / CEO only
───────────────────────────────────────────── */
exports.approveModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    if (!["architect", "ceo"].includes(role)) {
      return res.status(403).json({ error: "Only an architect can approve models" });
    }

    const existing = await pool.query("SELECT * FROM three_d_models WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Model not found" });
    if (existing.rows[0].status !== "pending_review") {
      return res.status(400).json({ error: "Only models pending review can be approved" });
    }

    const { comment } = req.body;

    const { rows } = await pool.query(
      `UPDATE three_d_models
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(),
           architect_feedback = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [userId, comment || "Approved.", id]
    );

    const updated = rows[0];

    await insertThreeDNotification(
      updated.created_by,
      "review",
      `Model approved: ${updated.title}`,
      comment || "Your 3D model was approved.",
      "/3d-visualizer/models",
      "ok",
      updated.id
    );

    res.json({ success: true, model: updated });
  } catch (err) {
    handleDbError(res, err, "Failed to approve model");
  }
};

/* ─────────────────────────────────────────────
   POST /api/3d-models/:id/reject
   Architect / CEO only — feedback required
───────────────────────────────────────────── */
exports.rejectModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    if (!["architect", "ceo"].includes(role)) {
      return res.status(403).json({ error: "Only an architect can reject models" });
    }

    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Rejection feedback is required" });
    }

    const existing = await pool.query("SELECT * FROM three_d_models WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Model not found" });
    if (existing.rows[0].status !== "pending_review") {
      return res.status(400).json({ error: "Only models pending review can be rejected" });
    }

    const { rows } = await pool.query(
      `UPDATE three_d_models
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
           architect_feedback = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [userId, comment.trim(), id]
    );

    const updated = rows[0];

    await insertThreeDNotification(
      updated.created_by,
      "review",
      `Model needs changes: ${updated.title}`,
      comment.trim(),
      "/3d-visualizer/models",
      "warn",
      updated.id
    );

    res.json({ success: true, model: updated });
  } catch (err) {
    handleDbError(res, err, "Failed to reject model");
  }
};

/* ─────────────────────────────────────────────
   DELETE /api/3d-models/:id
   Owner only, and only while in draft
───────────────────────────────────────────── */
exports.deleteModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const existing = await pool.query("SELECT * FROM three_d_models WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Model not found" });
    const model = existing.rows[0];

    if (model.created_by !== userId && role !== "ceo") {
      return res.status(403).json({ error: "You can only delete your own models" });
    }
    if (model.status !== "draft" && role !== "ceo") {
      return res.status(400).json({ error: "Only draft models can be deleted" });
    }

    await pool.query("DELETE FROM three_d_models WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    handleDbError(res, err, "Failed to delete model");
  }
};

/* ─────────────────────────────────────────────
   GET /api/3d-models/stats/summary
   Dashboard counts for the current visualizer
   (architect/ceo get org-wide counts)
───────────────────────────────────────────── */
exports.getStatsSummary = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const scoped = role === "3d_visualizer";
    const where = scoped ? "WHERE created_by = $1" : "";
    const vals = scoped ? [userId] : [];

    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM three_d_models ${where} GROUP BY status`,
      vals
    );

    const summary = { draft: 0, pending_review: 0, approved: 0, rejected: 0, total: 0 };
    rows.forEach((r) => {
      summary[r.status] = r.count;
      summary.total += r.count;
    });

    res.json({ success: true, summary });
  } catch (err) {
    handleDbError(res, err, "Failed to fetch model stats");
  }
};