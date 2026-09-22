import { useState, useEffect, useCallback } from "react";
import accountantService from "../../services/accountantService";
import { useProject } from "../../context/ProjectContext";
import "./AccountantShared.css";

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

function BudgetRow({ row }) {
  // Real API fields, confirmed from financeModel.getCostReportSummary:
  // { category, allocated, spent }
  const allocated = Number(row.allocated || 0);
  const spent = Number(row.spent || 0);
  const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const overBudget = spent > allocated;
  const fillClass = overBudget
    ? "acs-progress-over"
    : pct > 80
    ? "acs-progress-warn"
    : "";

  return (
    <tr>
      <td>{row.category}</td>
      <td>{formatCurrency(allocated)}</td>
      <td>{formatCurrency(spent)}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
          <div className="acs-progress-track" style={{ flex: 1 }}>
            <div className={`acs-progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: "0.78rem", color: overBudget ? "var(--acs-danger)" : "var(--acs-muted)", whiteSpace: "nowrap" }}>
            {allocated > 0 ? `${pct.toFixed(0)}%` : "—"}
          </span>
        </div>
      </td>
    </tr>
  );
}

export default function AccountantCostAnalysis() {
  const { activeProject } = useProject();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setStatus("loading");
    accountantService
      .getCostReport(activeProject?.id ?? null)
      .then((res) => {
        setData(res.data?.data ?? null);
        setStatus("success");
      })
      .catch((err) => {
        setErrorMessage(err?.response?.data?.message || "Failed to load cost report.");
        setStatus("error");
      });
  }, [activeProject?.id]);

  useEffect(() => { load(); }, [load]);

  const budgetVsActual = data?.budgetVsActual ?? [];
  const byExpenseCategory = data?.byExpenseCategory ?? [];

  return (
    <div className="acs-root">
      <div className="acs-header">
        <div>
          <h1>Cost Analysis</h1>
          <p>Budget-vs-actual summary, read-only. Uses /api/accountant/cost-report.</p>
        </div>
      </div>

      {status === "loading" && (
        <div className="acs-state">
          <div className="acs-spinner" aria-hidden="true" />
          <p>Loading…</p>
        </div>
      )}

      {status === "error" && (
        <div className="acs-state acs-state-error">
          <p>{errorMessage}</p>
          <button type="button" className="acs-btn" onClick={load}>Retry</button>
        </div>
      )}

      {status === "success" && (
        <>
          <div className="acs-section">
            <h3>Budget vs. Actual</h3>
            <p className="acs-section-sub">Allocated budget vs. amount spent, by category.</p>
            {budgetVsActual.length === 0 ? (
              <div className="acs-empty">No budget data available for this selection.</div>
            ) : (
              <div className="acs-table-wrap">
                <table className="acs-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Allocated</th>
                      <th>Spent</th>
                      <th>Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetVsActual.map((row, i) => (
                      <BudgetRow row={row} key={row.category ?? i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="acs-section">
            <h3>Expense Breakdown</h3>
            <p className="acs-section-sub">Total spend by expense category.</p>
            {byExpenseCategory.length === 0 ? (
              <div className="acs-empty">No expense data available for this selection.</div>
            ) : (
              <div className="acs-table-wrap">
                <table className="acs-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byExpenseCategory.map((row, i) => (
                      <tr key={row.category ?? i}>
                        <td>{row.category}</td>
                        <td>{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
