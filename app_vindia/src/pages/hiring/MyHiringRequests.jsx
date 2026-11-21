// ===== FILE: APP_Vindia/app_vindia/src/pages/hiring/MyHiringRequests.jsx =====
// A manager's own hiring requests (route /hiring-requests): status, remarks, history.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import hiringRequestService from "../../services/hiringRequestService";
import {
  ACTION_LABELS,
  EMPLOYMENT_TYPES,
  formatDate,
  formatDateTime,
  formatSalaryRange,
  labelOf,
} from "./hiringConstants";
import { StatusBadge, Stepper } from "./hiringComponents";
import "./HiringRequests.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "progress", label: "In progress" },
  { key: "approved", label: "Approved" },
  { key: "closed", label: "Rejected / Cancelled" },
];

const matchesFilter = (status, key) => {
  if (key === "all") return true;
  if (key === "progress") return status === "pending_finance" || status === "pending_hr";
  if (key === "approved") return status === "approved";
  return status === "rejected" || status === "cancelled";
};

export default function MyHiringRequests() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState({}); // { [id]: [...] }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hiringRequestService.getMine();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load your hiring requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      progress: rows.filter((r) => matchesFilter(r.status, "progress")).length,
      approved: rows.filter((r) => r.status === "approved").length,
      closed: rows.filter((r) => matchesFilter(r.status, "closed")).length,
    }),
    [rows],
  );

  const visible = rows.filter((r) => matchesFilter(r.status, filter));

  const loadHistory = async (id) => {
    try {
      const res = await hiringRequestService.getOne(id);
      setHistory((h) => ({ ...h, [id]: res.data?.history || [] }));
    } catch {
      setHistory((h) => ({ ...h, [id]: [] }));
    }
  };

  const toggleHistory = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!history[id]) loadHistory(id);
  };

  const handleCancel = async (r) => {
    if (!window.confirm(`Cancel hiring request ${r.request_code}?`)) return;
    setBusyId(r.id);
    setError("");
    try {
      await hiringRequestService.cancel(r.id);
      await load();
      if (expandedId === r.id) loadHistory(r.id);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not cancel this request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="hr-req-page">
      <div className="hr-req-header">
        <div>
          <h1>My Hiring Requests</h1>
          <p>Track positions you asked to hire for. Finance approves the budget, then HR starts recruitment.</p>
        </div>
        <button
          type="button"
          className="hr-req-btn hr-req-btn--primary"
          onClick={() => navigate("/hiring-requests/new")}
        >
          + New Hiring Request
        </button>
      </div>

      {error && <div className="hr-req-alert hr-req-alert--error">{error}</div>}

      <div className="hr-req-stats">
        <div className="hr-req-stat">
          <strong>{counts.total}</strong>
          <span>Total requests</span>
        </div>
        <div className="hr-req-stat">
          <strong>{counts.progress}</strong>
          <span>In progress</span>
        </div>
        <div className="hr-req-stat">
          <strong>{counts.approved}</strong>
          <span>Approved</span>
        </div>
        <div className="hr-req-stat">
          <strong>{counts.closed}</strong>
          <span>Rejected / Cancelled</span>
        </div>
      </div>

      <div className="hr-req-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`hr-req-filter ${filter === f.key ? "hr-req-filter--active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="hr-req-empty">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="hr-req-empty">
          {rows.length === 0
            ? "You have not raised any hiring requests yet."
            : "No requests match this filter."}
        </div>
      ) : (
        <div className="hr-req-list">
          {visible.map((r) => {
            const canEdit = r.status === "rejected";
            const canCancel = ["pending_finance", "pending_hr", "rejected"].includes(r.status);
            return (
              <div className="hr-req-card" key={r.id}>
                <div className="hr-req-card-top">
                  <div>
                    <div className="hr-req-code">{r.request_code}</div>
                    <h3 className="hr-req-title">
                      {r.position_title} × {r.vacancies}
                    </h3>
                    <div className="hr-req-sub">
                      {r.department || "—"}
                      {r.project_name ? ` · ${r.project_name}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <Stepper request={r} />

                <div className="hr-req-meta">
                  <div>
                    <span>Employment</span>
                    <strong>{labelOf(EMPLOYMENT_TYPES, r.employment_type)}</strong>
                  </div>
                  <div>
                    <span>Urgency</span>
                    <strong className={r.urgency === "high" ? "hr-req-urgency--high" : ""}>
                      {r.urgency ? r.urgency[0].toUpperCase() + r.urgency.slice(1) : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Budget per position</span>
                    <strong>{formatSalaryRange(r.salary_min, r.salary_max)}</strong>
                  </div>
                  <div>
                    <span>Expected joining</span>
                    <strong>{formatDate(r.expected_joining_date)}</strong>
                  </div>
                  <div>
                    <span>Submitted</span>
                    <strong>{formatDate(r.created_at)}</strong>
                  </div>
                </div>

                <div className="hr-req-text-block">
                  <b>Justification</b>
                  {r.justification}
                </div>

                {r.finance_remark && (
                  <div
                    className={`hr-req-remark ${
                      r.status === "rejected" && !r.hr_reviewed_by
                        ? "hr-req-remark--rejected"
                        : "hr-req-remark--ok"
                    }`}
                  >
                    <b>Finance remark{r.finance_reviewer_name ? ` — ${r.finance_reviewer_name}` : ""}</b>
                    {r.finance_remark}
                  </div>
                )}
                {r.hr_remark && (
                  <div
                    className={`hr-req-remark ${
                      r.status === "rejected" ? "hr-req-remark--rejected" : "hr-req-remark--ok"
                    }`}
                  >
                    <b>HR remark{r.hr_reviewer_name ? ` — ${r.hr_reviewer_name}` : ""}</b>
                    {r.hr_remark}
                  </div>
                )}

                {r.status === "approved" && (
                  <div className="hr-req-remark hr-req-remark--ok">
                    Approved by Finance and HR. HR has opened this position for recruitment.
                  </div>
                )}

                <div className="hr-req-card-actions">
                  {canEdit && (
                    <button
                      type="button"
                      className="hr-req-btn hr-req-btn--primary hr-req-btn--sm"
                      onClick={() => navigate(`/hiring-requests/${r.id}/edit`)}
                    >
                      Edit & Resubmit
                    </button>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      className="hr-req-btn hr-req-btn--danger hr-req-btn--sm"
                      disabled={busyId === r.id}
                      onClick={() => handleCancel(r)}
                    >
                      {busyId === r.id ? "Cancelling…" : "Cancel request"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="hr-req-btn hr-req-btn--ghost hr-req-btn--sm"
                    onClick={() => toggleHistory(r.id)}
                  >
                    {expandedId === r.id ? "Hide history" : "View history"}
                  </button>
                </div>

                {expandedId === r.id && (
                  <div className="hr-req-history">
                    <h4>History</h4>
                    {!history[r.id] ? (
                      <div className="hr-req-hint">Loading…</div>
                    ) : history[r.id].length === 0 ? (
                      <div className="hr-req-hint">No history yet.</div>
                    ) : (
                      <ul>
                        {history[r.id].map((h) => (
                          <li key={h.id}>
                            {ACTION_LABELS[h.action] || h.action}
                            {h.actor_name ? ` — ${h.actor_name}` : ""}
                            {h.remark ? `: "${h.remark}"` : ""}
                            <small>{formatDateTime(h.created_at)}</small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}