import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../services/authService";
import {
  getManagerUpdates, getManagerTodayStatus, reviewFinanceUpdate, reviewManagerReport,
  inr, cap, fmtDate, fmtDateTime, timeAgo,
} from "../../services/ceoService";
import "./CEOBase.css";
import "./ReportsInbox.css";

/* One "Reports" page for the CEO:
     Daily updates  – every manager's daily update + who has reported today
     Other reports  – weekly / monthly / incident / other reports from managers */

const ROLES = [
  ["", "All managers"], ["project_manager", "Project Manager"], ["hr_manager", "HR Manager"],
  ["finance_manager", "Finance Manager"], ["operations_manager", "Operations Manager"], ["bda", "Business Development"],
];
const ROLE_LABEL = Object.fromEntries(ROLES.filter(([v]) => v));
const STATUSES = [["", "Any status"], ["pending", "Awaiting review"], ["reviewed", "Reviewed"], ["approved", "Approved"], ["needs_changes", "Needs changes"], ["rejected", "Rejected"]];
const SOURCE = { report: "Daily report", finance: "Finance update", project: "Site update" };
const STATUS_TEXT = { pending: "Awaiting review", submitted: "Awaiting review", reviewed: "Reviewed", approved: "Approved", needs_changes: "Needs changes", rejected: "Rejected" };
const STATUS_TONE = { pending: "warn", submitted: "warn", reviewed: "ok", approved: "ok", needs_changes: "bad", rejected: "bad" };

function Sec({ label, text, risk }) {
  return text ? <div className={`rp-sec ${risk ? "risk" : ""}`}><b>{label}</b><p>{text}</p></div> : null;
}

/* ── One expandable item (used by both tabs) ── */
function Item({ it, onDone }) {
  const [open, setOpen] = useState(it.status === "pending");
  const [note, setNote] = useState(it.ceoComment || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const act = async (status) => {
    setBusy(true); setErr(null);
    try {
      if (it.source === "finance") await reviewFinanceUpdate(it.id, status, note);
      else await reviewManagerReport(it.id, status, note);
      onDone();
    } catch (e) { setErr(e.response?.data?.message || "Could not save."); }
    finally { setBusy(false); }
  };

  return (
    <div className={`rp-item ${open ? "open" : ""}`}>
      <div className="rp-top" onClick={() => setOpen((o) => !o)}>
        <div className="rp-main">
          <h4>{it.title}</h4>
          <div className="rp-meta">{it.manager} · {it.roleLabel} · {it.tag === "time" ? fmtDateTime(it.date) : fmtDate(it.date)}</div>
        </div>
        {it.tag && it.tag !== "time" && <span className="rp-tag">{it.tag}</span>}
        {it.health && it.health !== "on-track" && <span className={`cx-status ${it.health === "attention" ? "warn" : "bad"}`}>{cap(it.health)}</span>}
        <span className={`cx-status ${STATUS_TONE[it.status] || ""}`}>{STATUS_TEXT[it.status] || cap(it.status)}</span>
      </div>

      {open && (
        <div className="rp-body">
          <Sec label="Summary" text={it.summary} />
          {it.metrics && (
            <div className="rp-metrics">
              {Object.entries(it.metrics).map(([k, v]) => <div key={k}><span>{k}</span><b>{/cash|collect|expens/i.test(k) ? inr(v) : v}</b></div>)}
            </div>
          )}
          <Sec label="Highlights" text={it.highlights} />
          <Sec label="Issues / risks" text={it.issues} risk />
          <Sec label="Next steps" text={it.nextSteps} />
          {it.ceoComment && it.status !== "pending" && it.status !== "submitted" && <Sec label="Your comment" text={it.ceoComment} />}

          {it.reviewable ? (
            <div className="rp-review">
              <textarea className="cx-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a comment (optional)" />
              <div className="row">
                {it.source === "finance" ? (
                  <><button className="cx-btn" disabled={busy} onClick={() => act("approved")}>Approve</button>
                    <button className="cx-btn danger" disabled={busy} onClick={() => act("rejected")}>Reject</button></>
                ) : (
                  <><button className="cx-btn" disabled={busy} onClick={() => act("reviewed")}>Mark reviewed</button>
                    <button className="cx-btn outline" disabled={busy} onClick={() => act("needs_changes")}>Request changes</button></>
                )}
              </div>
              {err && <div className="cx-msg err">{err}</div>}
            </div>
          ) : <div className="cx-card-sub" style={{ marginTop: 12 }}>Site updates are approved through the project flow. Read-only here.</div>}
        </div>
      )}
    </div>
  );
}

/* map a manager_reports row to the shared item shape */
const fromReport = (r) => ({
  uid: `r-${r.id}`, source: "manager", id: r.id, role: r.submitter_role, roleLabel: ROLE_LABEL[r.submitter_role] || cap(r.submitter_role),
  manager: r.submitter_name, date: r.created_at, tag: cap(r.report_type) + (r.period_label ? ` · ${r.period_label}` : ""),
  title: r.title, summary: r.summary, highlights: r.highlights, issues: r.issues, nextSteps: r.next_steps,
  status: r.status === "submitted" ? "pending" : r.status, ceoComment: r.ceo_comment, reviewable: true,
});

export default function ReportsInbox() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "reports" ? "reports" : "daily";
  const role = params.get("role") || "";
  const status = params.get("status") || "";
  const setParam = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };

  const [days, setDays] = useState(14);
  const [feed, setFeed] = useState(null);
  const [today, setToday] = useState([]);
  const [others, setOthers] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [f, t, o] = await Promise.all([
        getManagerUpdates({ days, role, status }),
        getManagerTodayStatus(),
        API.get("/manager-reports", { params: role ? { role } : {} }),
      ]);
      setFeed(f); setToday(t); setOthers(o.data.filter((r) => r.report_type !== "daily").map(fromReport)); setError(null);
    } catch { setError("Could not load reports."); }
    finally { setBusy(false); }
  }, [days, role, status]);

  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, 45000); return () => clearInterval(t); }, [load]);

  const dailyItems = useMemo(() => (feed?.items || []).map((i) => ({ ...i, tag: i.source === "report" ? "time" : SOURCE[i.source] })), [feed]);
  const otherItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (others || []).filter((i) => (!status || i.status === status) && (!q || `${i.title} ${i.manager} ${i.summary}`.toLowerCase().includes(q)));
  }, [others, status, search]);
  const list = tab === "daily" ? dailyItems : otherItems;

  const done = today.filter((m) => m.submittedToday).length;
  const pendingDaily = feed?.counts?.pending ?? 0;
  const pendingOthers = (others || []).filter((i) => i.status === "pending").length;

  return (
    <div className="cx-page">
      <div className="cx-header">
        <div><div className="cx-crumb">CEO</div><h1 className="cx-title">Reports</h1><p className="cx-subtitle">Daily updates and reports from your managers.</p></div>
        <div className="cx-actions"><button className="cx-btn outline" onClick={load} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button></div>
      </div>

      <div className="cx-grid kpi">
        <div className="cx-kpi"><span>Reported today</span><strong>{done} / {today.length}</strong><small>managers</small></div>
        <div className="cx-kpi"><span>Daily updates awaiting review</span><strong>{pendingDaily}</strong></div>
        <div className="cx-kpi"><span>Other reports awaiting review</span><strong>{pendingOthers}</strong></div>
        <div className="cx-kpi"><span>Need attention</span><strong>{feed?.counts?.attention ?? 0}</strong><small>flagged in the period</small></div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h3>Today</h3><div className="cx-card-sub">Click a name to filter</div></div></div>
        {today.length === 0 ? <div className="cx-empty">No manager accounts found.</div> : (
          <div className="rp-today">
            {today.map((m) => (
              <button key={m.id} type="button" className={role === m.role ? "on" : ""} onClick={() => setParam("role", role === m.role ? "" : m.role)}>
                <div><b>{m.name}</b><small>{m.roleLabel}</small></div>
                <span className={`cx-status ${m.submittedToday ? "ok" : "warn"}`}>{m.submittedToday ? (m.lastSubmittedAt ? timeAgo(m.lastSubmittedAt) : "Reported") : "Pending"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cx-tabs">
        <button className={tab === "daily" ? "active" : ""} onClick={() => setParam("tab", "daily")}>Daily updates{pendingDaily > 0 && <em>{pendingDaily}</em>}</button>
        <button className={tab === "reports" ? "active" : ""} onClick={() => setParam("tab", "reports")}>Other reports{pendingOthers > 0 && <em>{pendingOthers}</em>}</button>
      </div>

      <div>
        <div className="cx-toolbar">
          {tab === "reports" && <input className="cx-input" placeholder="Search title, manager or summary" value={search} onChange={(e) => setSearch(e.target.value)} />}
          <select className="cx-select" value={role} onChange={(e) => setParam("role", e.target.value)}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select className="cx-select" value={status} onChange={(e) => setParam("status", e.target.value)}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {tab === "daily" && <div className="cx-seg">{[7, 14, 30].map((n) => <button key={n} className={days === n ? "active" : ""} onClick={() => setDays(n)}>{n} days</button>)}</div>}
        </div>
        {error && <div className="cx-msg err">{error}</div>}
        {(tab === "daily" ? !feed : !others) && !error ? <div className="cx-skel" style={{ height: 140 }} />
          : list.length === 0 ? <div className="cx-card"><div className="cx-empty">{tab === "daily" ? "No daily updates for these filters." : "No reports for these filters."}</div></div>
          : list.map((it) => <Item key={it.uid} it={it} onDone={load} />)}
      </div>
    </div>
  );
}