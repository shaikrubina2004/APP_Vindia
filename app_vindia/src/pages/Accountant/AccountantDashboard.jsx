import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  Landmark,
  PieChart,
  Receipt,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
} from "lucide-react";

import accountantService from "../../services/accountantService";
import { useProject } from "../../context/ProjectContext";
import { FINANCE_PERMISSIONS } from "../../config/financePermissions";
import { ROLES } from "../../roles";

import "./AccountantDashboard.css";

const ZERO = 0;

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : ZERO;
};

const formatCurrency = (value) => {
  const number = toNumber(value);

  if (Math.abs(number) >= 10000000) {
    return `₹${(number / 10000000).toFixed(2)} Cr`;
  }

  if (Math.abs(number) >= 100000) {
    return `₹${(number / 100000).toFixed(2)} L`;
  }

  if (Math.abs(number) >= 1000) {
    return `₹${Math.round(number).toLocaleString("en-IN")}`;
  }

  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatCompactCurrency = (value) => {
  const number = toNumber(value);

  if (Math.abs(number) >= 10000000) return `₹${(number / 10000000).toFixed(1)}Cr`;
  if (Math.abs(number) >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (Math.abs(number) >= 1000) return `₹${(number / 1000).toFixed(1)}K`;
  return formatCurrency(number);
};

const accountantPermissions = FINANCE_PERMISSIONS[ROLES.ACCOUNTANT] || {};

const canView = (moduleName) =>
  Array.isArray(accountantPermissions[moduleName]) &&
  accountantPermissions[moduleName].includes("view");

const hasVerifyPermission =
  Array.isArray(accountantPermissions.expenses) &&
  accountantPermissions.expenses.includes("verify");

const EMPTY_DASHBOARD = {
  financialOverview: {
    pendingInvoices: { count: 0, amount: 0 },
    expensesAwaitingVerification: { count: 0, amount: 0 },
    paymentsToProcess: { count: 0, amount: 0 },
    activeVendors: { count: 0 },
  },
  workQueue: {
    journalEntries: {
      draft: 0,
      submitted: 0,
      approved: 0,
      posted: 0,
      reversed: 0,
    },
    bankReconciliation: {
      inProgress: 0,
      reconciled: 0,
      total: 0,
    },
  },
  financialControl: {
    budget: {
      allocatedAmount: 0,
      spentAmount: 0,
      remainingAmount: 0,
      utilizationPct: 0,
    },
    receivables: { outstanding: 0, overdue: 0 },
    payables: { outstanding: 0, pending: 0 },
  },
  taxAndCash: {
    tax: {
      recordCount: 0,
      pendingCount: 0,
      filedCount: 0,
      taxableAmount: 0,
      taxAmount: 0,
    },
    pettyCash: {
      totalInflow: 0,
      totalOutflow: 0,
      balance: 0,
      pendingCount: 0,
    },
  },
  accountingCore: {
    chartOfAccounts: {
      activeAccounts: 0,
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expenses: 0,
    },
    generalLedger: {
      postedDebit: 0,
      postedCredit: 0,
    },
  },
};

/*
 * The backend's new dashboard contract is the preferred shape.
 * A small compatibility layer is intentionally kept here so the page
 * cannot crash if an older backend process is still running after a
 * frontend refresh. Missing new sections are shown as zero and a warning
 * is displayed instead of silently pretending those values were loaded.
 */
const normalizeDashboard = (raw) => {
  const source = raw && typeof raw === "object" ? raw : {};
  const legacyOverview = {
    pendingInvoices: source.pendingInvoices,
    expensesAwaitingVerification: source.expensesAwaitingVerification,
    paymentsToProcess: source.paymentsToProcess,
    activeVendors: source.activeVendors,
  };

  const nested = source.financialOverview || {};
  const financialOverview = source.financialOverview
    ? nested
    : legacyOverview;

  const merge = (base, value) => ({ ...base, ...(value || {}) });

  const result = {
    financialOverview: {
      pendingInvoices: merge(
        EMPTY_DASHBOARD.financialOverview.pendingInvoices,
        financialOverview.pendingInvoices
      ),
      expensesAwaitingVerification: merge(
        EMPTY_DASHBOARD.financialOverview.expensesAwaitingVerification,
        financialOverview.expensesAwaitingVerification
      ),
      paymentsToProcess: merge(
        EMPTY_DASHBOARD.financialOverview.paymentsToProcess,
        financialOverview.paymentsToProcess
      ),
      activeVendors: merge(
        EMPTY_DASHBOARD.financialOverview.activeVendors,
        financialOverview.activeVendors
      ),
    },
    workQueue: {
      journalEntries: merge(
        EMPTY_DASHBOARD.workQueue.journalEntries,
        source.workQueue?.journalEntries
      ),
      bankReconciliation: merge(
        EMPTY_DASHBOARD.workQueue.bankReconciliation,
        source.workQueue?.bankReconciliation
      ),
    },
    financialControl: {
      budget: merge(
        EMPTY_DASHBOARD.financialControl.budget,
        source.financialControl?.budget
      ),
      receivables: merge(
        EMPTY_DASHBOARD.financialControl.receivables,
        source.financialControl?.receivables
      ),
      payables: merge(
        EMPTY_DASHBOARD.financialControl.payables,
        source.financialControl?.payables
      ),
    },
    taxAndCash: {
      tax: merge(EMPTY_DASHBOARD.taxAndCash.tax, source.taxAndCash?.tax),
      pettyCash: merge(
        EMPTY_DASHBOARD.taxAndCash.pettyCash,
        source.taxAndCash?.pettyCash
      ),
    },
    accountingCore: {
      chartOfAccounts: merge(
        EMPTY_DASHBOARD.accountingCore.chartOfAccounts,
        source.accountingCore?.chartOfAccounts
      ),
      generalLedger: merge(
        EMPTY_DASHBOARD.accountingCore.generalLedger,
        source.accountingCore?.generalLedger
      ),
    },
  };

  const newContractLoaded = Boolean(
    source.financialOverview &&
      source.workQueue &&
      source.financialControl &&
      source.taxAndCash &&
      source.accountingCore
  );

  return { data: result, newContractLoaded };
};

const QUICK_ACTIONS = [
  {
    label: "Create Invoice",
    description: "Record a new customer invoice",
    path: "/accountant/invoices",
    icon: FileText,
  },
  {
    label: "Record Expense",
    description: "Capture a project expense",
    path: "/accountant/expenses",
    icon: Receipt,
  },
  {
    label: "Record Payment",
    description: "Create a payment transaction",
    path: "/accountant/payments",
    icon: CreditCard,
  },
  {
    label: "Journal Entry",
    description: "Create or submit an entry",
    path: "/accountant/journal-entries",
    icon: BookOpen,
  },
  {
    label: "Bank Reconciliation",
    description: "Review bank reconciliation",
    path: "/accountant/bank-reconciliation",
    icon: Landmark,
  },
  {
    label: "Daily Update",
    description: "Submit today's finance update",
    path: "/accountant/daily-update",
    icon: FileCheck2,
  },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="ac-section-heading">
      <div>
        {eyebrow && <span className="ac-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
    </div>
  );
}

function OverviewCard({ icon: Icon, label, count, amount, tone = "blue", subtitle }) {
  return (
    <div className={`ac-overview-card ac-tone-${tone}`}>
      <div className="ac-overview-top">
        <span className="ac-icon-box" aria-hidden="true">
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <span className="ac-overview-label">{label}</span>
      </div>
      <div className="ac-overview-main">
        <strong>{toNumber(count).toLocaleString("en-IN")}</strong>
        {amount !== undefined && <span>{formatCompactCurrency(amount)}</span>}
      </div>
      <div className="ac-overview-foot">
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "neutral", icon: Icon }) {
  return (
    <div className={`ac-metric ac-metric-${tone}`}>
      {Icon && (
        <span className="ac-metric-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
      )}
      <div>
        <span className="ac-metric-label">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Panel({ title, description, path, icon: Icon, children }) {
  return (
    <section className="ac-panel">
      <div className="ac-panel-header">
        <div className="ac-panel-title-wrap">
          {Icon && (
            <span className="ac-panel-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.9} />
            </span>
          )}
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
        </div>
        {path && (
          <Link to={path} className="ac-view-link">
            View <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="ac-panel-body">{children}</div>
    </section>
  );
}

function StatusPill({ label, value, tone = "neutral" }) {
  return (
    <div className={`ac-status-pill ac-status-${tone}`}>
      <span>{label}</span>
      <strong>{toNumber(value).toLocaleString("en-IN")}</strong>
    </div>
  );
}

const AccountantDashboard = () => {
  const { activeProject } = useProject();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [isNewContract, setIsNewContract] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await accountantService.getDashboard(activeProject?.id ?? null);
      const normalized = normalizeDashboard(response?.data?.data);

      setData(normalized.data);
      setIsNewContract(normalized.newContractLoaded);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          "Unable to load the Accountant dashboard. Please try again."
      );
      setStatus("error");
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const scopeLabel = activeProject?.id
    ? activeProject?.name || `Project #${activeProject.id}`
    : "All Projects";

  const budget = data.financialControl.budget;
  const utilization = Math.max(0, toNumber(budget.utilizationPct));
  const budgetBarWidth = Math.min(utilization, 100);
  const budgetOver = utilization > 100;

  const ledgerBalanced = useMemo(
    () =>
      Math.abs(
        toNumber(data.accountingCore.generalLedger.postedDebit) -
          toNumber(data.accountingCore.generalLedger.postedCredit)
      ) < 0.01,
    [data.accountingCore.generalLedger]
  );

  return (
    <main className="ac-root">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <div className="ac-hero-kicker">
            <span className="ac-live-dot" />
            ACCOUNTING OPERATIONS
          </div>
          <h1>Accountant Dashboard</h1>
          <p>Monitor financial transactions, accounting controls and daily work in one place.</p>
        </div>

        <div className="ac-hero-actions">
          <div className="ac-scope">
            <span className="ac-scope-label">Current scope</span>
            <strong>{scopeLabel}</strong>
          </div>
          <button
            type="button"
            className="ac-refresh-btn"
            onClick={fetchDashboard}
            disabled={status === "loading"}
            title="Refresh dashboard"
          >
            <RefreshCw size={17} className={status === "loading" ? "ac-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {status === "loading" && (
        <div className="ac-loading-shell" aria-live="polite">
          <div className="ac-loading-spinner" />
          <div>
            <strong>Loading financial data</strong>
            <span>Fetching the latest accounting figures…</span>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="ac-alert ac-alert-error" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Dashboard could not be loaded</strong>
            <p>{errorMessage}</p>
          </div>
          <button type="button" onClick={fetchDashboard}>
            Try again
          </button>
        </div>
      )}

      {status === "success" && (
        <>
          {!isNewContract && (
            <div className="ac-alert ac-alert-warning" role="status">
              <AlertCircle size={18} />
              <div>
                <strong>Dashboard data is from an older API response.</strong>
                <p>
                  The core invoice, expense, payment and vendor figures are available, but the
                  newer accounting sections need the updated backend dashboard endpoint.
                </p>
              </div>
            </div>
          )}

          <section>
            <SectionHeading
              eyebrow="AT A GLANCE"
              title="Financial Overview"
              description="Items that need attention during daily accounting operations."
            />

            <div className="ac-overview-grid">
              {canView("invoices") && (
                <OverviewCard
                  icon={FileText}
                  label="Pending Invoices"
                  count={data.financialOverview.pendingInvoices.count}
                  amount={data.financialOverview.pendingInvoices.amount}
                  subtitle="Awaiting processing"
                  tone="blue"
                />
              )}

              {(canView("expenses") || hasVerifyPermission) && (
                <OverviewCard
                  icon={Receipt}
                  label="Expenses to Verify"
                  count={data.financialOverview.expensesAwaitingVerification.count}
                  amount={data.financialOverview.expensesAwaitingVerification.amount}
                  subtitle="Awaiting verification"
                  tone="amber"
                />
              )}

              {canView("payments") && (
                <OverviewCard
                  icon={CreditCard}
                  label="Payments to Process"
                  count={data.financialOverview.paymentsToProcess.count}
                  amount={data.financialOverview.paymentsToProcess.amount}
                  subtitle="Pending or processing"
                  tone="green"
                />
              )}

              {canView("vendors") && (
                <OverviewCard
                  icon={Users}
                  label="Active Vendors"
                  count={data.financialOverview.activeVendors.count}
                  subtitle="Company-wide vendor count"
                  tone="purple"
                />
              )}
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="DAILY WORK"
              title="Accounting Work Queue"
              description="Track the movement of entries and reconciliation records."
            />

            <div className="ac-two-column">
              {canView("journalEntries") && (
                <Panel
                  title="Journal Entries"
                  description="Current workflow status"
                  path="/accountant/journal-entries"
                  icon={BookOpen}
                >
                  <div className="ac-status-grid">
                    <StatusPill label="Draft" value={data.workQueue.journalEntries.draft} />
                    <StatusPill label="Submitted" value={data.workQueue.journalEntries.submitted} tone="info" />
                    <StatusPill label="Approved" value={data.workQueue.journalEntries.approved} tone="success" />
                    <StatusPill label="Posted" value={data.workQueue.journalEntries.posted} tone="success" />
                    <StatusPill label="Reversed" value={data.workQueue.journalEntries.reversed} tone="danger" />
                  </div>
                </Panel>
              )}

              {canView("bankReconciliation") && (
                <Panel
                  title="Bank Reconciliation"
                  description="Reconciliation workflow"
                  path="/accountant/bank-reconciliation"
                  icon={Landmark}
                >
                  <div className="ac-status-grid ac-status-grid-three">
                    <StatusPill label="In Progress" value={data.workQueue.bankReconciliation.inProgress} tone="warning" />
                    <StatusPill label="Reconciled" value={data.workQueue.bankReconciliation.reconciled} tone="success" />
                    <StatusPill label="Total Records" value={data.workQueue.bankReconciliation.total} />
                  </div>
                </Panel>
              )}
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="CONTROL"
              title="Financial Control"
              description="Budget position and outstanding money flows."
            />

            <div className="ac-two-column">
              <Panel
                title="Budget Control"
                description="Allocated versus recorded spend"
                path="/accountant/budget"
                icon={PieChart}
              >
                <div className="ac-budget-summary">
                  <div>
                    <span>Allocated</span>
                    <strong>{formatCurrency(budget.allocatedAmount)}</strong>
                  </div>
                  <div>
                    <span>Spent</span>
                    <strong>{formatCurrency(budget.spentAmount)}</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong className={toNumber(budget.remainingAmount) < 0 ? "ac-negative" : ""}>
                      {formatCurrency(budget.remainingAmount)}
                    </strong>
                  </div>
                </div>

                <div className="ac-progress-wrap">
                  <div className="ac-progress-head">
                    <span>Utilization</span>
                    <strong>{utilization.toFixed(1)}%</strong>
                  </div>
                  <div className="ac-progress-track">
                    <div
                      className={`ac-progress-fill ${budgetOver ? "is-over" : ""}`}
                      style={{ width: `${budgetBarWidth}%` }}
                    />
                  </div>
                  <span className="ac-progress-note">
                    {budgetOver ? "Recorded spend is above allocated budget." : "Based on current budget figures."}
                  </span>
                </div>
              </Panel>

              <Panel
                title="Receivables & Payables"
                description="Outstanding customer and vendor balances"
                path="/accountant/receivables-payables"
                icon={Scale}
              >
                <div className="ac-finance-split">
                  <div className="ac-finance-block ac-receivable">
                    <span>Receivables</span>
                    <strong>{formatCurrency(data.financialControl.receivables.outstanding)}</strong>
                    <small>{formatCurrency(data.financialControl.receivables.overdue)} overdue</small>
                  </div>
                  <div className="ac-finance-block ac-payable">
                    <span>Payables</span>
                    <strong>{formatCurrency(data.financialControl.payables.outstanding)}</strong>
                    <small>{formatCurrency(data.financialControl.payables.pending)} pending</small>
                  </div>
                </div>
              </Panel>
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="CASH & TAX"
              title="Tax & Cash Management"
              description="Current tax register and petty-cash position."
            />

            <div className="ac-two-column">
              <Panel
                title="Tax Register"
                description="Filing and tax activity"
                path="/accountant/tax-register"
                icon={Calculator}
              >
                <div className="ac-tax-topline">
                  <div>
                    <span>Total tax records</span>
                    <strong>{toNumber(data.taxAndCash.tax.recordCount).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="ac-tax-pills">
                    <span className="ac-mini-pill ac-mini-warning">
                      {toNumber(data.taxAndCash.tax.pendingCount)} pending
                    </span>
                    <span className="ac-mini-pill ac-mini-success">
                      {toNumber(data.taxAndCash.tax.filedCount)} filed
                    </span>
                  </div>
                </div>
                <div className="ac-tax-values">
                  <Metric label="Taxable amount" value={formatCurrency(data.taxAndCash.tax.taxableAmount)} />
                  <Metric label="Tax amount" value={formatCurrency(data.taxAndCash.tax.taxAmount)} tone="info" />
                </div>
              </Panel>

              <Panel
                title="Petty Cash"
                description="Approved cash movement plus pending items"
                path="/accountant/petty-cash"
                icon={Wallet}
              >
                <div className="ac-cash-balance">
                  <span>Available balance</span>
                  <strong>{formatCurrency(data.taxAndCash.pettyCash.balance)}</strong>
                </div>
                <div className="ac-cash-metrics">
                  <Metric label="Inflow" value={formatCurrency(data.taxAndCash.pettyCash.totalInflow)} tone="success" />
                  <Metric label="Outflow" value={formatCurrency(data.taxAndCash.pettyCash.totalOutflow)} tone="danger" />
                  <Metric label="Pending" value={toNumber(data.taxAndCash.pettyCash.pendingCount)} tone="warning" />
                </div>
              </Panel>
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="ACCOUNTING CORE"
              title="Accounting Core"
              description="Accounts and posted ledger totals."
            />

            <div className="ac-two-column">
              <Panel
                title="Chart of Accounts"
                description="Account structure by type"
                path="/accountant/chart-of-accounts"
                icon={BookOpen}
              >
                <div className="ac-account-grid">
                  <Metric label="Active" value={toNumber(data.accountingCore.chartOfAccounts.activeAccounts)} />
                  <Metric label="Assets" value={toNumber(data.accountingCore.chartOfAccounts.assets)} />
                  <Metric label="Liabilities" value={toNumber(data.accountingCore.chartOfAccounts.liabilities)} />
                  <Metric label="Equity" value={toNumber(data.accountingCore.chartOfAccounts.equity)} />
                  <Metric label="Revenue" value={toNumber(data.accountingCore.chartOfAccounts.revenue)} />
                  <Metric label="Expenses" value={toNumber(data.accountingCore.chartOfAccounts.expenses)} />
                </div>
              </Panel>

              <Panel
                title="General Ledger"
                description="Posted journal entries only"
                path="/accountant/general-ledger"
                icon={TrendingUp}
              >
                <div className="ac-ledger-values">
                  <div>
                    <span>Posted debit</span>
                    <strong>{formatCurrency(data.accountingCore.generalLedger.postedDebit)}</strong>
                  </div>
                  <div>
                    <span>Posted credit</span>
                    <strong>{formatCurrency(data.accountingCore.generalLedger.postedCredit)}</strong>
                  </div>
                </div>
                <div className={`ac-ledger-status ${ledgerBalanced ? "is-balanced" : "is-unbalanced"}`}>
                  {ledgerBalanced ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>
                    {ledgerBalanced
                      ? "Posted debit and credit are balanced."
                      : "Posted debit and credit are currently different."}
                  </span>
                </div>
              </Panel>
            </div>
          </section>

          <section className="ac-actions-section">
            <SectionHeading
              eyebrow="ACTIONS"
              title="Quick Actions"
              description="Jump directly into common accounting tasks."
            />

            <div className="ac-action-grid">
              {QUICK_ACTIONS.map(({ label, description, path, icon: Icon }) => (
                <Link key={path} to={path} className="ac-action-card">
                  <span className="ac-action-icon" aria-hidden="true">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <span className="ac-action-copy">
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <ChevronRight className="ac-action-arrow" size={17} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default AccountantDashboard;
