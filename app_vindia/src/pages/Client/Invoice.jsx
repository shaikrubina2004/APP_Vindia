import { Fragment, useEffect, useState } from "react";
import { API } from "../../services/authService";
import {
  useClientAPI,
  withClientProject,
  PageLoader,
  PageError,
  fmtDate,
  fmtINR,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const PAY = {
  paid: ["Paid", "pill--success"],
  partial: ["Part paid", "pill--warning"],
  due: ["Due", "pill--danger"],
};

function Breakdown({ id }) {
  const [st, setSt] = useState({ loading: true, error: "", inv: null });

  useEffect(() => {
    let off = false;
    API.get(withClientProject(`/client/invoices/${id}`))
      .then((r) => !off && setSt({ loading: false, error: "", inv: r.data.invoice }))
      .catch((e) =>
        !off &&
        setSt({ loading: false, error: e?.response?.data?.message || "Could not load the breakdown.", inv: null }),
      );
    return () => {
      off = true;
    };
  }, [id]);

  if (st.loading) return <p className="cl-muted-note">Loading breakdown…</p>;
  if (st.error) return <p className="cl-muted-note" style={{ color: "var(--red)" }}>{st.error}</p>;
  const { material_lines = [], labour_lines = [] } = st.inv;

  return (
    <div className="cl-breakdown">
      <div className="cl-breakdown__block">
        <div className="cl-breakdown__title">Materials</div>
        {material_lines.length ? (
          <table className="cl-table cl-table--compact">
            <thead>
              <tr><th>Description</th><th>Unit</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Rate</th><th style={{ textAlign: "right" }}>Amount</th></tr>
            </thead>
            <tbody>
              {material_lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.description}</td>
                  <td>{l.unit}</td>
                  <td style={{ textAlign: "right" }}>{l.quantity.toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right" }}>{fmtINR(l.rate)}</td>
                  <td style={{ textAlign: "right" }}>{fmtINR(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="cl-muted-note">No material lines.</p>}
      </div>
      <div className="cl-breakdown__block">
        <div className="cl-breakdown__title">Labour</div>
        {labour_lines.length ? (
          <table className="cl-table cl-table--compact">
            <thead>
              <tr><th>Trade</th><th style={{ textAlign: "right" }}>Workers</th><th style={{ textAlign: "right" }}>Days</th><th style={{ textAlign: "right" }}>Amount</th></tr>
            </thead>
            <tbody>
              {labour_lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.type}</td>
                  <td style={{ textAlign: "right" }}>{l.workers}</td>
                  <td style={{ textAlign: "right" }}>{l.days}</td>
                  <td style={{ textAlign: "right" }}>{fmtINR(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="cl-muted-note">No labour lines.</p>}
      </div>
    </div>
  );
}

export default function Invoice() {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const { data, loading, error, refetch } = useClientAPI("/client/invoices");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const invoices = data?.invoices || [];
  const s = data?.summary || {};
  const outstanding = invoices.filter((i) => i.payment_status !== "paid");

  const filtered = invoices.filter((i) => {
    if (filter === "outstanding") return i.payment_status !== "paid";
    if (filter === "paid") return i.payment_status === "paid";
    return true;
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">Invoices</h1>
          <p className="cl-page-sub">
            {invoices.length} finalised invoice{invoices.length !== 1 ? "s" : ""}. Estimates still under review are not billed.
          </p>
        </div>
      </div>

      <div className="inv-summary">
        <div className="inv-sum-card">
          <div className="inv-sum-label">Total billed</div>
          <div className="inv-sum-value">{fmtINR(s.total_billed)}</div>
          <div className="inv-sum-sub">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="inv-sum-card">
          <div className="inv-sum-label">Amount paid</div>
          <div className="inv-sum-value" style={{ color: "var(--green)" }}>{fmtINR(s.total_paid)}</div>
          <div className="inv-sum-sub">
            {invoices.length - outstanding.length} fully paid
            {s.advance > 0 ? ` · ${fmtINR(s.advance)} advance held` : ""}
          </div>
        </div>
        <div className="inv-sum-card">
          <div className="inv-sum-label">Pending amount</div>
          <div className="inv-sum-value" style={{ color: s.total_pending > 0 ? "var(--red)" : "var(--green)" }}>
            {fmtINR(s.total_pending)}
          </div>
          <div className="inv-sum-sub">{outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""} outstanding</div>
        </div>
      </div>

      <div className="cl-card">
        <div className="cl-card__head">
          <span className="cl-card__title">All invoices</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "all", label: "All" },
              { key: "outstanding", label: "Outstanding" },
              { key: "paid", label: "Paid" },
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
                <th style={{ textAlign: "right" }}>Paid</th>
                <th style={{ textAlign: "right" }}>Balance</th>
                <th>Finalised on</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((inv) => {
                  const [label, cls] = PAY[inv.payment_status] || PAY.due;
                  const isOpen = openId === inv.id;
                  return (
                    <Fragment key={inv.id}>
                      <tr>
                        <td><span className="cl-mono">INV-{String(inv.id).padStart(4, "0")}</span></td>
                        <td>{inv.milestone_name || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtINR(inv.material_total)}</td>
                        <td style={{ textAlign: "right" }}>{fmtINR(inv.labour_total)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtINR(inv.amount)}</td>
                        <td style={{ textAlign: "right", color: "var(--green)" }}>{fmtINR(inv.paid_amount)}</td>
                        <td style={{ textAlign: "right", color: inv.balance > 0 ? "var(--red)" : "var(--text-muted)" }}>{fmtINR(inv.balance)}</td>
                        <td style={{ color: "var(--text-muted)" }}>{fmtDate(inv.invoice_date)}</td>
                        <td><span className={`pill ${cls}`}>{label}</span></td>
                        <td>
                          <button className="cl-btn cl-btn--ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setOpenId(isOpen ? null : inv.id)}>
                            {isOpen ? "Hide" : "Breakdown"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="cl-breakdown-row">
                          <td colSpan={10}><Breakdown id={inv.id} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className="cl-empty">
                      <div className="cl-empty__icon">🧾</div>
                      <p>{invoices.length ? "No invoices match this filter." : "No invoices yet. An invoice appears once a milestone's BOQ is finalised."}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="cl-muted-note" style={{ padding: "10px 16px 14px" }}>
          Payments received are applied to the oldest invoice first.
        </p>
      </div>
    </div>
  );
}
