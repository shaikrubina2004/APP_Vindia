import React, { useState, useEffect, useRef, useContext } from "react";
//import "./TravelRequest.css";
import {
  Plane,
  Utensils,
  BedDouble,
  MoreHorizontal as Misc,
  Upload,
  X,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  Building2,
  Briefcase,
  User,
  CreditCard,
  ArrowLeft,
  Send,
  MapPin,
  CalendarDays,
  StickyNote,
  IndianRupee,
} from "lucide-react";
import { API } from "../../services/authService";
import { AuthContext } from "../../context/useAuth";

// ── Status helpers ────────────────────────────────────────────────────────────
const getStatusIcon = (status) => {
  if (status === "Approved") return <CheckCircle size={12} />;
  if (status === "Rejected") return <XCircle size={12} />;
  return <Clock size={12} />;
};

// ── Upload Zone ───────────────────────────────────────────────────────────────
const UploadZone = ({ label, files, onAdd, onRemove }) => {
  const inputRef = useRef();

  const handleFiles = (raw) => {
    const valid = Array.from(raw).filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length) onAdd(valid);
  };

  return (
    <div className="tr-upload-wrap">
      <div
        className="tr-upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload size={14} className="tr-upload-icon" />
        <div className="tr-upload-text">
          <span>Upload receipt{label ? ` for ${label}` : ""}</span>
          <small>JPG, PNG or PDF · max 10 MB</small>
        </div>
      </div>

      {files.length > 0 && (
        <div className="tr-file-list">
          {files.map((f, i) => (
            <div className="tr-file-item" key={i}>
              <FileText size={13} />
              <span className="tr-file-name">{f.name}</span>
              <span className="tr-file-size">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                className="tr-file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                aria-label="Remove file"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Expense Row ───────────────────────────────────────────────────────────────
const expenseCategories = [
  { key: "travel", label: "Travel", Icon: Plane, cls: "tr-icon-travel" },
  { key: "food", label: "Food & Meals", Icon: Utensils, cls: "tr-icon-food" },
  {
    key: "accommodation",
    label: "Accommodation",
    Icon: BedDouble,
    cls: "tr-icon-stay",
  },
  { key: "other", label: "Other", Icon: Misc, cls: "tr-icon-other" },
];

// ── Request Card (history) ────────────────────────────────────────────────────
const RequestCard = ({ req }) => (
  <div className="tr-history-card">
    <div className="tr-history-top">
      <span className="tr-history-no">{req.request_no}</span>
      <span className={`tr-status tr-status-${req.status?.toLowerCase()}`}>
        {getStatusIcon(req.status)}
        {req.status}
      </span>
    </div>
    <div className="tr-history-title">{req.trip_title}</div>
    <div className="tr-history-meta">
      <span>
        <MapPin size={11} /> {req.destination}
      </span>
      <span>
        <CalendarDays size={11} />{" "}
        {new Date(req.travel_from_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>
    <div className="tr-history-footer">
      <span className="tr-history-amount">
        <IndianRupee size={12} />
        {Number(req.total_amount).toLocaleString("en-IN")}
      </span>
      <span
        className={`tr-budget-pill ${
          req.budget_type === "project" ? "pill-project" : "pill-company"
        }`}
      >
        {req.budget_type === "project" ? (
          <>
            <Briefcase size={10} /> Project
          </>
        ) : (
          <>
            <CreditCard size={10} /> Company
          </>
        )}
      </span>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const TravelRequest = () => {
  const { user } = useContext(AuthContext);

  // View: "form" | "history"
  const [view, setView] = useState("form");

  // Projects dropdown
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // My past requests
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const emptyForm = {
    trip_title: "",
    destination: "",
    travel_from_date: "",
    travel_to_date: "",
    purpose: "",
    notes: "",
    budget_type: "company", // "company" | "project"
    project_id: "",
    payment_mode: "company", // "company" | "self"
    travel_amount: "",
    food_amount: "",
    accommodation_amount: "",
    other_amount: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Receipts per category
  const [receipts, setReceipts] = useState({
    travel: [],
    food: [],
    accommodation: [],
    other: [],
    general: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success"|"error", msg }

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (view === "history") fetchHistory();
  }, [view]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await API.get("/projects");
      setProjects(res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get(`/travel-expenses?user_id=${user?.id}`);
      setHistory(res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addFiles = (category, files) =>
    setReceipts((prev) => ({
      ...prev,
      [category]: [...prev[category], ...files],
    }));

  const removeFile = (category, index) =>
    setReceipts((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (
      !form.trip_title ||
      !form.destination ||
      !form.travel_from_date ||
      !form.travel_to_date ||
      !form.purpose
    ) {
      showToast("error", "Please fill in all required fields.");
      return;
    }
    if (form.budget_type === "project" && !form.project_id) {
      showToast("error", "Please select a project.");
      return;
    }

    // Build receipt list (mock URLs; real impl uses file upload endpoint first)
    const receiptPayload = Object.entries(receipts).flatMap(([type, files]) =>
      files.map((f) => ({
        expense_type: type,
        file_name: f.name,
        file_url: `/uploads/travel/${Date.now()}_${f.name}`, // placeholder
        file_size_kb: Math.round(f.size / 1024),
      })),
    );

    // Derive user info from auth context + roles
    const payload = {
      user_id: user?.id,
      employee_name: user?.name || "Unknown",
      designation: user?.role || user?.designation || "—",
      department: user?.department || "—",
      ...form,
      project_id: form.budget_type === "project" ? form.project_id : null,
      receipts: receiptPayload,
    };

    setSubmitting(true);
    try {
      await API.post("/travel-expenses", payload);
      showToast("success", "Travel expense request submitted successfully!");
      setForm(emptyForm);
      setReceipts({
        travel: [],
        food: [],
        accommodation: [],
        other: [],
        general: [],
      });
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived user info ────────────────────────────────────────────────────────
  const userName = user?.name || "—";
  const userRole = user?.role || user?.designation || "—";
  const userDept = user?.department || "—";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="tr-page">
      {/* Toast */}
      {toast && (
        <div className={`tr-toast tr-toast-${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle size={14} />
          ) : (
            <XCircle size={14} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="tr-header">
        <div className="tr-header-left">
          <Plane size={18} className="tr-header-icon" />
          <div>
            <h1>Travel Expense Request</h1>
            <p>Submit your travel claims for reimbursement or approval</p>
          </div>
        </div>
        <div className="tr-tabs">
          <button
            className={`tr-tab ${view === "form" ? "active" : ""}`}
            onClick={() => setView("form")}
          >
            New Request
          </button>
          <button
            className={`tr-tab ${view === "history" ? "active" : ""}`}
            onClick={() => setView("history")}
          >
            My Requests
          </button>
        </div>
      </div>

      {/* ── FORM VIEW ────────────────────────────────────────────── */}
      {view === "form" && (
        <div className="tr-layout">
          {/* Left: Person info card (auto-filled) */}
          <aside className="tr-aside">
            <div className="tr-aside-card">
              <div className="tr-aside-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="tr-aside-name">{userName}</div>
              <div className="tr-aside-meta">{userRole}</div>
              <div className="tr-aside-dept">
                <Building2 size={12} />
                {userDept}
              </div>

              <div className="tr-aside-divider" />

              <div className="tr-aside-fields">
                <div className="tr-aside-field">
                  <span>Name</span>
                  <span>{userName}</span>
                </div>
                <div className="tr-aside-field">
                  <span>Designation</span>
                  <span>{userRole}</span>
                </div>
                <div className="tr-aside-field">
                  <span>Department</span>
                  <span>{userDept}</span>
                </div>
              </div>
            </div>

            <div className="tr-aside-tip">
              <StickyNote size={13} />
              <p>
                Your personal details are auto-filled from your profile. Upload
                receipts when you've self-paid.
              </p>
            </div>
          </aside>

          {/* Right: Form */}
          <div className="tr-form">
            {/* ── Section: Trip Details ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <MapPin size={14} />
                Trip Details
              </div>

              <div className="tr-grid-2">
                <div className="tr-field">
                  <label>
                    Trip Title <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Client Meeting – Bangalore"
                    value={form.trip_title}
                    onChange={(e) => set("trip_title", e.target.value)}
                  />
                </div>

                <div className="tr-field">
                  <label>
                    Destination <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="City / Location"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                  />
                </div>

                <div className="tr-field">
                  <label>
                    From Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.travel_from_date}
                    onChange={(e) => set("travel_from_date", e.target.value)}
                  />
                </div>

                <div className="tr-field">
                  <label>
                    To Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.travel_to_date}
                    onChange={(e) => set("travel_to_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="tr-field">
                <label>
                  Purpose / Reason <span className="req">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose of this trip..."
                  value={form.purpose}
                  onChange={(e) => set("purpose", e.target.value)}
                />
              </div>
            </div>

            {/* ── Section: Budget & Payment ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <CreditCard size={14} />
                Budget &amp; Payment
              </div>

              {/* Budget type toggle */}
              <div className="tr-field">
                <label>Budget Type</label>
                <div className="tr-toggle-group">
                  <button
                    className={`tr-toggle ${
                      form.budget_type === "company" ? "active" : ""
                    }`}
                    onClick={() => set("budget_type", "company")}
                  >
                    <CreditCard size={13} /> Company Expense
                  </button>
                  <button
                    className={`tr-toggle ${
                      form.budget_type === "project" ? "active" : ""
                    }`}
                    onClick={() => set("budget_type", "project")}
                  >
                    <Briefcase size={13} /> Project Budget
                  </button>
                </div>
              </div>

              {/* Project selector — only when project budget */}
              {form.budget_type === "project" && (
                <div className="tr-field tr-field-animate">
                  <label>
                    Project <span className="req">*</span>
                  </label>
                  <div className="tr-select-wrap">
                    <select
                      value={form.project_id}
                      onChange={(e) => set("project_id", e.target.value)}
                    >
                      <option value="">
                        {loadingProjects
                          ? "Loading projects..."
                          : "Select a project"}
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="tr-select-chevron" />
                  </div>
                </div>
              )}

              {/* Payment mode */}
              <div className="tr-field">
                <label>Payment Mode</label>
                <div className="tr-toggle-group">
                  <button
                    className={`tr-toggle ${
                      form.payment_mode === "company" ? "active" : ""
                    }`}
                    onClick={() => set("payment_mode", "company")}
                  >
                    <Building2 size={13} /> Company Pays
                  </button>
                  <button
                    className={`tr-toggle ${
                      form.payment_mode === "self" ? "active" : ""
                    }`}
                    onClick={() => set("payment_mode", "self")}
                  >
                    <User size={13} /> Self Paid
                  </button>
                </div>
              </div>

              {form.payment_mode === "self" && (
                <div className="tr-info-banner tr-banner-self">
                  <User size={13} />
                  You've paid out of pocket — upload receipts below so HR can
                  reimburse you.
                </div>
              )}
              {form.payment_mode === "company" && (
                <div className="tr-info-banner tr-banner-company">
                  <Building2 size={13} />
                  Company / HR will arrange and pay for the expenses directly.
                </div>
              )}
            </div>

            {/* ── Section: Expense Breakdown ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <IndianRupee size={14} />
                Expense Breakdown
              </div>

              <div className="tr-expense-grid">
                {expenseCategories.map(({ key, label, Icon, cls }) => (
                  <div className="tr-expense-row" key={key}>
                    <div className="tr-expense-label">
                      <div className={`tr-expense-icon ${cls}`}>
                        <Icon size={14} />
                      </div>
                      <span>{label}</span>
                    </div>

                    <div className="tr-amount-wrap">
                      <span className="tr-amount-prefix">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={form[`${key}_amount`]}
                        onChange={(e) => set(`${key}_amount`, e.target.value)}
                        className="tr-amount-input"
                      />
                    </div>

                    {/* Receipts only for self-paid */}
                    {form.payment_mode === "self" && (
                      <UploadZone
                        label={label}
                        files={receipts[key]}
                        onAdd={(files) => addFiles(key, files)}
                        onRemove={(i) => removeFile(key, i)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="tr-total-row">
                <span>Total Estimated Amount</span>
                <span className="tr-total-amount">
                  ₹{" "}
                  {[
                    form.travel_amount,
                    form.food_amount,
                    form.accommodation_amount,
                    form.other_amount,
                  ]
                    .map((v) => parseFloat(v) || 0)
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* ── Section: General Receipts (self-paid) ── */}
            {form.payment_mode === "self" && (
              <div className="tr-section">
                <div className="tr-section-head">
                  <FileText size={14} />
                  General / Additional Receipts
                </div>
                <UploadZone
                  label=""
                  files={receipts.general}
                  onAdd={(files) => addFiles("general", files)}
                  onRemove={(i) => removeFile("general", i)}
                />
              </div>
            )}

            {/* ── Section: Notes ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <StickyNote size={14} />
                Notes
              </div>
              <div className="tr-field">
                <label>Additional Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any other information HR or PM should know..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="tr-form-footer">
              <button
                className="tr-btn-reset"
                onClick={() => {
                  setForm(emptyForm);
                  setReceipts({
                    travel: [],
                    food: [],
                    accommodation: [],
                    other: [],
                    general: [],
                  });
                }}
              >
                Reset
              </button>
              <button
                className="tr-btn-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send size={14} /> Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY VIEW ─────────────────────────────────────────── */}
      {view === "history" && (
        <div className="tr-history">
          <button className="tr-back-btn" onClick={() => setView("form")}>
            <ArrowLeft size={14} /> New Request
          </button>

          {loadingHistory ? (
            <div className="tr-loading">Loading your requests…</div>
          ) : history.length === 0 ? (
            <div className="tr-empty">
              <Plane size={32} />
              <p>No requests submitted yet.</p>
            </div>
          ) : (
            <div className="tr-history-grid">
              {history.map((r) => (
                <RequestCard key={r.id} req={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TravelRequest;
