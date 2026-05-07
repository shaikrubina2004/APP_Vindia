const pool = require("../config/db");

/* ─────────────────────────────────────────────
   DB HELPER — wraps pool.query with timeout
   and consistent error handling
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
  const timer = setTimeout(() => {}, DB_TIMEOUT_MS); // keeps process alive briefly
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
───────────────────────────────────────────── */
exports.getDrawings = async (req, res) => {
  await withDb(res, async () => {
    const { userId, role } = req.query;

    let result;

    if (role === "architect") {
      result = await pool.query(`
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
        GROUP BY d.id, p.name, r.file_url, r.file_name
        ORDER BY d.created_at DESC
      `);

    } else if (role === "quantity_surveyor" || role === "project_coordinator") {
      const roleLabel =
        role === "quantity_surveyor" ? "Quantity Surveyor" : "Program Coordinator";

      result = await pool.query(`
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
        JOIN architect_drawing_recipients rq
          ON rq.drawing_id = d.id AND rq.role = $1
        LEFT JOIN architect_drawing_recipients rec ON rec.drawing_id = d.id
        GROUP BY d.id, p.name, r.file_url, r.file_name
        ORDER BY d.created_at DESC
      `, [roleLabel]);

    } else {
      result = await pool.query(`
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
        JOIN architect_drawing_recipients rq
          ON rq.drawing_id = d.id AND rq.user_id = $1
        LEFT JOIN architect_drawing_recipients rec ON rec.drawing_id = d.id
        GROUP BY d.id, p.name, r.file_url, r.file_name
        ORDER BY d.created_at DESC
      `, [userId]);
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

    const existing = await pool.query(
      `SELECT id FROM architect_drawing_recipients
       WHERE drawing_id = $1 AND role = $2
       ${user_id ? "AND user_id = $3" : "AND user_id IS NULL"}`,
      user_id ? [drawingId, role, user_id] : [drawingId, role]
    );

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
   GET REQUESTS
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