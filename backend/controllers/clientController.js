const pool = require("../config/db");

// ═══════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the project for the logged-in client user.
 * Returns the project row or null.
 */
async function getClientProject(clientUserId) {
  const result = await pool.query(
    `SELECT id, name, start_date, end_date, progress, status, budget, spent,
            location, description, building_type, floors, plot_size
     FROM projects
     WHERE client_user_id = $1
     LIMIT 1`,
    [clientUserId],
  );
  return result.rows[0] || null;
}

/**
 * Map raw WBS status / progress / due_date → frontend display status.
 */
function deriveStatus(status, progress, dueDate) {
  const s = (status || "").toUpperCase();
  if (["DONE", "COMPLETED"].includes(s) || progress === 100) return "done";
  if (dueDate) {
    const deadline = new Date(dueDate);
    if (deadline < new Date() && progress < 100) return "delayed";
  }
  if (progress > 0) return "in_progress";
  return "pending";
}

// ═══════════════════════════════════════════════════════════════════════════
//  MILESTONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/milestones
 * All top-level WBS milestones (visible_to_client = true) with sub-tasks.
 */
const getClientMilestones = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    // Top-level milestones
    const milestonesResult = await pool.query(
      `SELECT id, code, name, status, progress,
              start_date, due_date, budget, spent,
              description, phase, risks
       FROM wbs
       WHERE project_id = $1
         AND parent_id IS NULL
         AND visible_to_client = true
       ORDER BY id ASC`,
      [project.id],
    );

    const milestones = milestonesResult.rows;

    if (milestones.length === 0) {
      return res.status(200).json({
        project,
        milestones: [],
        overview: { total: 0, done: 0, in_progress: 0, delayed: 0, pending: 0 },
      });
    }

    // All sub-tasks in one query
    const milestoneIds = milestones.map((m) => m.id);
    const subtasksResult = await pool.query(
      `SELECT id, parent_id, code, name, status, progress,
              start_date, due_date, assigned_to, description
       FROM wbs
       WHERE project_id = $1
         AND parent_id = ANY($2::int[])
       ORDER BY id ASC`,
      [project.id, milestoneIds],
    );

    // Group sub-tasks by parent
    const subtasksByParent = {};
    for (const task of subtasksResult.rows) {
      if (!subtasksByParent[task.parent_id])
        subtasksByParent[task.parent_id] = [];
      subtasksByParent[task.parent_id].push(task);
    }

    // Enrich milestones
    const enriched = milestones.map((m) => {
      const subtasks = subtasksByParent[m.id] || [];
      return {
        ...m,
        display_status: deriveStatus(m.status, m.progress, m.due_date),
        subtasks,
        subtask_count: subtasks.length,
        subtask_done: subtasks.filter((t) =>
          ["DONE", "COMPLETED", "done", "completed"].includes(t.status),
        ).length,
      };
    });

    const overview = {
      total: enriched.length,
      done: enriched.filter((m) => m.display_status === "done").length,
      in_progress: enriched.filter((m) => m.display_status === "in_progress")
        .length,
      delayed: enriched.filter((m) => m.display_status === "delayed").length,
      pending: enriched.filter((m) => m.display_status === "pending").length,
    };

    return res.status(200).json({ project, milestones: enriched, overview });
  } catch (err) {
    console.error("getClientMilestones:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/client/milestones/:id
 * Single milestone with sub-tasks + daily log count.
 */
const getClientMilestoneById = async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);

    const milestoneResult = await pool.query(
      `SELECT w.*
       FROM wbs w
       JOIN projects p ON p.id = w.project_id
       WHERE w.id = $1
         AND p.client_user_id = $2
         AND w.visible_to_client = true
         AND w.parent_id IS NULL`,
      [milestoneId, req.user.id],
    );

    if (milestoneResult.rows.length === 0)
      return res.status(404).json({ message: "Milestone not found." });

    const milestone = milestoneResult.rows[0];

    const [subtasksResult, logsCountResult] = await Promise.all([
      pool.query(
        `SELECT id, parent_id, code, name, status, progress,
                start_date, due_date, assigned_to, description
         FROM wbs WHERE parent_id = $1 ORDER BY id ASC`,
        [milestoneId],
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM site_engineer_daily_updates WHERE milestone_id = $1`,
        [milestoneId],
      ),
    ]);

    return res.status(200).json({
      milestone: {
        ...milestone,
        display_status: deriveStatus(
          milestone.status,
          milestone.progress,
          milestone.due_date,
        ),
      },
      subtasks: subtasksResult.rows,
      daily_log_count: parseInt(logsCountResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error("getClientMilestoneById:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY LOGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/daily-logs
 * Site engineer daily updates for the client's project.
 * Query params: ?tag=Safety&limit=20&offset=0
 */
const getClientDailyLogs = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const limit = parseInt(req.query.limit || 20, 10);
    const offset = parseInt(req.query.offset || 0, 10);

    const result = await pool.query(
      `SELECT
         s.id,
         s.report_date,
         s.shift,
         s.weather_am,
         s.weather_pm,
         s.temp_c,
         s.work_done,
         s.labour_total,
         s.issues,
         s.next_day,
         s.notes,
         s.delay_type,
         s.delay_description,
         s.attachments,
         s.linked_incident,
         s.linked_rfi,
         w.name  AS milestone_name,
         st.name AS subtask_name,
         u.name  AS submitted_by_name
       FROM site_engineer_daily_updates s
       LEFT JOIN wbs     w  ON w.id = s.milestone_id
       LEFT JOIN wbs     st ON st.id = s.subtask_id
       LEFT JOIN users   u  ON u.email = s.submitted_by
       WHERE s.project_id = $1
       ORDER BY s.report_date DESC, s.id DESC
       LIMIT $2 OFFSET $3`,
      [project.id, limit, offset],
    );

    // Total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM site_engineer_daily_updates WHERE project_id = $1`,
      [project.id],
    );

    return res.status(200).json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error("getClientDailyLogs:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/client/daily-logs/:id
 */
const getClientDailyLogById = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT
         s.*,
         w.name  AS milestone_name,
         st.name AS subtask_name,
         u.name  AS submitted_by_name
       FROM site_engineer_daily_updates s
       LEFT JOIN wbs   w  ON w.id  = s.milestone_id
       LEFT JOIN wbs   st ON st.id = s.subtask_id
       LEFT JOIN users u  ON u.email = s.submitted_by
       WHERE s.id = $1 AND s.project_id = $2`,
      [req.params.id, project.id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Log not found." });

    return res.status(200).json({ log: result.rows[0] });
  } catch (err) {
    console.error("getClientDailyLogById:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  SITE PHOTOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/site-photos
 * Photos from incident_photos + task_photos scoped to the client's project.
 */
const getClientSitePhotos = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    // Incident photos for this project
    const incidentPhotos = await pool.query(
      `SELECT
         ip.id,
         ip.url,
         ip.uploaded_at,
         u.name  AS uploaded_by,
         i.title AS source_title,
         'incident' AS source_type
       FROM incident_photos ip
       JOIN incidents i ON i.id = ip.incident_id
       LEFT JOIN users u ON u.id = ip.uploaded_by
       WHERE i.project_id = $1
         AND i.is_deleted  = false
       ORDER BY ip.uploaded_at DESC`,
      [project.id],
    );

    // Task photos for this project
    const taskPhotos = await pool.query(
      `SELECT
         tp.id,
         tp.url,
         tp.uploaded_at,
         u.name  AS uploaded_by,
         t.title AS source_title,
         'task'  AS source_type
       FROM task_photos tp
       JOIN tasks t ON t.id = tp.task_id
       LEFT JOIN users u ON u.id = tp.uploaded_by
       WHERE t.project_id = $1
         AND t.is_deleted  = false
       ORDER BY tp.uploaded_at DESC`,
      [project.id],
    );

    const photos = [...incidentPhotos.rows, ...taskPhotos.rows].sort(
      (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at),
    );

    return res.status(200).json({ photos, total: photos.length });
  } catch (err) {
    console.error("getClientSitePhotos:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  INVOICES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/invoices
 * BOQs finalised for the client's project act as invoices.
 */
const getClientInvoices = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT
         id,
         milestone_name,
         grand_total      AS amount,
         status,
         finalised_date   AS invoice_date,
         updated_date,
         project_name,
         material_total,
         labour_total
       FROM boqs
       WHERE project_id = $1
       ORDER BY finalised_date DESC NULLS LAST`,
      [project.id],
    );

    const summary = {
      total_billed: result.rows.reduce(
        (s, r) => s + parseFloat(r.amount || 0),
        0,
      ),
      total_paid: project.client_paid || 0,
      total_pending: 0,
    };
    summary.total_pending = summary.total_billed - summary.total_paid;

    return res.status(200).json({ invoices: result.rows, summary });
  } catch (err) {
    console.error("getClientInvoices:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/client/invoices/:id
 */
const getClientInvoiceById = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT * FROM boqs WHERE id = $1 AND project_id = $2`,
      [req.params.id, project.id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Invoice not found." });

    return res.status(200).json({ invoice: result.rows[0] });
  } catch (err) {
    console.error("getClientInvoiceById:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  BOQ & ESTIMATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/boq
 */
const getClientBoq = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT
         b.id,
         b.milestone_name,
         b.rows,
         b.labour_rows,
         b.grand_total,
         b.material_total,
         b.labour_total,
         b.status,
         b.finalised_date,
         b.updated_date
       FROM boqs b
       WHERE b.project_id = $1
       ORDER BY b.id ASC`,
      [project.id],
    );

    return res.status(200).json({ boq: result.rows });
  } catch (err) {
    console.error("getClientBoq:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/payments
 * Derived from projects.client_paid vs boqs grand totals per milestone.
 */
const getClientPayments = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const boqsResult = await pool.query(
      `SELECT id, milestone_name, grand_total, status, finalised_date
       FROM boqs
       WHERE project_id = $1
       ORDER BY finalised_date ASC NULLS LAST`,
      [project.id],
    );

    const totalBilled = boqsResult.rows.reduce(
      (s, r) => s + parseFloat(r.grand_total || 0),
      0,
    );
    const totalPaid = parseFloat(project.client_paid || 0);

    return res.status(200).json({
      schedule: boqsResult.rows,
      total_billed: totalBilled,
      total_paid: totalPaid,
      total_pending: Math.max(0, totalBilled - totalPaid),
      budget: project.budget,
      spent: project.spent,
    });
  } catch (err) {
    console.error("getClientPayments:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/incidents
 */
const getClientIncidents = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT
         i.id, i.incident_no, i.title, i.description,
         i.priority, i.status, i.created_at, i.deadline_at,
         i.resolved_at, i.source,
         u.name AS created_by_name,
         a.name AS assigned_to_name
       FROM incidents i
       LEFT JOIN users u ON u.id = i.created_by
       LEFT JOIN users a ON a.id = i.assigned_to
       WHERE i.project_id = $1
         AND i.is_deleted = false
       ORDER BY i.created_at DESC`,
      [project.id],
    );

    return res
      .status(200)
      .json({ incidents: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("getClientIncidents:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/client/incidents/:id
 */
const getClientIncidentById = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const [incidentResult, commentsResult, photosResult] = await Promise.all([
      pool.query(
        `SELECT i.*, u.name AS created_by_name, a.name AS assigned_to_name
         FROM incidents i
         LEFT JOIN users u ON u.id = i.created_by
         LEFT JOIN users a ON a.id = i.assigned_to
         WHERE i.id = $1 AND i.project_id = $2 AND i.is_deleted = false`,
        [req.params.id, project.id],
      ),
      pool.query(
        `SELECT ic.id, ic.body, ic.created_at, u.name AS author_name
         FROM incident_comments ic
         JOIN users u ON u.id = ic.author_id
         WHERE ic.incident_id = $1
         ORDER BY ic.created_at ASC`,
        [req.params.id],
      ),
      pool.query(
        `SELECT ip.id, ip.url, ip.uploaded_at, u.name AS uploaded_by
         FROM incident_photos ip
         LEFT JOIN users u ON u.id = ip.uploaded_by
         WHERE ip.incident_id = $1
         ORDER BY ip.uploaded_at ASC`,
        [req.params.id],
      ),
    ]);

    if (incidentResult.rows.length === 0)
      return res.status(404).json({ message: "Incident not found." });

    return res.status(200).json({
      incident: incidentResult.rows[0],
      comments: commentsResult.rows,
      photos: photosResult.rows,
    });
  } catch (err) {
    console.error("getClientIncidentById:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * POST /api/client/incidents
 * Client raises a new incident.
 */
const createClientIncident = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const { title, description, priority = "P2", deadline_at } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required." });

    // Generate incident_no
    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM incidents WHERE project_id = $1`,
      [project.id],
    );
    const seq = parseInt(countResult.rows[0].count, 10) + 1;
    const incident_no = `INC-${project.id}-${String(seq).padStart(3, "0")}`;

    const result = await pool.query(
      `INSERT INTO incidents (incident_no, title, description, priority, status, created_by, project_id, deadline_at, source)
       VALUES ($1, $2, $3, $4, 'Created', $5, $6, $7, 'client')
       RETURNING *`,
      [
        incident_no,
        title,
        description,
        priority,
        req.user.id,
        project.id,
        deadline_at || null,
      ],
    );

    return res.status(201).json({ incident: result.rows[0] });
  } catch (err) {
    console.error("createClientIncident:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  RFI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/rfi
 */
const getClientRfis = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT
         r.id, r.rfi_code, r.subject, r.description,
         r.priority, r.status, r.created_at, r.updated_at,
         r.raised_by_name, r.raised_by_role,
         r.assigned_to_role, r.response_required_by,
         r.drawing_ref, r.zone
       FROM rfis r
       WHERE r.project_name = $1
       ORDER BY r.created_at DESC`,
      [project.name],
    );

    return res
      .status(200)
      .json({ rfis: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("getClientRfis:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/client/rfi/:id
 */
const getClientRfiById = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const [rfiResult, responsesResult] = await Promise.all([
      pool.query(`SELECT * FROM rfis WHERE id = $1 AND project_name = $2`, [
        req.params.id,
        project.name,
      ]),
      pool.query(
        `SELECT rr.id, rr.message, rr.responder_name, rr.responder_role,
                rr.file_url, rr.file_name, rr.created_at
         FROM rfi_responses rr
         WHERE rr.rfi_id = $1
         ORDER BY rr.created_at ASC`,
        [req.params.id],
      ),
    ]);

    if (rfiResult.rows.length === 0)
      return res.status(404).json({ message: "RFI not found." });

    return res
      .status(200)
      .json({ rfi: rfiResult.rows[0], responses: responsesResult.rows });
  } catch (err) {
    console.error("getClientRfiById:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * POST /api/client/rfi
 * Client raises a new RFI.
 */
const createClientRfi = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const {
      subject,
      description,
      priority = "Medium",
      response_required_by,
      drawing_ref,
      zone,
    } = req.body;
    if (!subject)
      return res.status(400).json({ message: "Subject is required." });

    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM rfis WHERE project_name = $1`,
      [project.name],
    );
    const seq = parseInt(countResult.rows[0].count, 10) + 1;
    const rfi_code = `RFI-${String(seq).padStart(3, "0")}`;

    const result = await pool.query(
      `INSERT INTO rfis
         (rfi_code, project_name, subject, description, priority, status,
          raised_by_name, raised_by_id, raised_by_role,
          response_required_by, drawing_ref, zone)
       VALUES ($1,$2,$3,$4,$5,'Open',$6,$7,'client',$8,$9,$10)
       RETURNING *`,
      [
        rfi_code,
        project.name,
        subject,
        description,
        priority,
        req.user.name || "Client",
        req.user.id,
        response_required_by || null,
        drawing_ref || null,
        zone || null,
      ],
    );

    return res.status(201).json({ rfi: result.rows[0] });
  } catch (err) {
    console.error("createClientRfi:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED FILES  (drawings issued for coordination / construction)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/client/shared-files
 * Returns drawings that are Issued for Coordination or Construction,
 * joined with the latest version's approval statuses for the client to see.
 */
const getClientSharedFiles = async (req, res) => {
  try {
    const project = await getClientProject(req.user.id);
    if (!project)
      return res
        .status(404)
        .json({ message: "No project found for this client." });

    const result = await pool.query(
      `SELECT
         d.id,
         d.name,
         d.drawing_no,
         d.drawing_number,
         d.discipline,
         d.sub_discipline,
         pf.name                    AS floor_name,
         dv.revision_number         AS current_revision,
         dv.file_url,
         dv.file_size,
         dv.uploaded_at,
         dv.status                  AS display_status,
         -- MEP review
         dv.mep_status,
         um.name                    AS mep_reviewed_by_name,
         dv.mep_reviewed_at,
         -- Arch review
         dv.arch_status,
         ua.name                    AS arch_reviewed_by_name,
         dv.arch_reviewed_at,
         -- Structural review
         dv.str_status,
         us.name                    AS str_reviewed_by_name,
         dv.str_reviewed_at,
         dv.fully_approved_at,
         dv.issued_for_construction_at
       FROM drawings d
       JOIN drawing_versions dv  ON dv.id = d.current_version_id
       JOIN project_floors   pf  ON pf.id = d.floor_id
       LEFT JOIN users       um  ON um.id = dv.mep_reviewed_by
       LEFT JOIN users       ua  ON ua.id = dv.arch_reviewed_by
       LEFT JOIN users       us  ON us.id = dv.str_reviewed_by
       WHERE d.project_id = $1
         AND d.is_deleted  = false
         AND dv.status IN ('Issued for Coordination','Issued for Construction','Approved')
       ORDER BY dv.uploaded_at DESC`,
      [project.id],
    );

    return res
      .status(200)
      .json({ files: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("getClientSharedFiles:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
  // Milestones
  getClientMilestones,
  getClientMilestoneById,

  // Daily logs
  getClientDailyLogs,
  getClientDailyLogById,

  // Site photos
  getClientSitePhotos,

  // Invoices
  getClientInvoices,
  getClientInvoiceById,

  // BOQ
  getClientBoq,

  // Payments
  getClientPayments,

  // Incidents
  getClientIncidents,
  getClientIncidentById,
  createClientIncident,

  // Shared files
  getClientSharedFiles,

  // RFI
  getClientRfis,
  getClientRfiById,
  createClientRfi,
};
