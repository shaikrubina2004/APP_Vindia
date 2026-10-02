const pool = require("../config/db");
const { notifyCEO } = require("./ceoNotificationsController");

/* Roles allowed to submit reports to the CEO.
   BDA is included because the BD team has no separate manager. */
const SUBMITTER_ROLES = [
  "project_manager",
  "hr_manager",
  "finance_manager",
  "operations_manager",
  "bda",
  "bd_manager",
];
exports.SUBMITTER_ROLES = SUBMITTER_ROLES;

const VALID_TYPES = ["daily", "weekly", "monthly", "incident", "other"];

/* POST /api/manager-reports  (manager) */
exports.submitReport = async (req, res) => {
  try {
    const { title, report_type, period_label, summary, highlights, issues, next_steps, details } = req.body;
    if (!title?.trim() || !summary?.trim()) {
      return res.status(400).json({ message: "Title and summary are required" });
    }
    const type = VALID_TYPES.includes(report_type) ? report_type : "other";

    const { rows } = await pool.query(
      `INSERT INTO manager_reports
        (title, report_type, period_label, summary, highlights, issues, next_steps, submitted_by, submitter_role, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title.trim(), type, period_label || null, summary.trim(),
       highlights || null, issues || null, next_steps || null,
       req.user.id, req.user.role,
       details && typeof details === "object" ? JSON.stringify(details) : null]
    );

    // 🔔 Tell the CEO. Daily updates carry the role-specific fields in `details`.
    const who = req.user.name || req.user.email || req.user.role;
    const st = details && details.status;
    await notifyCEO({
      type: type === "daily" ? "daily_update" : "report",
      title: `${type === "daily" ? "Daily update" : "New " + type + " report"} from ${who}`,
      description: title.trim(),
      link: type === "daily" ? `/reports?tab=daily&open=mr-${rows[0].id}` : `/reports?tab=reports&open=r-${rows[0].id}`,
      severity: st === "critical" ? "critical" : (st === "attention" || (issues && issues.trim())) ? "warning" : "info",
      referenceId: rows[0].id,
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("submitReport:", err.message);
    res.status(500).json({ message: "Failed to submit report" });
  }
};

/* GET /api/manager-reports/mine  (manager) */
exports.getMyReports = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM manager_reports WHERE submitted_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to load your reports" });
  }
};

/* GET /api/manager-reports  (CEO) — ?status=&role= */
exports.getAllReports = async (req, res) => {
  try {
    const { status, role } = req.query;
    const vals = [];
    let where = "WHERE 1=1";
    if (status) { vals.push(status); where += ` AND r.status = $${vals.length}`; }
    if (role)   { vals.push(role);   where += ` AND r.submitter_role = $${vals.length}`; }

    const { rows } = await pool.query(
      `SELECT r.*, u.name AS submitter_name, u.email AS submitter_email
       FROM manager_reports r
       JOIN users u ON u.id = r.submitted_by
       ${where}
       ORDER BY (r.status = 'submitted') DESC, r.created_at DESC`,
      vals
    );
    res.json(rows);
  } catch (err) {
    console.error("getAllReports:", err.message);
    res.status(500).json({ message: "Failed to load reports" });
  }
};

/* GET /api/manager-reports/summary  (CEO) */
exports.getSummary = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM manager_reports GROUP BY status`
    );
    const out = { submitted: 0, reviewed: 0, needs_changes: 0 };
    rows.forEach(r => { out[r.status] = r.count; });
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: "Failed to load summary" });
  }
};

/* PUT /api/manager-reports/:id/review  (CEO) */
exports.reviewReport = async (req, res) => {
  try {
    const { status, ceo_comment } = req.body;
    if (!["reviewed", "needs_changes"].includes(status)) {
      return res.status(400).json({ message: "status must be 'reviewed' or 'needs_changes'" });
    }
    const { rows } = await pool.query(
      `UPDATE manager_reports
       SET status = $1, ceo_comment = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, ceo_comment || null, req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Report not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to review report" });
  }
};