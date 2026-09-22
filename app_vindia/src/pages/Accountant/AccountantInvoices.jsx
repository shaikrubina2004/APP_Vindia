import { useCallback, useEffect, useMemo, useState } from "react";
import accountantService from "../../services/accountantService";
import { getProjects } from "../../services/projectService";
import "./AccountantInvoices.css";

const money = (value) => {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const compactMoney = (value) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return money(n);
};

const dateOnly = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  project_id: "",
  client_name: "",
  amount: "",
  tax_amount: "",
  issue_date: today(),
  due_date: "",
  notes: "",
};

const statusLabel = (status) => {
  const value = String(status || "pending").toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "invoice") return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 20v-4h-4" /></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "eye") return <svg {...common}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
  if (name === "close") return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
  if (name === "building") return <svg {...common}><path d="M4 21V4l8-2 8 2v17M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2M10 21v-3h4v3" /></svg>;
  if (name === "file") return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></svg>;
  return null;
}

export default function AccountantInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invoiceRes, projectRes] = await Promise.all([
        accountantService.getInvoices(),
        getProjects(),
      ]);
      setInvoices(invoiceRes?.data?.data || []);
      setProjects(projectRes?.data?.projects || projectRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const result = { total: 0, paid: 0, pending: 0, overdue: 0 };
    invoices.forEach((invoice) => {
      const amount = Number(invoice.amount || 0);
      const current = String(invoice.effectiveStatus || invoice.status || "pending").toLowerCase();
      result.total += amount;
      if (current === "paid") result.paid += amount;
      else if (current === "overdue") result.overdue += amount;
      else result.pending += amount;
    });
    return result;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const current = String(invoice.effectiveStatus || invoice.status || "pending").toLowerCase();
      const matchesStatus = status === "all" || current === status;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [invoice.invoice_number, invoice.client_name, invoice.project_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [invoices, search, status]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowCreate(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");

    const amount = Number(form.amount);
    const tax = Number(form.tax_amount || 0);

    if (!form.project_id) return setFormError("Select a project.");
    if (!form.client_name.trim()) return setFormError("Enter the client name.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a valid invoice amount.");
    if (!Number.isFinite(tax) || tax < 0) return setFormError("Tax amount cannot be negative.");
    if (form.due_date && form.issue_date && form.due_date < form.issue_date) {
      return setFormError("Due date cannot be earlier than the issue date.");
    }

    setSaving(true);
    try {
      await accountantService.createInvoice({
        project_id: Number(form.project_id),
        client_name: form.client_name.trim(),
        amount,
        tax_amount: tax,
        issue_date: form.issue_date || undefined,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
        status: "pending",
      });
      setShowCreate(false);
      setNotice("Invoice recorded successfully.");
      await load();
      window.setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create invoice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="accountant-invoices-page">
      <header className="ai-page-header">
        <div>
          <div className="ai-eyebrow"><span /> FINANCIAL OPERATIONS</div>
          <h1>Invoices</h1>
          <p>Record, monitor and review project invoices.</p>
        </div>
        <div className="ai-header-actions">
          <button className="ai-btn ai-btn-secondary" onClick={load} disabled={loading}>
            <Icon name="refresh" size={17} /> Refresh
          </button>
          <button className="ai-btn ai-btn-primary" onClick={openCreate}>
            <Icon name="plus" size={17} /> New Invoice
          </button>
        </div>
      </header>

      {notice && <div className="ai-notice">{notice}</div>}
      {error && <div className="ai-error"><strong>Unable to load invoices.</strong><span>{error}</span><button onClick={load}>Retry</button></div>}

      <section className="ai-summary-grid">
        <SummaryCard label="Total Invoiced" value={compactMoney(summary.total)} icon="invoice" tone="blue" />
        <SummaryCard label="Collected" value={compactMoney(summary.paid)} icon="file" tone="green" />
        <SummaryCard label="Pending" value={compactMoney(summary.pending)} icon="calendar" tone="amber" />
        <SummaryCard label="Overdue" value={compactMoney(summary.overdue)} icon="invoice" tone="red" />
      </section>

      <section className="ai-workspace">
        <div className="ai-toolbar">
          <div>
            <h2>Invoice Register</h2>
            <p>{filtered.length} of {invoices.length} invoices</p>
          </div>
          <div className="ai-toolbar-controls">
            <label className="ai-search">
              <Icon name="search" size={17} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, client or project" />
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="ai-select" aria-label="Filter invoice status">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="ai-loading"><div className="ai-spinner" /> Loading invoice register…</div>
        ) : filtered.length === 0 ? (
          <div className="ai-empty"><div className="ai-empty-icon"><Icon name="invoice" size={24} /></div><h3>No invoices found</h3><p>{search || status !== "all" ? "Try changing your search or status filter." : "Create the first invoice for this workspace."}</p>{!search && status === "all" && <button className="ai-btn ai-btn-primary" onClick={openCreate}><Icon name="plus" size={16} /> New Invoice</button>}</div>
        ) : (
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead><tr><th>Invoice</th><th>Client / Project</th><th>Amount</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th /></tr></thead>
              <tbody>
                {filtered.map((invoice) => {
                  const current = String(invoice.effectiveStatus || invoice.status || "pending").toLowerCase();
                  const total = Number(invoice.amount || 0) + Number(invoice.tax_amount || 0);
                  return (
                    <tr key={invoice.id}>
                      <td><button className="ai-invoice-link" onClick={() => setSelected(invoice)}>{invoice.invoice_number || `#${invoice.id}`}</button></td>
                      <td><div className="ai-client"><strong>{invoice.client_name || "—"}</strong><span>{invoice.project_name || "Project not assigned"}</span></div></td>
                      <td><strong>{money(total)}</strong><span className="ai-subvalue">Base {money(invoice.amount)}</span></td>
                      <td>{dateOnly(invoice.issue_date)}</td>
                      <td>{dateOnly(invoice.due_date)}</td>
                      <td><StatusBadge status={current} /></td>
                      <td><button className="ai-icon-btn" title="View invoice" onClick={() => setSelected(invoice)}><Icon name="eye" size={17} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="ai-footer-note"><Icon name="file" size={15} /> Invoice status is controlled by the Finance workflow. Accountant can record invoices but cannot change payment status from this page.</div>

      {showCreate && <CreateModal form={form} projects={projects} saving={saving} error={formError} onChange={updateField} onClose={() => setShowCreate(false)} onSubmit={submit} />}
      {selected && <InvoiceDrawer invoice={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  return <div className={`ai-summary-card ai-tone-${tone}`}><div className="ai-summary-icon"><Icon name={icon} size={19} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function StatusBadge({ status }) {
  return <span className={`ai-status ai-status-${status}`}><i />{statusLabel(status)}</span>;
}

function CreateModal({ form, projects, saving, error, onChange, onClose, onSubmit }) {
  const subtotal = Number(form.amount || 0);
  const tax = Number(form.tax_amount || 0);
  const total = subtotal + tax;
  return <div className="ai-modal-backdrop" onMouseDown={onClose}><div className="ai-modal" onMouseDown={(e) => e.stopPropagation()}>
    <div className="ai-modal-head"><div><span>NEW TRANSACTION</span><h2>Record Invoice</h2><p>The server will generate the invoice number automatically.</p></div><button className="ai-close" onClick={onClose}><Icon name="close" /></button></div>
    <form onSubmit={onSubmit}>
      {error && <div className="ai-form-error">{error}</div>}
      <div className="ai-form-section"><div className="ai-form-section-title"><Icon name="building" size={17} /><div><strong>Client & Project</strong><span>Choose the project and customer for this invoice.</span></div></div>
        <div className="ai-form-grid two"><Field label="Project" required><select value={form.project_id} onChange={(e) => onChange("project_id", e.target.value)}><option value="">Select project…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Client name" required><input value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} placeholder="Client / customer name" /></Field></div>
      </div>
      <div className="ai-form-section"><div className="ai-form-section-title"><Icon name="invoice" size={17} /><div><strong>Invoice Details</strong><span>Record the base amount, tax and dates.</span></div></div>
        <div className="ai-form-grid four"><Field label="Base amount" required><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0.00" /></Field><Field label="Tax amount"><input type="number" min="0" step="0.01" value={form.tax_amount} onChange={(e) => onChange("tax_amount", e.target.value)} placeholder="0.00" /></Field><Field label="Issue date" required><input type="date" value={form.issue_date} onChange={(e) => onChange("issue_date", e.target.value)} /></Field><Field label="Due date"><input type="date" value={form.due_date} min={form.issue_date || undefined} onChange={(e) => onChange("due_date", e.target.value)} /></Field></div>
        <Field label="Notes"><textarea rows="3" value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Optional accounting note" /></Field>
      </div>
      <div className="ai-total-bar"><div><span>Invoice total</span><strong>{money(total)}</strong></div><small>Base {money(subtotal)} + Tax {money(tax)}</small></div>
      <div className="ai-modal-actions"><button type="button" className="ai-btn ai-btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="ai-btn ai-btn-primary" disabled={saving}>{saving ? "Saving…" : "Record Invoice"}</button></div>
    </form>
  </div></div>;
}

function Field({ label, required, children }) {
  return <label className="ai-field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

function InvoiceDrawer({ invoice, onClose }) {
  const base = Number(invoice.amount || 0);
  const tax = Number(invoice.tax_amount || 0);
  const total = base + tax;
  const current = String(invoice.effectiveStatus || invoice.status || "pending").toLowerCase();
  return <div className="ai-drawer-backdrop" onMouseDown={onClose}><aside className="ai-drawer" onMouseDown={(e) => e.stopPropagation()}>
    <div className="ai-drawer-head"><div><span>INVOICE RECORD</span><h2>{invoice.invoice_number || `#${invoice.id}`}</h2></div><button className="ai-close" onClick={onClose}><Icon name="close" /></button></div>
    <div className="ai-drawer-status"><StatusBadge status={current} /><span>{invoice.project_name || "No project"}</span></div>
    <div className="ai-drawer-total"><span>Total invoice value</span><strong>{money(total)}</strong><small>Base {money(base)} · Tax {money(tax)}</small></div>
    <div className="ai-detail-list"><Detail label="Client" value={invoice.client_name || "—"} /><Detail label="Project" value={invoice.project_name || "—"} /><Detail label="Issue date" value={dateOnly(invoice.issue_date)} /><Detail label="Due date" value={dateOnly(invoice.due_date)} /><Detail label="Paid date" value={dateOnly(invoice.paid_date)} /><Detail label="Notes" value={invoice.notes || "No notes recorded."} /></div>
    <div className="ai-drawer-note"><Icon name="file" size={16} /><span>Accountant access allows invoice recording and viewing. Payment/status changes remain outside this page.</span></div>
  </aside></div>;
}

function Detail({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
