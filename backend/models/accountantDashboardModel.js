// ===== FILE: APP_Vindia/backend/models/accountantDashboardModel.js =====
//
// Dedicated model for the Accountant dashboard. Deliberately kept
// separate from models/financeModel.js — that file backs the Finance
// Manager dashboard and must not be modified or reused here.
//
// STATUS VALUE NOTE (unchanged from Phase 4A, confirmed against Supabase):
//   invoices.status  contains 'pending' among others
//   expenses.status  contains 'approved', 'paid', 'pending'
//   payments.status  contains 'completed' ('pending'/'processing' valid but unused)
//   vendors.status   contains 'active' ('inactive' the only other value)
//   journal_entries.status contains draft/submitted/approved/posted/reversed
//     (CHECK constraint enforced — see migrations/createJournalEntriesTables.js)
//   bank_reconciliations.status contains in_progress/reconciled (CHECK constraint)
//   petty_cash_transactions.status contains pending/approved/rejected (CHECK constraint)
//   tax_register.status contains pending/filed (CHECK constraint)
//   chart_of_accounts.account_type contains asset/liability/equity/revenue/expense (CHECK constraint)
//
// Reuse policy for this expansion:
//   - receivables/payables: reuses receivablesPayablesModel.getReport()
//     (project_id-filtered) rather than re-deriving "overdue"/"pending"
//     business logic, per instruction not to invent a second definition.
//   - petty cash balance: reuses pettyCashModel.getBalance(projectId)
//     exactly, since the balance MUST use approved-only transactions the
//     same way that function already defines.
//   - journal entries, bank reconciliation, budget, tax register, chart
//     of accounts, and general ledger (posted-only) are new aggregate
//     SQL written directly here, per instruction to implement new
//     dashboard-only aggregates in this file rather than modifying
//     journalEntryModel.js / bankReconciliationModel.js / budgetModel.js /
//     taxRegisterModel.js / chartOfAccountsModel.js / ledgerModel.js.
//     The general ledger query mirrors the SAME posted-only filtering
//     pattern already fixed in ledgerModel.getTrialBalance (INNER JOIN +
//     WHERE je.status='posted' in a subquery, not a LEFT JOIN ON
//     condition) — that fix is not undone or duplicated incorrectly here.

const pool = require("../config/db");
const ReceivablesPayables = require("./receivablesPayablesModel");
const PettyCash = require("./pettyCashModel");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const AccountantDashboard = {
  /**
   * @param {number|null} projectId - validated positive integer, or null for global view
   */
  getDashboard: async (projectId) => {
    const hasProjectFilter = projectId !== null && projectId !== undefined;
    const params = hasProjectFilter ? [projectId] : [];
    const pf = hasProjectFilter ? "AND project_id = $1" : "";

    const [
      // ── Financial Overview (existing 4 metrics — unchanged queries) ──
      pendingInvoicesRes,
      expensesAwaitingVerificationRes,
      paymentsToProcessRes,
      activeVendorsRes,

      // ── Work Queue ──
      journalEntriesRes,
      bankReconciliationRes,

      // ── Financial Control ──
      budgetRes,
      receivablesPayablesReport,

      // ── Tax & Cash ──
      taxRes,
      pettyCashBalance,
      pettyCashPendingRes,

      // ── Accounting Core ──
      chartOfAccountsRes,
      generalLedgerRes,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS amount
         FROM invoices WHERE status = 'pending' ${pf}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS amount
         FROM expenses WHERE status = 'pending' ${pf}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS amount
         FROM payments WHERE status IN ('pending', 'processing') ${pf}`,
        params
      ),
      // vendors: no project_id column — intentionally global, unchanged.
      pool.query(`SELECT COUNT(*)::int AS count FROM vendors WHERE status = 'active'`),

      // Journal entry status counts — single aggregation query, no JS math.
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'draft')::int     AS draft,
           COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
           COUNT(*) FILTER (WHERE status = 'approved')::int  AS approved,
           COUNT(*) FILTER (WHERE status = 'posted')::int    AS posted,
           COUNT(*) FILTER (WHERE status = 'reversed')::int  AS reversed
         FROM journal_entries WHERE 1=1 ${pf}`,
        params
      ),

      // Bank reconciliation — no project_id column on this table (linked
      // via bank_account_id only, confirmed in the migration), so this
      // is intentionally NOT project-filtered, matching the spec.
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'in_progress')::int AS "inProgress",
           COUNT(*) FILTER (WHERE status = 'reconciled')::int  AS reconciled,
           COUNT(*)::int AS total
         FROM bank_reconciliations`
      ),

      // Budget aggregate — same allocated/spent meaning as budgetModel.js,
      // applied across all matching budgets rather than per-row.
      pool.query(
        `SELECT
           COALESCE(SUM(allocated_amount),0) AS allocated,
           COALESCE(SUM(spent_amount),0)     AS spent
         FROM budgets WHERE 1=1 ${pf}`,
        params
      ),

      // Receivables/Payables — reused as-is via the existing model,
      // project-filtered the same way its own page filters it.
      ReceivablesPayables.getReport(
        hasProjectFilter ? { project_id: projectId } : {}
      ),

      // Tax register aggregate.
      pool.query(
        `SELECT
           COUNT(*)::int AS "recordCount",
           COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingCount",
           COUNT(*) FILTER (WHERE status = 'filed')::int   AS "filedCount",
           COALESCE(SUM(taxable_amount),0) AS "taxableAmount",
           COALESCE(SUM(tax_amount),0)     AS "taxAmount"
         FROM tax_register WHERE 1=1 ${pf}`,
        params
      ),

      // Petty cash balance — reused exactly via pettyCashModel.getBalance,
      // which already restricts to status='approved' transactions.
      PettyCash.getBalance(projectId),

      // Petty cash pending count — new, dashboard-only aggregate (not in
      // pettyCashModel.js, per instruction to add it here instead).
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM petty_cash_transactions WHERE status = 'pending' ${pf}`,
        params
      ),

      // Chart of Accounts — counts only, not project-filtered (accounts
      // are not project-scoped).
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE is_active = true)::int      AS "activeAccounts",
           COUNT(*) FILTER (WHERE account_type = 'asset')::int     AS assets,
           COUNT(*) FILTER (WHERE account_type = 'liability')::int AS liabilities,
           COUNT(*) FILTER (WHERE account_type = 'equity')::int    AS equity,
           COUNT(*) FILTER (WHERE account_type = 'revenue')::int   AS revenue,
           COUNT(*) FILTER (WHERE account_type = 'expense')::int   AS expenses
         FROM chart_of_accounts`
      ),

      // General Ledger — posted-only, same correct pattern as the fixed
      // ledgerModel.getTrialBalance (INNER JOIN + WHERE in a subquery,
      // not a LEFT JOIN ON condition that would silently include
      // non-posted lines).
      pool.query(
        `SELECT
           COALESCE(SUM(jel.debit),0)  AS "postedDebit",
           COALESCE(SUM(jel.credit),0) AS "postedCredit"
         FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.journal_entry_id
         WHERE je.status = 'posted' ${hasProjectFilter ? "AND je.project_id = $1" : ""}`,
        params
      ),
    ]);

    const je = journalEntriesRes.rows[0];
    const br = bankReconciliationRes.rows[0];
    const bud = budgetRes.rows[0];
    const tax = taxRes.rows[0];
    const coa = chartOfAccountsRes.rows[0];
    const gl = generalLedgerRes.rows[0];
    const pcPending = pettyCashPendingRes.rows[0];

    const allocatedAmount = num(bud.allocated);
    const spentAmount = num(bud.spent);
    const remainingAmount = allocatedAmount - spentAmount;
    // Same formula as budgetModel.js's per-row utilizationPct, applied
    // to the aggregate sums instead of a single row.
    const utilizationPct =
      allocatedAmount > 0 ? Math.round((spentAmount / allocatedAmount) * 1000) / 10 : 0;

    // Keep the expanded structure as the canonical API contract.
    // The four legacy fields are retained as additive aliases so older
    // Accountant dashboard builds can consume the same endpoint during
    // a rolling local restart without breaking the new UI.
    return {
      dashboardVersion: "2.0",

      financialOverview: {
        pendingInvoices: {
          count: num(pendingInvoicesRes.rows[0].count),
          amount: num(pendingInvoicesRes.rows[0].amount),
        },
        expensesAwaitingVerification: {
          count: num(expensesAwaitingVerificationRes.rows[0].count),
          amount: num(expensesAwaitingVerificationRes.rows[0].amount),
        },
        paymentsToProcess: {
          count: num(paymentsToProcessRes.rows[0].count),
          amount: num(paymentsToProcessRes.rows[0].amount),
        },
        activeVendors: {
          count: num(activeVendorsRes.rows[0].count),
        },
      },

      workQueue: {
        journalEntries: {
          draft: num(je.draft),
          submitted: num(je.submitted),
          approved: num(je.approved),
          posted: num(je.posted),
          reversed: num(je.reversed),
        },
        bankReconciliation: {
          inProgress: num(br.inProgress),
          reconciled: num(br.reconciled),
          total: num(br.total),
        },
      },

      financialControl: {
        budget: {
          allocatedAmount,
          spentAmount,
          remainingAmount,
          utilizationPct,
        },
        receivables: {
          outstanding: num(receivablesPayablesReport.summary.receivables.outstanding),
          overdue: num(receivablesPayablesReport.summary.receivables.overdue),
        },
        payables: {
          outstanding: num(receivablesPayablesReport.summary.payables.outstanding),
          pending: num(receivablesPayablesReport.summary.payables.pending),
        },
      },

      taxAndCash: {
        tax: {
          recordCount: num(tax.recordCount),
          pendingCount: num(tax.pendingCount),
          filedCount: num(tax.filedCount),
          taxableAmount: num(tax.taxableAmount),
          taxAmount: num(tax.taxAmount),
        },
        pettyCash: {
          totalInflow: num(pettyCashBalance.totalInflow),
          totalOutflow: num(pettyCashBalance.totalOutflow),
          balance: num(pettyCashBalance.balance),
          pendingCount: num(pcPending.count),
        },
      },

      accountingCore: {
        chartOfAccounts: {
          activeAccounts: num(coa.activeAccounts),
          assets: num(coa.assets),
          liabilities: num(coa.liabilities),
          equity: num(coa.equity),
          revenue: num(coa.revenue),
          expenses: num(coa.expenses),
        },
        generalLedger: {
          postedDebit: num(gl.postedDebit),
          postedCredit: num(gl.postedCredit),
        },
      },

      // Backward-compatible aliases. These do not replace the new nested
      // contract; they only keep older clients from breaking while the
      // backend is restarted across development environments.
      pendingInvoices: {
        count: num(pendingInvoicesRes.rows[0].count),
        amount: num(pendingInvoicesRes.rows[0].amount),
      },
      expensesAwaitingVerification: {
        count: num(expensesAwaitingVerificationRes.rows[0].count),
        amount: num(expensesAwaitingVerificationRes.rows[0].amount),
      },
      paymentsToProcess: {
        count: num(paymentsToProcessRes.rows[0].count),
        amount: num(paymentsToProcessRes.rows[0].amount),
      },
      activeVendors: {
        count: num(activeVendorsRes.rows[0].count),
      },
    };
  },
};

module.exports = AccountantDashboard;
