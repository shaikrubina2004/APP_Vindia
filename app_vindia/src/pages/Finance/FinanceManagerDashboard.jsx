import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import financeService from "../../services/financeService";
import CheckInButton from "../../SharedResourse/CheckInButton";

import "./FinanceManagerDashboard.css";

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/Cr/gi, "")
    .replace(/L/gi, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

const getAmount = (item = {}) => {
  return (
    toNumber(item.amount) ||
    toNumber(item.total) ||
    toNumber(item.balance) ||
    toNumber(item.outstanding_amount) ||
    toNumber(item.outstandingAmount) ||
    toNumber(item.pending_amount) ||
    toNumber(item.pendingAmount) ||
    toNumber(item.invoice_amount) ||
    toNumber(item.invoiceAmount) ||
    toNumber(item.net_amount) ||
    toNumber(item.netAmount) ||
    0
  );
};

const getClientName = (item = {}) => {
  return (
    item.client_name ||
    item.clientName ||
    item.client ||
    item.customer_name ||
    item.customerName ||
    item.customer ||
    item.company_name ||
    item.companyName ||
    "—"
  );
};

const getVendorName = (item = {}) => {
  return (
    item.vendor_name ||
    item.vendorName ||
    item.vendor ||
    item.supplier_name ||
    item.supplierName ||
    item.supplier ||
    item.company_name ||
    item.companyName ||
    "—"
  );
};

const getInvoiceNumber = (item = {}) => {
  return (
    item.invoice_number ||
    item.invoiceNumber ||
    item.invoice_no ||
    item.invoiceNo ||
    item.invoice_id ||
    item.invoiceId ||
    item.reference_number ||
    item.referenceNumber ||
    item.id ||
    "—"
  );
};

const getDueDate = (item = {}) => {
  return (
    item.due_date ||
    item.dueDate ||
    item.payment_due_date ||
    item.paymentDueDate ||
    item.date ||
    null
  );
};

const getProjectName = (item = {}) => {
  return (
    item.project_name ||
    item.projectName ||
    item.project ||
    "—"
  );
};

const formatCurrency = (value) => {
  const number = toNumber(value);

  if (number >= 10000000) {
    return `₹${(number / 10000000).toFixed(2)}Cr`;
  }

  if (number >= 100000) {
    return `₹${(number / 100000).toFixed(1)}L`;
  }

  return `₹${number.toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status) => {
  if (!status) {
    return "—";
  }

  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    ["paid", "approved", "completed", "received"].includes(
      normalized
    )
  ) {
    return "success";
  }

  if (
    ["overdue", "rejected", "cancelled", "failed"].includes(
      normalized
    )
  ) {
    return "danger";
  }

  if (
    ["pending", "partially_paid", "processing", "draft"].includes(
      normalized
    )
  ) {
    return "warning";
  }

  return "default";
};

const getArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const getObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
};

const getApiPayload = (response) => {
  const firstData = response?.data;
  const secondData = firstData?.data;

  if (secondData !== undefined) {
    return secondData;
  }

  return firstData || {};
};

/* =========================================================
   DONUT CHART
========================================================= */

const DONUT_COLORS = [
  "#7BBDE8",
  "#4E8EA2",
  "#49769F",
  "#0A4174",
  "#6EA2B3",
  "#BDD8E9",
];

const buildDonutSegments = (categories = []) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const validCategories = categories
    .map((category) => ({
      name:
        category.category ||
        category.name ||
        category.expense_category ||
        category.expenseCategory ||
        "Other",
      amount:
        toNumber(category.total) ||
        toNumber(category.amount) ||
        toNumber(category.value) ||
        0,
    }))
    .filter((category) => category.amount > 0);

  const total = validCategories.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  let accumulatedDash = 0;

  return validCategories.map((category, index) => {
    const percentage =
      total > 0 ? (category.amount / total) * 100 : 0;

    const dashLength =
      (percentage / 100) * circumference;

    const segment = {
      name: category.name,
      amount: category.amount,
      pct: percentage,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      radius,
      circumference,
      dashLength,
      offset: accumulatedDash,
    };

    accumulatedDash += dashLength;

    return segment;
  });
};

/* =========================================================
   COMPONENT
========================================================= */

export default function FinanceManagerDashboard() {
  const navigate = useNavigate();

  /* -------------------------------------------------------
     USER
  ------------------------------------------------------- */

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const isAccountant = normalizedRole === "accountant";

  const financeBasePath = isAccountant
    ? "/accountant"
    : "/finance-manager";

  const dashboardTitle = isAccountant
    ? "Accountant Dashboard"
    : "Finance Manager Dashboard";

  const dashboardGreeting = isAccountant
    ? "Finance Operations"
    : "Finance Overview";

  const employeeId =
    user?.employee_id ||
    user?.employeeId ||
    user?.id ||
    null;

  const designation =
    user?.designation ||
    user?.role ||
    null;

  /* -------------------------------------------------------
     UI STATE
  ------------------------------------------------------- */

  const [time, setTime] = useState(new Date());
  const [animIn, setAnimIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* -------------------------------------------------------
     DASHBOARD STATE
  ------------------------------------------------------- */

  const [stats, setStats] = useState({});

  const [monthlyTrend, setMonthlyTrend] = useState([]);

  const [expenseCategories, setExpenseCategories] = useState([]);

  const [projectBudgets, setProjectBudgets] = useState([]);

  const [recentInvoices, setRecentInvoices] = useState([]);

  const [receivablesPayables, setReceivablesPayables] =
    useState({
      receivables: [],
      payables: [],
      totalReceivables: 0,
      totalPayables: 0,
    });

  /* -------------------------------------------------------
     CLOCK AND INITIAL ANIMATION
  ------------------------------------------------------- */

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setAnimIn(true);
    });

    const clock = setInterval(() => {
      setTime(new Date());
    }, 60000);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(clock);
    };
  }, []);

  /* -------------------------------------------------------
     LOAD DASHBOARD
  ------------------------------------------------------- */

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        dashboardResponse,
        costReportResponse,
        invoicesResponse,
        receivablesPayablesResponse,
      ] = await Promise.all([
        financeService.getDashboard(),
        financeService.getCostReport(),
        financeService.getAllInvoices(),
        financeService.getReceivablesPayables(),
      ]);

      /* -----------------------------------------------
         DASHBOARD DATA
      ------------------------------------------------ */

      const dashboardPayload = getApiPayload(
        dashboardResponse
      );

      const dashboardData = getObject(
        dashboardPayload
      );

      const dashboardStats = getObject(
        dashboardData.stats ||
          dashboardData.metrics ||
          dashboardData.summary
      );

      setStats(dashboardStats);

      const trendData =
        dashboardData.monthlyTrend ||
        dashboardData.monthly_trend ||
        dashboardData.monthly ||
        dashboardData.trend ||
        [];

      setMonthlyTrend(
        getArray(trendData).map((item, index) => ({
          month:
            item.month ||
            item.label ||
            item.period ||
            `Month ${index + 1}`,

          revenue:
            toNumber(item.revenue) ||
            toNumber(item.totalRevenue) ||
            toNumber(item.income) ||
            0,

          expenses:
            toNumber(item.expenses) ||
            toNumber(item.totalExpenses) ||
            toNumber(item.cost) ||
            0,
        }))
      );

      /* -----------------------------------------------
         COST REPORT
      ------------------------------------------------ */

      const costReportPayload = getApiPayload(
        costReportResponse
      );

      const costReportData = getObject(
        costReportPayload
      );

      const categories =
        costReportData.byExpenseCategory ||
        costReportData.by_expense_category ||
        costReportData.expenseCategories ||
        costReportData.expense_categories ||
        costReportData.categories ||
        [];

      const budgets =
        costReportData.projectTotals ||
        costReportData.project_totals ||
        costReportData.projectBudgets ||
        costReportData.project_budgets ||
        costReportData.projects ||
        [];

      setExpenseCategories(getArray(categories));

      setProjectBudgets(
        getArray(budgets).map((project, index) => ({
          id:
            project.id ||
            project.project_id ||
            project.projectId ||
            index,

          name:
            project.name ||
            project.project_name ||
            project.projectName ||
            project.project ||
            "Unnamed Project",

          allocated:
            toNumber(project.allocated) ||
            toNumber(project.budget) ||
            toNumber(project.total_budget) ||
            toNumber(project.totalBudget) ||
            0,

          spent:
            toNumber(project.spent) ||
            toNumber(project.expenses) ||
            toNumber(project.total_spent) ||
            toNumber(project.totalSpent) ||
            0,
        }))
      );

      /* -----------------------------------------------
         INVOICES
      ------------------------------------------------ */

      const invoicesPayload = getApiPayload(
        invoicesResponse
      );

      let invoicesData = [];

      if (Array.isArray(invoicesPayload)) {
        invoicesData = invoicesPayload;
      } else {
        invoicesData =
          invoicesPayload.invoices ||
          invoicesPayload.rows ||
          invoicesPayload.items ||
          [];
      }

      setRecentInvoices(
        getArray(invoicesData).slice(0, 5)
      );

      /* -----------------------------------------------
         RECEIVABLES AND PAYABLES
      ------------------------------------------------ */

      const receivablesPayload = getApiPayload(
        receivablesPayablesResponse
      );

      const receivablesData = getObject(
        receivablesPayload
      );

      const receivables = getArray(
        receivablesData.receivables ||
          receivablesData.accountsReceivable ||
          receivablesData.accounts_receivable ||
          receivablesData.receivable ||
          receivablesData.receivableInvoices ||
          receivablesData.receivable_invoices
      );

      const payables = getArray(
        receivablesData.payables ||
          receivablesData.accountsPayable ||
          receivablesData.accounts_payable ||
          receivablesData.payable ||
          receivablesData.payableInvoices ||
          receivablesData.payable_invoices
      );

      /*
       * IMPORTANT FIX:
       *
       * Do not blindly trust totalReceivables and
       * totalPayables from the backend.
       *
       * If the backend sends 0 but rows contain amounts,
       * calculate the totals from the rows.
       */

      const calculatedReceivables = receivables.reduce(
        (sum, item) => sum + getAmount(item),
        0
      );

      const calculatedPayables = payables.reduce(
        (sum, item) => sum + getAmount(item),
        0
      );

      const backendTotalReceivables =
        toNumber(
          receivablesData.totalReceivables
        ) ||
        toNumber(
          receivablesData.total_receivables
        ) ||
        toNumber(
          receivablesData.receivableTotal
        ) ||
        toNumber(
          receivablesData.receivable_total
        ) ||
        0;

      const backendTotalPayables =
        toNumber(
          receivablesData.totalPayables
        ) ||
        toNumber(
          receivablesData.total_payables
        ) ||
        toNumber(
          receivablesData.payableTotal
        ) ||
        toNumber(
          receivablesData.payable_total
        ) ||
        0;

      const finalTotalReceivables =
        calculatedReceivables > 0
          ? calculatedReceivables
          : backendTotalReceivables;

      const finalTotalPayables =
        calculatedPayables > 0
          ? calculatedPayables
          : backendTotalPayables;

      setReceivablesPayables({
        receivables,
        payables,
        totalReceivables: finalTotalReceivables,
        totalPayables: finalTotalPayables,
      });
    } catch (err) {
      console.error(
        "Failed to load finance dashboard:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* -------------------------------------------------------
     DERIVED KPI VALUES
  ------------------------------------------------------- */

  const totalRevenue =
    toNumber(stats?.totalRevenue) ||
    toNumber(stats?.total_revenue) ||
    toNumber(stats?.revenue) ||
    0;

  const totalExpenses =
    toNumber(stats?.totalExpenses) ||
    toNumber(stats?.total_expenses) ||
    toNumber(stats?.expenses) ||
    0;

  const netProfit =
    toNumber(stats?.netProfit) ||
    toNumber(stats?.net_profit) ||
    toNumber(stats?.profit) ||
    totalRevenue - totalExpenses;

  const pendingInvoices =
    stats?.pendingInvoices ??
    stats?.pending_invoices ??
    stats?.pendingInvoiceCount ??
    stats?.pending_invoice_count ??
    0;

  const pendingAmount =
    toNumber(stats?.pendingAmount) ||
    toNumber(stats?.pending_amount) ||
    0;

  const profitPercentage =
    totalRevenue > 0
      ? ((netProfit / totalRevenue) * 100).toFixed(1)
      : "0.0";

  const donutSegments = useMemo(() => {
    return buildDonutSegments(expenseCategories);
  }, [expenseCategories]);

  const maxChartValue = useMemo(() => {
    const values = monthlyTrend.flatMap((item) => [
      item.revenue,
      item.expenses,
    ]);

    return Math.max(...values, 1);
  }, [monthlyTrend]);

  /* -------------------------------------------------------
     CSV EXPORT
  ------------------------------------------------------- */

  const handleExport = () => {
    const escapeCsvValue = (value) => {
      const text = String(value ?? "");

      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }

      return text;
    };

    const csvRow = (values) => {
      return (
        values.map(escapeCsvValue).join(",") + "\n"
      );
    };

    let csv = "";

    csv += csvRow([
      `${dashboardTitle} Export`,
    ]);

    csv += csvRow([
      `Generated on ${new Date().toLocaleString(
        "en-IN"
      )}`,
    ]);

    csv += "\n";

    /* Summary */

    csv += csvRow(["Summary"]);

    csv += csvRow([
      "Total Revenue",
      totalRevenue,
    ]);

    csv += csvRow([
      "Total Expenses",
      totalExpenses,
    ]);

    csv += csvRow([
      "Net Profit",
      netProfit,
    ]);

    csv += csvRow([
      "Profit Margin %",
      profitPercentage,
    ]);

    csv += csvRow([
      "Pending Invoices",
      pendingInvoices,
    ]);

    csv += csvRow([
      "Pending Amount",
      pendingAmount,
    ]);

    csv += csvRow([
      "Total Receivables",
      receivablesPayables.totalReceivables,
    ]);

    csv += csvRow([
      "Total Payables",
      receivablesPayables.totalPayables,
    ]);

    csv += "\n";

    /* Monthly Trend */

    csv += csvRow([
      "Monthly Revenue vs Expenses",
    ]);

    csv += csvRow([
      "Month",
      "Revenue",
      "Expenses",
    ]);

    monthlyTrend.forEach((item) => {
      csv += csvRow([
        item.month,
        item.revenue,
        item.expenses,
      ]);
    });

    csv += "\n";

    /* Expense Breakdown */

    csv += csvRow([
      "Expense Breakdown",
    ]);

    csv += csvRow([
      "Category",
      "Amount",
      "Percentage",
    ]);

    donutSegments.forEach((item) => {
      csv += csvRow([
        item.name,
        item.amount,
        `${item.pct.toFixed(1)}%`,
      ]);
    });

    csv += "\n";

    /* Project Budgets */

    csv += csvRow([
      "Project Budget Utilization",
    ]);

    csv += csvRow([
      "Project",
      "Allocated",
      "Spent",
    ]);

    projectBudgets.forEach((project) => {
      csv += csvRow([
        project.name,
        project.allocated,
        project.spent,
      ]);
    });

    csv += "\n";

    /* Receivables */

    csv += csvRow([
      "Receivables",
    ]);

    csv += csvRow([
      "Client",
      "Invoice",
      "Amount",
      "Due Date",
    ]);

    receivablesPayables.receivables.forEach((item) => {
      csv += csvRow([
        getClientName(item),
        getInvoiceNumber(item),
        getAmount(item),
        formatDate(getDueDate(item)),
      ]);
    });

    csv += "\n";

    /* Payables */

    csv += csvRow([
      "Payables",
    ]);

    csv += csvRow([
      "Vendor",
      "Reference",
      "Amount",
      "Due Date",
    ]);

    receivablesPayables.payables.forEach((item) => {
      csv += csvRow([
        getVendorName(item),
        getInvoiceNumber(item),
        getAmount(item),
        formatDate(getDueDate(item)),
      ]);
    });

    csv += "\n";

    /* Recent Invoices */

    csv += csvRow([
      "Recent Invoices",
    ]);

    csv += csvRow([
      "Invoice ID",
      "Client",
      "Project",
      "Amount",
      "Due Date",
      "Status",
    ]);

    recentInvoices.forEach((invoice) => {
      const status =
        invoice.effectiveStatus ||
        invoice.status ||
        invoice.invoice_status ||
        "";

      csv += csvRow([
        getInvoiceNumber(invoice),
        getClientName(invoice),
        getProjectName(invoice),
        getAmount(invoice),
        formatDate(getDueDate(invoice)),
        normalizeStatus(status),
      ]);
    });

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const dateStamp = new Date()
      .toISOString()
      .slice(0, 10);

    link.href = url;

    link.download = isAccountant
      ? `accountant-dashboard-report-${dateStamp}.csv`
      : `finance-dashboard-report-${dateStamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* -------------------------------------------------------
     LOADING STATE
  ------------------------------------------------------- */

  if (loading) {
    return (
      <div className="fm-root fm-animate-in">
        <div className="fm-state">
          Loading dashboard…
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     ERROR STATE
  ------------------------------------------------------- */

  if (error) {
    return (
      <div className="fm-root fm-animate-in">
        <div className="fm-state fm-state--error">
          <p>{error}</p>

          <button
            type="button"
            className="fm-retry-btn"
            onClick={loadDashboard}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={`fm-root ${
        animIn ? "fm-animate-in" : ""
      }`}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="fm-header">
        <div className="fm-header-left">
          <p className="fm-greeting">
            {dashboardGreeting}
          </p>

          <h1 className="fm-title">
            {dashboardTitle}
          </h1>
        </div>

        <div className="fm-header-right">
          <div className="fm-date-pill">
            <span>📅</span>

            <span>
              {time.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {employeeId && (
            <CheckInButton
              employeeId={employeeId}
              designation={designation}
            />
          )}

          <button
            type="button"
            className="fm-export-btn"
            onClick={handleExport}
          >
            ↓ Export Report
          </button>
        </div>
      </header>

      {/* =================================================
          KPI CARDS
      ================================================= */}

      <section className="fm-kpis">
        <div className="fm-kpi fm-kpi--revenue">
          <div className="fm-kpi-icon">
            💹
          </div>

          <div className="fm-kpi-body">
            <p className="fm-kpi-label">
              Total Revenue
            </p>

            <h2 className="fm-kpi-value">
              {formatCurrency(totalRevenue)}
            </h2>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--expense">
          <div className="fm-kpi-icon">
            📉
          </div>

          <div className="fm-kpi-body">
            <p className="fm-kpi-label">
              Total Expenses
            </p>

            <h2 className="fm-kpi-value">
              {formatCurrency(totalExpenses)}
            </h2>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--profit">
          <div className="fm-kpi-icon">
            🏦
          </div>

          <div className="fm-kpi-body">
            <p className="fm-kpi-label">
              Net Profit
            </p>

            <h2 className="fm-kpi-value">
              {formatCurrency(netProfit)}
            </h2>

            <p className="fm-kpi-sub fm-accent-text">
              Margin {profitPercentage}%
            </p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--pending">
          <div className="fm-kpi-icon">
            ⏳
          </div>

          <div className="fm-kpi-body">
            <p className="fm-kpi-label">
              Pending Invoices
            </p>

            <h2 className="fm-kpi-value">
              {pendingInvoices}
            </h2>

            <p className="fm-kpi-sub fm-warn">
              ≈ {formatCurrency(pendingAmount)} due
            </p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--receivable">
          <div className="fm-kpi-icon">
            💰
          </div>

          <div className="fm-kpi-body">
            <p className="fm-kpi-label">
              Total Receivables
            </p>

            <h2 className="fm-kpi-value">
              {formatCurrency(
                receivablesPayables.totalReceivables
              )}
            </h2>

            <p className="fm-kpi-sub fm-up">
              Amount to receive
            </p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--payable">
          <div className="fm-kpi-icon">
            💸
          </div>

          <div className="fm-kpi-body">
            <p className="fm-kpi-label">
              Total Payables
            </p>

            <h2 className="fm-kpi-value">
              {formatCurrency(
                receivablesPayables.totalPayables
              )}
            </h2>

            <p className="fm-kpi-sub fm-warn">
              Amount to pay
            </p>
          </div>
        </div>
      </section>

      {/* =================================================
          CHARTS
      ================================================= */}

      <section className="fm-charts-row">
        {/* Monthly Chart */}

        <div className="fm-card fm-chart-card">
          <div className="fm-card-header">
            <h3>
              Monthly Revenue vs Expenses
            </h3>
          </div>

          {monthlyTrend.length === 0 ? (
            <p className="fm-empty-text">
              No monthly data yet.
            </p>
          ) : (
            <>
              <div className="fm-bar-chart">
                {monthlyTrend.map((item, index) => (
                  <div
                    className="fm-bar-group"
                    key={`${item.month}-${index}`}
                  >
                    <div className="fm-bars">
                      <div
                        className="fm-bar fm-bar--rev"
                        style={{
                          "--h": `${
                            (item.revenue /
                              maxChartValue) *
                            100
                          }%`,
                        }}
                        title={`Revenue: ${formatCurrency(
                          item.revenue
                        )}`}
                      />

                      <div
                        className="fm-bar fm-bar--exp"
                        style={{
                          "--h": `${
                            (item.expenses /
                              maxChartValue) *
                            100
                          }%`,
                        }}
                        title={`Expenses: ${formatCurrency(
                          item.expenses
                        )}`}
                      />
                    </div>

                    <span className="fm-bar-label">
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>

              <div className="fm-chart-legend">
                <span>
                  <i className="fm-dot fm-dot--rev" />
                  Revenue
                </span>

                <span>
                  <i className="fm-dot fm-dot--exp" />
                  Expenses
                </span>
              </div>
            </>
          )}
        </div>

        {/* Expense Donut */}

        <div className="fm-card fm-donut-card">
          <div className="fm-card-header">
            <h3>
              Expense Breakdown
            </h3>
          </div>

          {donutSegments.length === 0 ? (
            <p className="fm-empty-text">
              No expenses recorded yet.
            </p>
          ) : (
            <>
              <div className="fm-donut-container">
                <svg
                  viewBox="0 0 140 140"
                  className="fm-donut-svg"
                >
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.name}
                      cx="70"
                      cy="70"
                      r={segment.radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="22"
                      strokeDasharray={`${segment.dashLength} ${
                        segment.circumference -
                        segment.dashLength
                      }`}
                      strokeDashoffset={
                        -segment.offset
                      }
                      transform="rotate(-90 70 70)"
                      className="fm-donut-seg"
                    />
                  ))}

                  <text
                    x="70"
                    y="65"
                    textAnchor="middle"
                    className="fm-donut-center-val"
                  >
                    {formatCurrency(totalExpenses)}
                  </text>

                  <text
                    x="70"
                    y="82"
                    textAnchor="middle"
                    className="fm-donut-center-label"
                  >
                    Total Spend
                  </text>
                </svg>
              </div>

              <ul className="fm-expense-list">
                {donutSegments.map((category) => (
                  <li
                    key={category.name}
                    className="fm-expense-item"
                  >
                    <span
                      className="fm-expense-dot"
                      style={{
                        background: category.color,
                      }}
                    />

                    <span className="fm-expense-name">
                      {category.name}
                    </span>

                    <div className="fm-expense-bar-wrap">
                      <div
                        className="fm-expense-bar-fill"
                        style={{
                          width: `${category.pct}%`,
                          background: category.color,
                        }}
                      />
                    </div>

                    <span className="fm-expense-pct">
                      {category.pct.toFixed(0)}%
                    </span>

                    <span className="fm-expense-amt">
                      {formatCurrency(category.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* =================================================
          BUDGET UTILIZATION
      ================================================= */}

      <section className="fm-card fm-budget-card">
        <div className="fm-card-header">
          <h3>
            Budget Utilization — Active Projects
          </h3>
        </div>

        {projectBudgets.length === 0 ? (
          <p className="fm-empty-text">
            No project budgets set up yet.
          </p>
        ) : (
          <div className="fm-budget-list">
            {projectBudgets.map((project) => {
              const allocated =
                toNumber(project.allocated);

              const spent =
                toNumber(project.spent);

              const percentage =
                allocated > 0
                  ? Math.round(
                      (spent / allocated) * 100
                    )
                  : 0;

              const progressClass =
                percentage >= 90
                  ? "danger"
                  : percentage >= 70
                  ? "warn"
                  : "ok";

              return (
                <div
                  className="fm-budget-row"
                  key={project.id}
                >
                  <div className="fm-budget-meta">
                    <span className="fm-budget-name">
                      {project.name}
                    </span>

                    <span className="fm-budget-nums">
                      {formatCurrency(spent)} /{" "}
                      {formatCurrency(allocated)}
                    </span>
                  </div>

                  <div className="fm-progress-track">
                    <div
                      className={`fm-progress-fill fm-progress--${progressClass}`}
                      style={{
                        width: `${Math.min(
                          percentage,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <span
                    className={`fm-budget-pct fm-pct--${progressClass}`}
                  >
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =================================================
          RECEIVABLES AND PAYABLES
      ================================================= */}

      <section className="fm-card fm-receivables-card">
        <div className="fm-card-header">
          <h3>
            Receivables & Payables
          </h3>

          <span className="fm-badge">
            Finance Overview
          </span>
        </div>

        <div className="fm-rp-grid">
          <div className="fm-rp-box fm-rp-box--receivable">
            <div className="fm-rp-icon">
              💰
            </div>

            <div>
              <p className="fm-rp-label">
                Total Receivables
              </p>

              <h2 className="fm-rp-value">
                {formatCurrency(
                  receivablesPayables.totalReceivables
                )}
              </h2>

              <p className="fm-rp-description">
                Money expected from clients
              </p>
            </div>
          </div>

          <div className="fm-rp-box fm-rp-box--payable">
            <div className="fm-rp-icon">
              💸
            </div>

            <div>
              <p className="fm-rp-label">
                Total Payables
              </p>

              <h2 className="fm-rp-value">
                {formatCurrency(
                  receivablesPayables.totalPayables
                )}
              </h2>

              <p className="fm-rp-description">
                Money payable to vendors
              </p>
            </div>
          </div>
        </div>

        <div className="fm-rp-tables">
          {/* Receivables Table */}

          <div className="fm-rp-table-section">
            <h4>
              Receivables
            </h4>

            {receivablesPayables.receivables.length ===
            0 ? (
              <p className="fm-empty-text">
                No receivables found.
              </p>
            ) : (
              <div className="fm-table-wrap">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Invoice</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {receivablesPayables.receivables
                      .slice(0, 5)
                      .map((item, index) => (
                        <tr
                          key={
                            item.id ||
                            item.invoice_id ||
                            item.invoiceId ||
                            index
                          }
                          className="fm-table-row"
                        >
                          <td>
                            {getClientName(item)}
                          </td>

                          <td>
                            {getInvoiceNumber(item)}
                          </td>

                          <td className="fm-inv-amount">
                            {formatCurrency(
                              getAmount(item)
                            )}
                          </td>

                          <td>
                            {formatDate(
                              getDueDate(item)
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payables Table */}

          <div className="fm-rp-table-section">
            <h4>
              Payables
            </h4>

            {receivablesPayables.payables.length ===
            0 ? (
              <p className="fm-empty-text">
                No payables found.
              </p>
            ) : (
              <div className="fm-table-wrap">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Reference</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {receivablesPayables.payables
                      .slice(0, 5)
                      .map((item, index) => (
                        <tr
                          key={
                            item.id ||
                            item.payment_id ||
                            item.paymentId ||
                            index
                          }
                          className="fm-table-row"
                        >
                          <td>
                            {getVendorName(item)}
                          </td>

                          <td>
                            {getInvoiceNumber(item)}
                          </td>

                          <td className="fm-inv-amount">
                            {formatCurrency(
                              getAmount(item)
                            )}
                          </td>

                          <td>
                            {formatDate(
                              getDueDate(item)
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =================================================
          RECENT INVOICES
      ================================================= */}

      <section className="fm-card fm-invoice-card">
        <div className="fm-card-header">
          <h3>
            Recent Invoices
          </h3>

          <button
            type="button"
            className="fm-view-all"
            onClick={() =>
              navigate(`${financeBasePath}/invoices`)
            }
          >
            View All →
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <p className="fm-empty-text">
            No invoices yet.
          </p>
        ) : (
          <div className="fm-table-wrap">
            <table className="fm-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentInvoices.map((invoice, index) => {
                  const status =
                    invoice.effectiveStatus ||
                    invoice.status ||
                    invoice.invoice_status ||
                    invoice.invoiceStatus ||
                    "";

                  return (
                    <tr
                      key={
                        invoice.id ||
                        invoice.invoice_id ||
                        index
                      }
                      className="fm-table-row"
                    >
                      <td className="fm-inv-id">
                        {getInvoiceNumber(invoice)}
                      </td>

                      <td>
                        {getClientName(invoice)}
                      </td>

                      <td className="fm-inv-project">
                        {getProjectName(invoice)}
                      </td>

                      <td className="fm-inv-amount">
                        {formatCurrency(
                          getAmount(invoice)
                        )}
                      </td>

                      <td>
                        {formatDate(
                          getDueDate(invoice)
                        )}
                      </td>

                      <td>
                        <span
                          className={`fm-status fm-status--${getStatusClass(
                            status
                          )}`}
                        >
                          {normalizeStatus(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <section className="fm-quick-actions">
        <h3 className="fm-qa-title">
          {isAccountant
            ? "Accountant Actions"
            : "Quick Actions"}
        </h3>

        <div className="fm-qa-grid">
          {[
            {
              icon: "📄",
              label: "Create Invoice",
              color: "#7BBDE8",
              path: `${financeBasePath}/invoices`,
            },
            {
              icon: "💳",
              label: "Manage Budget",
              color: "#4E8EA2",
              path: `${financeBasePath}/budget`,
            },
            {
              icon: "💸",
              label: "Add Expense",
              color: "#49769F",
              path: `${financeBasePath}/expenses`,
            },
            {
              icon: "📊",
              label: "Cost Report",
              color: "#6EA2B3",
              path: `${financeBasePath}/cost-analysis`,
            },
            {
              icon: "💰",
              label: "Track Payment",
              color: "#BDD8E9",
              path: `${financeBasePath}/payments`,
            },
            ...(isAccountant
              ? [
                  {
                    icon: "👥",
                    label: "Manage Vendors",
                    color: "#6EA2B3",
                    path: `${financeBasePath}/vendors`,
                  },
                ]
              : []),
          ].map((action) => (
            <button
              type="button"
              key={action.label}
              className="fm-qa-btn"
              style={{
                "--accent": action.color,
              }}
              onClick={() =>
                navigate(action.path)
              }
            >
              <span className="fm-qa-icon">
                {action.icon}
              </span>

              <span>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}