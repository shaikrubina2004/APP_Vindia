import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Plus, Receipt, CircleDollarSign, Clock3, CheckCircle2, Banknote, Eye, X, Building2, FileText, Pencil, ExternalLink } from "lucide-react";
import accountantService from "../../services/accountantService";
import { getProjects } from "../../services/projectService";
import "./AccountantExpenses.css";

const CATEGORY_OPTIONS = [
  "Materials",
  "Labour",
  "Equipment",
  "Subcontractors",
  "Overheads",
  "Contingency",
  "Misc",
];

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
];

const STATUS_OPTIONS = ["all", "pending", "approved", "paid", "rejected"];

const today = () => new Date().toISOString().slice(0, 10);

const createEmptyForm = (projectId = "") => ({
  project_id: projectId,
  expense_type: "project",
  category: "Materials",
  description: "",
  amount: "",
  vendor_id: "",
  expense_date: today(),
  payment_method: "bank_transfer",
  receipt_url: "",
});

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const titleCase = (value) => {
  const text = String(value || "pending");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const normalizeList = (response) => {
  const data = response?.data?.data;
  return Array.isArray(data) ? data : [];
};

export default function AccountantExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const [form, setForm] = useState(createEmptyForm());
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = projectFilter !== "all" ? { project_id: projectFilter } : {};
      const [expenseRes, vendorRes, projectRes] = await Promise.all([
        accountantService.getExpenses(params),
        accountantService.getVendors(),
        getProjects(),
      ]);

      setExpenses(normalizeList(expenseRes));
      setVendors(normalizeList(vendorRes));
      setProjects(projectRes?.data?.projects || projectRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load expenses.");
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
      approved: 0,
      paid: 0,
      rejected: 0,
    };

    for (const expense of expenses) {
      const amount = Number(expense.amount || 0);
      const status = String(expense.status || "pending").toLowerCase();
      result.total += amount;
      if (status === "pending") result.pending += amount;
      else if (status === "approved") result.approved += amount;
      else if (status === "paid") result.paid += amount;
      else if (status === "rejected") result.rejected += amount;
    }

    return result;
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals = {};
    expenses.forEach((expense) => {
      const category = expense.category || "Misc";
      totals[category] = (totals[category] || 0) + Number(expense.amount || 0);
    });

    return Object.entries(totals)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const maxCategoryTotal = categoryTotals[0]?.total || 1;

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const status = String(expense.status || "pending").toLowerCase();
      const category = String(expense.category || "");

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (categoryFilter !== "all" && category !== categoryFilter) return false;

      if (!query) return true;

      return [
        expense.description,
        expense.category,
        expense.vendor_name,
        expense.project_name,
        expense.payment_method,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [expenses, search, statusFilter, categoryFilter]);

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    const defaultProject = projectFilter !== "all" ? projectFilter : "";
    setForm(createEmptyForm(defaultProject));
    setFormError("");
    setEditingExpense(null);
    setShowCreate(true);
  };

  const openEdit = (expense) => {
    setForm({
      project_id: expense.project_id ? String(expense.project_id) : "",
      expense_type: expense.expense_type || "project",
      category: expense.category || "Materials",
      description: expense.description || "",
      amount: expense.amount ?? "",
      vendor_id: expense.vendor_id ? String(expense.vendor_id) : "",
      expense_date: expense.expense_date ? String(expense.expense_date).slice(0, 10) : today(),
      payment_method: expense.payment_method || "bank_transfer",
      receipt_url: expense.receipt_url || "",
    });
    setFormError("");
    setEditingExpense(expense);
    setSelectedExpense(null);
    setShowCreate(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowCreate(false);
    setEditingExpense(null);
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");

    const amount = Number(form.amount);

    if (!form.project_id) {
      setFormError("Select a project. Expenses must be linked to a project.");
      return;
    }
    if (!form.category) {
      setFormError("Select an expense category.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid expense amount greater than zero.");
      return;
    }
    if (!form.expense_date) {
      setFormError("Select an expense date.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        project_id: Number(form.project_id),
        expense_type: form.expense_type,
        category: form.category,
        description: form.description.trim() || null,
        amount,
        vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
        expense_date: form.expense_date,
        payment_method: form.payment_method || null,
        receipt_url: form.receipt_url.trim() || null,
      };

      if (editingExpense) {
        await accountantService.updateExpense(editingExpense.id, payload);
      } else {
        await accountantService.createExpense({ ...payload, status: "pending" });
      }

      closeForm();
      setNotice(editingExpense ? "Expense updated successfully." : "Expense recorded successfully.");
      await load();
      window.setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setFormError(err?.response?.data?.message || "Unable to save the expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="accountant-expenses-page">
      <header className="ae-page-header">
        <div>
          <div className="ae-eyebrow"><span /> FINANCIAL OPERATIONS</div>
          <h1>Expenses</h1>
          <p>Record, verify and monitor project expenditure from one accounting workspace.</p>
        </div>
        <div className="ae-header-actions">
          <button className="ae-btn ae-btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="ae-btn ae-btn-primary" onClick={openCreate}>
            <Plus size={17} /> Record Expense
          </button>
        </div>
      </header>

      {notice && <div className="ae-notice">{notice}</div>}
      {error && (
        <div className="ae-error">
          <div><strong>Unable to load expenses.</strong><span>{error}</span></div>
          <button onClick={load}>Retry</button>
        </div>
      )}

      <section className="ae-summary-grid">
        <SummaryCard label="Total Expenses" value={compactMoney(summary.total)} icon={<CircleDollarSign size={19} />} tone="blue" />
        <SummaryCard label="Pending Verification" value={compactMoney(summary.pending)} icon={<Clock3 size={19} />} tone="amber" />
        <SummaryCard label="Approved" value={compactMoney(summary.approved)} icon={<CheckCircle2 size={19} />} tone="green" />
        <SummaryCard label="Paid" value={compactMoney(summary.paid)} icon={<Banknote size={19} />} tone="violet" />
      </section>

      <section className="ae-content-grid">
        <div className="ae-main-card">
          <div className="ae-toolbar">
            <div>
              <div className="ae-section-kicker">EXPENSE REGISTER</div>
              <h2>All Expenses</h2>
              <p>{filteredExpenses.length} of {expenses.length} records</p>
            </div>
            <div className="ae-toolbar-controls">
              <label className="ae-search">
                <Search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, vendor or project" />
              </label>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="ae-select">
                <option value="all">All projects</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="ae-select">
                <option value="all">All categories</option>
                {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ae-select">
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : titleCase(status)}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ae-loading"><div className="ae-spinner" />Loading expense register…</div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState hasFilters={Boolean(search || statusFilter !== "all" || categoryFilter !== "all" || projectFilter !== "all")} onCreate={openCreate} />
          ) : (
            <div className="ae-table-wrap">
              <table className="ae-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Project</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => {
                    const status = String(expense.status || "pending").toLowerCase();
                    return (
                      <tr key={expense.id}>
                        <td>
                          <button className="ae-row-title" onClick={() => setSelectedExpense(expense)}>
                            {expense.description || `Expense #${expense.id}`}
                          </button>
                          <span className="ae-row-sub">#{expense.id} · {expense.expense_type || "project"}</span>
                        </td>
                        <td><strong>{expense.project_name || "—"}</strong></td>
                        <td>{expense.vendor_name || <span className="ae-muted">No vendor</span>}</td>
                        <td><span className="ae-category">{expense.category || "Misc"}</span></td>
                        <td><strong className="ae-amount">{money(expense.amount)}</strong></td>
                        <td>{dateOnly(expense.expense_date)}</td>
                        <td><StatusBadge status={status} /></td>
                        <td>
                          <div className="ae-row-actions">
                            <button className="ae-icon-btn" title="View expense" onClick={() => setSelectedExpense(expense)}><Eye size={16} /></button>
                            <button className="ae-icon-btn" title="Edit expense" onClick={() => openEdit(expense)}><Pencil size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="ae-side-column">
          <section className="ae-side-card">
            <div className="ae-side-head">
              <div><div className="ae-section-kicker">SPEND ANALYSIS</div><h3>By Category</h3></div>
              <Receipt size={18} />
            </div>
            {categoryTotals.length === 0 ? (
              <p className="ae-side-empty">No expense data available.</p>
            ) : (
              <div className="ae-category-list">
                {categoryTotals.slice(0, 6).map((item) => (
                  <div className="ae-category-row" key={item.category}>
                    <div className="ae-category-meta"><span>{item.category}</span><strong>{compactMoney(item.total)}</strong></div>
                    <div className="ae-bar"><i style={{ width: `${Math.max((item.total / maxCategoryTotal) * 100, 4)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ae-side-card ae-control-card">
            <div className="ae-side-head"><div><div className="ae-section-kicker">CONTROL</div><h3>Accountant workflow</h3></div><FileText size={18} /></div>
            <div className="ae-control-row"><span>New expense</span><b>Pending</b></div>
            <div className="ae-control-row"><span>Accountant</span><b>Record / Edit</b></div>
            <div className="ae-control-row"><span>Finance Manager</span><b>Approve / Pay</b></div>
            <p className="ae-control-note">Expense status is intentionally not editable by the Accountant. The backend remains the authority for status changes.</p>
          </section>
        </aside>
      </section>

      {showCreate && (
        <ExpenseModal
          form={form}
          editing={Boolean(editingExpense)}
          projects={projects}
          vendors={vendors}
          saving={saving}
          error={formError}
          onChange={updateForm}
          onClose={closeForm}
          onSubmit={submit}
        />
      )}

      {selectedExpense && (
        <ExpenseDrawer
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onEdit={() => openEdit(selectedExpense)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  return (
    <div className={`ae-summary-card ae-tone-${tone}`}>
      <div className="ae-summary-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`ae-status ae-status-${status}`}><i />{titleCase(status)}</span>;
}

function EmptyState({ hasFilters, onCreate }) {
  return (
    <div className="ae-empty">
      <div className="ae-empty-icon"><Receipt size={24} /></div>
      <h3>No expenses found</h3>
      <p>{hasFilters ? "Try changing the filters or search text." : "Record the first project expense to begin tracking spend."}</p>
      {!hasFilters && <button className="ae-btn ae-btn-primary" onClick={onCreate}><Plus size={16} /> Record Expense</button>}
    </div>
  );
}

function ExpenseModal({ form, editing, projects, vendors, saving, error, onChange, onClose, onSubmit }) {
  return (
    <div className="ae-modal-backdrop" onMouseDown={onClose}>
      <div className="ae-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ae-modal-head">
          <div><span>{editing ? "UPDATE TRANSACTION" : "NEW TRANSACTION"}</span><h2>{editing ? "Edit Expense" : "Record Expense"}</h2><p>{editing ? "Update the accounting details while keeping the workflow status controlled by Finance." : "New expenses are recorded as pending for verification."}</p></div>
          <button className="ae-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          {error && <div className="ae-form-error">{error}</div>}

          <div className="ae-form-section">
            <div className="ae-form-section-title"><Building2 size={17} /><div><strong>Project & Classification</strong><span>Every expense must be tied to a project.</span></div></div>
            <div className="ae-form-grid two">
              <Field label="Project" required>
                <select value={form.project_id} onChange={(e) => onChange("project_id", e.target.value)} disabled={editing}>
                  <option value="">Select project…</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </Field>
              <Field label="Expense type" required>
                <select value={form.expense_type} onChange={(e) => onChange("expense_type", e.target.value)}>
                  <option value="project">Project</option>
                  <option value="company">Company</option>
                </select>
              </Field>
              <Field label="Category" required>
                <select value={form.category} onChange={(e) => onChange("category", e.target.value)}>
                  {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Vendor">
                <select value={form.vendor_id} onChange={(e) => onChange("vendor_id", e.target.value)}>
                  <option value="">No vendor</option>
                  {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="ae-form-section">
            <div className="ae-form-section-title"><CircleDollarSign size={17} /><div><strong>Transaction Details</strong><span>Capture the amount, date and payment method.</span></div></div>
            <div className="ae-form-grid four">
              <Field label="Amount" required><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0.00" /></Field>
              <Field label="Expense date" required><input type="date" value={form.expense_date} onChange={(e) => onChange("expense_date", e.target.value)} /></Field>
              <Field label="Payment method"><select value={form.payment_method} onChange={(e) => onChange("payment_method", e.target.value)}><option value="">Select method…</option>{PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Status"><input value="Pending" disabled /></Field>
            </div>
            <Field label="Description"><textarea rows="3" value={form.description} onChange={(e) => onChange("description", e.target.value)} placeholder="What was this expense for?" /></Field>
            <Field label="Receipt URL"><input type="url" value={form.receipt_url} onChange={(e) => onChange("receipt_url", e.target.value)} placeholder="https://…" /></Field>
          </div>

          <div className="ae-total-bar">
            <div><span>Recorded amount</span><strong>{money(form.amount)}</strong></div>
            <small><Clock3 size={14} /> Pending verification</small>
          </div>

          <div className="ae-modal-actions">
            <button type="button" className="ae-btn ae-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="ae-btn ae-btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Record Expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return <label className="ae-field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

function ExpenseDrawer({ expense, onClose, onEdit }) {
  const status = String(expense.status || "pending").toLowerCase();
  return (
    <div className="ae-drawer-backdrop" onMouseDown={onClose}>
      <aside className="ae-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ae-drawer-head"><div><span>EXPENSE RECORD</span><h2>{expense.description || `Expense #${expense.id}`}</h2></div><button className="ae-close" onClick={onClose}><X size={18} /></button></div>
        <div className="ae-drawer-status"><StatusBadge status={status} /><span>#{expense.id}</span></div>
        <div className="ae-drawer-total"><span>Recorded amount</span><strong>{money(expense.amount)}</strong><small>{expense.project_name || "No project"} · {expense.category || "Misc"}</small></div>
        <div className="ae-detail-list">
          <Detail label="Project" value={expense.project_name || "—"} />
          <Detail label="Vendor" value={expense.vendor_name || "No vendor"} />
          <Detail label="Category" value={expense.category || "—"} />
          <Detail label="Expense type" value={titleCase(expense.expense_type || "project")} />
          <Detail label="Expense date" value={dateOnly(expense.expense_date)} />
          <Detail label="Payment method" value={(expense.payment_method || "—").replace(/_/g, " ")} />
          <Detail label="Created by" value={expense.created_by || "—"} />
          <Detail label="Description" value={expense.description || "No description provided."} />
        </div>
        <div className="ae-drawer-note"><FileText size={16} /><span>Accountant-created expenses start in <strong>Pending</strong>. Approval and payment status are controlled by the Finance workflow.</span></div>
        {expense.receipt_url && <a className="ae-receipt-link" href={expense.receipt_url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open receipt</a>}
        <button className="ae-btn ae-btn-primary ae-drawer-edit" onClick={onEdit}><Pencil size={16} /> Edit expense</button>
      </aside>
    </div>
  );
}

function Detail({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
