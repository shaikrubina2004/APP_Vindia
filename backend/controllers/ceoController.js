// backend/controllers/ceoController.js
//
// CEO-only endpoints:
//   GET  /api/ceo/dashboard                       real dashboard data
//   GET  /api/ceo/manager-updates                 all manager daily updates (feed)
//   GET  /api/ceo/manager-updates/today           who has / hasn't submitted today
//   PUT  /api/ceo/manager-updates/finance/:id/review   approve / reject a Finance Manager update
//
// Every section is wrapped so ONE failing query (missing table, renamed
// column…) never blanks the whole page — the same resilience pattern used in
// analyticsController.js.

const pool = require("../config/db");
const { CEO_MATCH } = require("./ceoNotificationsController");

const MANAGER_ROLES = [
  { code: "project_manager",    label: "Project Manager" },
  { code: "hr_manager",         label: "HR Manager" },
  { code: "finance_manager",    label: "Finance Manager" },
  { code: "operations_manager", label: "Operations Manager" },
  { code: "bd_manager",         label: "BD Manager" },
  { code: "bda",                label: "Business Dev. Analyst" },
];
const ROLE_LABEL = Object.fromEntries(MANAGER_ROLES.map((r) => [r.code, r.label]));

const ROLE_MATCH = `(
  LOWER(REPLACE(REPLACE(COALESCE(r.name,''),' ','_'),'-','_')) = ANY($1)
  OR LOWER(COALESCE(r.code,'')) = ANY($1)
)`;

const num = (v) => Number(v) || 0;

async function section(name, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[ceo] ${name}:`, err.message);
    return fallback;
  }
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;

  /* ── Finance snapshot (same definitions as Finance Manager dashboard:
        revenue = PAID invoices, expenses = approved/paid) ── */
  const finance = await section("finance", async () => {
    const inv = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE LOWER(status)='paid'),0)    AS revenue,
         COALESCE(SUM(amount) FILTER (WHERE LOWER(status)<>'paid'),0)   AS receivable,
         COUNT(*) FILTER (WHERE LOWER(status)='overdue')                AS overdue
       FROM invoices
       WHERE ($1::int IS NULL OR project_id = $1)`,
      [projectId]
    );
    const exp = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS expenses
       FROM expenses
       WHERE LOWER(status) IN ('approved','paid')
         AND ($1::int IS NULL OR project_id = $1)`,
      [projectId]
    );
    const revenue = num(inv.rows[0].revenue);
    const expenses = num(exp.rows[0].expenses);
    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      receivable: num(inv.rows[0].receivable),
      overdueInvoices: num(inv.rows[0].overdue),
    };
  }, { revenue: 0, expenses: 0, profit: 0, receivable: 0, overdueInvoices: 0 });

  /* ── Monthly income vs expense, last 6 months ── */
  const monthly = await section("monthly", async () => {
    const { rows } = await pool.query(
      `WITH months AS (
         SELECT date_trunc('month', CURRENT_DATE) - (n || ' month')::interval AS m
         FROM generate_series(0,5) n
       )
       SELECT to_char(m.m,'Mon') AS label,
              to_char(m.m,'YYYY-MM') AS key,
              COALESCE((SELECT SUM(i.amount) FROM invoices i
                         WHERE LOWER(i.status)='paid'
                           AND date_trunc('month', i.created_at)=m.m
                           AND ($1::int IS NULL OR i.project_id=$1)),0) AS income,
              COALESCE((SELECT SUM(e.amount) FROM expenses e
                         WHERE LOWER(e.status) IN ('approved','paid')
                           AND date_trunc('month', e.expense_date)=m.m
                           AND ($1::int IS NULL OR e.project_id=$1)),0) AS expense
       FROM months m
       ORDER BY m.m ASC`,
      [projectId]
    );
    return rows.map((r) => ({ label: r.label, key: r.key, income: num(r.income), expense: num(r.expense) }));
  }, []);

  /* ── Projects with progress & spend ── */
  const projects = await section("projects", async () => {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.client, p.status, p.start_date, p.end_date,
              COALESCE(p.budget,0) AS budget,
              COALESCE((SELECT ROUND(AVG(w.progress)) FROM wbs w
                         WHERE w.project_id=p.id AND w.parent_id IS NULL),0) AS progress,
              COALESCE((SELECT SUM(e.amount) FROM expenses e
                         WHERE e.project_id=p.id AND LOWER(e.status) IN ('approved','paid')),0) AS spent
       FROM projects p
       ORDER BY p.id DESC
       LIMIT 50`
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, client: r.client, status: r.status,
      startDate: r.start_date, endDate: r.end_date,
      budget: num(r.budget), spent: num(r.spent), progress: num(r.progress),
    }));
  }, []);

  /* ── WBS cost breakdown (labour / material / equipment / misc) ── */
  const wbsCost = await section("wbsCost", async () => {
    const q = (tbl, col) =>
      pool.query(
        `SELECT COALESCE(SUM(t.${col}),0) AS v
         FROM ${tbl} t JOIN wbs w ON w.id = t.task_id
         WHERE ($1::int IS NULL OR w.project_id=$1)`,
        [projectId]
      );
    const [l, m, e, x] = await Promise.all([
      q("wbs_labour", "cost"), q("wbs_material", "total"),
      q("wbs_equipment", "cost"), q("wbs_miscellaneous", "cost"),
    ]);
    return [
      { key: "labour",    label: "Labour",    value: num(l.rows[0].v) },
      { key: "material",  label: "Material",  value: num(m.rows[0].v) },
      { key: "equipment", label: "Equipment", value: num(e.rows[0].v) },
      { key: "misc",      label: "Misc",      value: num(x.rows[0].v) },
    ];
  }, []);

  /* ── WBS status overview (top-level milestones) ── */
  const wbsOverview = await section("wbsOverview", async () => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)                                                     AS total,
              COUNT(*) FILTER (WHERE LOWER(status) LIKE 'complet%')        AS completed,
              COUNT(*) FILTER (WHERE LOWER(status) LIKE '%progress%')      AS in_progress,
              COALESCE(ROUND(AVG(progress)),0)                             AS avg_progress
       FROM wbs
       WHERE ($1::int IS NULL OR project_id=$1)`,
      [projectId]
    );
    const r = rows[0];
    return {
      total: num(r.total), completed: num(r.completed),
      inProgress: num(r.in_progress), avgProgress: num(r.avg_progress),
    };
  }, { total: 0, completed: 0, inProgress: 0, avgProgress: 0 });

  /* ── HR snapshot ── */
  const hr = await section("hr", async () => {
    const emp = await pool.query(`SELECT COUNT(*) AS c FROM employees`);
    const att = await pool.query(
      `SELECT COUNT(DISTINCT employee_id) AS c FROM attendance
       WHERE date = CURRENT_DATE AND LOWER(status) IN ('present','late','wfh')`
    );
    const lv = await pool.query(
      `SELECT COUNT(DISTINCT employee_id) AS c FROM leaves
       WHERE LOWER(status)='approved'
         AND CURRENT_DATE BETWEEN from_date AND to_date`
    );
    const pend = await pool.query(`SELECT COUNT(*) AS c FROM leaves WHERE LOWER(status)='pending'`);
    return {
      employees: num(emp.rows[0].c),
      presentToday: num(att.rows[0].c),
      onLeave: num(lv.rows[0].c),
      pendingLeaves: num(pend.rows[0].c),
    };
  }, { employees: 0, presentToday: 0, onLeave: 0, pendingLeaves: 0 });

  /* ── Lead pipeline ── */
  const leads = await section("leads", async () => {
    const { rows } = await pool.query(
      `SELECT COALESCE(status,'New') AS status, COUNT(*) AS c
       FROM leads
       WHERE COALESCE(deleted_by_admin,false)=false
       GROUP BY 1 ORDER BY 2 DESC`
    );
    return rows.map((r) => ({ status: r.status, count: num(r.c) }));
  }, []);

  /* ── Manager reporting health ── */
  const managers = await section("managers", () => buildTodayStatus(), []);
  const pendingReports = await section("pendingReports", async () => {
    const { rows } = await pool.query(`SELECT COUNT(*) AS c FROM manager_reports WHERE status='submitted'`);
    return num(rows[0].c);
  }, 0);
  const pendingFinanceUpdates = await section("pendingFin", async () => {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS c FROM finance_daily_updates f
       JOIN users u ON u.id=f.submitted_by JOIN roles r ON r.id=u.role_id
       WHERE f.status='pending' AND ${ROLE_MATCH}`,
      [["finance_manager"]]
    );
    return num(rows[0].c);
  }, 0);

  res.json({
    generatedAt: new Date().toISOString(),
    finance, monthly, projects, wbsCost, wbsOverview, hr, leads,
    managers: {
      list: managers,
      submittedToday: managers.filter((m) => m.submittedToday).length,
      total: managers.length,
      pendingReports,
      pendingFinanceUpdates,
    },
  });
};

/* ══════════════════════════════════════════════════════════
   MANAGER DAILY UPDATES
   ══════════════════════════════════════════════════════════ */

/* One row per manager user, with whether they've sent a daily update today.
   Sources: manager_reports(type=daily), finance_daily_updates (finance mgr),
   daily_reports (PM — this table stores submitter as free text, so it counts
   for the project_manager role as a whole). */
async function buildTodayStatus() {
  const codes = MANAGER_ROLES.map((r) => r.code);
  const { rows: users } = await pool.query(
    `SELECT u.id, u.name, u.email,
            LOWER(REPLACE(REPLACE(COALESCE(NULLIF(r.code,''), r.name),' ','_'),'-','_')) AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE ${ROLE_MATCH}
     ORDER BY u.name`,
    [codes]
  );

  const mr = await section("today.mr", async () => {
    const { rows } = await pool.query(
      `SELECT submitted_by, MAX(created_at) AS at FROM manager_reports
       WHERE report_type='daily' AND created_at::date = CURRENT_DATE
       GROUP BY submitted_by`
    );
    return new Map(rows.map((r) => [r.submitted_by, r.at]));
  }, new Map());

  const fin = await section("today.fin", async () => {
    const { rows } = await pool.query(
      `SELECT submitted_by, MAX(updated_at) AS at FROM finance_daily_updates
       WHERE date = CURRENT_DATE GROUP BY submitted_by`
    );
    return new Map(rows.map((r) => [r.submitted_by, r.at]));
  }, new Map());

  const pmAt = await section("today.pm", async () => {
    const { rows } = await pool.query(
      `SELECT MAX(submission_time) AS at, COUNT(*) AS c FROM daily_reports WHERE date::date = CURRENT_DATE`
    );
    return num(rows[0].c) > 0 ? rows[0].at || true : null;
  }, null);

  return users.map((u) => {
    const at = mr.get(u.id) || fin.get(u.id) || (u.role === "project_manager" ? pmAt : null);
    return {
      id: u.id, name: u.name, email: u.email,
      role: u.role, roleLabel: ROLE_LABEL[u.role] || u.role,
      submittedToday: !!at,
      lastSubmittedAt: at && at !== true ? at : null,
    };
  });
}

exports.getTodayStatus = async (req, res) => {
  try {
    res.json(await buildTodayStatus());
  } catch (err) {
    console.error("[ceo] today status:", err.message);
    res.status(500).json({ message: "Failed to load today's status" });
  }
};

/* Unified feed. Query: ?days=14&role=&status= */
exports.getManagerUpdates = async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 180);
  const roleFilter = req.query.role || "";
  const statusFilter = req.query.status || "";
  const codes = MANAGER_ROLES.map((r) => r.code);

  /* 1 ─ Manager → CEO daily reports (all manager roles) */
  const fromReports = await section("feed.reports", async () => {
    const { rows } = await pool.query(
      `SELECT m.*, u.name AS submitter_name
       FROM manager_reports m JOIN users u ON u.id = m.submitted_by
       WHERE m.report_type='daily'
         AND m.created_at >= NOW() - ($1 || ' day')::interval`,
      [String(days)]
    );
    return rows.map((r) => ({
      uid: `mr-${r.id}`, source: "report", id: r.id,
      role: r.submitter_role, roleLabel: ROLE_LABEL[r.submitter_role] || r.submitter_role,
      manager: r.submitter_name,
      date: r.created_at, title: r.title,
      summary: r.summary, highlights: r.highlights, issues: r.issues, nextSteps: r.next_steps,
      health: r.issues && r.issues.trim() ? "attention" : "on-track",
      status: r.status === "submitted" ? "pending" : r.status,   // reviewed | needs_changes
      ceoComment: r.ceo_comment,
      reviewable: true,
    }));
  }, []);

  /* 2 ─ Finance Manager's own daily updates ("Pending CEO review") */
  const fromFinance = await section("feed.finance", async () => {
    const { rows } = await pool.query(
      `SELECT f.*, u.name AS submitter_name
       FROM finance_daily_updates f
       JOIN users u ON u.id = f.submitted_by JOIN roles r ON r.id = u.role_id
       WHERE ${ROLE_MATCH}
         AND f.date >= CURRENT_DATE - ($2 || ' day')::interval`,
      [["finance_manager"], String(days)]
    );
    return rows.map((r) => ({
      uid: `fin-${r.id}`, source: "finance", id: r.id,
      role: "finance_manager", roleLabel: "Finance Manager",
      manager: r.submitter_name, date: r.date,
      title: "Finance daily update",
      summary: r.summary || "",
      metrics: {
        "Cash position": num(r.cash_position), "Collections": num(r.todays_collections),
        "Expenses": num(r.todays_expenses), "Invoices raised": num(r.invoices_raised),
        "Payments made": num(r.payments_made), "Pending approvals": num(r.pending_approvals),
      },
      health: r.overall_status || "on-track",
      status: r.status || "pending",            // pending | approved | rejected
      ceoComment: r.review_note,
      reviewable: true,
    }));
  }, []);

  /* 3 ─ Project Manager site updates (daily_reports) */
  const fromPM = await section("feed.pm", async () => {
    const { rows } = await pool.query(
      `SELECT * FROM daily_reports
       WHERE date::date >= CURRENT_DATE - ($1 || ' day')::interval`,
      [String(days)]
    );
    return rows.map((r) => ({
      uid: `pm-${r.id}`, source: "project", id: r.id,
      role: "project_manager", roleLabel: "Project Manager",
      manager: r.submitted_by || "Project Manager",
      date: r.date, title: r.project_name || "Project daily update",
      summary: r.phase ? `Phase: ${r.phase}` : "Daily site update submitted",
      health: r.overall_status || "on-track",
      status: r.approved ? "approved" : "pending",
      reviewable: false,
    }));
  }, []);

  let items = [...fromReports, ...fromFinance, ...fromPM].filter((i) => codes.includes(i.role) || !i.role);
  if (roleFilter) items = items.filter((i) => i.role === roleFilter);
  if (statusFilter) items = items.filter((i) => i.status === statusFilter);
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    items,
    counts: {
      total: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      attention: items.filter((i) => i.health !== "on-track").length,
    },
  });
};

/* CEO approves / rejects a Finance Manager daily update
   (finance routes only allow finance_manager, so the CEO gets its own path). */
exports.reviewFinanceUpdate = async (req, res) => {
  try {
    const { status, review_note } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }
    const { rows } = await pool.query(
      `UPDATE finance_daily_updates f
       SET status=$1, review_note=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW()
       FROM users u JOIN roles r ON r.id=u.role_id
       WHERE f.id=$4 AND u.id=f.submitted_by AND ${ROLE_MATCH.replaceAll("$1", "$5")}
       RETURNING f.*`,
      [status, review_note || null, req.user.id, req.params.id, ["finance_manager"]]
    );
    if (!rows.length) return res.status(404).json({ message: "Finance manager update not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("[ceo] review finance:", err.message);
    res.status(500).json({ message: "Failed to review update" });
  }
};

exports.CEO_MATCH = CEO_MATCH;