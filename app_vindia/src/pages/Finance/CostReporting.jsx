import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/useAuth";
import financeService from "../../services/financeService";
import "./CostReporting.css";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

const fmt = (n) => {
  const value = Number(n || 0);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  }

  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  }

  return `${sign}₹${abs.toLocaleString("en-IN")}`;
};

const pct = (actual, budget) => {
  const a = Number(actual || 0);
  const b = Number(budget || 0);

  if (b <= 0) return 0;

  return Math.round((a / b) * 100);
};

const safePct = (actual, budget) => {
  return Math.min(Math.max(pct(actual, budget), 0), 100);
};

const varColor = (value) =>
  Number(value || 0) >= 0 ? "#059669" : "#dc2626";

const varLabel = (value) => {
  const v = Number(value || 0);

  if (v >= 0) {
    return `▲ ${fmt(v)} under`;
  }

  return `▼ ${fmt(Math.abs(v))} over`;
};

const categoryColors = [
  "#0A4174",
  "#4E8EA2",
  "#6EA2B3",
  "#49769F",
  "#7BBDE8",
  "#BDD8E9",
  "#5B8DB8",
  "#8AAFC1",
];

const categoryIcons = {
  material: "📦",
  labour: "👷",
  labor: "👷",
  equipment: "🏗️",
  plant: "🏗️",
  subcontractor: "🤝",
  subcontractors: "🤝",
  overhead: "🏢",
  overheads: "🏢",
  contingency: "🛡️",
};

const getCategoryIcon = (name) => {
  const key = String(name || "").toLowerCase();

  const match = Object.keys(categoryIcons).find((item) =>
    key.includes(item)
  );

  return match ? categoryIcons[match] : "💰";
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load cost report."
  );
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */

export default function CostReporting() {
  const { user } = useAuth();

  const [tab, setTab] = useState("Overview");
  const [animIn, setAnimIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [report, setReport] = useState({
    budgetVsActual: [],
    byExpenseCategory: [],
    projectTotals: [],
  });

  const isAccountant =
    String(user?.role || "").toLowerCase() === "accountant";

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimIn(true));

    return () => cancelAnimationFrame(id);
  }, []);

  /*
   * The backend endpoint accepts projectId as an optional query
   * parameter. We intentionally do not invent a project selection
   * here because this page previously had no project selector and
   * the API already supports returning the complete report.
   */
  useEffect(() => {
    let mounted = true;

    const loadCostReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await financeService.getCostReport();

        if (!mounted) return;

        const data = response?.data?.data || {};

        setReport({
          budgetVsActual: Array.isArray(data.budgetVsActual)
            ? data.budgetVsActual
            : [],

          byExpenseCategory: Array.isArray(data.byExpenseCategory)
            ? data.byExpenseCategory
            : [],

          projectTotals: Array.isArray(data.projectTotals)
            ? data.projectTotals
            : [],
        });
      } catch (err) {
        if (!mounted) return;

        console.error("Failed to load cost report:", err);
        setError(getErrorMessage(err));

        setReport({
          budgetVsActual: [],
          byExpenseCategory: [],
          projectTotals: [],
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCostReport();

    return () => {
      mounted = false;
    };
  }, []);

  /* ── Real API data calculations ─────────────────────────── */

  const costCategories = useMemo(() => {
    return report.budgetVsActual.map((row, index) => {
      const budgeted = Number(row.allocated || 0);
      const actual = Number(row.spent || 0);
      const remaining = budgeted - actual;

      return {
        id: `${row.category || "category"}-${index}`,
        name: row.category || "Uncategorised",
        budgeted,
        actual,
        remaining,
        color: categoryColors[index % categoryColors.length],
        icon: getCategoryIcon(row.category),
      };
    });
  }, [report.budgetVsActual]);

  const expenseCategories = useMemo(() => {
    return report.byExpenseCategory.map((row, index) => {
      return {
        id: `${row.category || "expense"}-${index}`,
        name: row.category || "Uncategorised",
        amount: Number(row.total || 0),
        color: categoryColors[index % categoryColors.length],
        icon: getCategoryIcon(row.category),
      };
    });
  }, [report.byExpenseCategory]);

  const projectTotals = useMemo(() => {
    return report.projectTotals.map((row) => {
      const allocated = Number(row.allocated || 0);
      const spent = Number(row.spent || 0);

      return {
        id: row.id,
        name: row.name || "Unnamed Project",
        allocated,
        spent,
        remaining: allocated - spent,
      };
    });
  }, [report.projectTotals]);

  const summary = useMemo(() => {
    const budgetedCost = costCategories.reduce(
      (sum, category) => sum + category.budgeted,
      0
    );

    const totalCost = costCategories.reduce(
      (sum, category) => sum + category.actual,
      0
    );

    const variance = budgetedCost - totalCost;

    const variancePct =
      budgetedCost > 0
        ? (variance / budgetedCost) * 100
        : 0;

    /*
     * CPI cannot be calculated correctly from the current
     * cost-report endpoint because the endpoint does not return
     * earned value / planned value.
     *
     * We therefore do not invent a CPI value.
     */
    return {
      totalCost,
      budgetedCost,
      variance,
      variancePct,
    };
  }, [costCategories]);

  const TABS = [
    "Overview",
    "Cost Codes",
    "Monthly Trend",
    "Variance Analysis",
  ];

  if (loading) {
    return (
      <div className="ca-root">
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          Loading cost report…
        </div>
      </div>
    );
  }

  return (
    <div className={`ca-root ${animIn ? "ca-in" : ""}`}>
      {/* ── Header ─────────────────────────────────────────── */}

      <div className="ca-header">
        <div>
          <p className="ca-eyebrow">
            {isAccountant ? "Finance Operations" : "Finance Manager"}
          </p>

          <h1 className="ca-title">Cost Reporting</h1>

          <p className="ca-subtitle">
            {isAccountant
              ? "Review budget, actual cost and project expenditure"
              : "Budget vs actual cost analysis"}
          </p>
        </div>

        <div className="ca-header-badges">
          <div className="ca-badge">
            <span className="ca-badge-dot ca-badge-dot--green" />

            {summary.budgetedCost > 0
              ? `${Math.round(
                  (summary.totalCost / summary.budgetedCost) * 100
                )}% Budget Used`
              : "No Budget Data"}
          </div>

          <div className="ca-badge">
            <span className="ca-badge-dot ca-badge-dot--blue" />

            {costCategories.length} Categories
          </div>
        </div>
      </div>

      {/* ── Accountant notice ─────────────────────────────── */}

      {isAccountant && (
        <div
          style={{
            marginBottom: "18px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          <strong>Accountant Cost Analysis</strong>
          <br />
          Review real budget allocations, actual expenses and project-level
          cost utilisation from the finance records.
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────── */}

      {error && (
        <div
          style={{
            marginBottom: "18px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────── */}

      <div className="ca-kpis">
        <div
          className="ca-kpi"
          style={{ "--kpi-accent": "#0A4174" }}
        >
          <p className="ca-kpi-label">Total Cost to Date</p>

          <p className="ca-kpi-value">
            {fmt(summary.totalCost)}
          </p>

          <span className="ca-kpi-sub">
            of {fmt(summary.budgetedCost)} budgeted
          </span>

          <div className="ca-kpi-bar">
            <div
              className="ca-kpi-fill"
              style={{
                width: `${safePct(
                  summary.totalCost,
                  summary.budgetedCost
                )}%`,
                background: "#0A4174",
              }}
            />
          </div>
        </div>

        <div
          className="ca-kpi"
          style={{ "--kpi-accent": "#059669" }}
        >
          <p className="ca-kpi-label">Cost Variance</p>

          <p
            className="ca-kpi-value"
            style={{
              color: varColor(summary.variance),
            }}
          >
            {fmt(summary.variance)}
          </p>

          <span className="ca-kpi-sub">
            {summary.budgetedCost > 0
              ? `${Math.abs(summary.variancePct).toFixed(1)}% ${
                  summary.variance >= 0 ? "under" : "over"
                } budget`
              : "No budget available"}
          </span>

          <div className="ca-kpi-bar">
            <div
              className="ca-kpi-fill"
              style={{
                width: `${Math.min(
                  Math.abs(summary.variancePct),
                  100
                )}%`,
                background:
                  summary.variance >= 0
                    ? "#059669"
                    : "#dc2626",
              }}
            />
          </div>
        </div>

        <div
          className="ca-kpi"
          style={{ "--kpi-accent": "#4E8EA2" }}
        >
          <p className="ca-kpi-label">Projects Reporting</p>

          <p className="ca-kpi-value">
            {projectTotals.length}
          </p>

          <span className="ca-kpi-sub">
            Projects with finance cost records
          </span>

          <div className="ca-kpi-bar">
            <div
              className="ca-kpi-fill"
              style={{
                width: `${Math.min(
                  projectTotals.length * 10,
                  100
                )}%`,
                background: "#4E8EA2",
              }}
            />
          </div>
        </div>

        <div
          className="ca-kpi"
          style={{ "--kpi-accent": "#f59e0b" }}
        >
          <p className="ca-kpi-label">Expense Categories</p>

          <p className="ca-kpi-value">
            {expenseCategories.length}
          </p>

          <span className="ca-kpi-sub">
            Categories with recorded expenses
          </span>

          <div className="ca-kpi-bar">
            <div
              className="ca-kpi-fill"
              style={{
                width: `${Math.min(
                  expenseCategories.length * 10,
                  100
                )}%`,
                background: "#f59e0b",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}

      <div className="ca-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`ca-tab ${
              tab === t ? "ca-tab--on" : ""
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Body ───────────────────────────────────────── */}

      <div className="ca-body">
        {tab === "Overview" && (
          <OverviewTab
            costCategories={costCategories}
            expenseCategories={expenseCategories}
          />
        )}

        {tab === "Cost Codes" && (
          <CostCodesTab
            projectTotals={projectTotals}
            costCategories={costCategories}
          />
        )}

        {tab === "Monthly Trend" && (
          <MonthlyTrendTab
            costCategories={costCategories}
            expenseCategories={expenseCategories}
          />
        )}

        {tab === "Variance Analysis" && (
          <VarianceTab
            costCategories={costCategories}
            projectTotals={projectTotals}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════ */

function OverviewTab({
  costCategories,
  expenseCategories,
}) {
  // Expense Distribution percentages must use the total of the
  // expense-category dataset, not the budget-vs-actual total.
  const totalExpenseAmount = expenseCategories.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  return (
    <div className="ca-overview">
      {/* ── Cost by Category ──────────────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Cost by Category
        </h2>

        {costCategories.length === 0 ? (
          <p className="ca-empty">
            No budget data available yet.
          </p>
        ) : (
          <div className="ca-cat-grid">
            {costCategories.map((cat) => {
              const usedPct = safePct(
                cat.actual,
                cat.budgeted
              );

              const overBudget =
                cat.actual > cat.budgeted;

              return (
                <div
                  key={cat.id}
                  className={`ca-cat-card ${
                    overBudget
                      ? "ca-cat-card--over"
                      : ""
                  }`}
                >
                  <div className="ca-cat-top">
                    <span className="ca-cat-icon">
                      {cat.icon}
                    </span>

                    <div className="ca-cat-info">
                      <p className="ca-cat-name">
                        {cat.name}
                      </p>

                      <p className="ca-cat-actual">
                        {fmt(cat.actual)}
                      </p>
                    </div>

                    <span
                      className={`ca-cat-pct ${
                        overBudget
                          ? "ca-cat-pct--over"
                          : ""
                      }`}
                    >
                      {usedPct}%
                    </span>
                  </div>

                  <div className="ca-progress">
                    <div
                      className="ca-progress-fill"
                      style={{
                        width: `${usedPct}%`,
                        background: overBudget
                          ? "#dc2626"
                          : cat.color,
                      }}
                    />
                  </div>

                  <div className="ca-cat-bottom">
                    <span>
                      Budget: {fmt(cat.budgeted)}
                    </span>

                    <span
                      style={{
                        color: varColor(
                          cat.remaining
                        ),
                      }}
                    >
                      {varLabel(cat.remaining)}
                    </span>
                  </div>

                  <div className="ca-cat-forecast">
                    <span className="ca-forecast-label">
                      Remaining
                    </span>

                    <span className="ca-forecast-val">
                      {fmt(cat.remaining)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Expense Distribution ─────────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Expense Distribution
        </h2>

        {expenseCategories.length === 0 ? (
          <p className="ca-empty">
            No expense data available yet.
          </p>
        ) : (
          <div className="ca-donut-section">
            <DonutChart
              categories={expenseCategories}
              total={expenseCategories.reduce(
                (sum, category) =>
                  sum + category.amount,
                0
              )}
            />

            <div className="ca-donut-legend">
              {expenseCategories.map((cat) => {
                const share =
                  totalExpenseAmount > 0
                    ? Math.round(
                        (cat.amount / totalExpenseAmount) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={cat.id}
                    className="ca-legend-row"
                  >
                    <span
                      className="ca-legend-dot"
                      style={{
                        background: cat.color,
                      }}
                    />

                    <span className="ca-legend-name">
                      {cat.name}
                    </span>

                    <span className="ca-legend-val">
                      {fmt(cat.amount)}
                    </span>

                    <span className="ca-legend-pct">
                      {share}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SVG Donut ────────────────────────────────────────────── */

function DonutChart({ categories, total }) {
  const R = 80;
  const cx = 100;
  const cy = 100;
  const strokeW = 28;
  const circumference = 2 * Math.PI * R;

  if (!total) {
    return (
      <div
        style={{
          width: "200px",
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
        }}
      >
        No data
      </div>
    );
  }

  let runningShare = 0;

  const segments = categories.map((cat) => {
    const share = cat.amount / total;

    const segment = {
      ...cat,
      share,
      startPct: runningShare,
    };

    runningShare += share;

    return segment;
  });

  return (
    <svg
      viewBox="0 0 200 200"
      className="ca-donut-svg"
    >
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeW}
      />

      {segments.map((seg) => {
        const dashArr = `${circumference * seg.share} ${
          circumference *
          (1 - seg.share)
        }`;

        const offset =
          circumference * (1 - seg.startPct);

        return (
          <circle
            key={seg.id}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={dashArr}
            strokeDashoffset={offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition:
                "stroke-dasharray 0.6s ease",
            }}
          />
        );
      })}

      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        className="ca-donut-label-top"
      >
        Total
      </text>

      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        className="ca-donut-label-val"
      >
        {(total / 10000000).toFixed(1)}Cr
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — COST CODES
════════════════════════════════════════════════════════════ */

function CostCodesTab({
  projectTotals,
  costCategories,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  /*
   * The backend currently has no separate cost_codes table.
   *
   * Therefore this tab is converted into a Project Cost Register
   * using the real projectTotals dataset returned by the API.
   */

  const rows = projectTotals.filter((row) => {
    const term = search.toLowerCase();

    const matchSearch =
      row.name.toLowerCase().includes(term) ||
      String(row.id).toLowerCase().includes(term);

    const status =
      row.spent > row.allocated
        ? "Over"
        : "Under";

    const matchFilter =
      filter === "All" || status === filter;

    return matchSearch && matchFilter;
  });

  const totalBudgeted = rows.reduce(
    (sum, row) => sum + row.allocated,
    0
  );

  const totalActual = rows.reduce(
    (sum, row) => sum + row.spent,
    0
  );

  const totalRemain = rows.reduce(
    (sum, row) => sum + row.remaining,
    0
  );

  return (
    <div className="ca-costcodes">
      <div className="ca-filters">
        <input
          className="ca-search"
          placeholder="Search project or project ID…"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="ca-filter-group">
          <label>Status:</label>

          <select
            className="ca-filter-select"
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
          >
            <option>All</option>
            <option>Under</option>
            <option>Over</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="ca-empty">
          No project cost records found.
        </p>
      ) : (
        <div className="ca-table-wrap">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Project</th>
                <th>Budgeted</th>
                <th>Actual</th>
                <th>Remaining</th>
                <th>Utilisation</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const used = pct(
                  r.spent,
                  r.allocated
                );

                const status =
                  r.spent > r.allocated
                    ? "Over"
                    : "Under";

                return (
                  <tr
                    key={r.id}
                    className="ca-trow"
                  >
                    <td className="ca-code">
                      {r.id}
                    </td>

                    <td className="ca-desc">
                      {r.name}
                    </td>

                    <td className="ca-mono">
                      {fmt(r.allocated)}
                    </td>

                    <td className="ca-mono">
                      {fmt(r.spent)}
                    </td>

                    <td
                      className="ca-mono"
                      style={{
                        color: varColor(
                          r.remaining
                        ),
                      }}
                    >
                      {fmt(r.remaining)}
                    </td>

                    <td>
                      <div className="ca-mini-bar">
                        <div
                          className="ca-mini-fill"
                          style={{
                            width: `${Math.min(
                              Math.max(used, 0),
                              100
                            )}%`,
                            background:
                              status === "Over"
                                ? "#dc2626"
                                : "#0A4174",
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: "0.72rem",
                          color:
                            status === "Over"
                              ? "#dc2626"
                              : "#374151",
                        }}
                      >
                        {used}%
                      </span>
                    </td>

                    <td>
                      <span
                        className="ca-status-badge"
                        style={{
                          background:
                            status === "Over"
                              ? "#fee2e2"
                              : "#dcfce7",
                          color:
                            status === "Over"
                              ? "#dc2626"
                              : "#059669",
                        }}
                      >
                        {status === "Over"
                          ? "Over Budget"
                          : "Under Budget"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="ca-tfoot">
                <td colSpan={2}>Total</td>

                <td className="ca-mono">
                  {fmt(totalBudgeted)}
                </td>

                <td className="ca-mono">
                  {fmt(totalActual)}
                </td>

                <td
                  className="ca-mono"
                  style={{
                    color: varColor(
                      totalRemain
                    ),
                  }}
                >
                  {fmt(totalRemain)}
                </td>

                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {costCategories.length > 0 && (
        <div
          style={{
            marginTop: "18px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          Category-level budget and actual figures are
          available in the Overview tab.
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — MONTHLY TREND
════════════════════════════════════════════════════════════ */

function MonthlyTrendTab({
  costCategories,
  expenseCategories,
}) {
  /*
   * The current cost-report backend does not return monthly
   * buckets. We therefore do not fabricate monthly values.
   *
   * Instead, this tab provides a category-level planned vs
   * actual visual using the real budgetVsActual response.
   */

  const maxValue = Math.max(
    ...costCategories.map((c) =>
      Math.max(c.budgeted, c.actual)
    ),
    1
  );

  return (
    <div className="ca-trend">
      <div className="ca-section">
        <h2 className="ca-section-title">
          Budgeted vs Actual Cost by Category
        </h2>

        <div className="ca-chart-legend">
          <span
            className="ca-legend-chip"
            style={{ background: "#0A4174" }}
          />

          Budgeted

          <span
            className="ca-legend-chip"
            style={{
              background: "#4E8EA2",
              marginLeft: "1.5rem",
            }}
          />

          Actual
        </div>

        {costCategories.length === 0 ? (
          <p className="ca-empty">
            No budget or actual cost data available yet.
          </p>
        ) : (
          <div className="ca-bar-chart">
            {costCategories.map((category) => {
              const plannedH =
                (category.budgeted / maxValue) *
                240;

              const actualH =
                (category.actual / maxValue) *
                240;

              return (
                <div
                  key={category.id}
                  className="ca-bar-group"
                >
                  <div className="ca-bar-pair">
                    <div className="ca-bar-col">
                      <div
                        className="ca-bar ca-bar--planned"
                        style={{
                          height: plannedH,
                        }}
                      >
                        <span className="ca-bar-tip">
                          {fmt(
                            category.budgeted
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="ca-bar-col">
                      <div
                        className="ca-bar ca-bar--actual"
                        style={{
                          height: actualH,
                        }}
                      >
                        <span className="ca-bar-tip">
                          {fmt(
                            category.actual
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="ca-bar-month">
                    {category.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Breakdown table ───────────────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Cost Breakdown
        </h2>

        {costCategories.length === 0 ? (
          <p className="ca-empty">
            No cost data available yet.
          </p>
        ) : (
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budgeted</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th>Variance %</th>
                </tr>
              </thead>

              <tbody>
                {costCategories.map((category) => {
                  const variance =
                    category.budgeted -
                    category.actual;

                  const variancePct =
                    category.budgeted > 0
                      ? (
                          (variance /
                            category.budgeted) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <tr
                      key={category.id}
                      className="ca-trow"
                    >
                      <td className="ca-mono">
                        {category.name}
                      </td>

                      <td className="ca-mono">
                        {fmt(
                          category.budgeted
                        )}
                      </td>

                      <td className="ca-mono">
                        {fmt(
                          category.actual
                        )}
                      </td>

                      <td
                        className="ca-mono"
                        style={{
                          color:
                            varColor(
                              variance
                            ),
                        }}
                      >
                        {fmt(variance)}
                      </td>

                      <td
                        style={{
                          color:
                            varColor(
                              variance
                            ),
                        }}
                      >
                        {variancePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Expense category section ─────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Expense Categories
        </h2>

        {expenseCategories.length === 0 ? (
          <p className="ca-empty">
            No expense category data available yet.
          </p>
        ) : (
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Expense</th>
                </tr>
              </thead>

              <tbody>
                {expenseCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="ca-trow"
                  >
                    <td>
                      <span
                        style={{
                          marginRight: "8px",
                        }}
                      >
                        {category.icon}
                      </span>

                      {category.name}
                    </td>

                    <td className="ca-mono">
                      {fmt(category.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 4 — VARIANCE ANALYSIS
════════════════════════════════════════════════════════════ */

function VarianceTab({
  costCategories,
  projectTotals,
}) {
  const totalVariance = costCategories.reduce(
    (sum, category) =>
      sum +
      (category.budgeted - category.actual),
    0
  );

  const totalUnder = costCategories
    .filter(
      (category) =>
        category.budgeted >= category.actual
    )
    .reduce(
      (sum, category) =>
        sum +
        (category.budgeted -
          category.actual),
      0
    );

  const totalOver = costCategories
    .filter(
      (category) =>
        category.actual > category.budgeted
    )
    .reduce(
      (sum, category) =>
        sum +
        (category.actual -
          category.budgeted),
      0
    );

  const maxImpact = Math.max(
    ...costCategories.map((category) =>
      Math.abs(
        category.budgeted -
          category.actual
      )
    ),
    1
  );

  return (
    <div className="ca-variance">
      {/* ── Summary ───────────────────────────────────────── */}

      <div className="ca-var-summary">
        <div className="ca-var-box ca-var-box--risk">
          <p className="ca-var-box-label">
            Total Over Budget
          </p>

          <p className="ca-var-box-val">
            {fmt(totalOver)}
          </p>
        </div>

        <div className="ca-var-box ca-var-box--opp">
          <p className="ca-var-box-label">
            Total Under Budget
          </p>

          <p className="ca-var-box-val">
            {fmt(totalUnder)}
          </p>
        </div>

        <div
          className="ca-var-box"
          style={{
            borderColor:
              varColor(totalVariance) + "44",
          }}
        >
          <p className="ca-var-box-label">
            Net Variance
          </p>

          <p
            className="ca-var-box-val"
            style={{
              color: varColor(
                totalVariance
              ),
            }}
          >
            {fmt(totalVariance)}
          </p>
        </div>
      </div>

      {/* ── Variance Drivers ─────────────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Category Variance
        </h2>

        {costCategories.length === 0 ? (
          <p className="ca-empty">
            No variance data available yet.
          </p>
        ) : (
          <div className="ca-waterfall">
            {costCategories.map((category) => {
              const impact =
                category.budgeted -
                category.actual;

              const barW = Math.round(
                (Math.abs(impact) /
                  maxImpact) *
                  100
              );

              return (
                <div
                  key={category.id}
                  className="ca-wf-row"
                >
                  <div className="ca-wf-label">
                    {category.name}
                  </div>

                  <div className="ca-wf-bar-wrap">
                    <div
                      className="ca-wf-bar"
                      style={{
                        width: `${barW}%`,
                        background:
                          impact >= 0
                            ? "#059669"
                            : "#dc2626",
                      }}
                    />
                  </div>

                  <span
                    className="ca-wf-val"
                    style={{
                      color:
                        varColor(impact),
                    }}
                  >
                    {impact > 0 ? "+" : ""}
                    {fmt(impact)}
                  </span>

                  <span
                    className="ca-wf-type"
                    style={{
                      background:
                        impact >= 0
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        impact >= 0
                          ? "#059669"
                          : "#dc2626",
                    }}
                  >
                    {impact >= 0
                      ? "Under Budget"
                      : "Over Budget"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Variance Register ────────────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Variance Register
        </h2>

        {costCategories.length === 0 ? (
          <p className="ca-empty">
            No variance records available yet.
          </p>
        ) : (
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budgeted</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {costCategories.map((category) => {
                  const variance =
                    category.budgeted -
                    category.actual;

                  return (
                    <tr
                      key={category.id}
                      className="ca-trow"
                    >
                      <td>
                        {category.name}
                      </td>

                      <td className="ca-mono">
                        {fmt(
                          category.budgeted
                        )}
                      </td>

                      <td className="ca-mono">
                        {fmt(
                          category.actual
                        )}
                      </td>

                      <td
                        className="ca-mono"
                        style={{
                          color:
                            varColor(
                              variance
                            ),
                          fontWeight: 600,
                        }}
                      >
                        {variance > 0
                          ? "+"
                          : ""}
                        {fmt(variance)}
                      </td>

                      <td>
                        <span
                          className="ca-status-badge"
                          style={{
                            background:
                              variance >= 0
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              variance >= 0
                                ? "#059669"
                                : "#dc2626",
                          }}
                        >
                          {variance >= 0
                            ? "Under Budget"
                            : "Over Budget"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Project variance ─────────────────────────────── */}

      <div className="ca-section">
        <h2 className="ca-section-title">
          Project Variance
        </h2>

        {projectTotals.length === 0 ? (
          <p className="ca-empty">
            No project cost records available.
          </p>
        ) : (
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Budgeted</th>
                  <th>Actual</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {projectTotals.map((project) => {
                  const overBudget =
                    project.spent >
                    project.allocated;

                  return (
                    <tr
                      key={project.id}
                      className="ca-trow"
                    >
                      <td>
                        {project.name}
                      </td>

                      <td className="ca-mono">
                        {fmt(
                          project.allocated
                        )}
                      </td>

                      <td className="ca-mono">
                        {fmt(
                          project.spent
                        )}
                      </td>

                      <td
                        className="ca-mono"
                        style={{
                          color:
                            varColor(
                              project.remaining
                            ),
                        }}
                      >
                        {fmt(
                          project.remaining
                        )}
                      </td>

                      <td>
                        <span
                          className="ca-status-badge"
                          style={{
                            background:
                              overBudget
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              overBudget
                                ? "#dc2626"
                                : "#059669",
                          }}
                        >
                          {overBudget
                            ? "Over Budget"
                            : "Under Budget"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}