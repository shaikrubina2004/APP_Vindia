import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../services/authService";
import {
  getManagerUpdates, getManagerTodayStatus, reviewFinanceUpdate, reviewManagerReport,
  inr, cap, fmtDate, fmtDateTime, timeAgo,
} from "../../services/ceoService";
import "./CEOBase.css";
import "./ReportsInbox.css";

/* One "Reports" page for the CEO.
     Daily updates  – each manager's daily update, with that role's own fields
     Other reports  – weekly / monthly / incident / other reports */

const ROLES = [
  ["", "All managers"], ["project_manager", "Project Manager"], ["hr_manager", "HR Manager"],
  ["finance_manager", "Finance Manager"], ["operations_manager", "Operations Manager"], ["bda", "Business Development"],
];
const ROLE_LABEL = Object.fromEntries(ROLES.filter(([v]) => v));
const STATUSES = [["", "Any status"], ["pending", "Awaiting review"], ["reviewed", "Reviewed"], ["approved", "Approved"], ["needs_changes", "Needs changes"], ["rejected", "Rejected"]];
const SOURCE = { report: "Daily update", finance: "Finance update", project: "Site update" };
const STATUS_TEXT = { pending: "Awaiting review", submitted: "Awaiting review", reviewed: "Reviewed", approved: "Approved", needs_changes: "Needs changes", rejected: "Rejected" };
const STATUS_TONE = { pending: "warn", submitted: "warn", reviewed: "ok", approved: "ok", needs_changes: "bad", rejected: "bad" };
const HEALTH_TONE = { "on-track": "ok", attention: "warn", critical: "bad" };
const ini = (n = "") => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

function Sec({ label, text, risk }) {
  return text ? <div className={`rp-sec ${risk ? "risk" : ""}`}><b>{label}</b><p>{text}</p></div> : null;
}

/* role-specific fields, grouped by section */
function Fields({ fields }) {
  if (!fields?.length) return null;
  const groups = fields.reduce((m, f) => { const k = f.section || "Details"; (m[k] = m[k] || []).push(f); return m; }, {});
  return Object.entries(groups).map(([sec, list]) => (
    <div className="rp-group" key={sec}>
      <div className="rp-glabel">{sec}</div>
      <div className="rp-tiles">{list.map((f) => <div key={f.label}><span>{f.label}</span><b>{f.kind === "money" ? inr(f.value) : String(f.value)}</b></div>)}</div>
    </div>
  ));
}

function Item({ it, onDone, autoOpen }) {
  const [open, setOpen] = useState(it.status === "pending" || autoOpen);
  const ref = useRef(null);
  useEffect(() => {              // arrived from a notification: open it, scroll to it, flash it
    if (autoOpen) { setOpen(true); ref.current?.scrollIntoView?.({ behavior: "smooth", block: "center" }); }
  }, [autoOpen]);
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
    <div className={`rp-item ${autoOpen ? "rp-flash" : ""}`} ref={ref}>
      <div className="rp-head" onClick={() => setOpen((o) => !o)}>
        <span className="cx-avatar">{ini(it.manager)}</span>
        <div className="rp-main">
          <h4>{it.title}</h4>
          <div className="rp-meta">{it.manager} · {it.roleLabel} · {it.source === "report" || it.source === "manager" ? fmtDateTime(it.date) : fmtDate(it.date)}</div>
        </div>
        {it.tag && <span className="cx-tag info">{it.tag}</span>}
        {it.health && <span className={`cx-status ${HEALTH_TONE[it.health] || "warn"}`}>{cap(it.health)}</span>}
        <span className={`cx-tag ${STATUS_TONE[it.status] || ""}`}>{STATUS_TEXT[it.status] || cap(it.status)}</span>
      </div>

      {open && (
        <div className="rp-body">
          <Sec label="Summary" text={it.summary} />
          <Fields fields={it.fields} />
          <Sec label="Highlights" text={it.highlights} />
          <Sec label="Issues / risks" text={it.issues} risk />
          <Sec label="Next steps" text={it.nextSteps} />
          {it.ceoComment && it.status !== "pending" && it.status !== "submitted" && <Sec label="Your comment" text={it.ceoComment} />}

          {it.reviewable ? (
            <div className="rp-review">
              <textarea className="cx-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a comment (optional)" />
              <div className="row">
                {it.source === "finance" ? (
                  <><button className="cx-pill primary" disabled={busy} onClick={() => act("approved")}>Approve</button>
                    <button className="cx-pill" disabled={busy} onClick={() => act("rejected")}>Reject</button></>
                ) : (
                  <><button className="cx-pill primary" disabled={busy} onClick={() => act("reviewed")}>Mark reviewed</button>
                    <button className="cx-pill" disabled={busy} onClick={() => act("needs_changes")}>Request changes</button></>
                )}
              </div>
              {err && <div className="cx-msg err" style={{ marginTop: 10 }}>{err}</div>}
            </div>
          ) : <div className="cx-sub" style={{ marginTop: 14 }}>Site updates are approved through the project flow. Read-only here.</div>}
        </div>
      )}
    </div>
  );
}

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
  const openId = params.get("open") || "";
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

  const dailyItems = useMemo(() => (feed?.items || []).map((i) => ({ ...i, tag: SOURCE[i.source] })), [feed]);
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
        <div><h1 className="cx-hello">Reports</h1><p className="cx-lead">Daily updates and reports from your managers.</p></div>
        <button className="cx-pill primary" onClick={load} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button>
      </div>

      <div className="cx-grid rp-top4">
        <div className="cx-feature">
          <h3>Reported today</h3>
          <div className="big">{done} / {today.length}</div>
          <p>managers have sent their daily update</p>
          <div className="cx-bar" style={{ marginTop: 16 }}><i style={{ width: `${today.length ? (done / today.length) * 100 : 0}%` }} /></div>
        </div>
        <div className="cx-kpi"><span>Daily updates to review</span><strong>{pendingDaily}</strong><small>awaiting your review</small></div>
        <div className="cx-kpi"><span>Other reports to review</span><strong>{pendingOthers}</strong><small>weekly, monthly and more</small></div>
        <div className="cx-kpi"><span>Need attention</span><strong>{feed?.counts?.attention ?? 0}</strong><small>flagged in this period</small></div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h3>Today</h3><div className="cx-sub">Select a manager to filter</div></div></div>
        {today.length === 0 ? <div className="cx-empty">No manager accounts found.</div> : (
          <div className="rp-today">
            {today.map((m) => (
              <button key={m.id} type="button" className={`rp-person ${role === m.role ? "on" : ""}`} onClick={() => setParam("role", role === m.role ? "" : m.role)}>
                <span className="cx-avatar">{ini(m.name)}</span>
                <div className="body"><b>{m.name}</b><small>{m.roleLabel}</small></div>
                <span className={`cx-status ${m.submittedToday ? "ok" : "warn"}`}>{m.submittedToday ? (m.lastSubmittedAt ? timeAgo(m.lastSubmittedAt) : "Sent") : "Pending"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cx-pillbar">
        <div className="cx-seg">
          <button className={tab === "daily" ? "active" : ""} onClick={() => setParam("tab", "daily")}>Daily updates{pendingDaily > 0 && <em>{pendingDaily}</em>}</button>
          <button className={tab === "reports" ? "active" : ""} onClick={() => setParam("tab", "reports")}>Other reports{pendingOthers > 0 && <em>{pendingOthers}</em>}</button>
        </div>
        {tab === "reports" && <input className="cx-pill" placeholder="Search title, manager or summary" value={search} onChange={(e) => setSearch(e.target.value)} />}
        <select className="cx-pill" value={role} onChange={(e) => setParam("role", e.target.value)}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="cx-pill" value={status} onChange={(e) => setParam("status", e.target.value)}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {tab === "daily" && <div className="cx-seg">{[7, 14, 30].map((n) => <button key={n} className={days === n ? "active" : ""} onClick={() => setDays(n)}>{n} days</button>)}</div>}
      </div>

      {error && <div className="cx-msg err">{error}</div>}
      <div>
        {(tab === "daily" ? !feed : !others) && !error ? <div className="cx-skel" style={{ height: 150 }} />
          : list.length === 0 ? <div className="cx-card"><div className="cx-empty">{tab === "daily" ? "No daily updates for these filters." : "No reports for these filters."}</div></div>
          : list.map((it) => <Item key={it.uid} it={it} onDone={load} autoOpen={it.uid === openId} />)}
      </div>
    </div>
  );
}