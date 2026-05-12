import { useState, useEffect } from "react";
import "./InvoiceManagement.css";

/* ── Mock Data ─────────────────────────────────────────────── */
const MOCK_INVOICES = [
  { id: "INV-2024-0041", client: "Skyline Infra Pvt Ltd",   project: "Tower B Construction",  amount: 1250000, issued: "2024-05-01", due: "2024-05-20", status: "pending" },
  { id: "INV-2024-0040", client: "Green Valley Developers", project: "Villa Complex Phase 2", amount:  980000, issued: "2024-04-20", due: "2024-05-10", status: "paid"    },
  { id: "INV-2024-0039", client: "Metro Constructions",     project: "Commercial Hub",        amount: 2100000, issued: "2024-04-10", due: "2024-05-01", status: "overdue" },
  { id: "INV-2024-0038", client: "Horizon Realty",          project: "Residential Block A",   amount:  650000, issued: "2024-04-08", due: "2024-04-28", status: "paid"    },
  { id: "INV-2024-0037", client: "BuildRight Corp",         project: "Highway Bridge",        amount: 1750000, issued: "2024-05-05", due: "2024-05-25", status: "pending" },
  { id: "INV-2024-0036", client: "Urban Spaces Ltd",        project: "Smart City Block 4",    amount:  320000, issued: "2024-03-28", due: "2024-04-15", status: "overdue" },
  { id: "INV-2024-0035", client: "Pinnacle Constructions",  project: "Office Complex A",      amount: 4500000, issued: "2024-04-01", due: "2024-04-30", status: "paid"    },
  { id: "INV-2024-0034", client: "Delta Infrastructure",    project: "Bridge Expansion",      amount:  875000, issued: "2024-05-07", due: "2024-05-28", status: "pending" },
];

const EMPTY_FORM = {
  client: "", project: "", invoiceNo: "", issueDate: "", dueDate: "",
  tax: "18", notes: "",
  items: [{ description: "", qty: 1, rate: "", amount: 0 }],
};

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const daysDiff = (dateStr) => {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  return diff;
};

const TABS = ["All Invoices", "Create Invoice", "Pending Invoices"];

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function InvoiceManagement() {
  const [tab, setTab]       = useState("All Invoices");
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  return (
    <div className={`inv-root ${animIn ? "inv-in" : ""}`}>
      {/* Header */}
      <div className="inv-header">
        <div>
          <p className="inv-eyebrow">Finance Manager</p>
          <h1 className="inv-title">Invoice Management</h1>
        </div>
        <button className="inv-btn-primary" onClick={() => setTab("Create Invoice")}>
          + New Invoice
        </button>
      </div>

      {/* Tabs */}
      <div className="inv-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`inv-tab ${tab === t ? "inv-tab--on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Pending Invoices" && (
              <span className="inv-tab-badge">
                {MOCK_INVOICES.filter((i) => i.status !== "paid").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="inv-body">
        {tab === "All Invoices"     && <AllInvoicesTab />}
        {tab === "Create Invoice"   && <CreateInvoiceTab onSuccess={() => setTab("All Invoices")} />}
        {tab === "Pending Invoices" && <PendingInvoicesTab />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — ALL INVOICES
════════════════════════════════════════════════════════════ */
function AllInvoicesTab() {
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = MOCK_INVOICES.filter((inv) => {
    const matchSearch = inv.client.toLowerCase().includes(search.toLowerCase())
      || inv.id.toLowerCase().includes(search.toLowerCase())
      || inv.project.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "all" || inv.status === status;
    return matchSearch && matchStatus;
  });

  const totals = {
    total:   MOCK_INVOICES.reduce((s, i) => s + i.amount, 0),
    paid:    MOCK_INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pending: MOCK_INVOICES.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0),
    overdue: MOCK_INVOICES.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0),
  };

  return (
    <>
      {/* Stats Row */}
      <div className="inv-stats">
        {[
          { label: "Total Invoiced", value: fmt(totals.total),   color: "#0A4174", bg: "rgba(10,65,116,0.07)" },
          { label: "Collected",      value: fmt(totals.paid),    color: "#059669", bg: "rgba(5,150,105,0.07)" },
          { label: "Pending",        value: fmt(totals.pending), color: "#d97706", bg: "rgba(217,119,6,0.07)" },
          { label: "Overdue",        value: fmt(totals.overdue), color: "#dc2626", bg: "rgba(220,38,38,0.07)" },
        ].map((s) => (
          <div key={s.label} className="inv-stat" style={{ "--c": s.color, "--bg": s.bg }}>
            <p className="inv-stat-label">{s.label}</p>
            <p className="inv-stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="inv-search"
            placeholder="Search by invoice ID, client or project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="inv-status-filters">
          {["all","paid","pending","overdue"].map((s) => (
            <button
              key={s}
              className={`inv-filter-btn ${status === s ? "inv-filter-btn--on" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="inv-count">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="inv-table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Client</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="inv-empty">No invoices found</td></tr>
            )}
            {filtered.map((inv) => (
              <tr key={inv.id} className="inv-row" onClick={() => setSelected(inv)}>
                <td className="inv-id">{inv.id}</td>
                <td className="inv-client">{inv.client}</td>
                <td className="inv-project">{inv.project}</td>
                <td className="inv-amount">{fmt(inv.amount)}</td>
                <td>{inv.issued}</td>
                <td>{inv.due}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="inv-actions">
                    <button className="inv-act-btn inv-act-btn--view" title="View">👁</button>
                    <button className="inv-act-btn inv-act-btn--edit" title="Edit">✏️</button>
                    <button className="inv-act-btn inv-act-btn--del"  title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <InvoiceDetailDrawer invoice={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — CREATE INVOICE
════════════════════════════════════════════════════════════ */
function CreateInvoiceTab({ onSuccess }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updateItem = (idx, key, val) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [key]: val };
      updated.amount = Number(updated.qty || 0) * Number(updated.rate || 0);
      return updated;
    });
    setForm((f) => ({ ...f, items }));
  };

  const addItem    = () => setForm((f) => ({ ...f, items: [...f.items, { description: "", qty: 1, rate: "", amount: 0 }] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = form.items.reduce((s, it) => s + it.amount, 0);
  const taxAmt   = subtotal * (Number(form.tax) / 100);
  const total    = subtotal + taxAmt;

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); onSuccess(); }, 1500);
  };

  return (
    <div className="inv-create">
      {submitted && <div className="inv-toast">✅ Invoice created successfully!</div>}

      <div className="inv-create-grid">
        {/* Left — Form */}
        <div className="inv-form-col">
          <section className="inv-section">
            <h3 className="inv-section-title">Client Details</h3>
            <div className="inv-form-row">
              <label>Client Name <span>*</span></label>
              <input className="inv-input" placeholder="e.g. Skyline Infra Pvt Ltd"
                value={form.client} onChange={(e) => setField("client", e.target.value)} />
            </div>
            <div className="inv-form-row">
              <label>Project</label>
              <input className="inv-input" placeholder="e.g. Tower B Construction"
                value={form.project} onChange={(e) => setField("project", e.target.value)} />
            </div>
          </section>

          <section className="inv-section">
            <h3 className="inv-section-title">Invoice Details</h3>
            <div className="inv-form-2col">
              <div className="inv-form-row">
                <label>Invoice No. <span>*</span></label>
                <input className="inv-input" placeholder="INV-2024-0042"
                  value={form.invoiceNo} onChange={(e) => setField("invoiceNo", e.target.value)} />
              </div>
              <div className="inv-form-row">
                <label>Tax Rate (%)</label>
                <input className="inv-input" type="number" min="0" max="100"
                  value={form.tax} onChange={(e) => setField("tax", e.target.value)} />
              </div>
              <div className="inv-form-row">
                <label>Issue Date</label>
                <input className="inv-input" type="date"
                  value={form.issueDate} onChange={(e) => setField("issueDate", e.target.value)} />
              </div>
              <div className="inv-form-row">
                <label>Due Date</label>
                <input className="inv-input" type="date"
                  value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="inv-section">
            <div className="inv-section-head">
              <h3 className="inv-section-title">Line Items</h3>
              <button className="inv-add-item" onClick={addItem}>+ Add Item</button>
            </div>
            <div className="inv-items-header">
              <span>Description</span><span>Qty</span><span>Rate (₹)</span><span>Amount</span><span></span>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="inv-item-row">
                <input className="inv-input inv-input--desc" placeholder="Work description"
                  value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                <input className="inv-input inv-input--num" type="number" min="1" placeholder="1"
                  value={item.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                <input className="inv-input inv-input--num" type="number" placeholder="0"
                  value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} />
                <span className="inv-item-amount">{fmt(item.amount)}</span>
                <button className="inv-remove-item" onClick={() => removeItem(idx)}
                  disabled={form.items.length === 1}>×</button>
              </div>
            ))}
          </section>

          <section className="inv-section">
            <h3 className="inv-section-title">Notes</h3>
            <textarea className="inv-textarea" rows={3} placeholder="Payment terms, bank details, or additional notes…"
              value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </section>
        </div>

        {/* Right — Preview */}
        <div className="inv-preview-col">
          <div className="inv-preview">
            <div className="inv-preview-top">
              <div>
                <p className="inv-preview-company">VINDIA</p>
                <p className="inv-preview-label">INVOICE</p>
              </div>
              <div className="inv-preview-meta">
                <p><strong>{form.invoiceNo || "INV-XXXX"}</strong></p>
                <p>Issued: {form.issueDate || "—"}</p>
                <p>Due: {form.dueDate || "—"}</p>
              </div>
            </div>

            <div className="inv-preview-to">
              <p className="inv-preview-to-label">BILL TO</p>
              <p className="inv-preview-to-name">{form.client || "Client Name"}</p>
              <p>{form.project || "Project Name"}</p>
            </div>

            <table className="inv-preview-table">
              <thead>
                <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.description || "—"}</td>
                    <td>{it.qty}</td>
                    <td>{it.rate ? `₹${Number(it.rate).toLocaleString("en-IN")}` : "—"}</td>
                    <td>{fmt(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="inv-preview-totals">
              <div className="inv-preview-total-row">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="inv-preview-total-row">
                <span>Tax ({form.tax}%)</span><span>{fmt(taxAmt)}</span>
              </div>
              <div className="inv-preview-total-row inv-preview-grand">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>

            {form.notes && (
              <p className="inv-preview-notes"><strong>Notes:</strong> {form.notes}</p>
            )}
          </div>

          <div className="inv-create-actions">
            <button className="inv-btn-outline">Save Draft</button>
            <button className="inv-btn-primary" onClick={handleSubmit}>Create Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — PENDING INVOICES
════════════════════════════════════════════════════════════ */
function PendingInvoicesTab() {
  const [filter, setFilter] = useState("all");

  const pending = MOCK_INVOICES.filter((i) => i.status !== "paid");
  const shown   = filter === "all" ? pending : pending.filter((i) => i.status === filter);

  const totalPending = pending.reduce((s, i) => s + i.amount, 0);
  const totalOverdue = pending.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      {/* Alert Banner */}
      {pending.filter((i) => i.status === "overdue").length > 0 && (
        <div className="inv-alert">
          ⚠️ <strong>{pending.filter((i) => i.status === "overdue").length} invoices are overdue</strong>
          — totalling {fmt(totalOverdue)}. Send reminders immediately.
        </div>
      )}

      {/* Summary */}
      <div className="inv-pending-summary">
        <div className="inv-ps-card inv-ps-card--pending">
          <p>Outstanding</p>
          <h3>{fmt(totalPending)}</h3>
          <span>{pending.length} invoices</span>
        </div>
        <div className="inv-ps-card inv-ps-card--overdue">
          <p>Overdue</p>
          <h3>{fmt(totalOverdue)}</h3>
          <span>{pending.filter((i) => i.status === "overdue").length} invoices</span>
        </div>
      </div>

      {/* Filter */}
      <div className="inv-pending-filters">
        {["all", "pending", "overdue"].map((f) => (
          <button key={f}
            className={`inv-filter-btn ${filter === f ? "inv-filter-btn--on" : ""}`}
            onClick={() => setFilter(f)}>
            {f === "all" ? "All Unpaid" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="inv-pending-cards">
        {shown.map((inv) => {
          const days = daysDiff(inv.due);
          return (
            <div key={inv.id} className={`inv-pcard inv-pcard--${inv.status}`}>
              <div className="inv-pcard-top">
                <div>
                  <p className="inv-pcard-id">{inv.id}</p>
                  <p className="inv-pcard-client">{inv.client}</p>
                  <p className="inv-pcard-project">{inv.project}</p>
                </div>
                <div className="inv-pcard-right">
                  <p className="inv-pcard-amount">{fmt(inv.amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
              <div className="inv-pcard-bottom">
                <span className="inv-pcard-due">
                  Due: {inv.due}
                  {inv.status === "overdue" && (
                    <strong className="inv-pcard-overdue-tag"> · {days}d overdue</strong>
                  )}
                </span>
                <div className="inv-pcard-actions">
                  <button className="inv-btn-sm inv-btn-sm--outline">Send Reminder</button>
                  <button className="inv-btn-sm inv-btn-sm--primary">Mark Paid</button>
                </div>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <div className="inv-empty-state">
            <p>🎉 No {filter === "all" ? "pending" : filter} invoices!</p>
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   INVOICE DETAIL DRAWER
════════════════════════════════════════════════════════════ */
function InvoiceDetailDrawer({ invoice, onClose }) {
  return (
    <div className="inv-drawer-overlay" onClick={onClose}>
      <div className="inv-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="inv-drawer-header">
          <div>
            <p className="inv-drawer-id">{invoice.id}</p>
            <StatusBadge status={invoice.status} />
          </div>
          <button className="inv-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-drawer-body">
          <Row label="Client"     value={invoice.client} />
          <Row label="Project"    value={invoice.project} />
          <Row label="Amount"     value={fmt(invoice.amount)} />
          <Row label="Issued"     value={invoice.issued} />
          <Row label="Due Date"   value={invoice.due} />
          <Row label="Status"     value={<StatusBadge status={invoice.status} />} />
        </div>
        <div className="inv-drawer-footer">
          <button className="inv-btn-outline">Download PDF</button>
          <button className="inv-btn-primary">Mark as Paid</button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared helpers ────────────────────────────────────────── */
function StatusBadge({ status }) {
  return <span className={`inv-badge inv-badge--${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function Row({ label, value }) {
  return (
    <div className="inv-drawer-row">
      <span className="inv-drawer-label">{label}</span>
      <span className="inv-drawer-value">{value}</span>
    </div>
  );
}