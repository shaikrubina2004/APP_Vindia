const pool = require("../config/db");

/* ─────────────────────────────────────────────
   DB HELPER
───────────────────────────────────────────── */
const DB_TIMEOUT_MS = 10_000;

function isConnectionError(err) {
  return (
    err.code === "EAI_AGAIN" ||
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND" ||
    err.message?.includes("getaddrinfo")
  );
}

async function withDb(res, fn) {
  const timer = setTimeout(() => {}, DB_TIMEOUT_MS);
  try {
    await fn();
  } catch (err) {
    clearTimeout(timer);
    console.error("[DB Error]", err.code, err.message);
    if (isConnectionError(err)) {
      return res.status(503).json({
        error: "Database unavailable. Please try again in a moment.",
        code: "DB_UNREACHABLE",
      });
    }
    return res.status(500).json({ error: err.message });
  }
  clearTimeout(timer);
}

/* ─────────────────────────────────────────────
   CREATE DRAWING
───────────────────────────────────────────── */
exports.createDrawing = async (req, res) => {
  await withDb(res, async () => {
    const { id, project_id, name, drawing_type, revision, file_url, file_name, user_id } = req.body;

    await pool.query(
      `INSERT INTO architect_drawings
       (id, project_id, name, drawing_type, current_revision, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, project_id, name, drawing_type, revision, user_id]
    );

    await pool.query(
      `INSERT INTO architect_drawing_revisions
       (drawing_id, revision, file_url, file_name, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, revision, file_url, file_name || null, user_id]
    );

    res.json({ success: true });
  });
};

/* ─────────────────────────────────────────────
   GET DRAWINGS (ROLE BASED)
   — Architect: only their own uploads (created_by = userId)
   — QS / PC: drawings sent to their role label
   — 3D Visualizer: drawings sent to "3D Visualizer" role
   — Site Engineer / Client: drawings sent to their user_id
───────────────────────────────────────────── */
exports.getDrawings = async (req, res) => {
  await withDb(res, async () => {
    const { userId, role } = req.query;

    let result;

    /* shared SELECT + GROUP fragment */
    const selectBlock = `
      SELECT
        d.*,
        p.name  AS project_name,
        r.file_url,
        r.file_name,
        COALESCE(
          json_agg(
            json_build_object(
              'role',    rec.role,
              'user_id', rec.user_id,
              'sent_at', rec.sent_at
            )
          ) FILTER (WHERE rec.id IS NOT NULL),
          '[]'
        ) AS recipients
      FROM architect_drawings d
      LEFT JOIN projects p ON p.id = d.project_id
      LEFT JOIN LATERAL (
        SELECT * FROM architect_drawing_revisions
        WHERE drawing_id = d.id
        ORDER BY created_at DESC LIMIT 1
      ) r ON true
      LEFT JOIN architect_drawing_recipients rec ON rec.drawing_id = d.id
    `;

    if (role === "architect") {
      /* ── STRICT ISOLATION: only drawings this architect uploaded ── */
      result = await pool.query(
        `${selectBlock}
         WHERE d.created_by = $1
         GROUP BY d.id, p.name, r.file_url, r.file_name
         ORDER BY d.created_at DESC`,
        [userId]
      );

    } else if (role === "quantity_surveyor") {
      result = await pool.query(
        `${selectBlock}
         JOIN architect_drawing_recipients rq
           ON rq.drawing_id = d.id AND rq.role = 'Quantity Surveyor'
         GROUP BY d.id, p.name, r.file_url, r.file_name
         ORDER BY d.created_at DESC`
      );

    } else if (role === "project_coordinator") {
      result = await pool.query(
        `${selectBlock}
         JOIN architect_drawing_recipients rq
           ON rq.drawing_id = d.id AND rq.role = 'Program Coordinator'
         GROUP BY d.id, p.name, r.file_url, r.file_name
         ORDER BY d.created_at DESC`
      );

    } else if (role === "3d_visualizer") {
      /* ── 3D Visualizer sees ALL drawings sent to the "3D Visualizer" role.
             We match on role label. If a user_id is stored, also accept those
             belonging to this specific user (backward-compat). ── */
      result = await pool.query(
        `${selectBlock}
         JOIN architect_drawing_recipients rq
           ON rq.drawing_id = d.id
          AND rq.role = '3D Visualizer'
         GROUP BY d.id, p.name, r.file_url, r.file_name
         ORDER BY d.created_at DESC`
      );

    } else {
      /* site_engineer, client — scoped by user_id */
      result = await pool.query(
        `${selectBlock}
         JOIN architect_drawing_recipients rq
           ON rq.drawing_id = d.id AND rq.user_id = $1
         GROUP BY d.id, p.name, r.file_url, r.file_name
         ORDER BY d.created_at DESC`,
        [userId]
      );
    }

    res.json(result.rows);
  });
};

/* ─────────────────────────────────────────────
   SEND DRAWING
───────────────────────────────────────────── */
exports.sendDrawing = async (req, res) => {
  await withDb(res, async () => {
    const { drawingId } = req.params;
    const { user_id, role, sent_by } = req.body;

    // Check for duplicate: if user_id provided, check exact match; otherwise check role-only
    let existing;
    if (user_id) {
      existing = await pool.query(
        `SELECT id FROM architect_drawing_recipients
         WHERE drawing_id = $1 AND role = $2 AND user_id = $3`,
        [drawingId, role, user_id]
      );
    } else {
      existing = await pool.query(
        `SELECT id FROM architect_drawing_recipients
         WHERE drawing_id = $1 AND role = $2`,
        [drawingId, role]
      );
    }

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Drawing already sent to this recipient." });
    }

    await pool.query(
      `INSERT INTO architect_drawing_recipients (drawing_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [drawingId, user_id || null, role]
    );

    await pool.query(
      `INSERT INTO architect_drawing_logs (drawing_id, action, stage, performed_by)
       VALUES ($1, 'SENT', $2, $3)`,
      [drawingId, role, sent_by]
    );

    res.json({ success: true });
  });
};

/* ─────────────────────────────────────────────
   REQUEST DRAWING
───────────────────────────────────────────── */
exports.requestDrawing = async (req, res) => {
  await withDb(res, async () => {
    const { project_id, requested_by, role, description, due_date } = req.body;

    await pool.query(
      `INSERT INTO architect_drawing_requests
       (project_id, requested_by, role, description, due_date)
       VALUES ($1,$2,$3,$4,$5)`,
      [project_id, requested_by, role, description, due_date]
    );

    res.json({ success: true });
  });
};

/* ─────────────────────────────────────────────
   GET REQUESTS (incoming to architect)
───────────────────────────────────────────── */
exports.getRequests = async (_req, res) => {
  await withDb(res, async () => {
    const result = await pool.query(`
      SELECT
        req.*,
        p.name   AS project_name,
        u.name   AS requester_name,
        req.role AS requester_role
      FROM architect_drawing_requests req
      LEFT JOIN projects p ON p.id = req.project_id
      LEFT JOIN users u ON u.id = req.requested_by
      ORDER BY req.created_at DESC
    `);
    res.json(result.rows);
  });
};

/* ─────────────────────────────────────────────
   SUBMIT 3D RENDER (3D Visualizer → Architect)
   POST /api/architect-designs/:drawingId/submit-3d
   Body: { submitted_by, file_url, file_name, notes }
───────────────────────────────────────────── */
exports.submit3DRender = async (req, res) => {
  await withDb(res, async () => {
    const { drawingId } = req.params;
    const { submitted_by, file_url, file_name, notes } = req.body;

    if (!submitted_by || !file_url) {
      return res.status(400).json({ error: "submitted_by and file_url are required." });
    }

    /* Ensure this drawing was sent to 3D Visualizer role */
    const access = await pool.query(
      `SELECT id FROM architect_drawing_recipients
       WHERE drawing_id = $1
         AND role = '3D Visualizer'`,
      [drawingId]
    );
    if (access.rows.length === 0) {
      return res.status(403).json({ error: "This drawing was not sent to you." });
    }

    /* Prevent duplicate pending submissions */
    const existingPending = await pool.query(
      `SELECT id FROM architect_3d_submissions
       WHERE drawing_id = $1 AND submitted_by = $2 AND status = 'Pending'`,
      [drawingId, submitted_by]
    );
    if (existingPending.rows.length > 0) {
      return res.status(409).json({ error: "You already have a pending submission for this drawing." });
    }

    await pool.query(
      `INSERT INTO architect_3d_submissions
         (drawing_id, submitted_by, file_url, file_name, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending')`,
      [drawingId, submitted_by, file_url, file_name || null, notes || null]
    );

    /* Notify the architect who owns this drawing */
    try {
      const drawingRow = await pool.query(
        `SELECT d.name AS drawing_name, d.created_by AS architect_id, p.name AS project_name
         FROM architect_drawings d
         LEFT JOIN projects p ON p.id = d.project_id
         WHERE d.id = $1`,
        [drawingId]
      );
      if (drawingRow.rows.length > 0) {
        const { architect_id, drawing_name, project_name } = drawingRow.rows[0];
        if (architect_id) {
          await pool.query(
            `INSERT INTO architect_notifications (user_id, type, title, description, severity)
             VALUES ($1, 'drawing', $2, $3, 'info')`,
            [
              architect_id,
              "3D Render Submitted: " + drawing_name,
              "A 3D render has been submitted for \"" + drawing_name + "\" (" + (project_name || "") + "). Please review it.",
            ]
          );
        }
      }
    } catch (notifErr) {
      console.warn("[submit3DRender] Could not send notification:", notifErr.message);
    }

    res.json({ success: true });
  });
};

/* ─────────────────────────────────────────────
   GET 3D SUBMISSIONS for a drawing
   GET /api/architect-designs/:drawingId/3d-submissions
───────────────────────────────────────────── */
exports.get3DSubmissions = async (req, res) => {
  await withDb(res, async () => {
    const { drawingId } = req.params;

    const result = await pool.query(
      `SELECT s.*, u.name AS submitter_name
       FROM architect_3d_submissions s
       LEFT JOIN users u ON u.id = s.submitted_by
       WHERE s.drawing_id = $1
       ORDER BY s.created_at DESC`,
      [drawingId]
    );

    res.json(result.rows);
  });
};

/* ─────────────────────────────────────────────
   APPROVE / REJECT 3D SUBMISSION (Architect)
   PATCH /api/architect-designs/3d-submissions/:submissionId
   Body: { status: "Approved" | "Rejected", reviewed_by, review_note }
───────────────────────────────────────────── */
exports.review3DSubmission = async (req, res) => {
  await withDb(res, async () => {
    const { submissionId } = req.params;
    const { status, reviewed_by, review_note } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be 'Approved' or 'Rejected'." });
    }

    const result = await pool.query(
      `UPDATE architect_3d_submissions
       SET status = $1, reviewed_by = $2, review_note = $3, reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, reviewed_by, review_note || null, submissionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Submission not found." });
    }

    res.json({ success: true, submission: result.rows[0] });
  });
};

/* ─────────────────────────────────────────────
   GET MY 3D SUBMISSIONS (3D Visualizer's own)
   GET /api/architect-designs/my-3d-submissions?userId=X
───────────────────────────────────────────── */
exports.getMy3DSubmissions = async (req, res) => {
  await withDb(res, async () => {
    const { userId } = req.query;

    const result = await pool.query(
      `SELECT s.*, d.name AS drawing_name, p.name AS project_name
       FROM architect_3d_submissions s
       JOIN architect_drawings d ON d.id = s.drawing_id
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE s.submitted_by = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  });
};
/* ─────────────────────────────────────────────
   INCREMENT PLANNING REVISION (Architect)
   PATCH /api/architect-designs/:drawingId/revision
   Body: { revision: "R2", updated_by: userId }
───────────────────────────────────────────── */
exports.incrementRevision = async (req, res) => {
  await withDb(res, async () => {
    const { drawingId } = req.params;
    const { revision, updated_by, file_url, file_name } = req.body;

    if (!revision) {
      return res.status(400).json({ error: "revision is required." });
    }

    // Verify drawing exists and is a Planning type
    const check = await pool.query(
      `SELECT id, drawing_type FROM architect_drawings WHERE id = $1`,
      [drawingId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ error: "Drawing not found." });
    }

    if (check.rows[0].drawing_type !== "Planning") {
      return res.status(400).json({ error: "Only Planning drawings support auto-revision." });
    }

    // Update the revision on the drawing
    await pool.query(
      `UPDATE architect_drawings
       SET current_revision = $1, updated_at = NOW()
       WHERE id = $2`,
      [revision, drawingId]
    );

    // Insert a revision history record (with optional file)
    await pool.query(
      `INSERT INTO architect_drawing_revisions
       (drawing_id, revision, file_url, file_name, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [drawingId, revision, file_url || null, file_name || null, updated_by || null]
    );

    // Log the action
    await pool.query(
      `INSERT INTO architect_drawing_logs (drawing_id, action, stage, performed_by, note)
       VALUES ($1, 'REVISION_INCREMENT', 'Planning', $2, $3)`,
      [drawingId, updated_by || null, `Revision incremented to ${revision}`]
    );

    res.json({ success: true, revision });
  });
};
/* ─────────────────────────────────────────────
   GET ALL PENDING 3D SUBMISSIONS FOR AN ARCHITECT
   GET /api/architect-designs/my-3d-reviews?architectId=X
   Returns all submissions for drawings this architect created
───────────────────────────────────────────── */
exports.getMy3DReviews = async (req, res) => {
  await withDb(res, async () => {
    const { architectId } = req.query;

    if (!architectId) {
      return res.status(400).json({ error: "architectId is required." });
    }

    const result = await pool.query(
      `SELECT s.*,
              d.name        AS drawing_name,
              p.name        AS project_name,
              u.name        AS submitter_name
       FROM   architect_3d_submissions s
       JOIN   architect_drawings d ON d.id = s.drawing_id
       LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN users    u ON u.id = s.submitted_by
       WHERE  d.created_by = $1
       ORDER BY s.created_at DESC`,
      [architectId]
    );

    res.json(result.rows);
  });
};