const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

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
    const { revision_number, title, change_notes, uploaded_by } = req.body;

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

    // TODO: Create linked incident here and write incident_id back
    // const incident = await createIncident(...)
    // await client.query(
    //   `UPDATE drawing_clashes SET incident_id = $1 WHERE id = $2`,
    //   [incident.id, result.rows[0].id]
    // );

    await client.query("COMMIT");

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
         d1.id   AS drawing_1_id,
         d1.name AS drawing_1_name,
         d2.id   AS drawing_2_id,
         d2.name AS drawing_2_name,
         u.name  AS raised_by_name
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
