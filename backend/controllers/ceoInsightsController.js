// One aggregated call for the CEO Dashboard + Analytics pages.
// Every block is wrapped so a missing table/column only empties that block –
// the rest of the dashboard still renders.

const pool = require("../config/db");
const { asyncHandler } = require("../middleware/errorHandler");
const { buildSummary } = require("./ceoDailyReportController");

const safe = async (label, fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    console.error(`[ceo-dashboard] ${label} skipped:`, err.message);
    return fallback;
  }
};

exports.overview = asyncHandler(async (req, res) => {
  const [employees, projects, leads, finance, reports, users] = await Promise.all([
    /* ── People ── */
    safe("employees", async () => {
      const total = await pool.query(`SELECT COUNT(*)::int AS c FROM employees`);
      let onLeave = 0;
      try {
        const l = await pool.query(
          `SELECT COUNT(DISTINCT employee_id)::int AS c FROM leave_requests
           WHERE status = 'Approved' AND CURRENT_DATE BETWEEN from_date AND to_date`
        );
        onLeave = l.rows[0].c;
      } catch (_) {}
      let present = 0;
      try {
        const a = await pool.query(
          `SELECT COUNT(*)::int AS c FROM attendance
           WHERE date = CURRENT_DATE AND LOWER(status) IN ('present','late','wfh')`
        );
        present = a.rows[0].c;
      } catch (_) {}
      return { total: total.rows[0].c, onLeave, present };
    }, { total: 0, onLeave: 0, present: 0 }),

    /* ── Projects ── */
    safe("projects", async () => {
      const { rows } = await pool.query(
        `SELECT id, name, client, progress, status, budget, end_date
         FROM projects ORDER BY created_at DESC`
      );
      const active = rows.filter((p) => !["completed", "closed"].includes(String(p.status || "").toLowerCase()));
      const avg = rows.length
        ? Math.round(rows.reduce((s, p) => s + Number(p.progress || 0), 0) / rows.length)
        : 0;
      return {
        total: rows.length,
        active: active.length,
        avgProgress: avg,
        totalBudget: rows.reduce((s, p) => s + Number(p.budget || 0), 0),
        list: rows.slice(0, 10).map((p) => ({
          id: p.id, name: p.name, client: p.client,
          progress: Number(p.progress || 0), status: p.status, budget: Number(p.budget || 0),
          end_date: p.end_date,
        })),
      };
    }, { total: 0, active: 0, avgProgress: 0, totalBudget: 0, list: [] }),

    /* ── Leads / BD ── */
    safe("leads", async () => {
      const total = await pool.query(`SELECT COUNT(*)::int AS c FROM leads WHERE deleted_by_admin = false`);
      const byStatus = await pool.query(
        `SELECT INITCAP(LOWER(status)) AS status, COUNT(*)::int AS count
         FROM leads WHERE deleted_by_admin = false GROUP BY 1 ORDER BY count DESC`
      );
      const bySource = await pool.query(
        `SELECT INITCAP(LOWER(COALESCE(source,'Unknown'))) AS source, COUNT(*)::int AS count
         FROM leads WHERE deleted_by_admin = false GROUP BY 1 ORDER BY count DESC LIMIT 6`
      );
      const monthly = await pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE LOWER(status)='converted')::int AS converted
         FROM leads WHERE deleted_by_admin = false
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at) DESC LIMIT 8`
      );
      const today = await pool.query(
        `SELECT COUNT(*)::int AS c FROM leads WHERE deleted_by_admin = false AND created_at::date = CURRENT_DATE`
      );
      const converted = byStatus.rows.find((r) => r.status === "Converted")?.count || 0;
      return {
        total: total.rows[0].c,
        converted,
        today: today.rows[0].c,
        conversionRate: total.rows[0].c ? Math.round((converted / total.rows[0].c) * 100) : 0,
        byStatus: byStatus.rows,
        bySource: bySource.rows,
        monthly: monthly.rows.reverse(),
      };
    }, { total: 0, converted: 0, today: 0, conversionRate: 0, byStatus: [], bySource: [], monthly: [] }),

    /* ── Finance (paid invoices vs approved expenses, last 12 months) ── */
    safe("finance", async () => {
      const Finance = require("../models/financeModel");
      const monthlyTrend = await Finance.getMonthlyTrend();
      const trend = monthlyTrend.map((m) => ({
        month: m.month, revenue: Number(m.revenue), expenses: Number(m.expenses),
      }));
      const revenue = trend.reduce((s, m) => s + m.revenue, 0);
      const expenses = trend.reduce((s, m) => s + m.expenses, 0);
      const last = trend[trend.length - 1] || { revenue: 0, expenses: 0 };
      const prev = trend[trend.length - 2] || { revenue: 0, expenses: 0 };
      const change = prev.revenue ? Math.round(((last.revenue - prev.revenue) / prev.revenue) * 100) : 0;
      return { trend, revenue, expenses, profit: revenue - expenses, thisMonth: last, revenueChange: change };
    }, { trend: [], revenue: 0, expenses: 0, profit: 0, thisMonth: { revenue: 0, expenses: 0 }, revenueChange: 0 }),

    /* ── Manager reports ── */
    safe("reports", () => buildSummary(), {
      pending: 0, approved: 0, rejected: 0, critical: 0, today: 0, total: 0,
      byType: [], trend: [], recent: [],
    }),

    /* ── Users awaiting role ── */
    safe("users", async () => {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM users WHERE LOWER(COALESCE(status,'')) = 'pending'`
      );
      return { pending: rows[0].c };
    }, { pending: 0 }),
  ]);

  res.json({ success: true, data: { employees, projects, leads, finance, reports, users } });
});