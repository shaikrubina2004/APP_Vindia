import React, { useState, useEffect, useRef, useContext } from "react";
import { useSearchParams } from "react-router-dom";
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
  Eye,
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

/* Turns raw role/department strings (often snake_case or all-lowercase,
   as stored on the user record) into a properly cased display label. */
const toTitleCase = (value) => {
  if (!value) return value;
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((word) =>
      word.length <= 3 && word === word.toLowerCase()
        ? word.toUpperCase() // short tokens like "hr", "it", "qc" read as acronyms
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
};

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

/* Derives a short "airport style" code from a free-text city name, purely
   for the boarding-pass presentation in the live preview. Decorative only —
   never sent to the API, never affects stored data. */
const codeOf = (place) => {
  if (!place) return "—·—·—";
  const clean = place.trim().replace(/[^a-zA-Z]/g, "");
  if (!clean) return "—·—·—";
  return clean.slice(0, 3).toUpperCase();
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
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
        >
          <div className="tr-upload-zone__icon">
            <Upload size={20} />
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
                <div className="tr-file-item__icon"><FileText size={13} /></div>
                <div className="tr-file-item__content">
                  <span className="tr-file-name">{f.name}</span>
                  <span className="tr-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <button className="tr-file-remove" onClick={() => onRemove(i)} aria-label="Remove file">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="tr-add-more-btn" onClick={openPicker}>
            <Upload size={12} />
            Add another receipt
          </button>
        </>
      )}
    </div>
  );
};

/* Live Preview Card — presented as a travel authorization ticket that fills
   in as the form is completed. Updates in real time. */
const LivePreview = ({ form, userName, userRole, userDept, userIsHR }) => {
  return (
    <div className="tr-preview-card">
      {/* Ticket header strip */}
      <div className="tr-pv-identity">
        <div className="tr-pv-logo">
          <Plane size={16} />
        </div>
        <div className="tr-pv-company">
          <span className="tr-pv-eyebrow">Travel Authorization</span>
          <strong>Passenger Copy · Draft</strong>
        </div>
        <div className="tr-pv-serial">TR&#8209;DRAFT</div>
      </div>

      {/* Big route codes, boarding-pass style */}
      <div className="tr-pv-route-hero">
        <div className="tr-pv-route-hero-code">{codeOf(form.origin)}</div>
        <div className="tr-pv-route-hero-line">
          <span className="tr-pv-route-hero-dot" />
          <span className="tr-pv-route-hero-dash" />
          <Plane size={13} className="tr-pv-route-hero-plane" />
          <span className="tr-pv-route-hero-dash" />
          <span className="tr-pv-route-hero-dot" />
        </div>
        <div className="tr-pv-route-hero-code tr-pv-route-hero-code--end">{codeOf(form.destination)}</div>
      </div>
      <div className="tr-pv-route-hero-names">
        <span>{form.origin || "Origin city"}</span>
        <span>{form.destination || "Destination city"}</span>
      </div>

      {/* Dates meta row */}
      <div className="tr-pv-meta-row">
        <div className="tr-pv-meta-cell">
          <span className="tr-pv-meta-lbl">Departs</span>
          <span className="tr-pv-meta-val">
            {form.travel_from_date
              ? fmtDate(form.travel_from_date)
              : <span className="tr-pv-placeholder">—</span>}
          </span>
        </div>
        <div className="tr-pv-meta-cell">
          <span className="tr-pv-meta-lbl">Returns</span>
          <span className="tr-pv-meta-val">
            {form.travel_to_date
              ? fmtDate(form.travel_to_date)
              : <span className="tr-pv-placeholder">—</span>}
          </span>
        </div>
        <div className="tr-pv-meta-cell">
          <span className="tr-pv-meta-lbl">Charged to</span>
          <span className="tr-pv-meta-val" style={{ textTransform: "capitalize" }}>
            {form.budget_type === "project" ? "Project" : "Company"}
          </span>
        </div>
      </div>

      {/* Employee */}
      <div className="tr-pv-section">
        <div className="tr-pv-section-label">Passenger</div>
        <div className="tr-pv-employee">
          <strong>{userName || "—"}</strong>
          <span>{userRole}{userDept ? ` · ${userDept}` : ""}</span>
         
        </div>
      </div>

      {/* Trip */}
      <div className="tr-pv-section">
        <div className="tr-pv-section-label">Purpose of travel</div>
        <p className="tr-pv-trip-title">
          {form.trip_title || <span className="tr-pv-placeholder">Untitled trip</span>}
        </p>
        {form.purpose && (
          <p className="tr-pv-purpose">{form.purpose}</p>
        )}
      </div>

      {/* Payment & Budget */}
      <div className="tr-pv-section">
        <div className="tr-pv-section-label">Payment</div>
        <div className="tr-pv-budget-row">
          <span className="tr-pv-pill tr-pv-pill--primary">
            {form.budget_type === "project" ? <Briefcase size={10} /> : <CreditCard size={10} />}
            {form.budget_type === "project" ? "Project Budget" : "Company Expense"}
          </span>
          <span className={`tr-pv-pill ${form.payment_mode === "self" ? "tr-pv-pill--warning" : "tr-pv-pill--success"}`}>
            {form.payment_mode === "self" ? <User size={10} /> : <Building2 size={10} />}
            {form.payment_mode === "self" ? "Self-Paid" : "Company Paid"}
          </span>
        </div>
      </div>

      {/* Perforation — ticket stub cut line */}
      <div className="tr-pv-perforation">
        <span className="tr-pv-notch tr-pv-notch--left" />
        <span className="tr-pv-notch tr-pv-notch--right" />
      </div>

      {/* Stub footer */}
      <div className="tr-pv-stub">
        <div className="tr-pv-stub-row">
          <span className="tr-pv-status">
            <span className="tr-pv-status-dot" />
            Draft
          </span>
          <span className="tr-pv-payment-mode">
            {form.payment_mode === "self" ? "Reimbursement" : "Corporate"}
          </span>
        </div>
        <div className="tr-pv-barcode" aria-hidden="true" />
      </div>
    </div>
  );
};

const RequestCard = ({ req }) => {
  const isApproved = req.status === "approved" || req.status === "pm_approved";
  const isRejected = req.status === "rejected";

  return (
    <div className="tr-premium-card">
      <div className="tr-pc-banner-header">
        <div className="tr-pc-header-icon"><Plane size={15} /></div>
        <div className="tr-pc-header-text">
          <span className="tr-pc-serial">{req.request_no || "TR-2026-0002"}</span>
          <h3 className="tr-pc-title">{req.trip_title || "Site Visit"}</h3>
        </div>
      </div>

      <div className="tr-pc-content-body">
        <p className="tr-pc-purpose">
          {req.purpose || "No additional purpose breakdown provided for this trip."}
        </p>

        <div className="tr-pc-route-strip">
          <div className="tr-pc-node">
            <span className="node-lbl">FROM</span>
            <strong className="node-val">{req.origin || "Origin"}</strong>
          </div>
          <div className="tr-pc-line-divider" />
          <div className="tr-pc-node alignment-right">
            <span className="node-lbl">TO</span>
            <strong className="node-val">{req.destination || "Destination"}</strong>
          </div>
        </div>

        <div className="tr-pc-meta-grid">
          <div className="meta-info-item">
            <span className="meta-lbl">Duration</span>
            <span className="meta-val">
              {fmtDate(req.travel_from_date)} – {fmtDate(req.travel_to_date)}
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

      <div className="tr-pc-footer-action-bar">
        <span className={`tr-pc-status-tag ${isApproved ? "status-pass" : isRejected ? "status-fail" : "status-hold"}`}>
          <span className="status-indicator-pulsar" />
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
  const [searchParams] = useSearchParams();

  const [view, setView] = useState(searchParams.get("view") === "history" ? "history" : "form");
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
    if (!form.trip_title || !form.destination || !form.travel_from_date || !form.travel_to_date || !form.purpose) {
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
  const rawRole = user?.role || user?.designation || "";
  const userRole = toTitleCase(rawRole) || "—";
  const userDept = toTitleCase(user?.department) || getDepartmentByRole(rawRole) || "—";
  const userIsHR = isHRRole(rawRole);
  const isSelfPaid = form.payment_mode === "self";

  return (
    <div className="tr-page">
      {toast && (
        <div className={`tr-toast tr-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Top Header Bar ── */}
      <header className="tr-header">
        <div className="tr-header-left">
          <div className="tr-header-icon-wrap">
            <Plane size={18} />
            <Sparkles size={11} className="tr-header-sparkle" />
          </div>
          <div>
           
            <h1>Travel Request</h1>
          </div>
        </div>

        <div className="tr-tabs">
          <button className={`tr-tab ${view === "form" ? "active" : ""}`} onClick={() => setView("form")}>
            <Send size={13} />
            New Request
          </button>
          <button className={`tr-tab ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>
            <Clock size={13} />
            My Requests
          </button>
        </div>
      </header>

      {/* ── Form View: split layout ── */}
      {view === "form" && (
        <div className="tr-split-layout">

          {/* LEFT — Scrollable form panel */}
          <div className="tr-form-panel">

            {/* Compact employee bar */}
            <div className="tr-form-user-bar">
              <div className="tr-form-user-avatar">
                {userName.charAt(0).toUpperCase()}
                <span className="tr-form-user-avatar__dot" />
              </div>
              <div className="tr-form-user-info">
                <span className="tr-form-user-eyebrow">Requested by</span>
                <strong>{userName}</strong>
              </div>
              <div className="tr-form-user-role">
                <Briefcase size={11} />
                {userRole}
              </div>
            </div>

            {/* HR notice */}
     
            {/* Form sections */}
            <div className="tr-sections">

              {/* Trip Details */}
              <section className="tr-section">
                <div className="tr-section-head">
                  <div className="tr-section-icon"><MapPin size={13} /></div>
                  <div>
                    <h3>Trip Details</h3>
                    <p>Title, purpose, and dates</p>
                  </div>
                </div>

                <div className="tr-field tr-field-full">
                  <label>Title <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Client Meeting – Mumbai"
                    value={form.trip_title}
                    onChange={(e) => set("trip_title", e.target.value)}
                  />
                </div>

                <div className="tr-field tr-field-full">
                  <label>Purpose of Travel <span className="req">*</span></label>
                  <textarea
                    rows={3}
                    placeholder="Describe the purpose of this trip…"
                    value={form.purpose}
                    onChange={(e) => set("purpose", e.target.value)}
                  />
                </div>

                <div className="tr-route-row">
                  <div className="tr-field">
                    <label><Navigation size={11} /> From</label>
                    <input
                      type="text"
                      placeholder="Departure city"
                      value={form.origin}
                      onChange={(e) => set("origin", e.target.value)}
                    />
                  </div>
                  <div className="tr-route-mid">
                    <MoveRight size={16} />
                  </div>
                  <div className="tr-field">
                    <label><MapPin size={11} /> Destination <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="Arrival city"
                      value={form.destination}
                      onChange={(e) => set("destination", e.target.value)}
                    />
                  </div>
                </div>

                <div className="tr-grid-2">
                  <div className="tr-field">
                    <label><CalendarDays size={11} /> From Date <span className="req">*</span></label>
                    <input
                      type="date"
                      value={form.travel_from_date}
                      onChange={(e) => set("travel_from_date", e.target.value)}
                    />
                  </div>
                  <div className="tr-field">
                    <label><CalendarDays size={11} /> To Date <span className="req">*</span></label>
                    <input
                      type="date"
                      value={form.travel_to_date}
                      min={form.travel_from_date}
                      onChange={(e) => set("travel_to_date", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Budget */}
              <section className="tr-section">
                <div className="tr-section-head">
                  <div className="tr-section-icon"><CreditCard size={13} /></div>
                  <div>
                    <h3>Budget</h3>
                    <p>Select cost center</p>
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
                      <CreditCard size={12} />
                      Company Expense
                    </button>
                    <button
                      type="button"
                      className={`tr-toggle ${form.budget_type === "project" ? "active" : ""}`}
                      onClick={() => set("budget_type", "project")}
                    >
                      <Briefcase size={12} />
                      Project Budget
                    </button>
                  </div>
                </div>

                {form.budget_type === "project" && (
                  <div className="tr-field tr-field-animate">
                    <label>Project <span className="req">*</span></label>
                    <div className="tr-select-wrap">
                      <select
                        value={form.project_id}
                        onChange={(e) => set("project_id", e.target.value)}
                      >
                        <option value="">{loadingProjects ? "Loading projects…" : "Select a project"}</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="tr-select-chevron" />
                    </div>
                  </div>
                )}
              </section>

              {/* Payment */}
              <section className="tr-section">
                <div className="tr-section-head">
                  <div className="tr-section-icon"><Wallet size={13} /></div>
                  <div>
                    <h3>Payment</h3>
                    <p>Who covers the cost?</p>
                  </div>
                </div>

                <div className="tr-field">
                  <label>Payment Mode</label>
                  <div className="tr-toggle-group">
                    <button
                      type="button"
                      className={`tr-toggle ${form.payment_mode === "company" ? "active" : ""}`}
                      onClick={() => { set("payment_mode", "company"); setReceipts([]); }}
                    >
                      <Building2 size={12} />
                      Company Paid
                    </button>
                    <button
                      type="button"
                      className={`tr-toggle ${form.payment_mode === "self" ? "active" : ""}`}
                      onClick={() => set("payment_mode", "self")}
                    >
                      <User size={12} />
                      Self Paid
                    </button>
                  </div>
                </div>

                

                {isSelfPaid && (
                  <div className="tr-field-animate" style={{ marginTop: 12 }}>
                    <label className="tr-receipts-label">Receipts <span className="req">*</span></label>
                    <UploadZone files={receipts} onAdd={addFiles} onRemove={removeFile} />
                  </div>
                )}
              </section>

              {/* Notes */}
              <section className="tr-section">
                <div className="tr-section-head">
                  <div className="tr-section-icon"><StickyNote size={13} /></div>
                  <div>
                    <h3>Additional Notes</h3>
                    <p>Optional context for approvers</p>
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

            {/* Bottom actions */}
            <div className="tr-form-actions" style={{ marginTop: 24 }}>
              <button type="button" className="tr-btn-reset" onClick={resetForm}>
                Reset
              </button>
              <button
                type="button"
                className="tr-btn-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : <><Send size={13} /> Submit Request</>}
              </button>
            </div>
          </div>

          {/* RIGHT — Sticky live preview panel */}
          <div className="tr-preview-panel">
            <div className="tr-preview-panel-header">
              <h3>Preview</h3>
            </div>
            <div className="tr-preview-panel-body">
              <LivePreview
                form={form}
                userName={userName}
                userRole={userRole}
                userDept={userDept}
                userIsHR={userIsHR}
              />
            </div>
          </div>

        </div>
      )}

      {/* ── History View ── */}
      {view === "history" && (
        <div className="tr-history-view">
          <div className="tr-history-header-row">
            <button className="tr-back-btn" onClick={() => setView("form")}>
              <ArrowLeft size={13} /> New Request
            </button>
            {history.length > 0 && (
              <span className="tr-history-count">{history.length} request{history.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loadingHistory ? (
            <div className="tr-loading">
              <Clock size={26} className="tr-spin-slow" strokeWidth={1.4} />
              <p>Loading your travel history…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="tr-empty">
              <Plane size={30} strokeWidth={1.4} />
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