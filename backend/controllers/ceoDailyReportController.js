// Daily updates that managers submit to the CEO, and the CEO's review inbox.
//
//  general rows  → ceo_daily_reports   (PM, BDA, Operations Manager, HR)
//  finance rows  → finance_daily_updates (already existing table)
// Both are exposed through one unified API so the CEO Reports page needs one call.

const pool = require("../config/db");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { notifyCeos } = require("./ceoAlertController");

/* report_type → which (normalised) roles may submit it */
const TYPE_ROLES = {
  pm:  ["project_manager"],
  bda: ["business_development_analyst", "bda", "bda1", "bda2", "business_development"],
  ops: ["operations_manager"],
  hr:  ["hr_manager", "hr"],
};

const TYPE_LABEL = {
  finance: "Finance Manager",
  pm:      "Project Manager",
  bda:     "Business Development",
  ops:     "Operations Manager",
  hr:      "HR Manager",
};

const VALID_STATUS = ["on-track", "attention", "critical", "delayed", "ahead"];

/* ── unified read query ─────────────────────────────────────────── */
const GENERAL_SELECT = `
  SELECT 'general'::text AS source, r.id, r.report_type, r.role, r.report_date,
         r.project_name, r.overall_status, r.summary, r.payload, r.status,
         r.reviewed_at, r.review_note, r.created_at, r.updated_at,
         r.submitted_by, u.name AS submitted_by_name, rv.name AS reviewed_by_name
  FROM ceo_daily_reports r
  JOIN users u ON u.id = r.submitted_by
  LEFT JOIN users rv ON rv.id = r.reviewed_by
`;

const FINANCE_SELECT = `
  SELECT 'finance'::text AS source, f.id, 'finance'::text AS report_type,
         'finance_manager'::text AS role, f.date AS report_date,
         NULL::text AS project_name, f.overall_status, f.summary,
         jsonb_build_object(
           'cash_position',      f.cash_position,
           'todays_collections', f.todays_collections,
           'todays_expenses',    f.todays_expenses,
           'invoices_raised',    f.invoices_raised,
           'payments_made',      f.payments_made,
           'pending_approvals',  f.pending_approvals
         ) AS payload,
         f.status, f.reviewed_at, f.review_note, f.created_at, f.updated_at,
         f.submitted_by, u.name AS submitted_by_name, rv.name AS reviewed_by_name
  FROM finance_daily_updates f
  JOIN users u ON u.id = f.submitted_by
  LEFT JOIN users rv ON rv.id = f.reviewed_by
`;

const shape = (row) => ({
  ...row,
  key: `${row.source}:${row.id}`,
  role_label: TYPE_LABEL[row.report_type] || row.role,
});

async function fetchUnified({ type, status, from, to, q, limit = 300, onlyUser } = {}) {
  const where = [];
  const values = [];
  const add = (sql, v) => {
    values.push(v);
    where.push(sql.replace("?", `$${values.length}`));
  };

  if (type)   add("t.report_type = ?", type);
  if (status) add("t.status = ?", status);
  if (from)   add("t.report_date >= ?", from);
  if (to)     add("t.report_date <= ?", to);
  if (onlyUser) add("t.submitted_by = ?", onlyUser);
  if (q) {
    values.push(`%${q}%`);
    const p = `$${values.length}`;
    where.push(
      `(t.submitted_by_name ILIKE ${p} OR COALESCE(t.project_name,'') ILIKE ${p} OR COALESCE(t.summary,'') ILIKE ${p})`
    );
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  const build = (withFinance) => `
    SELECT * FROM (
      ${GENERAL_SELECT}
      ${withFinance ? "UNION ALL " + FINANCE_SELECT : ""}
    ) t
    ${whereSql}
    ORDER BY t.report_date DESC, t.created_at DESC
    LIMIT ${Number(limit) || 300}
  `;

  try {
    const { rows } = await pool.query(build(true), values);
    return rows.map(shape);
  } catch (err) {
    // finance_daily_updates table missing (migration not run) → general only
    if (err.code === "42P01") {
      const { rows } = await pool.query(build(false), values);
      return rows.map(shape);
    }
    throw err;
  }
}
exports.fetchUnified = fetchUnified;

/* ═══════════════ POST /api/ceo-reports  (manager submits) ═══════════════ */
exports.submit = asyncHandler(async (req, res) => {
  const { report_type, date, project_name, overall_status, summary, payload } = req.body;

  if (!TYPE_ROLES[report_type]) throw new AppError("Invalid report_type", 400);
  if (!TYPE_ROLES[report_type].includes(req.user.role)) {
    throw new AppError("Your role is not allowed to submit this report", 403);
  }

  const status = VALID_STATUS.includes(overall_status) ? overall_status : "on-track";
  const reportDate = date || new Date().toISOString().slice(0, 10);

  const { rows } = await pool.query(
    `INSERT INTO ceo_daily_reports
       (submitted_by, role, report_type, report_date, project_name,
        overall_status, summary, payload, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',NOW())
     ON CONFLICT (submitted_by, report_date, report_type, (COALESCE(project_name, ''))) DO UPDATE SET
       project_name   = EXCLUDED.project_name,
       overall_status = EXCLUDED.overall_status,
       summary        = EXCLUDED.summary,
       payload        = EXCLUDED.payload,
       status         = 'pending',
       reviewed_by    = NULL,
       reviewed_at    = NULL,
       review_note    = NULL,
       updated_at     = NOW()
     RETURNING *, (xmax = 0) AS inserted`,
    [
      req.user.id,
      req.user.role,
      report_type,
      reportDate,
      project_name || null,
      status,
      summary || "",
      JSON.stringify(payload || {}),
    ]
  );
  const row = rows[0];

  const who = TYPE_LABEL[report_type];
  await notifyCeos({
    type: "report",
    title: row.inserted ? `${who} daily update submitted` : `${who} daily update resubmitted`,
    description:
      status === "critical"
        ? `Marked CRITICAL${project_name ? ` for ${project_name}` : ""}. Needs your attention.`
        : `Status: ${status.replace("-", " ")}${project_name ? ` · ${project_name}` : ""}.`,
    link: "/reports",
    severity: status === "critical" ? "critical" : status === "on-track" || status === "ahead" ? "info" : "warn",
    dedupeKey: `report-${row.id}-${new Date(row.updated_at).getTime()}`,
  });

  res.status(201).json({ success: true, data: shape({ source: "general", ...row }) });
});

/* ═══════════════ GET /api/ceo-reports/today?report_type=pm ═══════════════ */
exports.today = asyncHandler(async (req, res) => {
  const { report_type } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM ceo_daily_reports
     WHERE submitted_by = $1 AND report_type = $2 AND report_date = CURRENT_DATE
     LIMIT 1`,
    [req.user.id, report_type]
  );
  res.json({ success: true, data: rows[0] || null });
});

/* ═══════════════ GET /api/ceo-reports/mine?report_type=pm ═══════════════ */
exports.mine = asyncHandler(async (req, res) => {
  const { report_type } = req.query;
  const { rows } = await pool.query(
    `SELECT r.*, rv.name AS reviewed_by_name
     FROM ceo_daily_reports r
     LEFT JOIN users rv ON rv.id = r.reviewed_by
     WHERE r.submitted_by = $1 AND ($2::text IS NULL OR r.report_type = $2)
     ORDER BY r.report_date DESC
     LIMIT 60`,
    [req.user.id, report_type || null]
  );
  res.json({ success: true, data: rows });
});

/* ═══════════════ GET /api/ceo-reports  (CEO inbox) ═══════════════ */
exports.list = asyncHandler(async (req, res) => {
  const { type, status, from, to, q } = req.query;
  const data = await fetchUnified({
    type: type && type !== "all" ? type : undefined,
    status: status && status !== "all" ? status : undefined,
    from, to, q,
  });
  res.json({ success: true, data });
});

/* ═══════════════ GET /api/ceo-reports/summary ═══════════════ */
exports.summary = asyncHandler(async (req, res) => {
  const data = await buildSummary();
  res.json({ success: true, data });
});

async function buildSummary() {
  const rows = await fetchUnified({ limit: 600 });
  const todayStr = new Date().toISOString().slice(0, 10);
  const dayStr = (d) => new Date(d).toISOString().slice(0, 10);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  let critical = 0;
  let today = 0;
  const byType = {};

  Object.keys(TYPE_LABEL).forEach((t) => {
    byType[t] = { type: t, label: TYPE_LABEL[t], total: 0, pending: 0, approved: 0, rejected: 0, latest: null };
  });

  rows.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status === "pending" && r.overall_status === "critical") critical++;
    if (dayStr(r.report_date) === todayStr) today++;
    const g = byType[r.report_type];
    if (g) {
      g.total++;
      if (r.status === "pending") g.pending++;
      if (r.status === "approved") g.approved++;
      if (r.status === "rejected") g.rejected++;
      if (!g.latest) g.latest = { date: r.report_date, status: r.status, overall_status: r.overall_status, by: r.submitted_by_name };
    }
  });

  // last 14 days submission trend
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({
      date: key,
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      submitted: rows.filter((r) => dayStr(r.report_date) === key).length,
      pending: rows.filter((r) => dayStr(r.report_date) === key && r.status === "pending").length,
    });
  }

  return {
    ...counts,
    critical,
    today,
    total: rows.length,
    byType: Object.values(byType),
    trend,
    recent: rows.slice(0, 8),
  };
}
exports.buildSummary = buildSummary;

/* ═══════════════ PUT /api/ceo-reports/:source/:id/review ═══════════════ */
exports.review = asyncHandler(async (req, res) => {
  const { source, id } = req.params;
  const { status, note } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError("status must be 'approved' or 'rejected'", 400);
  }
  const table =
    source === "finance" ? "finance_daily_updates"
    : source === "general" ? "ceo_daily_reports"
    : null;
  if (!table) throw new AppError("Unknown report source", 400);

  const { rows } = await pool.query(
    `UPDATE ${table}
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, req.user.id, note || null, id]
  );
  if (!rows[0]) throw new AppError("Report not found", 404);

  res.json({ success: true, data: rows[0] });
});