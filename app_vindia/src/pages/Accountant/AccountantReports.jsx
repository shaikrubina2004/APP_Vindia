import { useState, useEffect } from "react";
import accountantService from "../../services/accountantService";
import "./AccountantShared.css";

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

/**
 * Rolls up reports that can genuinely be derived today from real data:
 *  - Trial Balance (posted journal entries — ledgerModel.getTrialBalance)
 *  - Expense Summary (existing expenseController.getExpenseSummary:
 *    { byType: [{expense_type,total}], byCategory: [{category,total,count}] })
 *  - Tax Summary (taxRegisterModel.getSummaryByPeriod)
 *  - Receivables/Payables (receivablesPayablesModel.getReport:
 *    { receivables: [...], payables: [...],
 *      summary: { receivables:{total,paid,outstanding,pending},
 *                 payables:{total,paid,outstanding,pending} } })
 * All field names below are taken directly from the backend model code,
 * not guessed. No report is shown whose underlying data can't be
 * correctly calculated from what actually exists in the database.
 */
export default function AccountantReports() {
  const [trialBalance, setTrialBalance] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [taxSummary, setTaxSummary] = useState(null);
  const [rp, setRp] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      accountantService.getTrialBalance(),
      accountantService.getExpenseSummary(),
      accountantService.getTaxSummary(),
      accountantService.getReceivablesPayables(),
    ]).then(([tb, es, ts, rpRes]) => {
      if (tb.status === "fulfilled") setTrialBalance(tb.value.data?.data ?? []);
      if (es.status === "fulfilled") setExpenseSummary(es.value.data?.data ?? null);
      if (ts.status === "fulfilled") setTaxSummary(ts.value.data?.data ?? []);
      if (rpRes.status === "fulfilled") setRp(rpRes.value.data?.data ?? null);
      if ([tb, es, ts, rpRes].every((r) => r.status === "rejected")) {
        setError("Failed to load reports. Please try again later.");
      }
    });
  }, []);

  return (
    <div className="acs-root">
      <div className="acs-header">
        <div>
          <h1>Accountant Reports</h1>
          <p>Rolled up from real data: posted journal entries, expenses, tax register, and receivables/payables.</p>
        </div>
      </div>

      {error && <p className="acs-error-text">{error}</p>}

      {/* ── Trial Balance ──────────────────────────────── */}
      <div className="acs-section">
        <h3>Trial Balance</h3>
        <p className="acs-section-sub">Posted journal entries only, grouped by account.</p>
        {trialBalance === null ? (
          <p style={{ color: "var(--acs-muted)" }}>Loading…</p>
        ) : trialBalance.length === 0 ? (
          <div className="acs-empty">No accounts found — run the Chart of Accounts migration/seed first.</div>
        ) : (
          <div className="acs-table-wrap">
            <table className="acs-table">
              <thead>
                <tr><th>Account</th><th>Type</th><th>Total Debit</th><th>Total Credit</th></tr>
              </thead>
              <tbody>
                {trialBalance.map((row) => (
                  <tr key={row.account_id}>
                    <td>{row.account_code} — {row.account_name}</td>
                    <td style={{ textTransform: "capitalize" }}>{row.account_type}</td>
                    <td>{formatCurrency(row.total_debit)}</td>
                    <td>{formatCurrency(row.total_credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tax Summary ────────────────────────────────── */}
      <div className="acs-section">
        <h3>Tax Summary</h3>
        <p className="acs-section-sub">Tax register entries grouped by filing period and tax type.</p>
        {taxSummary === null ? (
          <p style={{ color: "var(--acs-muted)" }}>Loading…</p>
        ) : taxSummary.length === 0 ? (
          <div className="acs-empty">No tax register entries yet.</div>
        ) : (
          <div className="acs-table-wrap">
            <table className="acs-table">
              <thead>
                <tr><th>Period</th><th>Tax Type</th><th>Taxable Total</th><th>Tax Total</th><th>Count</th></tr>
              </thead>
              <tbody>
                {taxSummary.map((row, i) => (
                  <tr key={i}>
                    <td>{row.filing_period || "—"}</td>
                    <td style={{ textTransform: "uppercase" }}>{row.tax_type}</td>
                    <td>{formatCurrency(row.taxable_total)}</td>
                    <td>{formatCurrency(row.tax_total)}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Expense Summary ────────────────────────────── */}
      <div className="acs-section">
        <h3>Expense Summary</h3>
        <p className="acs-section-sub">All expenses, grouped by type and by category.</p>
        {expenseSummary === null ? (
          <p style={{ color: "var(--acs-muted)" }}>Loading…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            <div>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--acs-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                By Type
              </p>
              {(expenseSummary.byType ?? []).length === 0 ? (
                <div className="acs-empty">No data.</div>
              ) : (
                <table className="acs-table">
                  <thead><tr><th>Type</th><th>Total</th></tr></thead>
                  <tbody>
                    {expenseSummary.byType.map((row, i) => (
                      <tr key={i}>
                        <td style={{ textTransform: "capitalize" }}>{row.expense_type}</td>
                        <td>{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--acs-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                By Category
              </p>
              {(expenseSummary.byCategory ?? []).length === 0 ? (
                <div className="acs-empty">No data.</div>
              ) : (
                <table className="acs-table">
                  <thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead>
                  <tbody>
                    {expenseSummary.byCategory.map((row, i) => (
                      <tr key={i}>
                        <td>{row.category}</td>
                        <td>{row.count}</td>
                        <td>{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Receivables & Payables ─────────────────────── */}
      <div className="acs-section">
        <h3>Receivables &amp; Payables Summary</h3>
        <p className="acs-section-sub">Full row-level detail is on the Receivables &amp; Payables page — this is the rollup.</p>
        {rp === null ? (
          <p style={{ color: "var(--acs-muted)" }}>Loading…</p>
        ) : (
          <div className="acs-summary-row" style={{ marginBottom: 0 }}>
            <div className="acs-summary-card">
              <div className="acs-summary-label">Receivables — Total</div>
              <div className="acs-summary-value">{formatCurrency(rp.summary?.receivables?.total)}</div>
            </div>
            <div className="acs-summary-card">
              <div className="acs-summary-label">Receivables — Outstanding</div>
              <div className="acs-summary-value">{formatCurrency(rp.summary?.receivables?.outstanding)}</div>
            </div>
            <div className="acs-summary-card">
              <div className="acs-summary-label">Payables — Total</div>
              <div className="acs-summary-value">{formatCurrency(rp.summary?.payables?.total)}</div>
            </div>
            <div className="acs-summary-card">
              <div className="acs-summary-label">Payables — Outstanding</div>
              <div className="acs-summary-value">{formatCurrency(rp.summary?.payables?.outstanding)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
