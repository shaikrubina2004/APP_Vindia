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

      // WBS breakdown — Section 18: bring Finance data into the SAME
      // PROJECT -> WBS/Milestone structure the existing BOQ/cost_reports
      // architecture already uses (milestone_id -> wbs.id). Only
      // meaningful within a single project, so it's only computed when
      // a projectId is given; a company-wide call gets an empty array
      // rather than a cross-project WBS-code collision.
      let byWbs = [];
      if (projectId) {
        const wbsRollup = await pool.query(
          `WITH wbs_milestone AS (
             SELECT id, COALESCE(parent_id, id) AS milestone_id
             FROM wbs WHERE project_id = $1
           ),
           milestones AS (
             SELECT id, code, name FROM wbs WHERE project_id = $1 AND parent_id IS NULL
           ),
           bsum AS (
             SELECT wm.milestone_id, SUM(b.allocated_amount) AS allocated
             FROM budgets b JOIN wbs_milestone wm ON wm.id = b.wbs_id
             WHERE b.project_id = $1
             GROUP BY wm.milestone_id
           ),
           esum AS (
             SELECT wm.milestone_id, SUM(e.amount) AS spent
             FROM expenses e JOIN wbs_milestone wm ON wm.id = e.wbs_id
             WHERE e.project_id = $1 AND e.status IN ('approved','paid')
             GROUP BY wm.milestone_id
           ),
           isum AS (
             SELECT wm.milestone_id, SUM(i.amount) AS invoiced
             FROM invoices i JOIN wbs_milestone wm ON wm.id = i.wbs_id
             WHERE i.project_id = $1
             GROUP BY wm.milestone_id
           )
           SELECT m.id AS "milestoneId", m.code, m.name,
                  COALESCE(bsum.allocated, 0) AS allocated,
                  COALESCE(esum.spent, 0) AS spent,
                  COALESCE(isum.invoiced, 0) AS invoiced
           FROM milestones m
           LEFT JOIN bsum ON bsum.milestone_id = m.id
           LEFT JOIN esum ON esum.milestone_id = m.id
           LEFT JOIN isum ON isum.milestone_id = m.id
           ORDER BY m.code`,
          [projectId]
        );
        byWbs = wbsRollup.rows;
      }

      return {
        budgetVsActual: budgetVsActual.rows,
        byExpenseCategory: byExpenseCategory.rows,
        projectTotals: projectTotals.rows,
        byWbs,
      };
    },
  };

  module.exports = Finance;