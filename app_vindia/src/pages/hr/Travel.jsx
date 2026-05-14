import React, { useState, useEffect, useContext } from "react";
import "./Travel.css";
import {
  Plane,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Briefcase,
  CreditCard,
  Building2,
  User,
  MapPin,
  Navigation,
  MoveRight,
  CalendarDays,
  FileText,
  ChevronDown,
  X,
  AlertCircle,
  Wallet,
  BadgeCheck,
  Hotel,
  UtensilsCrossed,
  Train,
  Plus,
  Trash2,
  IndianRupee,
  Eye,
  ExternalLink,
} from "lucide-react";
import { API } from "../../services/authService";
import { AuthContext } from "../../context/useAuth";

// ── Status helpers ────────────────────────────────────────────────────────────
const statusMeta = {
  Approved:    { icon: <CheckCircle size={12} />, cls: "approved" },
  Rejected:    { icon: <XCircle size={12} />,     cls: "rejected" },
  Cancelled:   { icon: <XCircle size={12} />,     cls: "rejected" },
  Pending:     { icon: <Clock size={12} />,        cls: "pending"  },
};
const getStatusMeta = (s) => statusMeta[s] || statusMeta.Pending;

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "pending_hr",  label: "Awaiting HR",  desc: "PM approved, needs your action" },
  { key: "all",         label: "All Requests",  desc: "Every request in the system"   },
];

// ── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ request, onClose, onAction }) => {
  const [note, setNote]         = useState("");
  const [acting, setActing]     = useState(false);
  const [confirm, setConfirm]   = useState(null); // "Approved" | "Rejected"

  const handle = async (status) => {
    setActing(true);
    await onAction(request.id, status, note);
    setActing(false);
    onClose();
  };

  const fromDate = request.travel_from_date
    ? new Date(request.travel_from_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const toDate = request.travel_to_date
    ? new Date(request.travel_to_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const canAct = request.status === "Pending" && request.pm_status === "Approved";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-head">
          <div>
            <h3>{request.trip_title || request.destination}</h3>
            <p>{request.request_no} · Submitted {new Date(request.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">

          {/* Employee */}
          <div className="modal-section">
            <div className="section-label">Employee</div>
            <div className="employee-row">
              <div className="avatar-lg">{(request.employee_name || "?").charAt(0).toUpperCase()}</div>
              <div>
                <div className="name">{request.employee_name}</div>
                <div className="dept">{request.designation} · {request.department}</div>
              </div>
            </div>
          </div>

          {/* Route + Dates */}
          <div className="modal-section">
            <div className="section-label">Trip Details</div>
            <div className="modal-route">
              <span><Navigation size={11} /> {request.origin || "—"}</span>
              <MoveRight size={13} />
              <span><MapPin size={11} /> {request.destination}</span>
            </div>
            <div className="modal-dates">
              <CalendarDays size={12} /> {fromDate} → {toDate}
            </div>
            {request.purpose && (
              <p className="modal-purpose">{request.purpose}</p>
            )}
          </div>

          {/* Budget + Payment */}
          <div className="modal-section modal-grid-2">
            <div>
              <div className="section-label">Budget Type</div>
              <div className="type-tabs">
                <div className={`type-tab ${request.budget_type === "company" ? "active company" : ""}`}>
                  <CreditCard size={13} /> Company
                </div>
                <div className={`type-tab ${request.budget_type === "project" ? "active project" : ""}`}>
                  <Briefcase size={13} /> {request.project_name || "Project"}
                </div>
              </div>
            </div>
            <div>
              <div className="section-label">Payment Mode</div>
              <div className={`payment-mode-banner ${request.payment_mode === "self" ? "mode-self" : "mode-hr"}`}>
                {request.payment_mode === "self"
                  ? <><Wallet size={13} /> Self-paid (reimburse)</>
                  : <><Building2 size={13} /> Company pays</>}
              </div>
            </div>
          </div>

          {/* PM approval badge */}
          <div className="modal-section">
            <div className="section-label">Approval Status</div>
            <div className="approval-trail">
              <div className={`trail-step ${request.pm_status === "Approved" ? "done" : request.pm_status === "Rejected" ? "rejected" : ""}`}>
                <BadgeCheck size={14} />
                <span>PM Review</span>
                <strong>{request.pm_status || "Pending"}</strong>
              </div>
              <div className="trail-arrow">→</div>
              <div className={`trail-step ${request.status === "Approved" ? "done" : request.status === "Rejected" ? "rejected" : ""}`}>
                <Building2 size={14} />
                <span>HR Decision</span>
                <strong>{request.status === "Pending" ? "Awaiting" : request.status}</strong>
              </div>
            </div>
          </div>

          {/* Notes from employee */}
          {request.notes && (
            <div className="modal-section">
              <div className="section-label">Employee Notes</div>
              <p className="modal-purpose">{request.notes}</p>
            </div>
          )}

          {/* Receipts */}
          {request.receipts && request.receipts.length > 0 && (
            <div className="modal-section">
              <div className="section-label">Receipts ({request.receipts.length})</div>
              <div className="receipts-list">
                {request.receipts.map((r, i) => (
                  <div key={i} className="receipt-item">
                    <FileText size={13} />
                    <span className="receipt-name">{r.file_name}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{r.file_size_kb} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HR Action — only if pending and PM-approved */}
          {canAct && (
            <div className="modal-section">
              <div className="section-label">HR Decision</div>
              <textarea
                className="hr-note-input"
                rows={2}
                placeholder="Add a note (optional)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {canAct && !confirm && (
            <div className="action-group">
              <button className="btn-primary" onClick={() => setConfirm("Approved")} disabled={acting}>
                <CheckCircle size={13} /> Approve
              </button>
              <button className="btn-danger" onClick={() => setConfirm("Rejected")} disabled={acting}>
                <XCircle size={13} /> Reject
              </button>
            </div>
          )}
          {canAct && confirm && (
            <div className="action-group">
              <span className="confirm-text">
                <AlertCircle size={13} /> Confirm {confirm}?
              </span>
              <button
                className={confirm === "Approved" ? "btn-primary" : "btn-danger"}
                onClick={() => handle(confirm)}
                disabled={acting}
              >
                {acting ? "Saving…" : "Yes, confirm"}
              </button>
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          )}
          {!canAct && (
            <span className={`status-lg ${getStatusMeta(request.status).cls}`}>
              {getStatusMeta(request.status).icon}
              {request.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Request Card ──────────────────────────────────────────────────────────────
const RequestCard = ({ req, onOpen, highlight }) => {
  const meta     = getStatusMeta(req.status);
  const fromDate = req.travel_from_date
    ? new Date(req.travel_from_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "—";
  const toDate   = req.travel_to_date
    ? new Date(req.travel_to_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "—";

  return (
    <div
      className={`request-card ${highlight ? "card-highlight" : "card-light"}`}
      onClick={() => onOpen(req)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(req)}
    >
      {highlight && <div className="card-badge-action">Action Required</div>}

      <div className="card-top">
        <Plane size={15} />
        <span className={`status ${meta.cls}`}>
          {meta.icon} {req.status}
        </span>
      </div>

      <h3 className="card-trip">{req.trip_title || req.destination}</h3>

      <div className="card-route">
        <span><Navigation size={10} /> {req.origin || "—"}</span>
        <MoveRight size={10} />
        <span><MapPin size={10} /> {req.destination}</span>
      </div>

      <div className="card-dates">
        <CalendarDays size={11} /> {fromDate} → {toDate}
      </div>

      <div className="card-employee">
        <div className="avatar">{(req.employee_name || "?").charAt(0).toUpperCase()}</div>
        <div>
          <h4>{req.employee_name}</h4>
          <p>{req.designation}</p>
        </div>
      </div>

      <div className="card-footer">
        <div className="card-pills">
          <span className={`budget-pill ${req.budget_type === "project" ? "pill-project" : "pill-company"}`}>
            {req.budget_type === "project" ? <><Briefcase size={9} /> Project</> : <><CreditCard size={9} /> Company</>}
          </span>
          <span className={`budget-pill ${req.payment_mode === "self" ? "pill-self" : "pill-hr"}`}>
            {req.payment_mode === "self" ? <><Wallet size={9} /> Self-paid</> : <><Building2 size={9} /> Requested</>}
          </span>
        </div>
        <span className="card-no">{req.request_no}</span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const TravelExpenseDashboard = () => {
  const { user } = useContext(AuthContext);

  const [tab, setTab]               = useState("pending_hr");
  const [allRequests, setAll]       = useState([]);
  const [pmApproved, setPmApproved] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);
  const [toast, setToast]           = useState(null);

  // fetch on mount
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allRes, pmRes] = await Promise.all([
        API.get("/travel-expenses"),
        API.get("/travel-expenses?role=hr_manager"),
      ]);
      setAll(allRes.data || []);
      setPmApproved(pmRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to load travel requests.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (id, status, note) => {
    try {
      await API.put(`/travel-expenses/${id}/status`, {
        status,
        reviewed_by: user?.id,
        review_note: note || null,
        reviewer_role: "hr_manager",
      });
      showToast("success", `Request ${status.toLowerCase()} successfully.`);
      fetchAll(); // refresh
    } catch (err) {
      const msg = err.response?.data?.message || "Action failed.";
      showToast("error", msg);
      throw err; // let modal know
    }
  };

  // derived
  const displayList = tab === "pending_hr" ? pmApproved : allRequests;

  const filtered = displayList.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.employee_name || "").toLowerCase().includes(q) ||
      (r.trip_title || "").toLowerCase().includes(q) ||
      (r.destination || "").toLowerCase().includes(q) ||
      (r.request_no || "").toLowerCase().includes(q)
    );
  });

  const stats = [
    { label: "Total",           value: allRequests.length },
    { label: "Awaiting HR",     value: pmApproved.length },
    { label: "Approved",        value: allRequests.filter((r) => r.status === "Approved").length },
    { label: "Rejected",        value: allRequests.filter((r) => r.status === "Rejected").length },
  ];

  return (
    <div className="travel-expense-dashboard dashboard-container">

      {/* Toast */}
      {toast && (
        <div className={`tr-toast tr-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="top-bar">
        <div>
          <h1>Travel Expense Requests</h1>
          <p>Review and approve employee travel requests</p>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by name, destination, request no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span>{s.label}</span>
            <h2>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tv-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tv-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "pending_hr" && pmApproved.length > 0 && (
              <span className="tv-tab-badge">{pmApproved.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="tr-loading">
          <Clock size={28} strokeWidth={1.4} />
          <p>Loading requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tr-empty">
          <Plane size={32} strokeWidth={1.4} />
          <p>{tab === "pending_hr" ? "No requests awaiting HR approval." : "No requests found."}</p>
        </div>
      ) : (
        <div className="requests-grid">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              req={r}
              onOpen={setSelected}
              highlight={tab === "pending_hr"}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <DetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
};

export default TravelExpenseDashboard;