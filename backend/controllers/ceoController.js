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
  { code: "bda",                label: "Business Development" },
];
const ROLE_LABEL = Object.fromEntries(MANAGER_ROLES.map((r) => [r.code, r.label]));

const ROLE_MATCH = `(
  LOWER(REPLACE(REPLACE(COALESCE(r.name,''),' ','_'),'-','_')) = ANY($1)
  OR LOWER(COALESCE(r.code,'')) = ANY($1)
)`;

const num = (v) => Number(v) || 0;

/* ── Role-specific field builders ─────────────────────────────
   Every manager's daily update has different fields. The CEO page just
   renders a generic list of { section, label, value, kind } — so each source
   converts its own data into that shape here. */
const keep = (f) => f && f.label && f.value !== "" && f.value != null;

const fieldsFromDetails = (d) => {
  try {
    const o = typeof d === "string" ? JSON.parse(d) : d;
    return Array.isArray(o && o.fields) ? o.fields.filter(keep) : [];
  } catch { return []; }
};
const statusFromDetails = (d) => {
  try { const o = typeof d === "string" ? JSON.parse(d) : d; return o && o.status; } catch { return null; }
};

const financeFields = (r) => [
  { section: "Cash", label: "Cash position", value: num(r.cash_position), kind: "money" },
  { section: "Cash", label: "Collections today", value: num(r.todays_collections), kind: "money" },
  { section: "Cash", label: "Expenses today", value: num(r.todays_expenses), kind: "money" },
  { section: "Activity", label: "Invoices raised", value: num(r.invoices_raised) },
  { section: "Activity", label: "Payments made", value: num(r.payments_made) },
  { section: "Activity", label: "Pending approvals", value: num(r.pending_approvals) },
];

const pmFields = (d = {}) => {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const sum = (a, k) => a.reduce((n, i) => n + (Number(i && i[k]) || 0), 0);
  const work = arr(d.workItems).filter((w) => w && w.activity);
  const men = arr(d.manpower);
  const planned = sum(men, "planned"), present = sum(men, "present");
  const iss = arr(d.issues).filter((i) => i && i.issue);
  const p = d.progress || {};
  const pct = (v) => (v !== "" && v != null ? `${v}%` : "");
  return [
    { section: "Site", label: "Project", value: d.projectName },
    { section: "Site", label: "Phase", value: d.phase },
    { section: "Site", label: "Weather", value: [d.weather, d.weatherTemp ? `${d.weatherTemp}°C` : ""].filter(Boolean).join(" · ") },
    { section: "Progress", label: "Overall", value: pct(p.overall) },
    { section: "Progress", label: "Structural", value: pct(p.structural) },
    { section: "Progress", label: "Finishing", value: pct(p.finishing) },
    { section: "Progress", label: "MEP electrical", value: pct(p.mepElec) },
    { section: "Progress", label: "MEP plumbing", value: pct(p.mepPlumb) },
    { section: "Work", label: "Work items done", value: work.length ? `${work.filter((w) => w.status === "done").length} of ${work.length}` : "" },
    { section: "Work", label: "Manpower present / planned", value: planned || present ? `${present} / ${planned}` : "" },
    { section: "Work", label: "Equipment on site", value: arr(d.equipment).filter((e) => e && e.name).length || "" },
    { section: "Risks", label: "Open issues", value: iss.length },
    { section: "Safety", label: "Safety observation", value: d.safetyObs },
  ].filter(keep);
};

/* Tiny in-memory cache so refreshing / several tabs don't re-run ~15 queries.
   ?fresh=1 (the Refresh button) bypasses it. */
const CACHE_MS = 20000;
const cache = new Map();

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
  const key = String(projectId || "all");
  const hit = cache.get(key);
  if (!req.query.fresh && hit && Date.now() - hit.at < CACHE_MS) return res.json(hit.data);

  const q = (sql, params) => pool.query(sql, params);

  /* Every section runs AT THE SAME TIME (was: one after another). */
  const [finance, monthly, projects, wbsCost, wbsOverview, hr, leads, managers, pendingReports, pendingFinanceUpdates] =
    await Promise.all([
      /* Finance snapshot – revenue = PAID invoices, expenses = approved/paid (same as Finance dashboard) */
      section("finance", async () => {
        const [inv, exp] = await Promise.all([
          q(`SELECT COALESCE(SUM(amount) FILTER (WHERE LOWER(status)='paid'),0)  AS revenue,
                    COALESCE(SUM(amount) FILTER (WHERE LOWER(status)<>'paid'),0) AS receivable,
                    COUNT(*) FILTER (WHERE LOWER(status)='overdue')              AS overdue
             FROM invoices WHERE ($1::int IS NULL OR project_id=$1)`, [projectId]),
          q(`SELECT COALESCE(SUM(amount),0) AS expenses FROM expenses
             WHERE LOWER(status) IN ('approved','paid') AND ($1::int IS NULL OR project_id=$1)`, [projectId]),
        ]);
        const revenue = num(inv.rows[0].revenue), expenses = num(exp.rows[0].expenses);
        return { revenue, expenses, profit: revenue - expenses,
                 receivable: num(inv.rows[0].receivable), overdueInvoices: num(inv.rows[0].overdue) };
      }, { revenue: 0, expenses: 0, profit: 0, receivable: 0, overdueInvoices: 0 }),

      /* Monthly trend – two grouped scans instead of 12 correlated sub-queries */
      section("monthly", async () => {
        const [inc, exp] = await Promise.all([
          q(`SELECT to_char(date_trunc('month',created_at),'YYYY-MM') AS k, SUM(amount) AS v FROM invoices
             WHERE LOWER(status)='paid' AND created_at >= date_trunc('month',CURRENT_DATE) - interval '5 month'
               AND ($1::int IS NULL OR project_id=$1) GROUP BY 1`, [projectId]),
          q(`SELECT to_char(date_trunc('month',expense_date),'YYYY-MM') AS k, SUM(amount) AS v FROM expenses
             WHERE LOWER(status) IN ('approved','paid') AND expense_date >= date_trunc('month',CURRENT_DATE) - interval '5 month'
               AND ($1::int IS NULL OR project_id=$1) GROUP BY 1`, [projectId]),
        ]);
        const I = new Map(inc.rows.map((r) => [r.k, num(r.v)])), E = new Map(exp.rows.map((r) => [r.k, num(r.v)]));
        const out = [], now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          out.push({ key: k, label: d.toLocaleString("en-US", { month: "short" }), income: I.get(k) || 0, expense: E.get(k) || 0 });
        }
        return out;
      }, []),

      /* Projects – progress & spend via one grouped join each (no per-row sub-queries) */
      section("projects", async () => {
        const { rows } = await q(
          `SELECT p.id, p.name, p.client, p.status, p.start_date, p.end_date, COALESCE(p.budget,0) AS budget,
                  COALESCE(w.progress,0) AS progress, COALESCE(e.spent,0) AS spent
           FROM projects p
           LEFT JOIN (SELECT project_id, ROUND(AVG(progress)) AS progress FROM wbs WHERE parent_id IS NULL GROUP BY project_id) w ON w.project_id=p.id
           LEFT JOIN (SELECT project_id, SUM(amount) AS spent FROM expenses WHERE LOWER(status) IN ('approved','paid') GROUP BY project_id) e ON e.project_id=p.id
           ORDER BY p.id DESC LIMIT 50`);
        return rows.map((r) => ({ id: r.id, name: r.name, client: r.client, status: r.status,
          startDate: r.start_date, endDate: r.end_date, budget: num(r.budget), spent: num(r.spent), progress: num(r.progress) }));
      }, []),

      /* WBS cost breakdown */
      section("wbsCost", async () => {
        const one = (tbl, col) => q(`SELECT COALESCE(SUM(t.${col}),0) AS v FROM ${tbl} t JOIN wbs w ON w.id=t.task_id
                                     WHERE ($1::int IS NULL OR w.project_id=$1)`, [projectId]);
        const [l, m, e, x] = await Promise.all([one("wbs_labour","cost"), one("wbs_material","total"), one("wbs_equipment","cost"), one("wbs_miscellaneous","cost")]);
        return [
          { key: "labour", label: "Labour", value: num(l.rows[0].v) }, { key: "material", label: "Material", value: num(m.rows[0].v) },
          { key: "equipment", label: "Equipment", value: num(e.rows[0].v) }, { key: "misc", label: "Miscellaneous", value: num(x.rows[0].v) },
        ];
      }, []),

      section("wbsOverview", async () => {
        const { rows } = await q(
          `SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE LOWER(status) LIKE 'complet%')   AS completed,
                  COUNT(*) FILTER (WHERE LOWER(status) LIKE '%progress%') AS in_progress,
                  COALESCE(ROUND(AVG(progress)),0) AS avg_progress
           FROM wbs WHERE ($1::int IS NULL OR project_id=$1)`, [projectId]);
        const r = rows[0];
        return { total: num(r.total), completed: num(r.completed), inProgress: num(r.in_progress), avgProgress: num(r.avg_progress) };
      }, { total: 0, completed: 0, inProgress: 0, avgProgress: 0 }),

      /* HR snapshot – four small counts in parallel */
      section("hr", async () => {
        const [emp, att, lv, pend] = await Promise.all([
          q(`SELECT COUNT(*) AS c FROM employees`),
          q(`SELECT COUNT(DISTINCT employee_id) AS c FROM attendance WHERE date=CURRENT_DATE AND LOWER(status) IN ('present','late','wfh')`),
          q(`SELECT COUNT(DISTINCT employee_id) AS c FROM leaves WHERE LOWER(status)='approved' AND CURRENT_DATE BETWEEN from_date AND to_date`),
          q(`SELECT COUNT(*) AS c FROM leaves WHERE LOWER(status)='pending'`),
        ]);
        return { employees: num(emp.rows[0].c), presentToday: num(att.rows[0].c), onLeave: num(lv.rows[0].c), pendingLeaves: num(pend.rows[0].c) };
      }, { employees: 0, presentToday: 0, onLeave: 0, pendingLeaves: 0 }),

      section("leads", async () => {
        const { rows } = await q(`SELECT COALESCE(status,'New') AS status, COUNT(*) AS c FROM leads
                                  WHERE COALESCE(deleted_by_admin,false)=false GROUP BY 1 ORDER BY 2 DESC`);
        return rows.map((r) => ({ status: r.status, count: num(r.c) }));
      }, []),

      section("managers", () => buildTodayStatus(), []),

      section("pendingReports", async () => {
        const { rows } = await q(`SELECT COUNT(*) AS c FROM manager_reports WHERE status='submitted'`);
        return num(rows[0].c);
      }, 0),

      section("pendingFin", async () => {
        const { rows } = await q(
          `SELECT COUNT(*) AS c FROM finance_daily_updates f
           JOIN users u ON u.id=f.submitted_by JOIN roles r ON r.id=u.role_id
           WHERE f.status='pending' AND ${ROLE_MATCH}`, [["finance_manager"]]);
        return num(rows[0].c);
      }, 0),
    ]);

  const data = {
    generatedAt: new Date().toISOString(),
    finance, monthly, projects, wbsCost, wbsOverview, hr, leads,
    managers: {
      list: managers,
      submittedToday: managers.filter((m) => m.submittedToday).length,
      total: managers.length,
      pendingReports, pendingFinanceUpdates,
    },
  };
  cache.set(key, { at: Date.now(), data });
  res.json(data);
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

  const [mr, fin, pmAt] = await Promise.all([
    section("today.mr", async () => {
      const { rows } = await pool.query(
        `SELECT submitted_by, MAX(created_at) AS at FROM manager_reports
         WHERE report_type='daily' AND created_at::date = CURRENT_DATE GROUP BY submitted_by`);
      return new Map(rows.map((r) => [r.submitted_by, r.at]));
    }, new Map()),
    section("today.fin", async () => {
      const { rows } = await pool.query(
        `SELECT submitted_by, MAX(updated_at) AS at FROM finance_daily_updates
         WHERE date = CURRENT_DATE GROUP BY submitted_by`);
      return new Map(rows.map((r) => [r.submitted_by, r.at]));
    }, new Map()),
    section("today.pm", async () => {
      const { rows } = await pool.query(
        `SELECT MAX(sent_to_ceo_at) AS at, COUNT(*) AS c FROM daily_reports WHERE date::date = CURRENT_DATE AND sent_to_ceo = TRUE`);
      return num(rows[0].c) > 0 ? rows[0].at || true : null;
    }, null),
  ]);

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

  const [fromReports, fromFinance, fromPM] = await Promise.all([
    /* 1 ─ HR / Operations / BDA daily updates (role-specific `details`) */
    section("feed.reports", async () => {
      const { rows } = await pool.query(
        `SELECT m.*, u.name AS submitter_name
         FROM manager_reports m JOIN users u ON u.id = m.submitted_by
         WHERE m.report_type='daily' AND m.created_at >= NOW() - ($1 || ' day')::interval`,
        [String(days)]
      );
      return rows.map((r) => ({
        uid: `mr-${r.id}`, source: "report", id: r.id,
        role: r.submitter_role, roleLabel: ROLE_LABEL[r.submitter_role] || r.submitter_role,
        manager: r.submitter_name, date: r.created_at, title: r.title,
        summary: r.summary, highlights: r.highlights, issues: r.issues, nextSteps: r.next_steps,
        fields: fieldsFromDetails(r.details),
        health: statusFromDetails(r.details) || (r.issues && r.issues.trim() ? "attention" : "on-track"),
        status: r.status === "submitted" ? "pending" : r.status,
        ceoComment: r.ceo_comment, reviewable: true,
      }));
    }, []),

    /* 2 ─ Finance Manager's own daily update ("Pending CEO review") */
    section("feed.finance", async () => {
      const { rows } = await pool.query(
        `SELECT f.*, u.name AS submitter_name
         FROM finance_daily_updates f
         JOIN users u ON u.id = f.submitted_by JOIN roles r ON r.id = u.role_id
         WHERE ${ROLE_MATCH} AND f.date >= CURRENT_DATE - ($2 || ' day')::interval`,
        [["finance_manager"], String(days)]
      );
      return rows.map((r) => ({
        uid: `fin-${r.id}`, source: "finance", id: r.id,
        role: "finance_manager", roleLabel: "Finance Manager",
        manager: r.submitter_name, date: r.date, title: "Finance daily update",
        summary: r.summary || "", fields: financeFields(r),
        health: r.overall_status || "on-track",
        status: r.status || "pending", ceoComment: r.review_note, reviewable: true,
      }));
    }, []),

    /* 3 ─ Project Manager reports, only once the PM pressed "Send to CEO" */
    section("feed.pm", async () => {
      const { rows } = await pool.query(
        `SELECT * FROM daily_reports
         WHERE sent_to_ceo = TRUE AND date::date >= CURRENT_DATE - ($1 || ' day')::interval`,
        [String(days)]
      );
      return rows.map((r) => {
        const d = typeof r.data === "string" ? JSON.parse(r.data || "{}") : (r.data || {});
        const iss = (Array.isArray(d.issues) ? d.issues : []).filter((i) => i && i.issue);
        const plan = (Array.isArray(d.tomorrowPlan) ? d.tomorrowPlan : []).filter((t) => t && t.activity);
        return {
          uid: `pm-${r.id}`, source: "project", id: r.id,
          role: "project_manager", roleLabel: "Project Manager",
          manager: r.submitted_by || "Project Manager", date: r.sent_to_ceo_at || r.date,
          title: r.project_name || "Project daily update",
          summary: d.pmRemarks || (r.phase ? `Phase: ${r.phase}` : "Daily site update"),
          issues: iss.map((i) => `• ${i.issue}${i.impact ? " (" + i.impact + ")" : ""}`).join("\n"),
          nextSteps: plan.map((t) => `• ${t.activity}${t.location ? " — " + t.location : ""}`).join("\n"),
          fields: pmFields({ ...d, projectName: d.projectName || r.project_name, phase: d.phase || r.phase }),
          health: r.overall_status || "on-track",
          status: r.approved ? "approved" : "pending", reviewable: false,
        };
      });
    }, []),
  ]);

  let items = [...fromReports, ...fromFinance, ...fromPM].filter((i) => codes.includes(i.role) || !i.role);
  if (roleFilter) items = items.filter((i) => i.role === roleFilter);
  if (statusFilter) items = items.filter((i) => i.status === statusFilter);
  items.sort((x, y) => new Date(y.date) - new Date(x.date));

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