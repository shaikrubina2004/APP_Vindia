import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import accountantService from "../../services/accountantService";
import { getProjects } from "../../services/projectService";
import "./AccountantPayments.css";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  payment_type: "outgoing",
  project_id: "",
  vendor_id: "",
  invoice_id: "",
  amount: "",
  payment_method: "bank_transfer",
  reference_number: "",
  payment_date: today(),
  notes: "",
};

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
];

const STATUS_OPTIONS = ["all", "pending", "processing", "completed", "failed"];
const TYPE_OPTIONS = ["all", "incoming", "outgoing"];

const normalizeList = (response) => {
  const data = response?.data?.data;
  return Array.isArray(data) ? data : [];
};

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

const titleCase = (value) => {
  const text = String(value || "pending").replace(/_/g, " ");
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeProjects = (response) =>
  response?.data?.projects || response?.data || [];

const projectName = (projects, id) => {
  const project = projects.find((item) => String(item.id) === String(id));
  return project?.name || project?.project_name || `Project #${id || "—"}`;
};

function StatusBadge({ status }) {
  const value = String(status || "pending").toLowerCase();
  return (
    <span className={`ap-status ap-status-${value}`}>
      <i />
      {titleCase(value)}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, caption }) {
  return (
    <article className={`ap-summary-card ap-tone-${tone}`}>
      <div className="ap-summary-icon"><Icon size={19} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {caption && <small>{caption}</small>}
      </div>
    </article>
  );
}

export default function AccountantPayments() {
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = projectFilter !== "all" ? { project_id: projectFilter } : {};
      const [paymentRes, vendorRes, invoiceRes, projectRes] = await Promise.all([
        accountantService.getPayments(params),
        accountantService.getVendors(),
        accountantService.getInvoices(),
        getProjects(),
      ]);

      setPayments(normalizeList(paymentRes));
      setVendors(normalizeList(vendorRes));
      setInvoices(normalizeList(invoiceRes));
      setProjects(normalizeProjects(projectRes));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      incoming: 0,
      outgoing: 0,
    };

    payments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      const status = String(payment.status || "pending").toLowerCase();
      const type = String(payment.payment_type || "").toLowerCase();
      result.total += amount;
      if (status in result) result[status] += amount;
      if (type === "incoming") result.incoming += amount;
      if (type === "outgoing") result.outgoing += amount;
    });

    return result;
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const status = String(payment.status || "pending").toLowerCase();
      const type = String(payment.payment_type || "").toLowerCase();
      const projectId = String(payment.project_id || "");

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (projectFilter !== "all" && projectId !== String(projectFilter)) return false;
      if (!query) return true;

      return [
        payment.reference_number,
        payment.invoice_number,
        payment.vendor_name,
        payment.payment_method,
        projectName(projects, payment.project_id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [payments, search, statusFilter, typeFilter, projectFilter, projects]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowCreate(true);
  };

  const openEdit = (payment) => {
    setFormError("");
    setEditingPayment(payment);
    setForm({
      ...EMPTY_FORM,
      amount: payment.amount ?? "",
      payment_method: payment.payment_method || "bank_transfer",
      reference_number: payment.reference_number || "",
      payment_date: payment.payment_date ? String(payment.payment_date).slice(0, 10) : today(),
      notes: payment.notes || "",
    });
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setFormError("");

    const amount = Number(form.amount);
    if (!form.project_id) return setFormError("Select a project.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a valid payment amount.");
    if (!form.payment_date) return setFormError("Select the payment date.");

    setSaving(true);
    try {
      await accountantService.createPayment({
        payment_type: form.payment_type,
        project_id: Number(form.project_id),
        vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
        invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
        amount,
        payment_method: form.payment_method || null,
        reference_number: form.reference_number.trim() || null,
        payment_date: form.payment_date,
        notes: form.notes.trim() || null,
        // Backend forces Accountant-created payments to pending.
        status: "pending",
      });

      setShowCreate(false);
      setNotice("Payment prepared successfully. It is saved as Pending for Finance Manager processing.");
      await load();
      window.setTimeout(() => setNotice(""), 4500);
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to prepare payment.");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!editingPayment) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a valid payment amount.");
    if (!form.payment_date) return setFormError("Select the payment date.");

    setSaving(true);
    try {
      await accountantService.updatePayment(editingPayment.id, {
        amount,
        payment_method: form.payment_method || null,
        reference_number: form.reference_number.trim() || null,
        payment_date: form.payment_date,
        notes: form.notes.trim() || null,
      });
      setEditingPayment(null);
      setNotice("Payment details updated successfully.");
      await load();
      window.setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to update payment.");
    } finally {
      setSaving(false);
    }
  };

  const selectedProjectName = selectedPayment
    ? projectName(projects, selectedPayment.project_id)
    : "";

  return (
    <div className="accountant-payments-page">
      <header className="ap-page-header">
        <div>
          <div className="ap-eyebrow"><span /> CASH & PAYMENT OPERATIONS</div>
          <h1>Payments</h1>
          <p>Prepare, review and track project payment activity.</p>
        </div>
        <div className="ap-header-actions">
          <button className="ap-btn ap-btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} className={loading ? "ap-spin" : ""} /> Refresh
          </button>
          <button className="ap-btn ap-btn-primary" onClick={openCreate}>
            <Plus size={17} /> Record Payment
          </button>
        </div>
      </header>

      {notice && <div className="ap-notice"><CheckCircle2 size={17} />{notice}</div>}
      {error && (
        <div className="ap-error">
          <div><strong>Unable to load payments.</strong><span>{error}</span></div>
          <button onClick={load}>Retry</button>
        </div>
      )}

      <section className="ap-summary-grid">
        <SummaryCard label="Total Recorded" value={compactMoney(summary.total)} icon={CircleDollarSign} tone="blue" caption={`${payments.length} payment records`} />
        <SummaryCard label="Pending" value={compactMoney(summary.pending)} icon={Clock3} tone="amber" caption="Awaiting Finance Manager processing" />
        <SummaryCard label="Completed" value={compactMoney(summary.completed)} icon={CheckCircle2} tone="green" caption="Completed payment value" />
        <SummaryCard label="Outgoing" value={compactMoney(summary.outgoing)} icon={ArrowUpRight} tone="violet" caption="Vendor / project outflows" />
      </section>

      <section className="ap-control-strip">
        <div className="ap-control-copy">
          <div className="ap-control-icon"><WalletCards size={18} /></div>
          <div>
            <strong>Accountant payment workflow</strong>
            <p>New payments are prepared as <b>Pending</b>. Status release or completion remains a Finance Manager action.</p>
          </div>
        </div>
        <div className="ap-direction-summary">
          <span><ArrowDownLeft size={14} /> Incoming {compactMoney(summary.incoming)}</span>
          <span><ArrowUpRight size={14} /> Outgoing {compactMoney(summary.outgoing)}</span>
        </div>
      </section>

      <section className="ap-workspace">
        <div className="ap-toolbar">
          <div>
            <div className="ap-kicker">PAYMENT REGISTER</div>
            <h2>Payment History</h2>
            <p>{filteredPayments.length} of {payments.length} records shown</p>
          </div>
          <div className="ap-toolbar-controls">
            <label className="ap-search">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, invoice, vendor..." />
            </label>
            <select className="ap-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter payment status">
              {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value === "all" ? "All statuses" : titleCase(value)}</option>)}
            </select>
            <select className="ap-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter payment type">
              {TYPE_OPTIONS.map((value) => <option key={value} value={value}>{value === "all" ? "All directions" : titleCase(value)}</option>)}
            </select>
            <select className="ap-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter project">
              <option value="all">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name || project.project_name}</option>)}
            </select>
          </div>
        </div>

        <div className="ap-table-wrap">
          {loading ? (
            <div className="ap-loading"><span className="ap-spinner" />Loading payment records…</div>
          ) : filteredPayments.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon"><WalletCards size={25} /></div>
              <h3>No payments found</h3>
              <p>Try changing your filters or prepare a new payment.</p>
              <button className="ap-btn ap-btn-primary" onClick={openCreate}><Plus size={16} /> Record Payment</button>
            </div>
          ) : (
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Direction</th>
                  <th>Invoice / Vendor</th>
                  <th>Project</th>
                  <th className="ap-num">Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const outgoing = String(payment.payment_type || "").toLowerCase() === "outgoing";
                  const related = payment.invoice_number || payment.vendor_name || "Unlinked";
                  return (
                    <tr key={payment.id}>
                      <td>
                        <button className="ap-link-button" onClick={() => setSelectedPayment(payment)}>
                          {payment.reference_number || `Payment #${payment.id}`}
                        </button>
                        <span className="ap-subtext">ID #{payment.id}</span>
                      </td>
                      <td>
                        <span className={`ap-direction ap-direction-${outgoing ? "outgoing" : "incoming"}`}>
                          {outgoing ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                          {outgoing ? "Outgoing" : "Incoming"}
                        </span>
                      </td>
                      <td>
                        <strong className="ap-related">{related}</strong>
                        <span className="ap-subtext">{payment.invoice_number ? "Linked invoice" : payment.vendor_name ? "Vendor payment" : "No linked record"}</span>
                      </td>
                      <td>
                        <span className="ap-project">{projectName(projects, payment.project_id)}</span>
                      </td>
                      <td className="ap-num ap-amount">{money(payment.amount)}</td>
                      <td>{titleCase(payment.payment_method || "—")}</td>
                      <td>{dateOnly(payment.payment_date)}</td>
                      <td><StatusBadge status={payment.status} /></td>
                      <td>
                        <div className="ap-row-actions">
                          <button className="ap-icon-btn" title="View payment" onClick={() => setSelectedPayment(payment)}><Eye size={15} /></button>
                          <button className="ap-icon-btn" title="Edit payment details" onClick={() => openEdit(payment)}><Pencil size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedPayment && (
        <div className="ap-overlay" onMouseDown={() => setSelectedPayment(null)}>
          <aside className="ap-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ap-drawer-header">
              <div>
                <span>PAYMENT DETAILS</span>
                <h2>{selectedPayment.reference_number || `Payment #${selectedPayment.id}`}</h2>
              </div>
              <button className="ap-close" onClick={() => setSelectedPayment(null)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="ap-drawer-status-row">
              <StatusBadge status={selectedPayment.status} />
              <span>ID #{selectedPayment.id}</span>
            </div>

            <div className="ap-drawer-amount">
              <span>PAYMENT VALUE</span>
              <strong>{money(selectedPayment.amount)}</strong>
              <small>{titleCase(selectedPayment.payment_type)} payment · {titleCase(selectedPayment.payment_method || "method not specified")}</small>
            </div>

            <div className="ap-detail-list">
              <div><span>Project</span><strong>{selectedProjectName}</strong></div>
              <div><span>Invoice</span><strong>{selectedPayment.invoice_number || "Not linked"}</strong></div>
              <div><span>Vendor</span><strong>{selectedPayment.vendor_name || "Not linked"}</strong></div>
              <div><span>Payment Date</span><strong>{dateOnly(selectedPayment.payment_date)}</strong></div>
              <div><span>Reference</span><strong>{selectedPayment.reference_number || "—"}</strong></div>
              <div><span>Notes</span><strong className="ap-detail-note">{selectedPayment.notes || "No notes recorded."}</strong></div>
            </div>

            {selectedPayment.invoice_number && (
              <div className="ap-drawer-note">
                <FileText size={15} />
                <span>This payment is linked to invoice <b>{selectedPayment.invoice_number}</b>. Completed incoming payments can automatically reconcile the invoice in the backend.</span>
              </div>
            )}

            <button className="ap-btn ap-btn-primary ap-drawer-action" onClick={() => { setSelectedPayment(null); openEdit(selectedPayment); }}>
              <Pencil size={16} /> Edit Payment Details
            </button>
          </aside>
        </div>
      )}

      {(showCreate || editingPayment) && (
        <div className="ap-overlay" onMouseDown={() => { if (!saving) { setShowCreate(false); setEditingPayment(null); } }}>
          <div className="ap-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ap-modal-header">
              <div>
                <span>{editingPayment ? "UPDATE PAYMENT" : "NEW PAYMENT"}</span>
                <h2>{editingPayment ? "Edit payment details" : "Prepare a payment"}</h2>
                <p>{editingPayment ? "Change only the payment details available to an Accountant." : "Record the payment information. The new record will remain Pending."}</p>
              </div>
              <button className="ap-close" onClick={() => { if (!saving) { setShowCreate(false); setEditingPayment(null); } }} aria-label="Close"><X size={18} /></button>
            </div>

            <form onSubmit={editingPayment ? submitEdit : submitCreate}>
              {formError && <div className="ap-form-error">{formError}</div>}

              {editingPayment ? (
                <>
                  <section className="ap-form-section">
                    <div className="ap-form-section-title">
                      <FileText size={17} />
                      <div><strong>Recorded Payment</strong><span>Core transaction fields remain read-only.</span></div>
                    </div>
                    <div className="ap-readonly-grid">
                      <ReadOnly label="Direction" value={titleCase(editingPayment.payment_type)} />
                      <ReadOnly label="Project" value={projectName(projects, editingPayment.project_id)} />
                      <ReadOnly label="Invoice" value={editingPayment.invoice_number || "Not linked"} />
                      <ReadOnly label="Vendor" value={editingPayment.vendor_name || "Not linked"} />
                    </div>
                  </section>

                  <PaymentEditableFields form={form} updateField={updateField} />
                </>
              ) : (
                <>
                  <section className="ap-form-section">
                    <div className="ap-form-section-title">
                      <CircleDollarSign size={17} />
                      <div><strong>Payment classification</strong><span>Choose the direction and project.</span></div>
                    </div>
                    <div className="ap-form-grid ap-form-grid-three">
                      <Field label="Payment Type" required>
                        <select value={form.payment_type} onChange={(e) => updateField("payment_type", e.target.value)}>
                          <option value="outgoing">Outgoing</option>
                          <option value="incoming">Incoming</option>
                        </select>
                      </Field>
                      <Field label="Project" required>
                        <select value={form.project_id} onChange={(e) => updateField("project_id", e.target.value)}>
                          <option value="">Select project</option>
                          {projects.map((project) => <option key={project.id} value={project.id}>{project.name || project.project_name}</option>)}
                        </select>
                      </Field>
                      <Field label="Amount" required>
                        <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => updateField("amount", e.target.value)} placeholder="0.00" />
                      </Field>
                    </div>
                  </section>

                  <section className="ap-form-section">
                    <div className="ap-form-section-title">
                      <Users size={17} />
                      <div><strong>Linked records</strong><span>Optional relationships for invoice and vendor tracking.</span></div>
                    </div>
                    <div className="ap-form-grid ap-form-grid-two">
                      <Field label="Invoice" hint="Recommended for incoming payments">
                        <select value={form.invoice_id} onChange={(e) => updateField("invoice_id", e.target.value)}>
                          <option value="">Not linked</option>
                          {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number || `Invoice #${invoice.id}`} · {money(invoice.amount)}</option>)}
                        </select>
                      </Field>
                      <Field label="Vendor" hint="Use for outgoing payments when applicable">
                        <select value={form.vendor_id} onChange={(e) => updateField("vendor_id", e.target.value)}>
                          <option value="">Not linked</option>
                          {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                        </select>
                      </Field>
                    </div>
                  </section>

                  <PaymentEditableFields form={form} updateField={updateField} />

                  <div className="ap-workflow-note">
                    <Clock3 size={16} />
                    <div><strong>Accountant workflow</strong><span>This payment will be submitted with <b>Pending</b> status. The backend prevents an Accountant from releasing or completing a payment.</span></div>
                  </div>
                </>
              )}

              <div className="ap-modal-actions">
                <button type="button" className="ap-btn ap-btn-secondary" onClick={() => { setShowCreate(false); setEditingPayment(null); }} disabled={saving}>Cancel</button>
                <button type="submit" className="ap-btn ap-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingPayment ? "Save Changes" : "Prepare Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentEditableFields({ form, updateField }) {
  return (
    <section className="ap-form-section">
      <div className="ap-form-section-title">
        <Banknote size={17} />
        <div><strong>Payment details</strong><span>Method, reference, date and supporting notes.</span></div>
      </div>
      <div className="ap-form-grid ap-form-grid-three">
        <Field label="Payment Method">
          <select value={form.payment_method} onChange={(e) => updateField("payment_method", e.target.value)}>
            {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </Field>
        <Field label="Reference Number">
          <input value={form.reference_number} onChange={(e) => updateField("reference_number", e.target.value)} placeholder="UTR / cheque / reference" />
        </Field>
        <Field label="Payment Date" required>
          <input type="date" value={form.payment_date} onChange={(e) => updateField("payment_date", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows="3" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Add payment notes or supporting context..." />
      </Field>
    </section>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="ap-field">
      <span>{label}{required && <b> *</b>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div className="ap-readonly">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
