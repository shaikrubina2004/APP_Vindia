const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const { insertMEPNotification } = require("./mepNotificationsController");

/**
 * ✅ Upload a new drawing (creates drawing + first version)
 */
exports.uploadDrawing = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      project_id,
      name,
      discipline,
      sub_discipline,
      drawing_number,
      drawing_type,
      floor_id,
      revision_number,
      title,
      change_notes,
    } = req.body;
    const uploaded_by = req.user?.id;
    // Basic validation
    if (
      !project_id ||
      !name ||
      !discipline ||
      !sub_discipline ||
      !drawing_number ||
      !drawing_type ||
      !floor_id ||
      !revision_number ||
      !title ||
      !uploaded_by
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Drawing file is required" });
    }

    const file_url = `/uploads/drawings/${req.file.filename}`;
    const file_size = (req.file.size / 1024 / 1024).toFixed(1) + " MB";
    const file_type = path
      .extname(req.file.originalname)
      .replace(".", "")
      .toLowerCase();

    await client.query("BEGIN");

    // Insert drawing
    const drawingResult = await client.query(
      `INSERT INTO drawings
        (project_id, name, discipline, sub_discipline, drawing_number,
         drawing_type, floor_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        project_id,
        name,
        discipline,
        sub_discipline,
        drawing_number,
        drawing_type,
        floor_id,
        uploaded_by,
      ],
    );

    const drawing = drawingResult.rows[0];

    // Insert first version
    // Status defaults to 'Issued for Coordination' via DB default
    // Approval columns initialized by trigger fn_on_new_version_insert
    const versionResult = await client.query(
      `INSERT INTO drawing_versions
        (drawing_id, revision_number, title, change_notes,
         file_url, file_size, file_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        drawing.id,
        revision_number,
        title,
        change_notes || null,
        file_url,
        file_size,
        file_type,
        uploaded_by,
      ],
    );

    await client.query("COMMIT");

    // Notify all other MEP engineers about new drawing
    try {
      const projectUsers = await pool.query(
        `SELECT u.id FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.code = 'mep_engineer' AND u.id != $1`,
        [uploaded_by],
      );
      for (const u of projectUsers.rows) {
        await insertMEPNotification(
          u.id,
          "drawing",
          `New Drawing Uploaded — ${name}`,
          `${sub_discipline} drawing ${drawing_number} uploaded.`,
          "info",
          drawing.id,
        );
      }
    } catch (notifErr) {
      console.error("Notify error (non-fatal):", notifErr.message);
    }

    res.status(201).json({
      drawing: drawing,
      version: versionResult.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("🔥 UPLOAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * ✅ Upload a new version of an existing drawing
 */
exports.uploadNewVersion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { drawing_id } = req.params;
    const { revision_number, title, change_notes } = req.body;
    const uploaded_by = req.user?.id;

    if (!revision_number || !title || !uploaded_by) {
      return res
        .status(400)
        .json({ error: "revision_number, title and uploaded_by are required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Drawing file is required" });
    }

    // Check drawing exists
    const drawingCheck = await client.query(
      `SELECT id FROM drawings WHERE id = $1 AND is_deleted = FALSE`,
      [drawing_id],
    );
    if (drawingCheck.rows.length === 0) {
      return res.status(404).json({ error: "Drawing not found" });
    }

    const file_url = `/uploads/drawings/${req.file.filename}`;
    const file_size = (req.file.size / 1024 / 1024).toFixed(1) + " MB";
    const file_type = path
      .extname(req.file.originalname)
      .replace(".", "")
      .toLowerCase();

    await client.query("BEGIN");

    // Insert new version
    // Trigger fn_on_new_version_insert will:
    // - supersede previous latest version
    // - update drawings.current_version_id
    // - initialize approval columns based on discipline
    const versionResult = await client.query(
      `INSERT INTO drawing_versions
        (drawing_id, revision_number, title, change_notes,
         file_url, file_size, file_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        drawing_id,
        revision_number,
        title,
        change_notes || null,
        file_url,
        file_size,
        file_type,
        uploaded_by,
      ],
    );

    await client.query("COMMIT");

    res.status(201).json(versionResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("🔥 NEW VERSION ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * ✅ Get all drawings for a project (uses v_drawing_register view)
 */
exports.getDrawingsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM v_drawing_register
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [project_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH DRAWINGS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get all versions of a drawing
 */
exports.getVersionsByDrawing = async (req, res) => {
  try {
    const { drawing_id } = req.params;

    const result = await pool.query(
      `SELECT
         dv.*,
         u.name AS uploaded_by_name
       FROM drawing_versions dv
       LEFT JOIN users u ON u.id = dv.uploaded_by
       WHERE dv.drawing_id = $1
       ORDER BY dv.uploaded_at DESC`,
      [drawing_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH VERSIONS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Approve a drawing version
 * role must be: 'mep' | 'arch' | 'str'
 * Trigger fn_on_approval_update handles auto-finalize
 */
exports.approveDrawing = async (req, res) => {
  try {
    const { version_id } = req.params;
    const { role, user_id, status, comments } = req.body;
    // status must be: 'Approved' | 'Approved with Comments' | 'Rejected'

    if (!role || !user_id || !status) {
      return res
        .status(400)
        .json({ error: "role, user_id and status are required" });
    }

    const allowedRoles = ["mep", "arch", "str"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "role must be mep, arch or str" });
    }

    const allowedStatuses = ["Approved", "Approved with Comments", "Rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const statusCol = `${role}_status`;
    const reviewedByCol = `${role}_reviewed_by`;
    const commentsCol = `${role}_comments`;

    const result = await pool.query(
      `UPDATE drawing_versions
       SET
         ${statusCol}     = $1,
         ${reviewedByCol} = $2,
         ${commentsCol}   = $3
       WHERE id = $4
       RETURNING *`,
      [status, user_id, comments || null, version_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Notify drawing uploader about approval (non-fatal)
    try {
      const versionOwner = await pool.query(
        `SELECT dv.uploaded_by, d.name FROM drawing_versions dv
         JOIN drawings d ON d.id = dv.drawing_id
         WHERE dv.id = $1`,
        [version_id],
      );
      const owner = versionOwner.rows[0];
      if (owner?.uploaded_by) {
        await insertMEPNotification(
          owner.uploaded_by,
          "approval",
          `Drawing ${status} — ${owner.name}`,
          `Your drawing was ${status.toLowerCase()} by the ${role.toUpperCase()} team.`,
          status === "Approved" ? "ok" : "warn",
          version_id,
        );
      }
    } catch (notifErr) {
      console.error("Approval notify error (non-fatal):", notifErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 APPROVE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Issue for Construction
 * Only Architect (role = 'arch') can call this
 * Drawing must be in 'Approved' status
 */
exports.issueForConstruction = async (req, res) => {
  try {
    const { version_id } = req.params;
    const { user_id, role } = req.body;

    if (role !== "arch") {
      return res
        .status(403)
        .json({ error: "Only Architect can issue drawings for construction" });
    }

    // Check current status
    const check = await pool.query(
      `SELECT status FROM drawing_versions WHERE id = $1`,
      [version_id],
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    if (check.rows[0].status !== "Approved") {
      return res.status(400).json({
        error: "Drawing must be Approved before issuing for construction",
      });
    }

    const result = await pool.query(
      `UPDATE drawing_versions
       SET
         status                      = 'Issued for Construction',
         issued_for_construction_at  = NOW(),
         issued_by_user_id           = $1
       WHERE id = $2
       RETURNING *`,
      [user_id, version_id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 ISSUE FOR CONSTRUCTION ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Flag a clash on a drawing
 * Creates a drawing_clash record
 * Backend should also create a linked incident (add that logic here)
 */
exports.flagClash = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      drawing_id_1,
      drawing_id_2,
      version_id_1,
      version_id_2,
      clash_type,
      description,
      location,
      priority,
      raised_by,
    } = req.body;

    const raised_by_id = req.user?.id;

    if (
      !drawing_id_1 ||
      !drawing_id_2 ||
      !clash_type ||
      !description ||
      !raised_by_id
    ) {
      return res.status(400).json({
        error:
          "drawing_id_1, drawing_id_2, clash_type, description and raised_by are required",
      });
    }

    if (drawing_id_1 === drawing_id_2) {
      return res
        .status(400)
        .json({ error: "Cannot flag a clash between the same drawing" });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO drawing_clashes
        (drawing_id_1, drawing_id_2, version_id_1, version_id_2,
         clash_type, description, location, priority, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        drawing_id_1,
        drawing_id_2,
        version_id_1 || null,
        version_id_2 || null,
        clash_type,
        description,
        location || null,
        priority || "P2",
        raised_by_id,
      ],
    );

    // Auto-create incident for this clash
    const clash = result.rows[0];

    // Get drawing owner (assigned_to) from drawing_id_2 (the drawing being clashed against)
    const drawingOwner = await client.query(
      `SELECT created_by FROM drawings WHERE id = $1`,
      [drawing_id_1],
    );
    const assigned_to = drawingOwner.rows[0]?.created_by || null;

    // Get drawing names for incident title
    const drawingNames = await client.query(
      `SELECT d1.name AS name1, d2.name AS name2
       FROM drawings d1, drawings d2
       WHERE d1.id = $1 AND d2.id = $2`,
      [drawing_id_1, drawing_id_2],
    );
    const name1 = drawingNames.rows[0]?.name1 || "Drawing 1";
    const name2 = drawingNames.rows[0]?.name2 || "Drawing 2";

    const incidentResult = await client.query(
      `INSERT INTO incidents
        (title, description, priority, status,
         created_by, assigned_to)
       VALUES ($1, $2, 'P2', 'Created', $3, $4)
       RETURNING id`,
      [
        `Clash: ${name1} vs ${name2}`,
        `${clash_type} — ${description}. Clash flagged on drawing "${name1}" conflicting with "${name2}".`,
        raised_by_id,
        assigned_to,
      ],
    );

    // Link incident back to clash
    if (incidentResult.rows.length > 0) {
      await client.query(
        `UPDATE drawing_clashes SET incident_id = $1 WHERE id = $2`,
        [incidentResult.rows[0].id, clash.id],
      );
    }

    await client.query("COMMIT");

    // Notify drawing owner about the clash (non-fatal)
    try {
      const drawingCreator = await pool.query(
        `SELECT created_by FROM drawings WHERE id = $1`,
        [drawing_id_1],
      );
      const ownerId = drawingCreator.rows[0]?.created_by;
      if (ownerId && ownerId !== raised_by_id) {
        await insertMEPNotification(
          ownerId,
          "clash",
          `Clash Flagged on Your Drawing`,
          `${clash_type} — ${description}`,
          "warn",
          clash.id,
        );
      }
    } catch (notifErr) {
      console.error("Clash notify error (non-fatal):", notifErr.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("🔥 FLAG CLASH ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * ✅ Get floors for a project (for the upload form floor dropdown)
 */
exports.getFloorsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const result = await pool.query(
      `SELECT id, name, level_no
       FROM project_floors
       WHERE project_id = $1 AND is_active = TRUE
       ORDER BY level_no ASC`,
      [project_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH FLOORS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Soft delete a drawing
 */
/**
 * ✅ Get all clashes for a drawing (both as drawing_1 and drawing_2)
 */
exports.getClashesByDrawing = async (req, res) => {
  try {
    const { drawing_id } = req.params;

    const result = await pool.query(
      `SELECT
         c.id,
         c.clash_no,
         c.clash_type,
         c.description,
         c.location,
         c.priority,
         c.status,
         c.created_at,
         c.resolved_at,
         c.version_id_1,
         c.version_id_2,
         c.incident_id,
         d1.id   AS drawing_1_id,
         d1.name AS drawing_1_name,
         d2.id   AS drawing_2_id,
         d2.name AS drawing_2_name,
       u.name  AS raised_by_name,
         u.id    AS raised_by_id
       FROM drawing_clashes c
       JOIN drawings d1 ON d1.id = c.drawing_id_1
       JOIN drawings d2 ON d2.id = c.drawing_id_2
       JOIN users    u  ON u.id  = c.raised_by
       WHERE (c.drawing_id_1 = $1 OR c.drawing_id_2 = $1)
         AND c.is_deleted = FALSE
       ORDER BY c.created_at DESC`,
      [drawing_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH CLASHES ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.resolveClash = async (req, res) => {
  try {
    const { clash_id } = req.params;
    const resolved_by = req.user?.id;

    const result = await pool.query(
      `UPDATE drawing_clashes
       SET status = 'Resolved', resolved_by = $1, resolved_at = NOW()
       WHERE id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [resolved_by, clash_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Clash not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 RESOLVE CLASH ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDrawing = async (req, res) => {
  try {
    const { drawing_id } = req.params;

    const result = await pool.query(
      `UPDATE drawings
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE
       RETURNING id`,
      [drawing_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Drawing not found" });
    }

    res.json({ message: "Drawing deleted successfully" });
  } catch (err) {
    console.error("🔥 DELETE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Create or update a daily log (upsert)
 */
exports.upsertDailyLog = async (req, res) => {
  const client = await pool.connect();
  try {
    const submitted_by = req.user?.id;
    const {
      project_id,
      floor_id,
      discipline,
      log_date,
      shift,
      workers_deployed,
      materials_used,
      activities,
      blockers,
      plan_tomorrow,
      completion_pct,
      coord_checked,
      structural_checked,
      drawing_checked,
      incident_checked,
      photos_uploaded,
      status,
    } = req.body;

    if (!project_id || !floor_id || !discipline || !log_date || !activities) {
      return res.status(400).json({
        error:
          "project_id, floor_id, discipline, log_date and activities are required",
      });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, status FROM daily_logs
       WHERE project_id = $1 AND floor_id = $2 AND discipline = $3 AND log_date = $4`,
      [project_id, floor_id, discipline, log_date],
    );

    let result;

    if (existing.rows.length > 0) {
      if (existing.rows[0].status === "Verified") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Cannot edit a Verified log" });
      }

      result = await client.query(
        `UPDATE daily_logs SET
          shift = $1, workers_deployed = $2, materials_used = $3,
          activities = $4, blockers = $5, plan_tomorrow = $6,
          completion_pct = $7,
          coord_checked = $8, structural_checked = $9, drawing_checked = $10,
          incident_checked = $11, photos_uploaded = $12,
          status = $13, updated_at = NOW()
         WHERE project_id = $14 AND floor_id = $15 AND discipline = $16 AND log_date = $17
         RETURNING *`,
        [
          shift || "Day",
          workers_deployed || 0,
          materials_used || null,
          activities,
          blockers || null,
          plan_tomorrow || null,
          completion_pct || 0,
          coord_checked || false,
          structural_checked || false,
          drawing_checked || false,
          incident_checked || false,
          photos_uploaded || false,
          status || "Draft",
          project_id,
          floor_id,
          discipline,
          log_date,
        ],
      );
    } else {
      result = await client.query(
        `INSERT INTO daily_logs
          (project_id, floor_id, discipline, log_date,
           shift, workers_deployed, materials_used,
           activities, blockers, plan_tomorrow,
           completion_pct,
           coord_checked, structural_checked, drawing_checked,
           incident_checked, photos_uploaded,
           submitted_by, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING *`,
        [
          project_id,
          floor_id,
          discipline,
          log_date,
          shift || "Day",
          workers_deployed || 0,
          materials_used || null,
          activities,
          blockers || null,
          plan_tomorrow || null,
          completion_pct || 0,
          coord_checked || false,
          structural_checked || false,
          drawing_checked || false,
          incident_checked || false,
          photos_uploaded || false,
          submitted_by,
          status || "Draft",
        ],
      );
    }

    await client.query("COMMIT");
    res.status(200).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("🔥 DAILY LOG UPSERT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * ✅ Get logs for a project
 */
exports.getDailyLogsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;
    const limit = req.query.limit || 10;

    const result = await pool.query(
      `SELECT dl.*, pf.name AS floor_name, u.name AS submitted_by_name
       FROM daily_logs dl
       LEFT JOIN project_floors pf ON pf.id = dl.floor_id
       LEFT JOIN users u ON u.id = dl.submitted_by
       WHERE dl.project_id = $1
       ORDER BY dl.log_date DESC, dl.created_at DESC
       LIMIT $2`,
      [project_id, limit],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH DAILY LOGS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Check if today's log exists
 */

/* ══════════════════════════════════════
   COORDINATION THREADS
══════════════════════════════════════ */

/**
 * ✅ Get all threads for a project
 */
exports.getThreadsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM v_coord_threads WHERE project_id = $1`,
      [project_id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH THREADS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get single thread with messages
 */
exports.getThreadById = async (req, res) => {
  try {
    const { thread_id } = req.params;

    const threadResult = await pool.query(
      `SELECT * FROM v_coord_threads WHERE id = $1`,
      [thread_id],
    );
    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const messagesResult = await pool.query(
      `SELECT cm.*, u.name AS author_name
       FROM coord_messages cm
       JOIN users u ON u.id = cm.author_id
       WHERE cm.thread_id = $1
       ORDER BY cm.created_at ASC`,
      [thread_id],
    );

    res.json({
      ...threadResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (err) {
    console.error("🔥 FETCH THREAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Create a new thread
 */
exports.createThread = async (req, res) => {
  const client = await pool.connect();
  try {
    const created_by = req.user?.id;
    const {
      project_id,
      title,
      discipline,
      priority,
      drawing_id,
      clash_id,
      opening_note,
      participants, // array of { role, user_id }
    } = req.body;

    if (!project_id || !title || !participants?.length) {
      return res
        .status(400)
        .json({ error: "project_id, title and participants are required" });
    }

    await client.query("BEGIN");

    const threadResult = await client.query(
      `INSERT INTO coord_threads
        (project_id, title, discipline, priority, drawing_id, clash_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        project_id,
        title,
        discipline || null,
        priority || "Medium",
        drawing_id || null,
        clash_id || null,
        created_by,
      ],
    );

    const thread = threadResult.rows[0];

    // Insert participants — each has role + specific user_id
    for (const p of participants) {
      await client.query(
        `INSERT INTO coord_thread_participants (thread_id, role, user_id)
         VALUES ($1,$2,$3)`,
        [thread.id, p.role, p.user_id || null],
      );
    }

    // Insert opening message if provided
    if (opening_note?.trim()) {
      await client.query(
        `INSERT INTO coord_messages (thread_id, author_id, body, is_decision)
         VALUES ($1,$2,$3,false)`,
        [thread.id, created_by, opening_note.trim()],
      );
    }

    await client.query("COMMIT");

    res.status(201).json(thread);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("🔥 CREATE THREAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * ✅ Add a message to a thread
 */
exports.addMessage = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const author_id = req.user?.id;
    const { body, is_decision } = req.body;

    if (!body?.trim()) {
      return res.status(400).json({ error: "Message body is required" });
    }

    const result = await pool.query(
      `INSERT INTO coord_messages (thread_id, author_id, body, is_decision)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [thread_id, author_id, body.trim(), is_decision || false],
    );

    // bump thread updated_at
    await pool.query(
      `UPDATE coord_threads SET updated_at = NOW() WHERE id = $1`,
      [thread_id],
    );

    // fetch author name
    const userResult = await pool.query(
      `SELECT name FROM users WHERE id = $1`,
      [author_id],
    );

    res.status(201).json({
      ...result.rows[0],
      author_name: userResult.rows[0]?.name || "Unknown",
    });
  } catch (err) {
    console.error("🔥 ADD MESSAGE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Resolve a thread
 */
exports.resolveThread = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { resolution } = req.body;

    if (!resolution?.trim()) {
      return res.status(400).json({ error: "Resolution text is required" });
    }

    const result = await pool.query(
      `UPDATE coord_threads
       SET status = 'resolved', resolution = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [resolution.trim(), thread_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 RESOLVE THREAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Current user agrees to close the thread
 * Trigger auto-resolves when all participants have agreed
 */
exports.agreeToClose = async (req, res) => {
  const client = await pool.connect();
  try {
    const { thread_id } = req.params;
    const user_id = req.user?.id;

    // Check user is a participant
    const check = await client.query(
      `SELECT id FROM coord_thread_participants
       WHERE thread_id = $1 AND user_id = $2`,
      [thread_id, user_id],
    );

    if (check.rows.length === 0) {
      return res.status(403).json({
        error: "You are not a participant in this thread",
      });
    }

    // Insert agreement (ignore if already agreed — unique constraint)
    await client.query(
      `INSERT INTO coord_thread_agreements (thread_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (thread_id, user_id) DO NOTHING`,
      [thread_id, user_id],
    );

    // Return updated thread state
    const result = await client.query(
      `SELECT
         ct.status,
         (SELECT COUNT(*) FROM coord_thread_agreements WHERE thread_id = $1) AS agreement_count,
         (SELECT COUNT(*) FROM coord_thread_participants WHERE thread_id = $1) AS participant_count
       FROM coord_threads ct WHERE ct.id = $1`,
      [thread_id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 AGREE TO CLOSE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * ✅ Get project members filtered by role
 * Used to populate the user picker in NewThreadForm
 */
exports.getProjectMembersByRole = async (req, res) => {
  try {
    const { role } = req.query; // e.g. ?role=architect

    // Map frontend role keys → roles.code in your DB
    const ROLE_DB_MAP = {
      architect: "architect",
      structural_engineer: "structural_engineer",
      project_coordinator: "project_coordinator",
      quantity_surveyor: "quantity_surveyor",
      site_engineer: "site_engineer",
      mep_engineer: "mep_engineer",
    };

    const dbRoleCode = ROLE_DB_MAP[role];

    let result;
    if (dbRoleCode) {
      result = await pool.query(
        `SELECT u.id, u.name, u.email, r.name AS role_name, r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.code = $1
         ORDER BY u.name ASC`,
        [dbRoleCode],
      );
    } else {
      result = await pool.query(
        `SELECT u.id, u.name, u.email, r.name AS role_name, r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         ORDER BY u.name ASC`,
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH PROJECT MEMBERS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Get latest open clash for a drawing
 * Used to auto-fill clash field in NewThreadForm
 */
exports.getLatestClashForDrawing = async (req, res) => {
  try {
    const { drawing_id } = req.params;

    const result = await pool.query(
      `SELECT
         c.id,
         c.clash_no,
         c.clash_type,
         c.description,
         c.priority,
         c.status,
         c.created_at,
         d1.name AS drawing_1_name,
         d2.name AS drawing_2_name
       FROM drawing_clashes c
       JOIN drawings d1 ON d1.id = c.drawing_id_1
       JOIN drawings d2 ON d2.id = c.drawing_id_2
       WHERE (c.drawing_id_1 = $1 OR c.drawing_id_2 = $1)
         AND c.status = 'Open'
         AND c.is_deleted = FALSE
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [drawing_id],
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("🔥 FETCH LATEST CLASH ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.checkTodayLog = async (req, res) => {
  try {
    const { project_id, floor_id, discipline } = req.query;
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT id, status, completion_pct FROM daily_logs
       WHERE project_id = $1 AND floor_id = $2 AND discipline = $3 AND log_date = $4`,
      [project_id, floor_id, discipline, today],
    );

    res.json({ exists: result.rows.length > 0, log: result.rows[0] || null });
  } catch (err) {
    console.error("🔥 CHECK TODAY LOG ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};
