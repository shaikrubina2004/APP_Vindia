import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getManagerUpdates, getManagerTodayStatus, reviewFinanceUpdate, reviewManagerReport,
  inr, cap, fmtDate, timeAgo,
} from "../../services/ceoService";
import "./CEOTheme.css";
import "./ManagerUpdates.css";

const ROLES = [
  ["", "All managers"], ["project_manager", "Project Manager"], ["hr_manager", "HR Manager"],
  ["finance_manager", "Finance Manager"], ["operations_manager", "Operations Manager"],
  ["bd_manager", "BD Manager"], ["bda", "Business Dev. Analyst"],
];
const STATUSES = [["", "Any status"], ["pending", "Pending review"], ["approved", "Approved"], ["reviewed", "Reviewed"], ["needs_changes", "Needs changes"], ["rejected", "Rejected"]];
const SOURCE_LABEL = { report: "Daily report", finance: "Finance update", project: "Site update" };
const initials = (n = "") => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

function UpdateCard({ u, onDone }) {
  const [open, setOpen] = useState(u.status === "pending");
  const [note, setNote] = useState(u.ceoComment || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const act = async (status) => {
    setBusy(true); setErr(null);
    try {
      if (u.source === "finance") await reviewFinanceUpdate(u.id, status, note);
      else await reviewManagerReport(u.id, status, note);
      onDone();
    } catch (e) { setErr(e.response?.data?.message || "Could not save."); }
    finally { setBusy(false); }
  };

  return (
    <div className={`mu-card ${u.health}`}>
      <div className="mu-top" onClick={() => setOpen((o) => !o)}>
        <div className="mu-avatar">{initials(u.manager)}</div>
        <div className="mu-main">
          <h4>{u.title}</h4>
          <div className="mu-meta">{u.manager} · {u.roleLabel} · {fmtDate(u.date)}</div>
        </div>
        <span className="ceo-badge info">{SOURCE_LABEL[u.source]}</span>
        <span className={`ceo-badge ${u.health}`}>{cap(u.health)}</span>
        <span className={`ceo-badge ${u.status}`}>{cap(u.status)}</span>
      </div>

      {open && (
        <div className="mu-body">
          {u.summary && <div className="mu-sec"><b>Summary</b><p>{u.summary}</p></div>}
          {u.metrics && (
            <div className="mu-metrics">
              {Object.entries(u.metrics).map(([k, v]) => (
                <div key={k}><span>{k}</span><b>{/cash|collect|expens/i.test(k) ? inr(v) : v}</b></div>
              ))}
            </div>
          )}
          {u.highlights && <div className="mu-sec good"><b>Highlights</b><p>{u.highlights}</p></div>}
          {u.issues && <div className="mu-sec risk"><b>Issues / risks</b><p>{u.issues}</p></div>}
          {u.nextSteps && <div className="mu-sec"><b>Next steps</b><p>{u.nextSteps}</p></div>}
          {u.ceoComment && u.status !== "pending" && <div className="mu-sec"><b>Your comment</b><p>{u.ceoComment}</p></div>}

          {u.reviewable ? (
            <div className="mu-review">
              <textarea className="ceo-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a comment (optional)…" />
              <div className="mu-actions">
                {u.source === "finance" ? (
                  <>
                    <button className="ceo-btn ok" disabled={busy} onClick={() => act("approved")}>✓ Approve</button>
                    <button className="ceo-btn bad" disabled={busy} onClick={() => act("rejected")}>✕ Reject</button>
                  </>
                ) : (
                  <>
                    <button className="ceo-btn ok" disabled={busy} onClick={() => act("reviewed")}>✓ Mark reviewed</button>
                    <button className="ceo-btn warn" disabled={busy} onClick={() => act("needs_changes")}>↺ Request changes</button>
                  </>
                )}
              </div>
              {err && <div className="ceo-msg err">{err}</div>}
            </div>
          ) : <div className="ceo-sub">Site updates are approved by the Project Coordinator flow — read-only here.</div>}
        </div>
      )}
    </div>
  );
}

export default function ManagerUpdates() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const role = params.get("role") || "";
  const status = params.get("status") || "";
  const [days, setDays] = useState(14);

  const [feed, setFeed] = useState(null);
  const [today, setToday] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const setFilter = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [f, t] = await Promise.all([getManagerUpdates({ days, role, status }), getManagerTodayStatus()]);
      setFeed(f); setToday(t); setError(null);
    } catch { setError("Could not load manager updates."); }
    finally { setBusy(false); }
  }, [days, role, status]);

  useEffect(() => { load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, [load]);

  const done = today.filter((m) => m.submittedToday).length;

  return (
    <div className="ceo-page">
      <div className="ceo-hero">
        <div><h1>Manager Daily Updates</h1><p>Every manager's daily update in one place.</p></div>
        <div className="ceo-hero-actions">
          <button className="ceo-btn ghost" onClick={() => navigate("/reports")}>All reports →</button>
          <button className="ceo-btn ghost" onClick={load} disabled={busy}>{busy ? "Refreshing…" : "↻ Refresh"}</button>
        </div>
      </div>

      <div className="ceo-card">
        <div className="ceo-card-head">
          <div><h3>Today's submissions</h3><div className="ceo-sub">{done} of {today.length} managers have reported today</div></div>
        </div>
        <div className="ceo-bar" style={{ marginBottom: 14 }}><i className="ok" style={{ width: `${today.length ? (done / today.length) * 100 : 0}%` }} /></div>
        {today.length === 0 ? <div className="ceo-empty">No manager accounts found.</div> : (
          <div className="mu-strip">
            {today.map((m) => (
              <button key={m.id} type="button" className={`mu-pill ${m.submittedToday ? "done" : ""}`} onClick={() => setFilter("role", role === m.role ? "" : m.role)}>
                <span className="mu-dot" />{m.name}<small>{m.roleLabel}</small>
                <em>{m.submittedToday ? (m.lastSubmittedAt ? timeAgo(m.lastSubmittedAt) : "✓") : "Pending"}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ceo-toolbar mu-filters">
        <select className="ceo-select" value={role} onChange={(e) => setFilter("role", e.target.value)}>
          {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="ceo-select" value={status} onChange={(e) => setFilter("status", e.target.value)}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="ceo-chips">
          {[7, 14, 30].map((n) => <button key={n} className={`ceo-chip ${days === n ? "active" : ""}`} onClick={() => setDays(n)}>{n} days</button>)}
        </div>
        {feed && <span className="ceo-sub" style={{ margin: 0 }}>{feed.counts.total} updates · {feed.counts.pending} pending · {feed.counts.attention} need attention</span>}
      </div>

      {error && <div className="ceo-msg err">{error}</div>}
      {!feed && !error ? <div className="ceo-skeleton" style={{ height: 160 }} />
        : feed && feed.items.length === 0 ? <div className="ceo-card"><div className="ceo-empty">📭 No manager updates for these filters.</div></div>
        : feed && feed.items.map((u) => <UpdateCard key={u.uid} u={u} onDone={load} />)}
    </div>
  );
}