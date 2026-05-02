const pool = require("../config/db");

/* ─────────────────────────────────────────────
   CREATE DRAWING
───────────────────────────────────────────── */
exports.createDrawing = async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   GET DRAWINGS (ROLE BASED)
   Returns drawings with project_name, file info,
   and a recipients JSON array for sentTo badges.
───────────────────────────────────────────── */
exports.getDrawings = async (req, res) => {
  try {
    const { userId, role } = req.query;

    let result;

    if (role === "architect") {
      // Architect sees ALL drawings with latest revision file info
      result = await pool.query(`
        SELECT
          d.*,
          p.name AS project_name,
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
    } else {
      // All other roles: only drawings that have been sent to them
      result = await pool.query(`
        SELECT
          d.*,
          p.name AS project_name,
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
        JOIN architect_drawing_recipients rec ON rec.drawing_id = d.id AND rec.user_id = $1
        LEFT JOIN architect_drawing_recipients rec2 ON rec2.drawing_id = d.id
        GROUP BY d.id, p.name, r.file_url, r.file_name
        ORDER BY d.created_at DESC
      `, [userId]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   SEND DRAWING
───────────────────────────────────────────── */
exports.sendDrawing = async (req, res) => {
  try {
    const { drawingId } = req.params;
    const { user_id, role, sent_by } = req.body;

    // user_id may be null for QS/PC (role-wide, not user-specific)
    await pool.query(
      `INSERT INTO architect_drawing_recipients (drawing_id, user_id, role)
       VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [drawingId, user_id || null, role]
    );

    await pool.query(
      `INSERT INTO architect_drawing_logs (drawing_id, action, stage, performed_by)
       VALUES ($1,'SENT',$2,$3)`,
      [drawingId, role, sent_by]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   REQUEST DRAWING
───────────────────────────────────────────── */
exports.requestDrawing = async (req, res) => {
  try {
    const { project_id, requested_by, role, description, due_date } = req.body;

    await pool.query(
      `INSERT INTO architect_drawing_requests
       (project_id, requested_by, role, description, due_date)
       VALUES ($1,$2,$3,$4,$5)`,
      [project_id, requested_by, role, description, due_date]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   GET REQUESTS (with project name)
───────────────────────────────────────────── */
exports.getRequests = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT req.*, p.name AS project_name
      FROM architect_drawing_requests req
      LEFT JOIN projects p ON p.id = req.project_id
      ORDER BY req.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};