import { useState } from "react";
import "../../styles/Client.css";

const INVOICES = [
  {
    id: "INV-2024-003",
    desc: "Structural work – Phase 2",
    amount: 1420000,
    due: "May 14, 2024",
    issued: "Apr 30, 2024",
    status: "due",
    milestone: "Structural frame – floors 1–5",
  },
  {
    id: "INV-2024-002",
    desc: "Foundation completion",
    amount: 2280000,
    due: "Mar 30, 2024",
    issued: "Mar 15, 2024",
    status: "paid",
    milestone: "Foundation & excavation",
  },
  {
    id: "INV-2024-001",
    desc: "Mobilisation & project setup",
    amount: 850000,
    due: "Jan 20, 2024",
    issued: "Jan 5, 2024",
    status: "paid",
    milestone: "—",
  },
];

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

const SUMMARY = [
  {
    label: "Total contract value",
    val: fmt(12500000),
    sub: "As per agreement",
  },
  { label: "Amount billed", val: fmt(4550000), sub: "3 invoices raised" },
  { label: "Amount paid", val: fmt(3130000), sub: "2 invoices cleared" },
];

function StatusPill({ status }) {
  const map = {
    due: ["Due", "pill--danger"],
    paid: ["Paid", "pill--success"],
    overdue: ["Overdue", "pill--warning"],
  };
  const [label, cls] = map[status] || [status, "pill--neutral"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export default function Invoice() {
  const [filter, setFilter] = useState("all");
  const filtered = INVOICES.filter(
    (inv) => filter === "all" || inv.status === filter,
  );

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">Invoices</h1>
          <p className="cl-page-sub">Greenview Residences – Tower B</p>
        </div>
      </div>

      <div className="inv-summary">
        {SUMMARY.map((s) => (
          <div key={s.label} className="inv-sum-card">
            <div className="inv-sum-label">{s.label}</div>
            <div className="inv-sum-value">{s.val}</div>
            <div className="inv-sum-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="cl-card">
        <div className="cl-card__head">
          <span className="cl-card__title">All invoices</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "due", "paid"].map((f) => (
              <button
                key={f}
                className={`cl-btn ${filter === f ? "cl-btn--primary" : "cl-btn--ghost"}`}
                style={{ padding: "4px 12px", fontSize: "12px" }}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Description</th>
                <th>Milestone</th>
                <th>Issued</th>
                <th>Due date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span className="cl-mono">{inv.id}</span>
                  </td>
                  <td>{inv.desc}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {inv.milestone}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{inv.issued}</td>
                  <td
                    style={{
                      color:
                        inv.status === "due"
                          ? "var(--red)"
                          : "var(--text-muted)",
                    }}
                  >
                    {inv.due}
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
                  <td>
                    <StatusPill status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
