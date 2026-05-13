import React, { useState, useEffect, useRef, useContext } from "react";
import "./TravelRequest.css";
import {
  Plane,
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
  Navigation,
  MoveRight,
  BadgeCheck,
  Wallet,
} from "lucide-react";
import { API } from "../../services/authService";
import { AuthContext } from "../../context/useAuth";

// ── HR roles that should route requests to the CEO ────────────────────────────
const HR_ROLES = [
  "hr_manager",
  "hr",
  "human_resources",
  "hr_executive",
  "hr_officer",
];

const isHRRole = (role) =>
  HR_ROLES.includes((role || "").toLowerCase().replace(/\s+/g, "_"));

// ── Status helpers ────────────────────────────────────────────────────────────
const getStatusIcon = (status) => {
  if (status === "Approved" || status === "PM_Approved")
    return <CheckCircle size={12} />;
  if (status === "Rejected" || status === "PM_Rejected")
    return <XCircle size={12} />;
  return <Clock size={12} />;
};

const getStatusLabel = (status) => {
  if (status === "PM_Approved") return "PM Approved";
  if (status === "PM_Rejected") return "PM Rejected";
  return status;
};

const getStatusClass = (status) => {
  if (status === "Approved") return "approved";
  if (status === "PM_Approved") return "pm-approved";
  if (status === "Rejected" || status === "PM_Rejected" || status === "Cancelled")
    return "rejected";
  return "pending";
};

// ── Upload Zone ───────────────────────────────────────────────────────────────
const UploadZone = ({ files, onAdd, onRemove }) => {
  const inputRef = useRef();

  const handleFiles = (raw) => {
    const valid = Array.from(raw).filter((f) => f.size <= 10 * 1024 * 1024);
    const oversized = Array.from(raw).length - valid.length;
    if (oversized > 0) alert(`${oversized} file(s) skipped — each file must be under 10 MB.`);
    if (valid.length) onAdd(valid);
    // Reset input so the same file can be re-added if removed and re-selected
    inputRef.current.value = "";
  };

  const openPicker = () => inputRef.current.click();

  return (
    <div className="tr-upload-wrap">
      {/* Hidden input — always present so it can be triggered at any time */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drop zone — shown when no files yet, or always as a secondary add area */}
      {files.length === 0 ? (
        <div
          className="tr-upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
        >
          <Upload size={15} className="tr-upload-icon" />
          <div className="tr-upload-text">
            <span>Click or drag &amp; drop receipts here</span>
            <small>JPG, PNG or PDF · max 10 MB per file · multiple allowed</small>
          </div>
        </div>
      ) : (
        <>
          <div className="tr-file-list">
            {files.map((f, i) => (
              <div className="tr-file-item" key={i}>
                <FileText size={13} />
                <span className="tr-file-name">{f.name}</span>
                <span className="tr-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  className="tr-file-remove"
                  onClick={() => onRemove(i)}
                  aria-label="Remove file"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* "Add more" button — always visible once at least one file is added */}
          <button
            type="button"
            className="tr-add-more-btn"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onClick={openPicker}
          >
            <Upload size={12} />
            Add more receipts
          </button>
        </>
      )}
    </div>
  );
};

// ── Request Card (history) ────────────────────────────────────────────────────
const RequestCard = ({ req }) => (
  <div className="tr-history-card">
    <div className="tr-history-top">
      <span className="tr-history-no">{req.request_no}</span>
      <span className={`tr-status tr-status-${getStatusClass(req.status)}`}>
        {getStatusIcon(req.status)}
        {getStatusLabel(req.status)}
      </span>
    </div>
    <div className="tr-history-title">{req.trip_title || req.destination}</div>

    <div className="tr-history-route">
      <span className="tr-route-point">
        <Navigation size={10} />
        {req.origin || "—"}
      </span>
      <MoveRight size={11} className="tr-route-arrow" />
      <span className="tr-route-point">
        <MapPin size={10} />
        {req.destination || "—"}
      </span>
    </div>

    <div className="tr-history-meta">
      <span>
        <CalendarDays size={11} />
        {new Date(req.travel_from_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        {" → "}
        {new Date(req.travel_to_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>

    <div className="tr-history-purpose">{req.purpose}</div>

    <div className="tr-history-footer">
      <div className="tr-history-pills">
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
        <span
          className={`tr-budget-pill ${
            req.payment_mode === "self" ? "pill-self" : "pill-hr"
          }`}
        >
          {req.payment_mode === "self" ? (
            <>
              <Wallet size={10} /> Self-paid
            </>
          ) : (
            <>
              <Building2 size={10} /> Requested
            </>
          )}
        </span>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const TravelRequest = () => {
  const { user } = useContext(AuthContext);

  const [view, setView] = useState("form"); // "form" | "history"
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const emptyForm = {
    trip_title: "",
    origin: "",
    destination: "",
    travel_from_date: "",
    travel_to_date: "",
    purpose: "",
    notes: "",
    budget_type: "company", // "company" | "project"
    project_id: "",
    payment_mode: "company", // "company" (request) | "self"
  };

  const [form, setForm] = useState(emptyForm);
  const [receipts, setReceipts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Effects ──────────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const addFiles = (files) => setReceipts((p) => [...p, ...files]);
  const removeFile = (index) => setReceipts((p) => p.filter((_, i) => i !== index));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setReceipts([]);
  };

  const handleSubmit = async () => {
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
    if (form.payment_mode === "self" && receipts.length === 0) {
      showToast("error", "Please upload at least one receipt for self-paid expenses.");
      return;
    }

    const receiptPayload = receipts.map((f) => ({
      expense_type: "general",
      file_name: f.name,
      file_url: `/uploads/travel/${Date.now()}_${f.name}`,
      file_size_kb: Math.round(f.size / 1024),
    }));

    // Determine if this user is HR — if so, route to CEO
    const userRole = user?.role || user?.designation || "";
    const routeToCeo = isHRRole(userRole);

    const payload = {
      user_id: user?.id,
      employee_name: user?.name || "Unknown",
      designation: user?.role || user?.designation || "—",
      department: user?.department || "—",
      route_to_ceo: routeToCeo,
      ...form,
      project_id: form.budget_type === "project" ? form.project_id : null,
      receipts: form.payment_mode === "self" ? receiptPayload : [],
    };

    setSubmitting(true);
    try {
      await API.post("/travel-expenses", payload);
      showToast(
        "success",
        routeToCeo
          ? "Request submitted — routed to CEO for approval."
          : "Travel request submitted successfully!"
      );
      resetForm();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived user info ──────────────────────────────────────────────────────
  const userName = user?.name || "—";
  const userRole = user?.role || user?.designation || "—";
  const userDept = user?.department || "—";
  const userIsHR = isHRRole(userRole);
  const isSelfPaid = form.payment_mode === "self";

  // ── Render ────────────────────────────────────────────────────────────────
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
          <div className="tr-header-icon-wrap">
            <Plane size={20} />
          </div>
          <div>
            <h1>Travel Request</h1>
            <p>Submit a travel request or claim reimbursement for self-paid expenses</p>
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

      {/* ── FORM VIEW ─────────────────────────────────────────────────────── */}
      {view === "form" && (
        <div className="tr-layout">
          {/* ── LEFT: User Profile Card ── */}
          <aside className="tr-aside">
            <div className="tr-profile-card">
              <div className="tr-profile-banner" />
              <div className="tr-profile-body">
                <div className="tr-avatar">{userName.charAt(0).toUpperCase()}</div>
                <div className="tr-profile-name">{userName}</div>
                <div className="tr-profile-role">{userRole}</div>

                <div className="tr-profile-divider" />

                <div className="tr-profile-fields">
                  <div className="tr-profile-field">
                    <span className="tr-pf-label">Department</span>
                    <span className="tr-pf-value">
                      <Building2 size={11} />
                      {userDept}
                    </span>
                  </div>
                  <div className="tr-profile-field">
                    <span className="tr-pf-label">Designation</span>
                    <span className="tr-pf-value">{userRole}</span>
                  </div>
                  <div className="tr-profile-field">
                    <span className="tr-pf-label">Employee ID</span>
                    <span className="tr-pf-value">
                      #{String(user?.id || 0).padStart(4, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* HR routing notice */}
            {userIsHR && (
              <div className="tr-aside-notice tr-notice-ceo">
                <BadgeCheck size={13} />
                <p>
                  As an HR staff member, your travel request will be routed directly
                  to the <strong>CEO</strong> for approval.
                </p>
              </div>
            )}

            <div className="tr-aside-tip">
              <StickyNote size={12} />
              <p>
                Your details are auto-filled. Receipts are only needed if you've
                already paid out of pocket.
              </p>
            </div>
          </aside>

          {/* ── RIGHT: Form ── */}
          <div className="tr-form">
            {/* ── Section 1: Trip Details ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <div className="tr-section-icon">
                  <MapPin size={13} />
                </div>
                Trip Details
              </div>

              <div className="tr-field tr-field-full">
                <label>
                  Trip Title <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Meeting – Mumbai"
                  value={form.trip_title}
                  onChange={(e) => set("trip_title", e.target.value)}
                />
              </div>

              <div className="tr-field tr-field-full">
                <label>
                  Purpose of Travel <span className="req">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose of this trip…"
                  value={form.purpose}
                  onChange={(e) => set("purpose", e.target.value)}
                />
              </div>

              {/* Origin → Destination */}
              <div className="tr-route-row">
                <div className="tr-field">
                  <label>
                    <Navigation size={12} /> From
                  </label>
                  <input
                    type="text"
                    placeholder="Departure city / location"
                    value={form.origin}
                    onChange={(e) => set("origin", e.target.value)}
                  />
                </div>
                <div className="tr-route-mid">
                  <MoveRight size={18} />
                </div>
                <div className="tr-field">
                  <label>
                    <MapPin size={12} /> Destination <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Arrival city / location"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="tr-grid-2">
                <div className="tr-field">
                  <label>
                    <CalendarDays size={12} /> From Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.travel_from_date}
                    onChange={(e) => set("travel_from_date", e.target.value)}
                  />
                </div>
                <div className="tr-field">
                  <label>
                    <CalendarDays size={12} /> To Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.travel_to_date}
                    min={form.travel_from_date}
                    onChange={(e) => set("travel_to_date", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Budget ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <div className="tr-section-icon">
                  <CreditCard size={13} />
                </div>
                Budget
              </div>

              <div className="tr-field">
                <label>Budget Type</label>
                <div className="tr-toggle-group">
                  <button
                    type="button"
                    className={`tr-toggle ${form.budget_type === "company" ? "active" : ""}`}
                    onClick={() => set("budget_type", "company")}
                  >
                    <CreditCard size={13} /> Company Expense
                  </button>
                  <button
                    type="button"
                    className={`tr-toggle ${form.budget_type === "project" ? "active" : ""}`}
                    onClick={() => set("budget_type", "project")}
                  >
                    <Briefcase size={13} /> Project Budget
                  </button>
                </div>
              </div>

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
                        {loadingProjects ? "Loading projects…" : "Select a project"}
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
            </div>

            {/* ── Section 3: Payment Mode ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <div className="tr-section-icon">
                  <Wallet size={13} />
                </div>
                Payment
              </div>

              <div className="tr-field">
                <label>How will this trip be paid for?</label>
                <div className="tr-toggle-group">
                  <button
                    type="button"
                    className={`tr-toggle ${form.payment_mode === "company" ? "active" : ""}`}
                    onClick={() => {
                      set("payment_mode", "company");
                      setReceipts([]);
                    }}
                  >
                    <Building2 size={13} /> Request (Company Pays)
                  </button>
                  <button
                    type="button"
                    className={`tr-toggle ${form.payment_mode === "self" ? "active" : ""}`}
                    onClick={() => set("payment_mode", "self")}
                  >
                    <User size={13} /> Self Paid (Reimburse Me)
                  </button>
                </div>
              </div>

              {/* Contextual info banners */}
              {!isSelfPaid ? (
                <div className="tr-info-banner tr-banner-company">
                  <Building2 size={13} />
                  <div>
                    <strong>Company arranges &amp; pays</strong>
                    <span>
                      HR or the relevant approver will arrange travel on your behalf. No
                      receipts needed.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="tr-info-banner tr-banner-self">
                  <Wallet size={13} />
                  <div>
                    <strong>Self-paid reimbursement</strong>
                    <span>
                      You've paid out of pocket. Upload your receipts below so they can
                      be reimbursed.
                    </span>
                  </div>
                </div>
              )}

              {/* Receipt upload — only for self-paid */}
              {isSelfPaid && (
                <div className="tr-field-animate">
                  <label className="tr-receipts-label">
                    Receipts <span className="req">*</span>
                  </label>
                  <UploadZone
                    files={receipts}
                    onAdd={addFiles}
                    onRemove={removeFile}
                  />
                </div>
              )}
            </div>

            {/* ── Section 4: Notes ── */}
            <div className="tr-section">
              <div className="tr-section-head">
                <div className="tr-section-icon">
                  <StickyNote size={13} />
                </div>
                Additional Notes
              </div>
              <div className="tr-field tr-field-full">
                <textarea
                  rows={3}
                  placeholder="Any other information the approver should know…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="tr-form-footer">
              <button type="button" className="tr-btn-reset" onClick={resetForm}>
                Reset
              </button>
              <button
                type="button"
                className="tr-btn-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  "Submitting…"
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

      {/* ── HISTORY VIEW ─────────────────────────────────────────────────── */}
      {view === "history" && (
        <div className="tr-history-view">
          <button className="tr-back-btn" onClick={() => setView("form")}>
            <ArrowLeft size={14} /> New Request
          </button>

          {loadingHistory ? (
            <div className="tr-loading">
              <Clock size={28} strokeWidth={1.4} />
              <p>Loading your requests…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="tr-empty">
              <Plane size={32} strokeWidth={1.4} />
              <p>No travel requests submitted yet.</p>
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