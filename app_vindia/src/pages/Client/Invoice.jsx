import { useState } from "react";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
  fmtINR,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

function StatusPill({ status }) {
  // Normalise boq statuses to display labels
  const map = {
    finalised: ["Finalised", "pill--success"],
    finalized: ["Finalised", "pill--success"],
    pending_pm: ["Pending PM", "pill--warning"],
    pending_se: ["Pending SE", "pill--warning"],
    approved_by_pm: ["Approved", "pill--info"],
    due: ["Due", "pill--danger"],
    paid: ["Paid", "pill--success"],
  };
  const [label, cls] = map[status] || [status || "Pending", "pill--neutral"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export default function Invoice() {
  const [filter, setFilter] = useState("all");

  const { data, loading, error, refetch } = useClientAPI("/client/invoices");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const invoices = data?.invoices || [];
  const summary = data?.summary || {};

  const isFinalised = (s) => ["finalised", "finalized"].includes(s);
  const isPending = (s) =>
    ["pending_pm", "pending_se", "approved_by_pm"].includes(s);

  const filtered = invoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "finalised") return isFinalised(inv.status);
    if (filter === "pending") return isPending(inv.status);
    return true;
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">Invoices</h1>
          <p className="cl-page-sub">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} raised
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="inv-summary">
        <div className="inv-sum-card">
          <div className="inv-sum-label">Total billed</div>
          <div className="inv-sum-value">{fmtINR(summary.total_billed)}</div>
          <div className="inv-sum-sub">{invoices.length} invoices</div>
        </div>
        <div className="inv-sum-card">
          <div className="inv-sum-label">Amount paid</div>
          <div className="inv-sum-value" style={{ color: "var(--green)" }}>
            {fmtINR(summary.total_paid)}
          </div>
          <div className="inv-sum-sub">
            {invoices.filter((i) => isFinalised(i.status)).length} finalised
          </div>
        </div>
        <div className="inv-sum-card">
          <div className="inv-sum-label">Pending amount</div>
          <div
            className="inv-sum-value"
            style={{
              color: summary.total_pending > 0 ? "var(--red)" : "var(--green)",
            }}
          >
            {fmtINR(summary.total_pending)}
          </div>
          <div className="inv-sum-sub">
            {invoices.filter((i) => isPending(i.status)).length} awaiting
            finalisation
          </div>
        </div>
      </div>

      <div className="cl-card">
        <div className="cl-card__head">
          <span className="cl-card__title">All invoices</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "finalised", label: "Finalised" },
            ].map((f) => (
              <button
                key={f.key}
                className={`cl-btn ${filter === f.key ? "cl-btn--primary" : "cl-btn--ghost"}`}
                style={{ padding: "4px 12px", fontSize: 12 }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Milestone</th>
                <th style={{ textAlign: "right" }}>Material</th>
                <th style={{ textAlign: "right" }}>Labour</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Finalised on</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className="cl-mono">BOQ-{inv.id}</span>
                    </td>
                    <td>{inv.milestone_name || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {fmtINR(inv.material_total)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {fmtINR(inv.labour_total)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {fmtINR(inv.amount ?? inv.grand_total)}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {fmtDate(inv.invoice_date) || "—"}
                    </td>
                    <td>
                      <StatusPill status={inv.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="cl-empty">
                      <div className="cl-empty__icon">🧾</div>
                      <p>No invoices found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
