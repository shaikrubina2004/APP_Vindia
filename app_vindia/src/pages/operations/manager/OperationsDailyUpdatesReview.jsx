// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/manager/OperationsDailyUpdatesReview.jsx =====
// Operations Manager inbox: daily updates from Inventory Controller and
// Logistics Coordinator. Approve, or send back with a note.

import React, { useEffect, useState } from "react";
import opsDailyUpdateService from "../../../services/opsDailyUpdateService";
import { ROLE_CONFIG, REVIEW_STATUS } from "../shared/opsDailyUpdateConfig";
import "../../Project Coordinator/DailyUpdates.css";
import "../shared/OpsDailyUpdate.css";

const STATUS_FILTERS = [
  { value: "pending",  label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Needs Changes" },
  { value: "all",      label: "All" },
];

const ROLE_FILTERS = [
  { value: "all",                   label: "All roles" },
  { value: "inventory_controller",  label: "Inventory" },
  { value: "logistics_coordinator", label: "Logistics" },
  { value: "office_administrator",  label: "Office Admin" },
];

const parseDay = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const DetailBlock = ({ label, val }) => (
  <div className="du-detail-block">
    <p className="du-detail-label">{label}</p>
    <p className="du-detail-val">{val || "—"}</p>
  </div>
);

export default function OperationsDailyUpdatesReview() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpanded] = useState(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await opsDailyUpdateService.getAllUpdates({
        status: statusFilter,
        role_code: roleFilter,
      });
      setUpdates(res.data?.data || []);
    } catch (err) {
      console.error("LOAD REVIEW ERROR:", err);
      showToast("error", err.response?.data?.message || "Could not load daily updates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, roleFilter]);

  const review = async (id, status) => {
    if (status === "rejected" && !note.trim()) {
      showToast("error", "Please add a note explaining what needs to change.");
      return;
    }
    try {
      setBusyId(id);
      await opsDailyUpdateService.reviewUpdate(id, { status, note: note.trim() });
      showToast("success", status === "approved" ? "Update approved." : "Sent back for changes.");
      setNote("");
      setExpanded(null);
      await load();
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.message || "Review failed — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="du-page">
      {toast && (
        <div className={`du-toast du-toast--${toast.type}`}>
          <span className="du-toast__msg">{toast.msg}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div className="du-header">
        <div>
          <h1 className="du-title">Team Daily Updates</h1>
          <p className="du-subtitle">Inventory &amp; Logistics</p>
        </div>
      </div>

      <div className="opsr-filters">
        <div className="opsr-chip-group">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`opsr-chip ${statusFilter === f.value ? "active" : ""}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="opsr-sep" />
        <div className="opsr-chip-group">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`opsr-chip ${roleFilter === f.value ? "active" : ""}`}
              onClick={() => setRoleFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="du-empty"><p>Loading…</p></div>}
      {!loading && updates.length === 0 && (
        <div className="du-empty"><p>No daily updates here.</p></div>
      )}

      <div className="du-log-list">
        {updates.map((log) => {
          const cfg = ROLE_CONFIG[log.role_code];
          const sc = REVIEW_STATUS[log.status] || REVIEW_STATUS.pending;
          const isOpen = expandedId === log.id;
          const d = parseDay(log.date_str || log.date);

          return (
            <div key={log.id} className={`du-log-item ${isOpen ? "open" : ""}`}>
              <div
                className="du-log-item__header"
                onClick={() => {
                  setExpanded(isOpen ? null : log.id);
                  setNote("");
                }}
              >
                <div className="du-log-item__left">
                  <div className="du-log-item__dot" style={{ background: sc.border }} />
                  <div>
                    <div className="du-log-item__top-row">
                      <p className="du-log-item__day">
                        {log.submitter_name || `User #${log.submitted_by}`}
                        <span className="du-log-item__date">
                          {" · "}
                          {d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </p>
                      <span className={`opsr-role-tag opsr-role-tag--${log.role_code}`}>
                        {cfg?.roleLabel || log.role_code}
                      </span>
                    </div>
                    <p className="du-log-item__preview">
                      {log.work?.length > 90 ? log.work.slice(0, 90) + "…" : log.work}
                    </p>
                  </div>
                </div>
                <div className="du-log-item__right">
                  <span
                    className="du-status-pill"
                    style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}
                  >
                    {sc.label}
                  </span>
                  <span className="du-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div className="du-log-item__body">
                  <div className="du-log-grid">
                    <DetailBlock label="Work Done" val={log.work} />
                    <DetailBlock label="Status" val={log.overall_status} />
                    <DetailBlock label="Issues" val={log.issues} />
                    <DetailBlock label="Pending / Need" val={log.pending} />
                    <DetailBlock label="Tomorrow's Plan" val={log.next_plan} />
                  </div>

                  {log.status === "pending" ? (
                    <div className="opsr-review-box">
                      <label className="du-label">
                        Note <span className="du-field-hint-inline">— required if sending back</span>
                      </label>
                      <textarea
                        className="du-textarea"
                        rows={2}
                        placeholder="e.g. Please add the GRN numbers."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="opsr-review-actions">
                        <button
                          className="opsr-btn opsr-btn--approve"
                          disabled={busyId === log.id}
                          onClick={() => review(log.id, "approved")}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="opsr-btn opsr-btn--reject"
                          disabled={busyId === log.id}
                          onClick={() => review(log.id, "rejected")}
                        >
                          Send Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="opsr-reviewed">
                      {sc.label}
                      {log.reviewer_name ? ` by ${log.reviewer_name}` : ""}
                      {log.review_note ? ` — “${log.review_note}”` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}