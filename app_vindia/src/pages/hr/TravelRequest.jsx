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
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { API } from "../../services/authService";
import { AuthContext } from "../../context/useAuth";

const ROLES_DB = [
  { code: "hr_manager", department: "HR" },
  { code: "hr_executive", department: "HR" },
  { code: "software_engineer", department: "IT" },
  { code: "tester", department: "IT" },
  { code: "operations_manager", department: "Operations & Administration" },
  { code: "admin_executive", department: "Operations & Administration" },
  { code: "project_manager", department: "Project Management" },
  { code: "site_engineer", department: "Project Management" },
  { code: "mep_engineer", department: "Project Management" },
  { code: "project_coordinator", department: "Project Management" },
  { code: "quantity_surveyor", department: "Project Management" },
  { code: "structural_engineer", department: "Project Management" },
  { code: "planning_engineer", department: "Project Management" },
  { code: "safety_officer", department: "Project Management" },
  { code: "qc_engineer", department: "Project Management" },
  { code: "client", department: "Project Management" },
  { code: "bd_manager", department: "Business Development" },
  { code: "sales_executive", department: "Business Development" },
  { code: "bda", department: "Business Development" },
  { code: "digital_marketing", department: "Business Development" },
  { code: "accountant", department: "Finance" },
  { code: "finance_manager", department: "Finance" },
  { code: "architect", department: "Design" },
  { code: "draftsman", department: "Design" },
  { code: "3d_visualizer", department: "Design" },
  { code: "ceo", department: "Management" },
];

const getDepartmentByRole = (roleCode) => {
  const normalized = (roleCode || "").toLowerCase().replace(/\s+/g, "_");
  const found = ROLES_DB.find((r) => r.code === normalized);
  return found ? found.department : null;
};

const HR_ROLES = ["hr_manager", "hr", "human_resources", "hr_executive", "hr_officer"];

const isHRRole = (role) =>
  HR_ROLES.includes((role || "").toLowerCase().replace(/\s+/g, "_"));

const getStatusIcon = (status) => {
  if (status === "Approved" || status === "PM_Approved") return <CheckCircle size={14} />;
  if (status === "Rejected" || status === "PM_Rejected" || status === "Cancelled") return <XCircle size={14} />;
  return <Clock size={14} />;
};

const getStatusLabel = (status) => {
  if (status === "PM_Approved") return "PM Approved";
  if (status === "PM_Rejected") return "PM Rejected";
  return status;
};

const getStatusClass = (status) => {
  if (status === "Approved") return "approved";
  if (status === "PM_Approved") return "pm-approved";
  if (status === "Rejected" || status === "PM_Rejected" || status === "Cancelled") return "rejected";
  return "pending";
};

const UploadZone = ({ files, onAdd, onRemove }) => {
  const inputRef = useRef();

  const handleFiles = (raw) => {
    const valid = Array.from(raw).filter((f) => f.size <= 10 * 1024 * 1024);
    const oversized = Array.from(raw).length - valid.length;
    if (oversized > 0) alert(`${oversized} file(s) skipped — each file must be under 10 MB.`);
    if (valid.length) onAdd(valid);
    inputRef.current.value = "";
  };

  const openPicker = () => inputRef.current.click();

  return (
    <div className="tr-upload-wrap">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length === 0 ? (
        <div
          className="tr-upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
        >
          <div className="tr-upload-zone__icon">
            <Upload size={22} />
          </div>
          <div className="tr-upload-zone__content">
            <strong>Drop your receipts here</strong>
            <span>or click to browse from your device</span>
            <small>JPG, PNG or PDF · max 10 MB per file</small>
          </div>
        </div>
      ) : (
        <>
          <div className="tr-file-list">
            {files.map((f, i) => (
              <div className="tr-file-item" key={i}>
                <div className="tr-file-item__icon">
                  <FileText size={14} />
                </div>
                <div className="tr-file-item__content">
                  <span className="tr-file-name">{f.name}</span>
                  <span className="tr-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <button
                  className="tr-file-remove"
                  onClick={() => onRemove(i)}
                  aria-label="Remove file"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="tr-add-more-btn" onClick={openPicker}>
            <Upload size={13} />
            Add another receipt
          </button>
        </>
      )}
    </div>
  );
};

const RequestCard = ({ req }) => {
  const isApproved = req.status === 'approved' || req.status === 'pm_approved';
  const isRejected = req.status === 'rejected';
  
  return (
    <div className="tr-premium-card">
      {/* Visual Block Header */}
      <div className="tr-pc-banner-header">
        <div className="tr-pc-header-icon">
          <Plane size={16} />
        </div>
        <div className="tr-pc-header-text">
          <span className="tr-pc-serial">{req.request_no || "TR-2026-0002"}</span>
          <h3 className="tr-pc-title">{req.trip_title || "Site Visit"}</h3>
        </div>
      </div>

      <div className="tr-pc-content-body">
        {/* Purpose / Description Description Block */}
        <p className="tr-pc-purpose">
          {req.purpose || "No additional purpose breakdown provided for this trip."}
        </p>

        {/* Route Tracking Panel */}
        <div className="tr-pc-route-strip">
          <div className="tr-pc-node">
            <span className="node-lbl">FROM</span>
            <strong className="node-val">{req.origin || "Origin"}</strong>
          </div>
          <div className="tr-pc-line-divider"></div>
          <div className="tr-pc-node alignment-right">
            <span className="node-lbl">TO</span>
            <strong className="node-val">{req.destination || "Destination"}</strong>
          </div>
        </div>

        {/* Dynamic Horizontal Metadata Info list */}
        <div className="tr-pc-meta-grid">
          <div className="meta-info-item">
            <span className="meta-lbl">Duration</span>
            <span className="meta-val">
              {new Date(req.travel_from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - {new Date(req.travel_to_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="meta-info-item">
            <span className="meta-lbl">Coverage</span>
            <span className={`meta-val tag-${req.budget_type}`}>
              {req.budget_type === "project" ? "Project" : "Company"}
            </span>
          </div>
        </div>
      </div>

      {/* High Contrast Footer Utility Row */}
      <div className="tr-pc-footer-action-bar">
        <span className={`tr-pc-status-tag ${isApproved ? 'status-pass' : isRejected ? 'status-fail' : 'status-hold'}`}>
          <span className="status-indicator-pulsar"></span>
          {req.status || "Pending"}
        </span>

        <span className="tr-pc-payment-mode-pill">
          {req.payment_mode === "self" ? "Self-Paid" : "Corporate"}
        </span>
      </div>
    </div>
  );
};

const TravelRequest = () => {
  const { user } = useContext(AuthContext);

  const [view, setView] = useState("form");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [form, setForm] = useState({
    trip_title: "",
    origin: "",
    destination: "",
    travel_from_date: "",
    travel_to_date: "",
    purpose: "",
    notes: "",
    budget_type: "company",
    project_id: "",
    payment_mode: "company",
  });

  const emptyForm = {
    trip_title: "",
    origin: "",
    destination: "",
    travel_from_date: "",
    travel_to_date: "",
    purpose: "",
    notes: "",
    budget_type: "company",
    project_id: "",
    payment_mode: "company",
  };

  // Safe isolated effect blocks ensuring no cascading hooks break layout mounting
  useEffect(() => {
    let active = true;
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await API.get("/projects");
        if (active) setProjects(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingProjects(false);
      }
    };
    fetchProjects();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (view !== "history" || !user?.id) return;
    let active = true;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await API.get(`/travel-expenses?user_id=${user.id}`);
        if (active) setHistory(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingHistory(false);
      }
    };
    fetchHistory();
    return () => { active = false; };
  }, [view, user?.id]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const addFiles = (files) => setReceipts((prev) => [...prev, ...files]);
  const removeFile = (index) => setReceipts((prev) => prev.filter((_, i) => i !== index));

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
      setView("history");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const userName = user?.name || "—";
  const userRole = user?.role || user?.designation || "—";
  const userDept = user?.department || getDepartmentByRole(user?.role || user?.designation) || "—";
  const userIsHR = isHRRole(userRole);
  const isSelfPaid = form.payment_mode === "self";

  return (
    <div className="tr-page">
      {toast && (
        <div className={`tr-toast tr-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <header className="tr-header">
        <div className="tr-header-left">
          <div className="tr-header-icon-wrap">
            <Plane size={20} />
            <Sparkles size={12} className="tr-header-sparkle" />
          </div>
          <div>
            <h1>Travel Management</h1>
          </div>
        </div>

        <div className="tr-tabs">
          <button
            className={`tr-tab ${view === "form" ? "active" : ""}`}
            onClick={() => setView("form")}
          >
            <Send size={14} />
            New Request
          </button>
          <button
            className={`tr-tab ${view === "history" ? "active" : ""}`}
            onClick={() => setView("history")}
          >
            <Clock size={14} />
            My Requests
          </button>
        </div>
      </header>

      {view === "form" && (
        <div className="tr-layout">
          <aside className="tr-aside">
            <div className="tr-profile-card">
              <div className="tr-profile-banner" />
              <div className="tr-profile-body">
                <div className="tr-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>

                <div className="tr-profile-name">{userName}</div>
                <div className="tr-profile-role">{userRole}</div>

                <div className="tr-dept-badge">
                  <Building2 size={11} />
                  {userDept}
                </div>

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
                </div>
              </div>

              {userIsHR && (
                <div className="tr-aside-notice tr-aside-notice--ceo">
                  <BadgeCheck size={13} />
                  <p>
                    As an HR staff member, your travel request will be routed directly to the <strong>CEO</strong> for approval.
                  </p>
                </div>
              )}
            </div>
          </aside>

          <main className="tr-form-wrapper">
            <div className="tr-form">
              <div className="tr-sections">
                <section className="tr-section">
                  <div className="tr-section-head">
                    <div className="tr-section-icon">
                      <MapPin size={13} />
                    </div>
                    <div>
                      <h3>Trip Details</h3>
                    </div>
                  </div>

                  <div className="tr-field tr-field-full">
                    <label>
                     Title <span className="req">*</span>
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
                </section>

                <section className="tr-section">
                  <div className="tr-section-head">
                    <div className="tr-section-icon">
                      <CreditCard size={13} />
                    </div>
                    <div>
                      <h3>Budget</h3>
                    </div>
                  </div>

                  <div className="tr-field">
                    <label>Budget Type</label>
                    <div className="tr-toggle-group">
                      <button
                        type="button"
                        className={`tr-toggle ${form.budget_type === "company" ? "active" : ""}`}
                        onClick={() => set("budget_type", "company")}
                      >
                        <CreditCard size={13} />
                        Company Expense
                      </button>
                      <button
                        type="button"
                        className={`tr-toggle ${form.budget_type === "project" ? "active" : ""}`}
                        onClick={() => set("budget_type", "project")}
                      >
                        <Briefcase size={13} />
                        Project Budget
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
                </section>

                <section className="tr-section">
                  <div className="tr-section-head">
                    <div className="tr-section-icon">
                      <Wallet size={13} />
                    </div>
                    <div>
                      <h3>Payment</h3>
                    </div>
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
                        <Building2 size={13} />
                        Company Paid 
                      </button>
                      <button
                        type="button"
                        className={`tr-toggle ${form.payment_mode === "self" ? "active" : ""}`}
                        onClick={() => set("payment_mode", "self")}
                      >
                        <User size={13} />
                        Self Paid
                      </button>
                    </div>
                  </div>

                  {!isSelfPaid ? (
                    <div className="tr-info-banner tr-banner-company">
                      <Building2 size={13} />
                      <div>
                        <strong>Company arranges & pays</strong>
                        <span>
                          HR or the relevant approver will arrange travel on your behalf. No receipts needed.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="tr-info-banner tr-banner-self">
                      <Wallet size={13} />
                      <div>
                        <strong>Paid Out of Pocket</strong>
                        <span>Please upload relevant receipts below to process your reimbursement lifecycle.</span>
                      </div>
                    </div>
                  )}

                  {isSelfPaid && (
                    <div className="tr-field-animate">
                      <label className="tr-receipts-label">
                        Receipts <span className="req">*</span>
                      </label>
                      <UploadZone files={receipts} onAdd={addFiles} onRemove={removeFile} />
                    </div>
                  )}
                </section>

                <section className="tr-section">
                  <div className="tr-section-head">
                    <div className="tr-section-icon">
                      <StickyNote size={13} />
                    </div>
                    <div>
                      <h3>Additional Notes</h3>
                    </div>
                  </div>

                  <div className="tr-field tr-field-full">
                    <textarea
                      rows={3}
                      placeholder="Any other information the approver should know…"
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                    />
                  </div>
                </section>
              </div>

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
                  {submitting ? "Submitting…" : <>
                    <Send size={14} /> Submit Request
                  </>}
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {view === "history" && (
        <div className="tr-history-view">
          <div className="tr-history-header-row">
            <button className="tr-back-btn" onClick={() => setView("form")}>
              <ArrowLeft size={14} /> New Request
            </button>
          
          </div>

          {loadingHistory ? (
            <div className="tr-loading">
              <Clock size={28} className="tr-spin-slow" strokeWidth={1.4} />
              <p>Loading historical ledger data...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="tr-empty">
              <Plane size={32} strokeWidth={1.4} />
              <p>No travel requests submitted yet.</p>
            </div>
          ) : (
            <div className="tr-list-container">
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