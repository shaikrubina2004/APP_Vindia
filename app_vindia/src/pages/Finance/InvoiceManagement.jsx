import { useState, useEffect, useCallback } from "react";
import financeService from "../../services/financeService";
import { getProjects } from "../../services/projectService";
import "./InvoiceManagement.css";

const EMPTY_FORM = {
  project_id: "", client_name: "", invoiceNo: "", issueDate: "", dueDate: "",
  tax: "18", notes: "",
  items: [{ description: "", qty: 1, rate: "", amount: 0 }],
};

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) => {
  const num = Number(n) || 0;
  return num >= 10000000 ? `₹${(num / 10000000).toFixed(2)}Cr`
    : num >= 100000 ? `₹${(num / 100000).toFixed(1)}L`
    : `₹${num.toLocaleString("en-IN")}`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toISOString().split("T")[0];
};

const daysDiff = (dateStr) => {
  if (!dateStr) return 0;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
};

const TABS = ["All Invoices", "Create Invoice", "Pending Invoices"];

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT — owns all data fetching
════════════════════════════════════════════════════════════ */
export default function InvoiceManagement() {
  const [tab, setTab]       = useState("All Invoices");
  const [animIn, setAnimIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesRes, projectsRes] = await Promise.all([
        financeService.getAllInvoices(),
        getProjects(),
      ]);
      setInvoices(invoicesRes.data.data || []);
      setProjects(projectsRes.data.projects || projectsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoice data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const pendingCount = invoices.filter((i) => (i.effectiveStatus || i.status) !== "paid").length;

  if (loading) {
    return <div className="inv-root"><p className="inv-state">Loading invoices…</p></div>;
  }
  if (error) {
    return (
      <div className="inv-root">
        <p className="inv-state inv-state--error">
          {error} <button className="inv-btn-outline" onClick={loadAll}>Retry</button>
        </p>
      </div>
    );
  }

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
            {t === "Pending Invoices" && pendingCount > 0 && (
              <span className="inv-tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="inv-body">
        {tab === "All Invoices" && (
          <AllInvoicesTab invoices={invoices} onReload={loadAll} />
        )}
        {tab === "Create Invoice" && (
          <CreateInvoiceTab projects={projects} onSuccess={() => { loadAll(); setTab("All Invoices"); }} />
        )}
        {tab === "Pending Invoices" && (
          <PendingInvoicesTab invoices={invoices} onReload={loadAll} />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — ALL INVOICES
════════════════════════════════════════════════════════════ */
function AllInvoicesTab({ invoices, onReload }) {
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const filtered = invoices.filter((inv) => {
    const effStatus = inv.effectiveStatus || inv.status;
    const q = search.toLowerCase();
    const matchSearch =
      (inv.client_name || "").toLowerCase().includes(q) ||
      (inv.invoice_number || "").toLowerCase().includes(q) ||
      (inv.project_name || "").toLowerCase().includes(q);
    const matchStatus = status === "all" || effStatus === status;
    return matchSearch && matchStatus;
  });

  const totals = {
    total:   invoices.reduce((s, i) => s + Number(i.amount), 0),
    paid:    invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0),
    pending: invoices.filter((i) => (i.effectiveStatus || i.status) === "pending").reduce((s, i) => s + Number(i.amount), 0),
    overdue: invoices.filter((i) => (i.effectiveStatus || i.status) === "overdue").reduce((s, i) => s + Number(i.amount), 0),
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}? This can't be undone.`)) return;
    try {
      await financeService.deleteInvoice(inv.id);
      await onReload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete invoice");
    }
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
                <td className="inv-id">{inv.invoice_number}</td>
                <td className="inv-client">{inv.client_name || "—"}</td>
                <td className="inv-project">{inv.project_name || "—"}</td>
                <td className="inv-amount">{fmt(inv.amount)}</td>
                <td>{fmtDate(inv.issue_date)}</td>
                <td>{fmtDate(inv.due_date)}</td>
                <td><StatusBadge status={inv.effectiveStatus || inv.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="inv-actions">
                    <button className="inv-act-btn inv-act-btn--view" title="View" onClick={() => setSelected(inv)}>👁</button>
                    <button className="inv-act-btn inv-act-btn--edit" title="Edit" onClick={() => setEditing(inv)}>✏️</button>
                    <button className="inv-act-btn inv-act-btn--del" title="Delete" onClick={() => handleDelete(inv)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <InvoiceDetailDrawer
          invoice={selected}
          onClose={() => setSelected(null)}
          onReload={onReload}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditInvoiceModal
          invoice={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await onReload(); setEditing(null); }}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — CREATE INVOICE
════════════════════════════════════════════════════════════ */
function CreateInvoiceTab({ projects, onSuccess }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState(null);
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

  const projectName = projects.find((p) => String(p.id) === String(form.project_id))?.name;

  const handleSubmit = async () => {
    if (!form.project_id) {
      setFormError("Please select a project.");
      return;
    }
    if (subtotal <= 0) {
      setFormError("Add at least one line item with a rate.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await financeService.createInvoice({
        project_id: form.project_id,
        client_name: form.client_name || null,
        invoice_number: form.invoiceNo || undefined, // backend auto-generates if omitted
        amount: subtotal,
        tax_amount: taxAmt,
        issue_date: form.issueDate || undefined,
        due_date: form.dueDate || null,
        notes: form.notes || null,
        status: "pending",
      });
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setForm(EMPTY_FORM); onSuccess(); }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-create">
      {submitted && <div className="inv-toast">✅ Invoice created successfully!</div>}

      <div className="inv-create-grid">
        {/* Left — Form */}
        <div className="inv-form-col">
          {formError && <p className="inv-form-error">{formError}</p>}

          <section className="inv-section">
            <h3 className="inv-section-title">Client & Project</h3>
            <div className="inv-form-row">
              <label>Project <span>*</span></label>
              <select className="inv-input" value={form.project_id} onChange={(e) => setField("project_id", e.target.value)}>
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="inv-form-row">
              <label>Client Name</label>
              <input className="inv-input" placeholder="e.g. Skyline Infra Pvt Ltd"
                value={form.client_name} onChange={(e) => setField("client_name", e.target.value)} />
            </div>
          </section>

          <section className="inv-section">
            <h3 className="inv-section-title">Invoice Details</h3>
            <div className="inv-form-2col">
              <div className="inv-form-row">
                <label>Invoice No.</label>
                <input className="inv-input" placeholder="Auto-generated if left blank"
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
            <p className="inv-hint">Used to calculate the invoice total — individual line items aren't stored separately.</p>
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
                <p><strong>{form.invoiceNo || "Auto-generated"}</strong></p>
                <p>Issued: {form.issueDate || "—"}</p>
                <p>Due: {form.dueDate || "—"}</p>
              </div>
            </div>

            <div className="inv-preview-to">
              <p className="inv-preview-to-label">BILL TO</p>
              <p className="inv-preview-to-name">{form.client_name || "Client Name"}</p>
              <p>{projectName || "Select a project"}</p>
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
            <button className="inv-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — PENDING INVOICES
════════════════════════════════════════════════════════════ */
function PendingInvoicesTab({ invoices, onReload }) {
  const [filter, setFilter] = useState("all");
  const [markingId, setMarkingId] = useState(null);

  const pending = invoices.filter((i) => (i.effectiveStatus || i.status) !== "paid");
  const shown   = filter === "all" ? pending : pending.filter((i) => (i.effectiveStatus || i.status) === filter);

  const totalPending = pending.reduce((s, i) => s + Number(i.amount), 0);
  const overdueList  = pending.filter((i) => (i.effectiveStatus || i.status) === "overdue");
  const totalOverdue = overdueList.reduce((s, i) => s + Number(i.amount), 0);

  const handleMarkPaid = async (inv) => {
    setMarkingId(inv.id);
    try {
      await financeService.updateInvoiceStatus(inv.id, "paid");
      await onReload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update invoice");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <>
      {/* Alert Banner */}
      {overdueList.length > 0 && (
        <div className="inv-alert">
          ⚠️ <strong>{overdueList.length} invoice{overdueList.length !== 1 ? "s are" : " is"} overdue</strong>
          — totalling {fmt(totalOverdue)}.
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
          <span>{overdueList.length} invoices</span>
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
          const status = inv.effectiveStatus || inv.status;
          const days = daysDiff(inv.due_date);
          return (
            <div key={inv.id} className={`inv-pcard inv-pcard--${status}`}>
              <div className="inv-pcard-top">
                <div>
                  <p className="inv-pcard-id">{inv.invoice_number}</p>
                  <p className="inv-pcard-client">{inv.client_name || "—"}</p>
                  <p className="inv-pcard-project">{inv.project_name || "—"}</p>
                </div>
                <div className="inv-pcard-right">
                  <p className="inv-pcard-amount">{fmt(inv.amount)}</p>
                  <StatusBadge status={status} />
                </div>
              </div>
              <div className="inv-pcard-bottom">
                <span className="inv-pcard-due">
                  Due: {fmtDate(inv.due_date)}
                  {status === "overdue" && (
                    <strong className="inv-pcard-overdue-tag"> · {days}d overdue</strong>
                  )}
                </span>
                <div className="inv-pcard-actions">
                  <button
                    className="inv-btn-sm inv-btn-sm--primary"
                    onClick={() => handleMarkPaid(inv)}
                    disabled={markingId === inv.id}
                  >
                    {markingId === inv.id ? "Marking…" : "Mark Paid"}
                  </button>
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
function InvoiceDetailDrawer({ invoice, onClose, onReload }) {
  const [busy, setBusy] = useState(false);
  const status = invoice.effectiveStatus || invoice.status;

  const handleMarkPaid = async () => {
    setBusy(true);
    try {
      await financeService.updateInvoiceStatus(invoice.id, "paid");
      await onReload();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update invoice");
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}? This can't be undone.`)) return;
    setBusy(true);
    try {
      await financeService.deleteInvoice(invoice.id);
      await onReload();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete invoice");
      setBusy(false);
    }
  };

  return (
    <div className="inv-drawer-overlay" onClick={onClose}>
      <div className="inv-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="inv-drawer-header">
          <div>
            <p className="inv-drawer-id">{invoice.invoice_number}</p>
            <StatusBadge status={status} />
          </div>
          <button className="inv-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-drawer-body">
          <Row label="Client"      value={invoice.client_name || "—"} />
          <Row label="Project"     value={invoice.project_name || "—"} />
          <Row label="Amount"      value={fmt(invoice.amount)} />
          <Row label="Tax"         value={fmt(invoice.tax_amount)} />
          <Row label="Issued"      value={fmtDate(invoice.issue_date)} />
          <Row label="Due Date"    value={fmtDate(invoice.due_date)} />
          <Row label="Paid Date"   value={fmtDate(invoice.paid_date)} />
          <Row label="Status"      value={<StatusBadge status={status} />} />
          {invoice.notes && <Row label="Notes" value={invoice.notes} />}
        </div>
        <div className="inv-drawer-footer">
          <button className="inv-btn-outline" onClick={handleDelete} disabled={busy}>
            Delete
          </button>
          {status !== "paid" && (
            <button className="inv-btn-primary" onClick={handleMarkPaid} disabled={busy}>
              {busy ? "Working…" : "Mark as Paid"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   EDIT MODAL — only client_name, amount, tax_amount, due_date,
   notes can be changed (project_id and invoice_number are
   immutable per Invoice.update() on the backend)
════════════════════════════════════════════════════════════ */
function EditInvoiceModal({ invoice, onClose, onSaved }) {
  const [form, setForm] = useState({
    client_name: invoice.client_name || "",
    amount: invoice.amount || "",
    tax_amount: invoice.tax_amount || "",
    due_date: invoice.due_date ? fmtDate(invoice.due_date) : "",
    notes: invoice.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await financeService.updateInvoice(invoice.id, {
        client_name: form.client_name,
        amount: Number(form.amount),
        tax_amount: Number(form.tax_amount) || 0,
        due_date: form.due_date || null,
        notes: form.notes,
      });
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-drawer-overlay" onClick={onClose}>
      <div className="inv-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="inv-drawer-header">
          <div>
            <p className="inv-drawer-id">Edit {invoice.invoice_number}</p>
          </div>
          <button className="inv-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-drawer-body">
          {error && <p className="inv-form-error">{error}</p>}
          <div className="inv-form-row">
            <label>Client Name</label>
            <input className="inv-input" value={form.client_name} onChange={(e) => setF("client_name", e.target.value)} />
          </div>
          <div className="inv-form-row">
            <label>Amount (₹)</label>
            <input className="inv-input" type="number" value={form.amount} onChange={(e) => setF("amount", e.target.value)} />
          </div>
          <div className="inv-form-row">
            <label>Tax Amount (₹)</label>
            <input className="inv-input" type="number" value={form.tax_amount} onChange={(e) => setF("tax_amount", e.target.value)} />
          </div>
          <div className="inv-form-row">
            <label>Due Date</label>
            <input className="inv-input" type="date" value={form.due_date} onChange={(e) => setF("due_date", e.target.value)} />
          </div>
          <div className="inv-form-row">
            <label>Notes</label>
            <textarea className="inv-textarea" rows={3} value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
          </div>
        </div>
        <div className="inv-drawer-footer">
          <button className="inv-btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared helpers ────────────────────────────────────────── */
function StatusBadge({ status }) {
  if (!status) return null;
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