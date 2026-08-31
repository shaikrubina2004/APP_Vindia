// ===== FILE: APP_Vindia/backend/models/financeModel.js =====
const pool = require("../config/db");

const Finance = {
  // ── Dashboard KPIs (FinanceManagerDashboard.jsx) ─────────────────
  getDashboard: async (projectId) => {
    const values = [];
    let projectFilter = "";
    if (projectId) {
      values.push(projectId);
      projectFilter = `AND project_id = $1`;
    }

    const revenue = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS "totalRevenue"
       FROM invoices WHERE status = 'paid' ${projectFilter}`,
      values
    );
    const expenses = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS "totalExpenses"
       FROM expenses WHERE status IN ('approved','paid') ${projectFilter}`,
      values
    );
    const pending = await pool.query(
      `SELECT COUNT(*)::int AS "pendingInvoices", COALESCE(SUM(amount),0) AS "pendingAmount"
       FROM invoices WHERE status = 'pending' ${projectFilter}`,
      values
    );

    const totalRevenue = Number(revenue.rows[0].totalRevenue);
    const totalExpenses = Number(expenses.rows[0].totalExpenses);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      pendingInvoices: pending.rows[0].pendingInvoices,
      pendingAmount: Number(pending.rows[0].pendingAmount),
    };
  },

  // Monthly revenue vs expenses, last 12 months (bar chart)
  getMonthlyTrend: async (projectId) => {
    const values = [];
    let projectFilterInv = "";
    let projectFilterExp = "";
    if (projectId) {
      values.push(projectId);
      projectFilterInv = `AND i.project_id = $1`;
      projectFilterExp = `AND e.project_id = $1`;
    }
    const result = await pool.query(
      `WITH months AS (
         SELECT to_char(d, 'Mon') AS month, date_trunc('month', d) AS month_start
         FROM generate_series(date_trunc('month', NOW()) - INTERVAL '11 months', date_trunc('month', NOW()), INTERVAL '1 month') d
       ),
       rev AS (
         SELECT date_trunc('month', i.issue_date) AS month_start, SUM(i.amount) AS revenue
         FROM invoices i WHERE i.status = 'paid' ${projectFilterInv}
         GROUP BY 1
       ),
       exp AS (
         SELECT date_trunc('month', e.expense_date) AS month_start, SUM(e.amount) AS expenses
         FROM expenses e WHERE e.status IN ('approved','paid') ${projectFilterExp}
         GROUP BY 1
       )
       SELECT m.month, COALESCE(rev.revenue,0) AS revenue, COALESCE(exp.expenses,0) AS expenses
       FROM months m
       LEFT JOIN rev ON rev.month_start = m.month_start
       LEFT JOIN exp ON exp.month_start = m.month_start
       ORDER BY m.month_start`,
      values
    );
    return result.rows;
  },

  // ── Cost Reporting (CostReporting.jsx) ───────────────────────────
  getCostReportSummary: async (projectId) => {
    const values = [];
    let projectFilter = "";
    if (projectId) {
      values.push(projectId);
      projectFilter = `AND project_id = $1`;
    }
    const budgetVsActual = await pool.query(
      `SELECT b.category,
              COALESCE(SUM(b.allocated_amount),0) AS allocated,
              COALESCE(SUM(b.spent_amount),0) AS spent
       FROM budgets b WHERE 1=1 ${projectFilter}
       GROUP BY b.category ORDER BY allocated DESC`,
      values
    );
    const byExpenseCategory = await pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS total
       FROM expenses WHERE 1=1 ${projectFilter}
       GROUP BY category ORDER BY total DESC`,
      values
    );
    const projectTotals = await pool.query(
      `SELECT p.id, p.name,
              COALESCE(b.allocated,0) AS allocated,
              COALESCE(e.spent,0) AS spent
       FROM projects p
       LEFT JOIN (SELECT project_id, SUM(allocated_amount) AS allocated FROM budgets GROUP BY project_id) b ON b.project_id = p.id
       LEFT JOIN (SELECT project_id, SUM(amount) AS spent FROM expenses WHERE status IN ('approved','paid') GROUP BY project_id) e ON e.project_id = p.id
       ${projectId ? "WHERE p.id = $1" : ""}
       ORDER BY p.name`,
      values
    );
    return {
      budgetVsActual: budgetVsActual.rows,
      byExpenseCategory: byExpenseCategory.rows,
      projectTotals: projectTotals.rows,
    };
  },
};

module.exports = Finance;