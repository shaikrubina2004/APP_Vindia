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

    } else if (role === "site_engineer") {
      /*
       * Site Engineer: only sees drawings that were sent to them (user_id match)
       * AND where the drawing's project has this user assigned as site_engineer_id.
       * This prevents drawings from unrelated projects from showing up even if
       * someone mistakenly inserted a recipient row.
       */
      result = await pool.query(
        `${selectBlock}
         JOIN architect_drawing_recipients rq
           ON rq.drawing_id = d.id AND rq.user_id = $1
         JOIN projects proj ON proj.id = d.project_id
           AND proj.site_engineer_id = $1
         GROUP BY d.id, p.name, r.file_url, r.file_name
         ORDER BY d.created_at DESC`,
        [userId]
      );

    } else {
      /* client — scoped by user_id */
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
    const { role, sent_by } = req.body;
    let { user_id } = req.body;

    /*
     * For "Site Engineer": always resolve the correct user_id from the
     * drawing's project (projects.site_engineer_id).  This enforces the rule
     * that only the site engineer assigned to the same project as the
     * architect receives the drawing, regardless of what the frontend sent.
     */
    if (role === "Site Engineer") {
      const projectRow = await pool.query(
        `SELECT p.site_engineer_id
         FROM architect_drawings d
         JOIN projects p ON p.id = d.project_id
         WHERE d.id = $1`,
        [drawingId]
      );

      if (projectRow.rowCount === 0) {
        return res.status(404).json({ error: "Drawing not found." });
      }

      const assignedSE = projectRow.rows[0].site_engineer_id;
      if (!assignedSE) {
        return res.status(400).json({
          error: "No site engineer is assigned to this project.",
        });
      }

      user_id = assignedSE;
    }

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
   MARK REQUEST AS SEEN (Architect)
   PATCH /api/architect-designs/requests/:reqId/seen
   Body: { seen_by: userId }
   Sets status to 'seen' so it stops counting as
   unseen/pending on reload (row.status !== "pending"
   is what the frontend uses to derive `seen`).
───────────────────────────────────────────── */
exports.markRequestSeen = async (req, res) => {
  await withDb(res, async () => {
    const { reqId } = req.params;

    if (!reqId) {
      return res.status(400).json({ error: "reqId is required." });
    }

    // Only touch `status` — that's the single column normaliseRequest()
    // on the frontend relies on (`row.status !== "pending"` ⇒ seen).
    // Avoid writing to seen_by/seen_at etc. since those columns aren't
    // guaranteed to exist on architect_drawing_requests.
    const result = await pool.query(
      `UPDATE architect_drawing_requests
       SET status = 'seen'
       WHERE id = $1
       RETURNING id`,
      [reqId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

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
   — Only returns requests for projects where this architect
     is the assigned architect (projects.architect_id = architectId).
     Without architectId, no requests are returned (prevents leaking
     every architect's requests to whoever is logged in).
───────────────────────────────────────────── */
exports.getRequests = async (req, res) => {
  await withDb(res, async () => {
    const { architectId } = req.query;

    if (!architectId) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT
        req.*,
        p.name   AS project_name,
        u.name   AS requester_name,
        req.role AS requester_role
      FROM architect_drawing_requests req
      JOIN projects p ON p.id = req.project_id
        AND p.architect_id = $1
      LEFT JOIN users u ON u.id = req.requested_by
      ORDER BY req.created_at DESC
      `,
      [architectId]
    );
    res.json(result.rows);
  });
};

/* ─────────────────────────────────────────────
   SUBMIT 3D RENDER (3D Visualizer → Architect)
   POST /api/architect-designs/:drawingId/submit-3d
   Body: { submitted_by, file_url, file_name, notes, drawing_revision }
───────────────────────────────────────────── */
exports.submit3DRender = async (req, res) => {
  await withDb(res, async () => {
    const { drawingId } = req.params;
    const { submitted_by, file_url, file_name, notes, drawing_revision } = req.body;

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

    /* Resolve the owning architect + project for this drawing */
    const drawingRow = await pool.query(
      `SELECT d.name AS drawing_name, d.project_id, d.created_by AS architect_id, d.current_revision, p.name AS project_name
       FROM architect_drawings d
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`,
      [drawingId]
    );
    if (drawingRow.rowCount === 0) {
      return res.status(404).json({ error: "Drawing not found." });
    }
    const { architect_id, drawing_name, project_id, project_name, current_revision } = drawingRow.rows[0];

    /* Prevent duplicate pending submissions */
    const existingPending = await pool.query(
      `SELECT id FROM architect_3d_submissions
       WHERE drawing_id = $1 AND submitted_by = $2 AND status = 'Pending'`,
      [drawingId, submitted_by]
    );
    if (existingPending.rows.length > 0) {
      return res.status(409).json({ error: "You already have a pending submission for this drawing." });
    }

    /* Self-healing schema: make sure drawing_revision exists in case the
       table predates this feature. Cheap no-op once already applied. */
    try {
      await pool.query(`ALTER TABLE architect_3d_submissions ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(20)`);
    } catch (schemaErr) {
      console.warn("[submit3DRender] Schema check:", schemaErr.message);
    }

    await pool.query(
      `INSERT INTO architect_3d_submissions
         (drawing_id, project_id, architect_id, submitted_by, file_url, file_name, notes, drawing_revision, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')`,
      [
        drawingId,
        project_id || null,
        architect_id || null,
        submitted_by,
        file_url,
        file_name || null,
        notes || null,
        drawing_revision || current_revision || "R1",
      ]
    );

    /* Notify the architect who owns this drawing */
    if (architect_id) {
      try {
        await pool.query(
          `INSERT INTO architect_notifications (user_id, type, title, description, severity)
           VALUES ($1, 'drawing', $2, $3, 'info')`,
          [
            architect_id,
            "3D Render Submitted: " + drawing_name,
            "A 3D render has been submitted for \"" + drawing_name + "\" (" + (project_name || "") + "). Please review it.",
          ]
        );
      } catch (notifErr) {
        console.warn("[submit3DRender] Could not send notification:", notifErr.message);
      }
    }

    res.json({ success: true });
  });
};

/* ─────────────────────────────────────────────
   SEND DIRECTLY TO ARCHITECT (3D Visualizer → Architect)
   POST /api/architect-designs/submit-to-architect
   Body: { project_id, submitted_by, file_url, file_name, notes, drawing_revision }

   Unlike submit3DRender (which responds to a drawing the architect
   already sent), this lets the 3D Visualizer initiate a submission
   for any project — resolved to whichever architect is assigned to
   that project (projects.architect_id). No prior "send" required.
───────────────────────────────────────────── */
exports.submitToArchitect = async (req, res) => {
  await withDb(res, async () => {
    const { project_id, submitted_by, file_url, file_name, notes, drawing_revision } = req.body;

    if (!project_id || !submitted_by || !file_url) {
      return res.status(400).json({ error: "project_id, submitted_by and file_url are required." });
    }

    /* Self-healing schema: make sure the columns/nullability this
       endpoint needs exist, in case the table predates this feature.
       Cheap no-ops once already applied. */
    try {
      await pool.query(`ALTER TABLE architect_3d_submissions ADD COLUMN IF NOT EXISTS project_id INTEGER`);
      await pool.query(`ALTER TABLE architect_3d_submissions ADD COLUMN IF NOT EXISTS architect_id INTEGER`);
      await pool.query(`ALTER TABLE architect_3d_submissions ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(20)`);
      await pool.query(`ALTER TABLE architect_3d_submissions ALTER COLUMN drawing_id DROP NOT NULL`);
    } catch (schemaErr) {
      console.warn("[submitToArchitect] Schema check:", schemaErr.message);
    }

    const projectRow = await pool.query(
      `SELECT id, name, architect_id FROM projects WHERE id = $1`,
      [project_id]
    );
    if (projectRow.rowCount === 0) {
      return res.status(404).json({ error: "Project not found." });
    }

    const { architect_id, name: project_name } = projectRow.rows[0];
    if (!architect_id) {
      return res.status(400).json({ error: "No architect is assigned to this project yet." });
    }

    /* Prevent duplicate pending direct submissions for the same project */
    const existingPending = await pool.query(
      `SELECT id FROM architect_3d_submissions
       WHERE project_id = $1 AND drawing_id IS NULL AND submitted_by = $2 AND status = 'Pending'`,
      [project_id, submitted_by]
    );
    if (existingPending.rows.length > 0) {
      return res.status(409).json({ error: "You already have a pending submission for this project." });
    }

    const inserted = await pool.query(
      `INSERT INTO architect_3d_submissions
         (project_id, architect_id, submitted_by, file_url, file_name, notes, drawing_revision, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING id`,
      [
        project_id,
        architect_id,
        submitted_by,
        file_url,
        file_name || null,
        notes || null,
        drawing_revision || "R1",
      ]
    );

    /* Notify the architect */
    try {
      await pool.query(
        `INSERT INTO architect_notifications (user_id, type, title, description, severity)
         VALUES ($1, 'drawing', $2, $3, 'info')`,
        [
          architect_id,
          "New 3D Submission Received",
          "A 3D visualizer has sent a submission for \"" + (project_name || "") + "\". Please review it.",
        ]
      );
    } catch (notifErr) {
      console.warn("[submitToArchitect] Could not send notification:", notifErr.message);
    }

    res.json({ success: true, id: inserted.rows[0].id });
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

    /*
     * LEFT JOIN on architect_drawings because a submission may either be:
     *  - tied to a specific drawing (drawing_id set), or
     *  - a direct submission to the architect for a project (drawing_id NULL,
     *    project_id set instead).
     * project_name/architect_name are resolved from whichever path applies.
     */
    const result = await pool.query(
      `SELECT
         s.*,
         COALESCE(d.name, 'Direct Submission') AS drawing_name,
         COALESCE(dp.name, p.name)             AS project_name,
         a.name AS architect_name
       FROM architect_3d_submissions s
       LEFT JOIN architect_drawings d ON d.id = s.drawing_id
       LEFT JOIN projects dp ON dp.id = d.project_id
       LEFT JOIN projects p  ON p.id  = s.project_id
       LEFT JOIN users a     ON a.id  = s.architect_id
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

    /*
     * Filters on s.architect_id directly (set at insert time for both
     * submit3DRender and submitToArchitect), so this covers:
     *  - drawing-based submissions (3D Visualizer responding to a drawing
     *    the architect sent), and
     *  - direct submissions (3D Visualizer sending to the architect
     *    straight away, with no drawing involved).
     */
    const result = await pool.query(
      `SELECT
         s.*,
         COALESCE(d.name, 'Direct Submission') AS drawing_name,
         COALESCE(dp.name, p.name)             AS project_name,
         u.name AS submitter_name
       FROM architect_3d_submissions s
       LEFT JOIN architect_drawings d ON d.id = s.drawing_id
       LEFT JOIN projects dp ON dp.id = d.project_id
       LEFT JOIN projects p  ON p.id  = s.project_id
       LEFT JOIN users    u  ON u.id  = s.submitted_by
       WHERE s.architect_id = $1
       ORDER BY s.created_at DESC`,
      [architectId]
    );

    res.json(result.rows);
  });
};

/* ─────────────────────────────────────────────
   DELETE DRAWING (Architect — permanent)
   DELETE /api/architect-designs/:drawingId
   Removes the drawing plus everything tied to it
   (revisions, recipients, logs, 3D submissions)
   inside a single transaction.
───────────────────────────────────────────── */
exports.deleteDrawing = async (req, res) => {
  const { drawingId } = req.params;

  if (!drawingId) {
    return res.status(400).json({ error: "drawingId is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id FROM architect_drawings WHERE id = $1`,
      [drawingId]
    );
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Drawing not found." });
    }

    // Clear anything that references this drawing before removing it,
    // so the delete doesn't fail on a foreign-key constraint.
    await client.query(
      `DELETE FROM architect_3d_submissions WHERE drawing_id = $1`,
      [drawingId]
    );
    await client.query(
      `DELETE FROM architect_drawing_logs WHERE drawing_id = $1`,
      [drawingId]
    );
    await client.query(
      `DELETE FROM architect_drawing_recipients WHERE drawing_id = $1`,
      [drawingId]
    );
    await client.query(
      `DELETE FROM architect_drawing_revisions WHERE drawing_id = $1`,
      [drawingId]
    );
    await client.query(
      `DELETE FROM architect_drawings WHERE id = $1`,
      [drawingId]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[DB Error - deleteDrawing]", err.code, err.message);
    if (isConnectionError(err)) {
      return res.status(503).json({
        error: "Database unavailable. Please try again in a moment.",
        code: "DB_UNREACHABLE",
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};