// ===== FILE: APP_Vindia/app_vindia/src/pages/hiring/HiringReviewQueue.jsx =====
// The approver's page. One component, two stages:
//   <HiringReviewQueue stage="hr" />       -> HR Manager  (/hr/hiring-requests)
//   <HiringReviewQueue stage="finance" />  -> Finance Manager (added in the next component)
// The backend decides who may approve (can_decide); this page only shows it.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import hiringRequestService from "../../services/hiringRequestService";
import {
  ACTION_LABELS,
  EMPLOYMENT_TYPES,
  formatDate,
  formatDateTime,
  formatRoleName,
  formatSalaryRange,
  labelOf,
} from "./hiringConstants";
import { StatusBadge, Stepper } from "./hiringComponents";
import "./HiringRequests.css";

const STAGES = {
  hr: {
    title: "Hiring Requests",
    subtitle:
      "Review hiring requests that Finance has approved. Approving opens the position in Recruitment.",
    pendingStatus: "pending_hr",
    load: () => hiringRequestService.getHrQueue(),
    decide: (id, decision, remark) => hiringRequestService.hrDecision(id, decision, remark),
    approveLabel: "Approve & open position",
    approveHint: "Approving creates a Job Opening in Recruitment for this position.",
    emptyPending: "No hiring requests are waiting for HR.",
  },
  finance: {
    title: "Hiring Requests",
    subtitle:
      "Review the budget for hiring requests raised by managers. Approving sends the request to HR.",
    pendingStatus: "pending_finance",
    load: () => hiringRequestService.getFinanceQueue(),
    decide: (id, decision, remark) => hiringRequestService.financeDecision(id, decision, remark),
    approveLabel: "Approve budget",
    approveHint: "Approving sends this request to HR.",
    emptyPending: "No hiring requests are waiting for Finance.",
  },
};

export default function HiringReviewQueue({ stage = "hr" }) {
  const cfg = STAGES[stage] || STAGES.hr;
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState("pending");
  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState({});
  const [decision, setDecision] = useState(null); // { id, type: "approve" | "reject" }
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await cfg.load();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load hiring requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cfg]);

  useEffect(() => {
    load();
  }, [load]);

  const isPending = useCallback((r) => r.status === cfg.pendingStatus, [cfg]);

  const counts = useMemo(
    () => ({
      pending: rows.filter(isPending).length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows, isPending],
  );

  const visible = rows.filter((r) => {
    if (tab === "pending") return isPending(r);
    if (tab === "reviewed") return !isPending(r);
    return true;
  });

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

  const openDecision = (id, type) => {
    setDecision({ id, type });
    setRemark("");
    setError("");
    setSuccess("");
  };

  const closeDecision = () => {
    setDecision(null);
    setRemark("");
  };

  const submitDecision = async (r) => {
    if (!decision) return;
    if (decision.type === "reject" && !remark.trim()) {
      setError("A remark is required when rejecting a request.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await cfg.decide(r.id, decision.type, remark.trim());
      setSuccess(
        decision.type === "approve"
          ? `${r.request_code} approved.${stage === "hr" ? " The position is now open in Recruitment." : " It is now with HR."}`
          : `${r.request_code} rejected. The requester has been notified.`,
      );
      closeDecision();
      setHistory((h) => {
        const next = { ...h };
        delete next[r.id]; // force a fresh history fetch
        return next;
      });
      await load();
      if (expandedId === r.id) loadHistory(r.id);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save your decision. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const whyCannotDecide = (r) => {
    if (stage === "hr" && r.requester_role === "hr_manager") {
      return "This request was raised by an HR Manager, so only the CEO can approve it.";
    }
    return "You cannot decide this request.";
  };

  return (
    <div className="hr-req-page">
      <div className="hr-req-header">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.subtitle}</p>
        </div>
      </div>

      {error && <div className="hr-req-alert hr-req-alert--error">{error}</div>}
      {success && <div className="hr-req-alert hr-req-alert--info">{success}</div>}

      <div className="hr-req-stats">
        <div className="hr-req-stat">
          <strong>{counts.pending}</strong>
          <span>Waiting for your decision</span>
        </div>
        <div className="hr-req-stat">
          <strong>{counts.approved}</strong>
          <span>Fully approved</span>
        </div>
        <div className="hr-req-stat">
          <strong>{counts.rejected}</strong>
          <span>Rejected</span>
        </div>
        <div className="hr-req-stat">
          <strong>{rows.length}</strong>
          <span>Total in this list</span>
        </div>
      </div>

      <div className="hr-req-filters">
        {[
          { key: "pending", label: "Waiting for review" },
          { key: "reviewed", label: "Already reviewed" },
          { key: "all", label: "All" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`hr-req-filter ${tab === t.key ? "hr-req-filter--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="hr-req-empty">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="hr-req-empty">
          {tab === "pending" ? cfg.emptyPending : "Nothing to show here."}
        </div>
      ) : (
        <div className="hr-req-list">
          {visible.map((r) => {
            const deciding = decision && decision.id === r.id;
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
                    <span>Requested by</span>
                    <strong>
                      {r.requester_name || "—"} ({formatRoleName(r.requester_role)})
                    </strong>
                  </div>
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
                {r.job_description && (
                  <div className="hr-req-text-block">
                    <b>Job description / requirements</b>
                    {r.job_description}
                  </div>
                )}

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

                {isPending(r) && !r.can_decide && (
                  <div className="hr-req-alert hr-req-alert--warn">{whyCannotDecide(r)}</div>
                )}

                {deciding && (
                  <div className="hr-req-form" style={{ marginBottom: 12 }}>
                    <div className="hr-req-field">
                      <label>
                        {decision.type === "approve" ? "Remark (optional)" : "Reason for rejection"}
                        {decision.type === "reject" && <span className="hr-req-required"> *</span>}
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder={
                          decision.type === "approve"
                            ? "Add a note for the requester (optional)"
                            : "Tell the requester why this was rejected"
                        }
                      />
                      {decision.type === "approve" && (
                        <span className="hr-req-hint">{cfg.approveHint}</span>
                      )}
                    </div>
                    <div className="hr-req-form-actions">
                      <button
                        type="button"
                        className="hr-req-btn hr-req-btn--ghost hr-req-btn--sm"
                        onClick={closeDecision}
                        disabled={busy}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className={`hr-req-btn hr-req-btn--sm ${
                          decision.type === "approve" ? "hr-req-btn--success" : "hr-req-btn--danger"
                        }`}
                        onClick={() => submitDecision(r)}
                        disabled={busy}
                      >
                        {busy
                          ? "Saving…"
                          : decision.type === "approve"
                            ? `Confirm: ${cfg.approveLabel}`
                            : "Confirm rejection"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="hr-req-card-actions">
                  {isPending(r) && r.can_decide && !deciding && (
                    <>
                      <button
                        type="button"
                        className="hr-req-btn hr-req-btn--success hr-req-btn--sm"
                        onClick={() => openDecision(r.id, "approve")}
                      >
                        {cfg.approveLabel}
                      </button>
                      <button
                        type="button"
                        className="hr-req-btn hr-req-btn--danger hr-req-btn--sm"
                        onClick={() => openDecision(r.id, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {stage === "hr" && r.status === "approved" && r.job_opening_id && (
                    <button
                      type="button"
                      className="hr-req-btn hr-req-btn--primary hr-req-btn--sm"
                      onClick={() => navigate(`/hr/recruitment/job-openings/${r.job_opening_id}`)}
                    >
                      View job opening
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