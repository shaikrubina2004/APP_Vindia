const pool = require("../config/db");
const { ensureClientTables } = require("../utils/clientTables");

/* ═══════════════════════════════════════════════════════════════════════════
   CLIENT PORTAL API

   Rules this file enforces (each one fixes a defect found in the audit):
   - A client only ever sees THEIR project. Several projects: ?project_id= is checked
     against ownership; otherwise the most recent active one (deterministic).
   - Money = FINALISED BOQs only. Draft/under-review estimates (pending_pm, pending_se)
     are internal and were previously billed to the client.
   - "Paid" comes from projects.client_paid (it was never selected, so it was always 0),
     allocated oldest-invoice-first.
   - Internal data never leaves: project spend, WBS budget/risks/assignees, BOQ notes,
     labour wage rates, site-engineer notes/issues, internal incident photos.
   - Dates leave as plain YYYY-MM-DD strings (no timezone drift).
   ═══════════════════════════════════════════════════════════════════════════ */

// ── small helpers ───────────────────────────────────────────────────────────
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v) => Math.round(num(v) * 100) / 100;
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const clampInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : def;
};
// DATE/TIMESTAMP column -> 'YYYY-MM-DD'
const D = (col, alias) => `to_char(${col}::date, 'YYYY-MM-DD') AS ${alias || col.split(".").pop()}`;
const fail = (res, status, message) => res.status(status).json({ message });
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const parseJsonArray = (v) => {
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

// ── project resolution ──────────────────────────────────────────────────────
const PROJECT_SELECT = `
  SELECT p.id, p.name, ${D("p.start_date")}, ${D("p.end_date")}, p.progress, p.status,
         p.budget, p.client_paid, p.location, p.description, p.building_type,
         p.floors, p.plot_size,
         p.manager_id, p.coordinator_id, p.site_engineer_id, p.architect_id
    FROM projects p`;

async function resolveProject(req) {
  const requested = toInt(req.query.project_id ?? req.body?.project_id);
  if (req.user.role === "client") {
    const r = await pool.query(
      `${PROJECT_SELECT}
        WHERE p.client_user_id = $1 AND ($2::int IS NULL OR p.id = $2)
        ORDER BY (LOWER(COALESCE(p.status,'')) IN ('completed','closed','cancelled')) ASC,
                 p.created_at DESC, p.id DESC
        LIMIT 1`,
      [req.user.id, requested]
    );
    if (r.rows[0] || requested === null) return r.rows[0] || null;
    // A remembered project id from another account/browser session: fall back to the default.
    const fallback = await pool.query(
      `${PROJECT_SELECT}
        WHERE p.client_user_id = $1
        ORDER BY (LOWER(COALESCE(p.status,'')) IN ('completed','closed','cancelled')) ASC,
                 p.created_at DESC, p.id DESC
        LIMIT 1`,
      [req.user.id]
    );
    return fallback.rows[0] || null;
  }
  // CEO preview of the portal: an explicit project, else the newest one.
  const r = await pool.query(
    `${PROJECT_SELECT}
      WHERE ($1::int IS NULL OR p.id = $1)
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 1`,
    [requested]
  );
  return r.rows[0] || null;
}

// What the client is allowed to see about the project (no staff ids, no `spent`).
const publicProject = (p) => ({
  id: p.id,
  name: p.name,
  start_date: p.start_date,
  end_date: p.end_date,
  progress: num(p.progress),
  status: p.status,
  budget: num(p.budget),
  client_paid: num(p.client_paid),
  location: p.location,
  description: p.description,
  building_type: p.building_type,
  floors: p.floors,
  plot_size: p.plot_size,
});

const withProject = (tag, fn) => async (req, res) => {
  try {
    const project = await resolveProject(req);
    if (!project) return fail(res, 404, "No project found for this client.");
    return await fn(req, res, project);
  } catch (err) {
    console.error(`${tag}:`, err);
    return fail(res, 500, "Internal server error.");
  }
};

// GET /api/client/projects — the client's own projects (for the project switcher)
const getClientProjects = async (req, res) => {
  try {
    const r =
      req.user.role === "client"
        ? await pool.query(
            `SELECT id, name, status FROM projects WHERE client_user_id = $1 ORDER BY created_at DESC, id DESC`,
            [req.user.id]
          )
        : await pool.query(`SELECT id, name, status FROM projects ORDER BY created_at DESC, id DESC LIMIT 100`);
    return res.status(200).json({ projects: r.rows });
  } catch (err) {
    console.error("getClientProjects:", err);
    return fail(res, 500, "Internal server error.");
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  MILESTONES
// ═══════════════════════════════════════════════════════════════════════════
function deriveStatus(status, progress, dueDate) {
  const s = String(status || "").toUpperCase();
  const p = num(progress);
  if (["DONE", "COMPLETED"].includes(s) || p >= 100) return "done";
  // A milestone due today is not late until the day has passed.
  if (dueDate && p < 100 && dueDate < todayStr()) return "delayed";
  if (p > 0) return "in_progress";
  return "pending";
}

const MILESTONE_COLS = `id, code, name, status, progress, ${D("start_date")}, ${D("due_date")}, description, phase`;
const SUBTASK_COLS = `id, parent_id, code, name, status, progress, ${D("start_date")}, ${D("due_date")}, description`;

const getClientMilestones = withProject("getClientMilestones", async (req, res, project) => {
  const ms = await pool.query(
    `SELECT ${MILESTONE_COLS} FROM wbs
      WHERE project_id = $1 AND parent_id IS NULL AND visible_to_client = true
      ORDER BY id ASC`,
    [project.id]
  );
  const milestones = ms.rows;
  const empty = { total: 0, done: 0, in_progress: 0, delayed: 0, pending: 0 };
  if (!milestones.length) {
    return res.status(200).json({ project: publicProject(project), milestones: [], overview: empty });
  }

  const subs = await pool.query(
    `SELECT ${SUBTASK_COLS} FROM wbs
      WHERE project_id = $1 AND parent_id = ANY($2::int[])
      ORDER BY id ASC`,
    [project.id, milestones.map((m) => m.id)]
  );
  const byParent = {};
  for (const t of subs.rows) (byParent[t.parent_id] = byParent[t.parent_id] || []).push(t);

  const isDone = (t) => ["DONE", "COMPLETED"].includes(String(t.status || "").toUpperCase());
  const enriched = milestones.map((m) => {
    const subtasks = byParent[m.id] || [];
    return {
      ...m,
      progress: num(m.progress),
      display_status: deriveStatus(m.status, m.progress, m.due_date),
      subtasks,
      subtask_count: subtasks.length,
      subtask_done: subtasks.filter(isDone).length,
    };
  });
  const count = (k) => enriched.filter((m) => m.display_status === k).length;
  return res.status(200).json({
    project: publicProject(project),
    milestones: enriched,
    overview: { total: enriched.length, done: count("done"), in_progress: count("in_progress"), delayed: count("delayed"), pending: count("pending") },
  });
});

const getClientMilestoneById = withProject("getClientMilestoneById", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid milestone id.");

  const m = await pool.query(
    `SELECT ${MILESTONE_COLS} FROM wbs
      WHERE id = $1 AND project_id = $2 AND parent_id IS NULL AND visible_to_client = true`,
    [id, project.id]
  );
  if (!m.rows.length) return fail(res, 404, "Milestone not found.");

  const [subs, logs] = await Promise.all([
    pool.query(`SELECT ${SUBTASK_COLS} FROM wbs WHERE parent_id = $1 ORDER BY id ASC`, [id]),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM site_engineer_daily_updates WHERE milestone_id = $1 AND project_id = $2`,
      [id, project.id]
    ),
  ]);
  const milestone = m.rows[0];
  return res.status(200).json({
    milestone: { ...milestone, progress: num(milestone.progress), display_status: deriveStatus(milestone.status, milestone.progress, milestone.due_date) },
    subtasks: subs.rows,
    daily_log_count: logs.rows[0].count,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY LOGS  (site engineer reports; internal notes/issues/links are NOT shared)
// ═══════════════════════════════════════════════════════════════════════════
const LOG_COLS = `
  s.id, ${D("s.report_date")}, s.shift, s.weather_am, s.weather_pm, s.temp_c,
  s.work_done, s.labour_total, s.next_day, s.delay_type, s.delay_description, s.attachments,
  w.name  AS milestone_name,
  st.name AS subtask_name,
  (SELECT u.name FROM users u WHERE u.email = s.submitted_by LIMIT 1) AS submitted_by_name`;

const getClientDailyLogs = withProject("getClientDailyLogs", async (req, res, project) => {
  const limit = clampInt(req.query.limit, 20, 1, 100);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${LOG_COLS}
         FROM site_engineer_daily_updates s
         LEFT JOIN wbs w  ON w.id  = s.milestone_id
         LEFT JOIN wbs st ON st.id = s.subtask_id
        WHERE s.project_id = $1
        ORDER BY s.report_date DESC, s.id DESC
        LIMIT $2 OFFSET $3`,
      [project.id, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS count FROM site_engineer_daily_updates WHERE project_id = $1`, [project.id]),
  ]);
  return res.status(200).json({ logs: rows.rows, total: count.rows[0].count, limit, offset });
});

const getClientDailyLogById = withProject("getClientDailyLogById", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid log id.");
  const r = await pool.query(
    `SELECT ${LOG_COLS}
       FROM site_engineer_daily_updates s
       LEFT JOIN wbs w  ON w.id  = s.milestone_id
       LEFT JOIN wbs st ON st.id = s.subtask_id
      WHERE s.id = $1 AND s.project_id = $2`,
    [id, project.id]
  );
  if (!r.rows.length) return fail(res, 404, "Log not found.");
  return res.status(200).json({ log: r.rows[0] });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SITE PHOTOS  (progress photos + photos on incidents the CLIENT raised)
// ═══════════════════════════════════════════════════════════════════════════
const getClientSitePhotos = withProject("getClientSitePhotos", async (req, res, project) => {
  const limit = clampInt(req.query.limit, 24, 1, 60);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);

  const union = `
    SELECT 'task-' || tp.id AS photo_key, tp.id, tp.url, tp.uploaded_at,
           u.name AS uploaded_by, t.title AS source_title, 'task' AS source_type
      FROM task_photos tp
      JOIN tasks t ON t.id = tp.task_id
      LEFT JOIN users u ON u.id = tp.uploaded_by
     WHERE t.project_id = $1 AND t.is_deleted = false
    UNION ALL
    SELECT 'incident-' || ip.id, ip.id, ip.url, ip.uploaded_at,
           u.name, i.title, 'incident'
      FROM incident_photos ip
      JOIN incidents i ON i.id = ip.incident_id
      LEFT JOIN users u ON u.id = ip.uploaded_by
     WHERE i.project_id = $1 AND i.is_deleted = false AND i.source = 'client'`;

  const [rows, count] = await Promise.all([
    pool.query(`SELECT * FROM (${union}) x ORDER BY uploaded_at DESC NULLS LAST LIMIT $2 OFFSET $3`, [project.id, limit, offset]),
    pool.query(`SELECT COUNT(*)::int AS count FROM (${union}) x`, [project.id]),
  ]);
  return res.status(200).json({ photos: rows.rows, total: count.rows[0].count, limit, offset });
});

// ═══════════════════════════════════════════════════════════════════════════
//  FINANCE — invoices / BOQ / payments (FINALISED BOQs only)
// ═══════════════════════════════════════════════════════════════════════════
async function getFinalisedBoqs(projectId) {
  const r = await pool.query(
    `SELECT id, milestone_name, rows, labour_rows, grand_total, material_total, labour_total,
            status, ${D("finalised_date")}, ${D("updated_date")}
       FROM boqs
      WHERE project_id = $1 AND LOWER(status) IN ('finalised','finalized')
      ORDER BY finalised_date ASC NULLS LAST, id ASC`,
    [projectId]
  );
  return r.rows;
}

/**
 * The project keeps ONE running total of what the client has paid (projects.client_paid).
 * Allocate it oldest-invoice-first so every invoice can show Paid / Partly paid / Due.
 */
function allocatePayments(boqs, clientPaid) {
  const paidTotalRaw = Math.max(0, num(clientPaid));
  let remaining = paidTotalRaw;
  let totalBilled = 0;
  const items = boqs.map((b) => {
    const amount = num(b.grand_total);
    const paid = Math.min(amount, remaining);
    remaining -= paid;
    totalBilled += amount;
    const payment_status = amount <= 0 || paid >= amount ? "paid" : paid > 0 ? "partial" : "due";
    return { ...b, amount: round2(amount), paid_amount: round2(paid), balance: round2(amount - paid), payment_status };
  });
  const totalPaid = Math.min(totalBilled, paidTotalRaw);
  return {
    items,
    summary: {
      total_billed: round2(totalBilled),
      total_paid: round2(totalPaid),
      total_pending: round2(Math.max(0, totalBilled - totalPaid)),
      advance: round2(Math.max(0, paidTotalRaw - totalBilled)),
    },
  };
}

const materialLine = (r) => {
  const quantity = num(r.quantity ?? r.qty);
  const rate = num(r.unitPrice ?? r.unit_price ?? r.rate);
  return {
    description: String(r.material ?? r.description ?? "").trim() || "—",
    unit: r.unit || "",
    quantity,
    rate,
    amount: r.total != null ? round2(r.total) : round2(quantity * rate),
  };
};
// Labour: the client sees crew and cost, NOT the contractor's daily wage rate.
const labourLine = (r) => {
  const workers = num(r.workers);
  const days = num(r.workingDays ?? r.working_days);
  const wage = num(r.dailyWage ?? r.daily_wage);
  return {
    type: String(r.labourType ?? r.labour_type ?? "Labour"),
    workers,
    days,
    amount: r.total != null ? round2(r.total) : round2(workers * days * wage),
  };
};

const invoiceView = (b) => ({
  id: b.id,
  milestone_name: b.milestone_name,
  amount: b.amount,
  material_total: round2(b.material_total),
  labour_total: round2(b.labour_total),
  status: "finalised",
  invoice_date: b.finalised_date,
  payment_status: b.payment_status,
  paid_amount: b.paid_amount,
  balance: b.balance,
});

const getClientInvoices = withProject("getClientInvoices", async (req, res, project) => {
  const { items, summary } = allocatePayments(await getFinalisedBoqs(project.id), project.client_paid);
  return res.status(200).json({ invoices: items.map(invoiceView).reverse(), summary });
});

const getClientInvoiceById = withProject("getClientInvoiceById", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid invoice id.");
  const { items } = allocatePayments(await getFinalisedBoqs(project.id), project.client_paid);
  const b = items.find((x) => x.id === id);
  if (!b) return fail(res, 404, "Invoice not found.");
  return res.status(200).json({
    invoice: {
      ...invoiceView(b),
      material_lines: parseJsonArray(b.rows).map(materialLine),
      labour_lines: parseJsonArray(b.labour_rows).map(labourLine),
    },
  });
});

const getClientBoq = withProject("getClientBoq", async (req, res, project) => {
  const boqs = await getFinalisedBoqs(project.id);
  const boq = boqs.map((b) => ({
    id: b.id,
    milestone_name: b.milestone_name,
    finalised_date: b.finalised_date,
    material_total: round2(b.material_total),
    labour_total: round2(b.labour_total),
    grand_total: round2(b.grand_total),
    material_lines: parseJsonArray(b.rows).map(materialLine),
    labour_lines: parseJsonArray(b.labour_rows).map(labourLine),
  }));
  return res.status(200).json({ project: { id: project.id, name: project.name }, boq, grand_total: round2(boq.reduce((s, b) => s + b.grand_total, 0)) });
});

const getClientPayments = withProject("getClientPayments", async (req, res, project) => {
  const { items, summary } = allocatePayments(await getFinalisedBoqs(project.id), project.client_paid);
  return res.status(200).json({
    schedule: items.map(invoiceView),
    ...summary,
    budget: num(project.budget), // contract value; internal spend is never sent
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  INTERNAL TEAM NOTIFICATIONS  (client -> project staff)
// ═══════════════════════════════════════════════════════════════════════════
async function projectStaffUserIds(project) {
  const ids = new Set([project.coordinator_id, project.site_engineer_id].filter(Boolean));
  if (project.manager_id) {
    const r = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [project.manager_id]);
    if (r.rows[0]?.user_id) ids.add(r.rows[0].user_id);
  }
  return [...ids];
}

async function notifyStaff(userIds, project, n) {
  try {
    const { notifyByRole } = require("./IncidentController");
    if (typeof notifyByRole !== "function") return;
    for (const uid of userIds) {
      await notifyByRole(uid, n.type, n.title, n.description, n.link ?? null, n.severity || "info", n.referenceId ?? null, project.id);
    }
  } catch (err) {
    console.error("notifyStaff failed:", err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  INCIDENTS  (the client sees / raises THEIR OWN tickets, not internal ones)
// ═══════════════════════════════════════════════════════════════════════════
const MINE = `i.project_id = $1 AND i.is_deleted = false AND (i.created_by = $2 OR i.source = 'client')`;
const INCIDENT_COLS = `
  i.id, i.incident_no, i.title, i.description, i.priority, i.status,
  i.created_at, i.deadline_at, i.resolved_at, i.source,
  (SELECT a.name FROM users a WHERE a.id = i.assigned_to) AS assigned_to_name`;

const getClientIncidents = withProject("getClientIncidents", async (req, res, project) => {
  const r = await pool.query(
    `SELECT ${INCIDENT_COLS} FROM incidents i WHERE ${MINE} ORDER BY i.created_at DESC`,
    [project.id, req.user.id]
  );
  return res.status(200).json({ incidents: r.rows, total: r.rows.length });
});

const getClientIncidentById = withProject("getClientIncidentById", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid incident id.");
  const inc = await pool.query(`SELECT ${INCIDENT_COLS} FROM incidents i WHERE i.id = $3 AND ${MINE}`, [project.id, req.user.id, id]);
  if (!inc.rows.length) return fail(res, 404, "Incident not found.");

  const [comments, photos] = await Promise.all([
    pool.query(
      `SELECT ic.id, ic.body, ic.created_at, u.name AS author_name
         FROM incident_comments ic LEFT JOIN users u ON u.id = ic.author_id
        WHERE ic.incident_id = $1 ORDER BY ic.created_at ASC`,
      [id]
    ),
    pool.query(
      `SELECT ip.id, ip.url, ip.uploaded_at, u.name AS uploaded_by
         FROM incident_photos ip LEFT JOIN users u ON u.id = ip.uploaded_by
        WHERE ip.incident_id = $1 ORDER BY ip.uploaded_at ASC`,
      [id]
    ),
  ]);
  return res.status(200).json({ incident: inc.rows[0], comments: comments.rows, photos: photos.rows });
});

const INCIDENT_PRIORITIES = ["P1", "P2", "P3"];

const createClientIncident = withProject("createClientIncident", async (req, res, project) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const priority = INCIDENT_PRIORITIES.includes(req.body.priority) ? req.body.priority : "P2";
  if (!title) return fail(res, 400, "Title is required.");
  if (title.length > 200) return fail(res, 400, "Title must be 200 characters or fewer.");
  if (description.length > 4000) return fail(res, 400, "Description is too long (4000 characters max).");

  let deadline = null;
  if (req.body.deadline_at) {
    const d = new Date(req.body.deadline_at);
    if (Number.isNaN(d.getTime())) return fail(res, 400, "Deadline is not a valid date.");
    deadline = d.toISOString();
  }

  const db = await pool.connect();
  let incident;
  try {
    await db.query("BEGIN");
    // serialise numbering per project so two simultaneous requests cannot share an incident_no
    await db.query("SELECT pg_advisory_xact_lock($1)", [project.id]);
    const c = await db.query(`SELECT COUNT(*)::int AS count FROM incidents WHERE project_id = $1`, [project.id]);
    const incident_no = `INC-${project.id}-${String(c.rows[0].count + 1).padStart(3, "0")}`;
    const ins = await db.query(
      `INSERT INTO incidents (incident_no, title, description, priority, status, created_by, project_id, deadline_at, source)
       VALUES ($1,$2,$3,$4,'Created',$5,$6,$7,'client')
       RETURNING id, incident_no, title, description, priority, status, created_at, deadline_at, source`,
      [incident_no, title, description || null, priority, req.user.id, project.id, deadline]
    );
    await db.query("COMMIT");
    incident = ins.rows[0];
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    db.release();
  }

  // the project team must actually hear about it
  await notifyStaff(await projectStaffUserIds(project), project, {
    type: "incident",
    title: `Client incident ${incident.incident_no}: ${title}`,
    description: description || `Raised by the client on ${project.name}`,
    severity: priority === "P1" ? "high" : "info",
    referenceId: incident.id,
  });

  return res.status(201).json({ incident });
});

// ═══════════════════════════════════════════════════════════════════════════
//  RFI  (matched to the project by name: the rfis table has no project_id)
// ═══════════════════════════════════════════════════════════════════════════
const RFI_MINE = `r.project_name = $1 AND (r.raised_by_id = $2 OR LOWER(r.assigned_to_role) = 'client')`;
const RFI_COLS = `
  r.id, 'RFI-' || LPAD(r.id::text, 4, '0') AS rfi_code, r.subject, r.description,
  r.priority, r.status, r.created_at, r.updated_at, r.raised_by_name, r.raised_by_role,
  r.assigned_to_role, ${D("r.response_required_by", "response_required_by")}, r.drawing_ref, r.zone`;

const getClientRfis = withProject("getClientRfis", async (req, res, project) => {
  const r = await pool.query(
    `SELECT ${RFI_COLS},
            (SELECT COUNT(*)::int FROM rfi_responses rp WHERE rp.rfi_id = r.id) AS response_count
       FROM rfis r WHERE ${RFI_MINE} ORDER BY r.created_at DESC`,
    [project.name, req.user.id]
  );
  return res.status(200).json({ rfis: r.rows, total: r.rows.length });
});

const getClientRfiById = withProject("getClientRfiById", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid RFI id.");
  const rfi = await pool.query(`SELECT ${RFI_COLS} FROM rfis r WHERE r.id = $3 AND ${RFI_MINE}`, [project.name, req.user.id, id]);
  if (!rfi.rows.length) return fail(res, 404, "RFI not found.");
  const responses = await pool.query(
    `SELECT id, message, responder_name, responder_role, file_url, file_name, created_at
       FROM rfi_responses WHERE rfi_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  return res.status(200).json({ rfi: rfi.rows[0], responses: responses.rows });
});

// Who a client may address an RFI to, and which project column names that person.
const RFI_TARGETS = {
  project_coordinator: "coordinator_id",
  architect: "architect_id",
  site_engineer: "site_engineer_id",
  project_manager: null, // manager_id is an employees.id -> resolved below
};
const RFI_PRIORITIES = ["low", "medium", "high", "critical"];

async function rfiAssigneeUserId(project, role) {
  if (role === "project_manager") {
    if (!project.manager_id) return null;
    const r = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [project.manager_id]);
    return r.rows[0]?.user_id || null;
  }
  return project[RFI_TARGETS[role]] || null;
}

const createClientRfi = withProject("createClientRfi", async (req, res, project) => {
  const subject = String(req.body.subject || "").trim();
  const description = String(req.body.description || "").trim();
  if (!subject) return fail(res, 400, "Subject is required.");
  if (subject.length > 255) return fail(res, 400, "Subject must be 255 characters or fewer.");
  if (description.length > 4000) return fail(res, 400, "Description is too long (4000 characters max).");

  const priority = String(req.body.priority || "medium").toLowerCase();
  if (!RFI_PRIORITIES.includes(priority)) return fail(res, 400, `Priority must be one of: ${RFI_PRIORITIES.join(", ")}.`);

  const assignedRole = String(req.body.assigned_to_role || "project_coordinator");
  if (!(assignedRole in RFI_TARGETS)) return fail(res, 400, `assigned_to_role must be one of: ${Object.keys(RFI_TARGETS).join(", ")}.`);

  let responseBy = null;
  if (req.body.response_required_by) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.response_required_by))) return fail(res, 400, "response_required_by must be YYYY-MM-DD.");
    responseBy = req.body.response_required_by;
  }

  const assigneeId = await rfiAssigneeUserId(project, assignedRole);
  const ins = await pool.query(
    `INSERT INTO rfis
       (subject, description, priority, status,
        raised_by_role, raised_by_name, raised_by_id,
        assigned_to_role, assigned_to_user_id,
        project_name, drawing_ref, zone, response_required_by, created_at, updated_at)
     VALUES ($1,$2,$3,'open','client',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
     RETURNING id`,
    [
      subject, description, priority,
      req.user.name || "Client", req.user.id,
      assignedRole, assigneeId,
      project.name,
      String(req.body.drawing_ref || "").trim() || null,
      String(req.body.zone || "").trim() || null,
      responseBy,
    ]
  );
  const id = ins.rows[0].id;

  if (assigneeId) {
    await notifyStaff([assigneeId], project, {
      type: "rfi",
      title: `Client RFI: ${subject}`,
      description: `${req.user.name || "The client"} raised an RFI on ${project.name}`,
      severity: priority === "critical" || priority === "high" ? "high" : "info",
      referenceId: id,
    });
  }

  const created = await pool.query(`SELECT ${RFI_COLS} FROM rfis r WHERE r.id = $1`, [id]);
  return res.status(201).json({ rfi: created.rows[0] });
});

// ── client replies (two-way threads) ───────────────────────────────────────
const addClientIncidentComment = withProject("addClientIncidentComment", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid incident id.");
  const body = String(req.body.body || "").trim();
  if (!body) return fail(res, 400, "Comment cannot be empty.");
  if (body.length > 2000) return fail(res, 400, "Comment is too long (2000 characters max).");

  const inc = await pool.query(
    `SELECT i.id, i.incident_no, i.status, i.assigned_to FROM incidents i WHERE i.id = $3 AND ${MINE}`,
    [project.id, req.user.id, id]
  );
  const row = inc.rows[0];
  if (!row) return fail(res, 404, "Incident not found.");
  if (row.status === "Closed") return fail(res, 409, "This incident is closed.");

  const ins = await pool.query(
    `INSERT INTO incident_comments (incident_id, author_id, body) VALUES ($1,$2,$3) RETURNING id, body, created_at`,
    [id, req.user.id, body]
  );
  const staff = new Set(await projectStaffUserIds(project));
  if (row.assigned_to) staff.add(row.assigned_to);
  await notifyStaff([...staff], project, {
    type: "incident",
    title: `Client comment on ${row.incident_no}`,
    description: body.slice(0, 160),
    referenceId: id,
  });
  return res.status(201).json({ comment: { ...ins.rows[0], author_name: req.user.name || "You" } });
});

const respondClientRfi = withProject("respondClientRfi", async (req, res, project) => {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 400, "Invalid RFI id.");
  const message = String(req.body.message || "").trim();
  if (!message) return fail(res, 400, "Message cannot be empty.");
  if (message.length > 4000) return fail(res, 400, "Message is too long (4000 characters max).");

  const found = await pool.query(
    `SELECT r.id, r.subject, r.status, r.raised_by_role, r.raised_by_id, r.assigned_to_user_id
       FROM rfis r WHERE r.id = $3 AND ${RFI_MINE}`,
    [project.name, req.user.id, id]
  );
  const rfi = found.rows[0];
  if (!rfi) return fail(res, 404, "RFI not found.");
  if (String(rfi.status).toLowerCase() === "closed") return fail(res, 409, "This RFI is closed.");

  const ins = await pool.query(
    `INSERT INTO rfi_responses (rfi_id, responder_role, responder_name, responder_id, message, created_at)
     VALUES ($1,'client',$2,$3,$4,NOW())
     RETURNING id, message, responder_name, responder_role, file_url, file_name, created_at`,
    [id, req.user.name || "Client", req.user.id, message]
  );

  // Status mirrors who the ball is with: the client's own RFI goes back to "open" when they
  // follow up; an RFI staff sent TO the client becomes "responded" when the client answers.
  const raisedByClient = String(rfi.raised_by_role).toLowerCase() === "client";
  await pool.query(
    `UPDATE rfis SET status = CASE
        WHEN $2 AND LOWER(status) = 'responded' THEN 'open'
        WHEN NOT $2 AND LOWER(status) = 'open' THEN 'responded'
        ELSE status END,
        updated_at = NOW()
      WHERE id = $1`,
    [id, raisedByClient]
  );

  const targets = raisedByClient
    ? [rfi.assigned_to_user_id].filter(Boolean)
    : [rfi.raised_by_id].filter(Boolean);
  await notifyStaff(targets.length ? targets : await projectStaffUserIds(project), project, {
    type: "rfi",
    title: `Client replied: ${rfi.subject}`,
    description: message.slice(0, 160),
    referenceId: id,
  });
  return res.status(201).json({ response: ins.rows[0] });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED FILES  (drawings issued for coordination / construction)
// ═══════════════════════════════════════════════════════════════════════════
const getClientSharedFiles = withProject("getClientSharedFiles", async (req, res, project) => {
  const r = await pool.query(
    `SELECT d.id, d.name, d.drawing_no, d.drawing_number, d.discipline, d.sub_discipline,
            pf.name AS floor_name,
            dv.revision_number AS current_revision, dv.file_url, dv.file_size, dv.uploaded_at,
            dv.status AS display_status,
            dv.mep_status, um.name AS mep_reviewed_by_name, dv.mep_reviewed_at,
            dv.arch_status, ua.name AS arch_reviewed_by_name, dv.arch_reviewed_at,
            dv.str_status, us.name AS str_reviewed_by_name, dv.str_reviewed_at,
            dv.fully_approved_at, dv.issued_for_construction_at
       FROM drawings d
       JOIN drawing_versions dv ON dv.id = d.current_version_id
       LEFT JOIN project_floors pf ON pf.id = d.floor_id
       LEFT JOIN users um ON um.id = dv.mep_reviewed_by
       LEFT JOIN users ua ON ua.id = dv.arch_reviewed_by
       LEFT JOIN users us ON us.id = dv.str_reviewed_by
      WHERE d.project_id = $1 AND d.is_deleted = false
        AND dv.status IN ('Issued for Coordination','Issued for Construction','Approved')
      ORDER BY dv.uploaded_at DESC`,
    [project.id]
  );
  return res.status(200).json({ files: r.rows, total: r.rows.length });
});

// ═══════════════════════════════════════════════════════════════════════════
//  APPROVALS & CLEARANCES  (real records the project team maintains)
// ═══════════════════════════════════════════════════════════════════════════
const getClientApprovals = withProject("getClientApprovals", async (req, res, project) => {
  await ensureClientTables();
  const r = await pool.query(
    `SELECT id, title, category, issued_by, reference_no, status,
            ${D("issued_date")}, ${D("valid_until")}, validity_note, description, document_url
       FROM project_approvals
      WHERE project_id = $1 AND visible_to_client = true
      ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
               issued_date DESC NULLS LAST, id ASC`,
    [project.id]
  );
  return res.status(200).json({ approvals: r.rows, total: r.rows.length });
});

// ═══════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS  (the client's bell)
// ═══════════════════════════════════════════════════════════════════════════
const getClientNotifications = async (req, res) => {
  try {
    await ensureClientTables();
    const [list, unread] = await Promise.all([
      pool.query(
        `SELECT id, type, title, description, link, severity, reference_id, is_read, created_at
           FROM client_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.user.id]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM client_notifications WHERE user_id = $1 AND is_read = false`, [req.user.id]),
    ]);
    return res.status(200).json({ notifications: list.rows, unread: unread.rows[0].count });
  } catch (err) {
    console.error("getClientNotifications:", err);
    return fail(res, 500, "Internal server error.");
  }
};

const markClientNotificationRead = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return fail(res, 400, "Invalid notification id.");
    await ensureClientTables();
    await pool.query(`UPDATE client_notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("markClientNotificationRead:", err);
    return fail(res, 500, "Internal server error.");
  }
};

const markAllClientNotificationsRead = async (req, res) => {
  try {
    await ensureClientTables();
    await pool.query(`UPDATE client_notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [req.user.id]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("markAllClientNotificationsRead:", err);
    return fail(res, 500, "Internal server error.");
  }
};

module.exports = {
  getClientProjects,
  getClientMilestones,
  getClientMilestoneById,
  getClientDailyLogs,
  getClientDailyLogById,
  getClientSitePhotos,
  getClientInvoices,
  getClientInvoiceById,
  getClientBoq,
  getClientPayments,
  getClientIncidents,
  getClientIncidentById,
  createClientIncident,
  getClientRfis,
  getClientRfiById,
  createClientRfi,
  addClientIncidentComment,
  respondClientRfi,
  getClientSharedFiles,
  getClientApprovals,
  getClientNotifications,
  markClientNotificationRead,
  markAllClientNotificationsRead,
  // exported for unit tests
  __test: { allocatePayments, deriveStatus, materialLine, labourLine, parseJsonArray, clampInt, toInt },
};
