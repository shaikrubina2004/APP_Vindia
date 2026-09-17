// backend/models/receivablesPayablesModel.js

const pool = require("../config/db");
/* =========================================================
   Helpers
========================================================= */

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getInvoiceState(total, received, dueDate) {
  const outstanding = Math.max(total - received, 0);

  if (outstanding <= 0) {
    return "paid";
  }

  if (received > 0) {
    return "partially paid";
  }

  if (dueDate && new Date(dueDate) < new Date()) {
    return "overdue";
  }

  return "pending";
}

function getPayableState(expenses, paid) {
  const outstanding = Math.max(expenses - paid, 0);

  if (outstanding <= 0) {
    return "paid";
  }

  if (paid > 0) {
    return "partially paid";
  }

  return "pending";
}

function buildSearchCondition(search, values, aliases = {}) {
  if (!search) {
    return "";
  }

  const invoiceAlias = aliases.invoice || "i";
  const projectAlias = aliases.project || "p";
  const vendorAlias = aliases.vendor || "v";

  values.push(`%${search}%`);

  return `
    AND (
      CAST(${invoiceAlias}.invoice_number AS TEXT) ILIKE $${values.length}
      OR COALESCE(CAST(${invoiceAlias}.client_name AS TEXT), '') ILIKE $${values.length}
      OR COALESCE(CAST(${projectAlias}.name AS TEXT), '') ILIKE $${values.length}
      OR COALESCE(CAST(${vendorAlias}.name AS TEXT), '') ILIKE $${values.length}
    )
  `;
}

/* =========================================================
   RECEIVABLES
========================================================= */

async function getReceivables(filters = {}) {
  const {
    search = "",
    project_id,
    from,
    to,
    status
  } = filters;

  const values = [];
  const conditions = [];

  if (project_id) {
    values.push(project_id);
    conditions.push(`i.project_id = $${values.length}`);
  }

  if (from) {
    values.push(from);
    conditions.push(`i.issue_date >= $${values.length}`);
  }

  if (to) {
    values.push(to);
    conditions.push(`i.issue_date <= $${values.length}`);
  }

  const searchCondition = buildSearchCondition(
    search,
    values,
    {
      invoice: "i",
      project: "p"
    }
  );

  const whereClause = `
    WHERE 1 = 1
    ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
    ${searchCondition}
  `;

  const query = `
    SELECT
      i.id,
      i.invoice_number,
      i.client_name,
      i.project_id,
      p.name AS project_name,
      i.issue_date AS invoice_date,
      i.due_date,

      COALESCE(i.amount, 0) AS total,

      COALESCE(
        SUM(
          CASE
            WHEN LOWER(COALESCE(pay.payment_type, '')) IN (
              'incoming',
              'received',
              'receivable',
              'customer'
            )
            AND LOWER(COALESCE(pay.status, 'completed')) IN (
              'completed',
              'paid',
              'approved',
              'success'
            )
            THEN COALESCE(pay.amount, 0)
            ELSE 0
          END
        ),
        0
      ) AS received,

      i.status AS invoice_status

    FROM invoices i

    LEFT JOIN projects p
      ON p.id = i.project_id

    LEFT JOIN payments pay
      ON pay.invoice_id = i.id

    ${whereClause}

    GROUP BY
    i.id,
    i.invoice_number,
    i.client_name,
    i.project_id,
    p.name,
    i.issue_date,
    i.due_date,
    i.amount,
    i.status

    ORDER BY i.issue_date DESC, i.id DESC
  `;

  const result = await pool.query(query, values);

  let receivables = result.rows.map((row) => {
    const total = toNumber(row.total);
    const received = toNumber(row.received);
    const outstanding = Math.max(total - received, 0);

    const state = getInvoiceState(
      total,
      received,
      row.due_date
    );

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      clientName: row.client_name,
      projectId: row.project_id,
      projectName: row.project_name,
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,

      total,
      received,
      outstanding,

      state,

      // Always derive this from the payment values.
      invoiceStatus: state
    };
  });

  if (status) {
    receivables = receivables.filter(
      (item) =>
        String(item.state).toLowerCase() ===
        String(status).toLowerCase()
    );
  }

  return receivables;
}

/* =========================================================
   PAYABLES
========================================================= */

async function getPayables(filters = {}) {
  const {
    search = "",
    project_id,
    vendor_id,
    from,
    to,
    status
  } = filters;

  const values = [];
  const conditions = [];

  if (project_id) {
    values.push(project_id);
    conditions.push(`e.project_id = $${values.length}`);
  }

  if (vendor_id) {
    values.push(vendor_id);
    conditions.push(`e.vendor_id = $${values.length}`);
  }

  if (from) {
    values.push(from);
    conditions.push(`e.expense_date >= $${values.length}`);
  }

  if (to) {
    values.push(to);
    conditions.push(`e.expense_date <= $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);

    conditions.push(`
      (
        COALESCE(CAST(v.name AS TEXT), '') ILIKE $${values.length}
        OR COALESCE(CAST(p.name AS TEXT), '') ILIKE $${values.length}
      )
    `);
  }

  const whereClause = `
    WHERE 1 = 1
    ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
  `;

  const query = `
    WITH expense_totals AS (
      SELECT
        e.vendor_id,
        e.project_id,

        COALESCE(v.name, 'Unlinked vendor') AS vendor_name,
        COALESCE(p.name, 'Unlinked project') AS project_name,

        COALESCE(SUM(e.amount), 0) AS expenses,

        COALESCE(
          SUM(e.amount) FILTER (
            WHERE LOWER(COALESCE(e.status, 'pending')) = 'pending'
          ),
          0
        ) AS pending_amount,

        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(e.status, 'pending')) = 'pending'
        ) AS pending_count,

        COUNT(*) AS expense_count

      FROM expenses e

      LEFT JOIN vendors v
        ON v.id = e.vendor_id

      LEFT JOIN projects p
        ON p.id = e.project_id

      ${whereClause}

      GROUP BY
        e.vendor_id,
        e.project_id,
        v.name,
        p.name
    ),

    payment_totals AS (
      SELECT
        pay.vendor_id,
        pay.project_id,

        COALESCE(
          SUM(pay.amount) FILTER (
            WHERE LOWER(COALESCE(pay.payment_type, '')) IN (
              'outgoing',
              'paid',
              'payable',
              'vendor'
            )
            AND LOWER(COALESCE(pay.status, 'completed')) IN (
              'completed',
              'paid',
              'approved',
              'success'
            )
          ),
          0
        ) AS paid

      FROM payments pay

      GROUP BY
        pay.vendor_id,
        pay.project_id
    )

    SELECT
      et.vendor_id,
      et.vendor_name,
      et.project_id,
      et.project_name,

      et.expenses,
      et.pending_amount,
      et.pending_count,
      et.expense_count,

      COALESCE(pt.paid, 0) AS paid

    FROM expense_totals et

    LEFT JOIN payment_totals pt
      ON pt.vendor_id IS NOT DISTINCT FROM et.vendor_id
      AND pt.project_id IS NOT DISTINCT FROM et.project_id

    ORDER BY et.expenses DESC
  `;

  const result = await pool.query(query, values);

  let payables = result.rows.map((row) => {
    const expenses = toNumber(row.expenses);
    const paid = toNumber(row.paid);

    const outstanding = Math.max(expenses - paid, 0);

    const state = getPayableState(
      expenses,
      paid
    );

    return {
      vendorId: row.vendor_id,
      vendorName: row.vendor_name || "Unlinked vendor",

      projectId: row.project_id,
      projectName: row.project_name || "Unlinked project",

      expenses,
      paid,

      // pending is now an AMOUNT, not a count.
      pending: toNumber(row.pending_amount),

      // Separate count field.
      pendingCount: Number(row.pending_count || 0),

      outstanding,
      state,

      expenseCount: Number(row.expense_count || 0)
    };
  });

  if (status) {
    payables = payables.filter(
      (item) =>
        String(item.state).toLowerCase() ===
        String(status).toLowerCase()
    );
  }

  return payables;
}

/* =========================================================
   SUMMARY
========================================================= */

async function getSummary(receivables, payables) {
  const receivableSummary = receivables.reduce(
    (summary, item) => {
      summary.total += toNumber(item.total);
      summary.received += toNumber(item.received);
      summary.outstanding += toNumber(item.outstanding);

      if (item.state === "overdue") {
        summary.overdue += toNumber(item.outstanding);
      }

      return summary;
    },
    {
      total: 0,
      received: 0,
      outstanding: 0,
      overdue: 0
    }
  );

  const payableSummary = payables.reduce(
    (summary, item) => {
      summary.total += toNumber(item.expenses);
      summary.paid += toNumber(item.paid);
      summary.outstanding += toNumber(item.outstanding);
      summary.pending += toNumber(item.pending);

      return summary;
    },
    {
      total: 0,
      paid: 0,
      outstanding: 0,
      pending: 0
    }
  );

  return {
    receivables: receivableSummary,
    payables: payableSummary
  };
}

/* =========================================================
   COMPLETE REPORT
========================================================= */

async function getReport(filters = {}) {
  const [receivables, payables] = await Promise.all([
    getReceivables(filters),
    getPayables(filters)
  ]);

  const summary = await getSummary(
    receivables,
    payables
  );

  return {
    receivables,
    payables,
    summary
  };
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getReceivables,
  getPayables,
  getSummary,
  getReport
};