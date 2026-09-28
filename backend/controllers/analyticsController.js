const pool = require("../config/db");

/* Each section runs independently. If one query fails (e.g. a column
   name differs in your DB) that section returns { error } and the rest
   of the dashboard still loads — check the server console for details. */
const section = async (name, fn) => {
  try {
    return await fn();
  } catch (err) {
    console.error(`analytics[${name}]:`, err.message);
    return { error: true };
  }
};

/* GET /api/analytics/overview  (CEO) */
exports.getOverview = async (req, res) => {
  const [projects, leads, hr, finance, reports] = await Promise.all([
    section("projects", async () => {
      const byStatus = await pool.query(
        `SELECT COALESCE(status,'Unknown') AS status, COUNT(*)::int AS count,
                COALESCE(SUM(budget),0)::float AS budget
         FROM projects GROUP BY 1 ORDER BY count DESC`
      );
      return {
        total: byStatus.rows.reduce((s, r) => s + r.count, 0),
        totalBudget: byStatus.rows.reduce((s, r) => s + r.budget, 0),
        byStatus: byStatus.rows,
      };
    }),

    section("leads", async () => {
      const byStatus = await pool.query(
        `SELECT COALESCE(status,'Unknown') AS status, COUNT(*)::int AS count
         FROM leads WHERE deleted_by_admin = false GROUP BY 1 ORDER BY count DESC`
      );
      const perBda = await pool.query(
        `SELECT COALESCE(NULLIF(TRIM(assigned_to),''),'Unassigned') AS bda,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE LOWER(status) = 'converted')::int AS converted
         FROM leads WHERE deleted_by_admin = false
         GROUP BY 1 ORDER BY total DESC`
      );
      const total = byStatus.rows.reduce((s, r) => s + r.count, 0);
      const converted = byStatus.rows
        .filter(r => r.status.toLowerCase() === "converted")
        .reduce((s, r) => s + r.count, 0);
      return {
        total, converted,
        conversionRate: total ? Math.round((converted / total) * 1000) / 10 : 0,
        byStatus: byStatus.rows,
        perBda: perBda.rows,
      };
    }),

    section("hr", async () => {
      const emp = await pool.query(`SELECT COUNT(*)::int AS count FROM employees`);
      const att = await pool.query(
        `SELECT LOWER(status) AS status, COUNT(*)::int AS count FROM (
           SELECT DISTINCT ON (employee_id) employee_id, status
           FROM attendance ORDER BY employee_id, date DESC
         ) t GROUP BY 1`
      );
      return { headcount: emp.rows[0].count, attendance: att.rows };
    }),

    section("finance", async () => {
      const inv = await pool.query(
        `SELECT COALESCE(LOWER(status),'unknown') AS status, COUNT(*)::int AS count,
                COALESCE(SUM(amount),0)::float AS amount
         FROM invoices GROUP BY 1 ORDER BY amount DESC`
      );
      const pay = await pool.query(
        `SELECT COALESCE(LOWER(status),'unknown') AS status, COUNT(*)::int AS count,
                COALESCE(SUM(amount),0)::float AS amount
         FROM payments GROUP BY 1 ORDER BY amount DESC`
      );
      return { invoices: inv.rows, payments: pay.rows };
    }),

    section("reports", async () => {
      const byStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM manager_reports GROUP BY 1`
      );
      const byRole = await pool.query(
        `SELECT submitter_role AS role, COUNT(*)::int AS count
         FROM manager_reports GROUP BY 1 ORDER BY count DESC`
      );
      return { byStatus: byStatus.rows, byRole: byRole.rows };
    }),
  ]);

  res.json({ projects, leads, hr, finance, reports, generatedAt: new Date().toISOString() });
};