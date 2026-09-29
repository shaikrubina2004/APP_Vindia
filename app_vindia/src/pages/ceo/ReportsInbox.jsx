import { useEffect, useState, useCallback, useMemo } from "react";
import { reviewManagerReport, cap, fmtDateTime } from "../../services/ceoService";
import API from "../../services/authService";
import "./CEOTheme.css";
import "./ReportsInbox.css";

const ROLE_LABEL = {
  project_manager: "Project Manager", hr_manager: "HR Manager",
  finance_manager: "Finance Manager", operations_manager: "Operations Manager",
  bda: "Business Development", bd_manager: "BD Manager",
};
const STATUS_LABEL = { submitted: "New", reviewed: "Reviewed", needs_changes: "Needs changes" };
const initials = (n = "") => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

function Section({ label, text, tone }) {
  if (!text) return null;
  return <div className={`ri-sec ${tone || ""}`}><b>{label}</b><p>{text}</p></div>;
}

function ReportRow({ r, onReviewed }) {
  const [open, setOpen] = useState(r.status === "submitted");
  const [comment, setComment] = useState(r.ceo_comment || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const review = async (status) => {
    setBusy(true); setErr(null);
    try { await reviewManagerReport(r.id, status, comment); onReviewed(); }
    catch (e) { setErr(e.response?.data?.message || "Could not save review."); }
    finally { setBusy(false); }
  };

  return (
    <div className={`ri-row ${r.status} ${open ? "open" : ""}`}>
      <div className="ri-top" onClick={() => setOpen((o) => !o)}>
        <div className="ri-avatar">{initials(r.submitter_name)}</div>
        <div className="ri-main">
          <h4>{r.title}</h4>
          <div className="ri-meta">
            {r.submitter_name} · {ROLE_LABEL[r.submitter_role] || cap(r.submitter_role)} · <span className="ri-type">{r.report_type}</span>
            {r.period_label ? ` · ${r.period_label}` : ""} · {fmtDateTime(r.created_at)}
          </div>
        </div>
        <span className={`ceo-badge ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
        <span className="ri-chev">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="ri-detail">
          <Section label="Summary" text={r.summary} />
          <Section label="Highlights" text={r.highlights} tone="good" />
          <Section label="Issues / risks" text={r.issues} tone="risk" />
          <Section label="Next steps" text={r.next_steps} />
          <div className="ri-review">
            <label>Your comment (optional)</label>
            <textarea className="ceo-textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write feedback for the manager…" />
            <div className="ri-actions">
              <button className="ceo-btn ok" disabled={busy} onClick={() => review("reviewed")}>✓ Mark reviewed</button>
              <button className="ceo-btn warn" disabled={busy} onClick={() => review("needs_changes")}>↺ Request changes</button>
            </div>
            {err && <div className="ceo-msg err">{err}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsInbox() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({ submitted: 0, reviewed: 0, needs_changes: 0 });
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status) params.status = status;
      if (role) params.role = role;
      const [list, sum] = await Promise.all([
        API.get("/manager-reports", { params }),
        API.get("/manager-reports/summary"),
      ]);
      setReports(list.data); setSummary(sum.data); setError(null);
    } catch { setError("Could not load reports."); }
    finally { setLoading(false); }
  }, [status, role]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? reports.filter((r) => `${r.title} ${r.submitter_name} ${r.summary}`.toLowerCase().includes(q)) : reports;
  }, [reports, search]);

  const tabs = [
    { key: "", label: "All", n: summary.submitted + summary.reviewed + summary.needs_changes },
    { key: "submitted", label: "New", n: summary.submitted },
    { key: "needs_changes", label: "Needs changes", n: summary.needs_changes },
    { key: "reviewed", label: "Reviewed", n: summary.reviewed },
  ];

  return (
    <div className="ceo-page">
      <div className="ceo-hero">
        <div><h1>Manager Reports</h1><p>Reports submitted to you by your managers.</p></div>
        <div className="ceo-hero-actions"><button className="ceo-btn ghost" onClick={load}>↻ Refresh</button></div>
      </div>

      <div className="ceo-grid kpi ri-kpis">
        <div className="ceo-kpi"><div className="ceo-kpi-icon" style={{ background: "#2563eb" }}>📥</div><div><span className="ceo-kpi-label">New</span><strong>{summary.submitted}</strong></div></div>
        <div className="ceo-kpi"><div className="ceo-kpi-icon" style={{ background: "#f59e0b" }}>↺</div><div><span className="ceo-kpi-label">Needs changes</span><strong>{summary.needs_changes}</strong></div></div>
        <div className="ceo-kpi"><div className="ceo-kpi-icon" style={{ background: "#16a34a" }}>✓</div><div><span className="ceo-kpi-label">Reviewed</span><strong>{summary.reviewed}</strong></div></div>
      </div>

      <div className="ceo-card">
        <div className="ceo-chips ri-tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`ceo-chip ${status === t.key ? "active" : ""}`} onClick={() => setStatus(t.key)}>{t.label} <span className="ri-count">{t.n}</span></button>
          ))}
        </div>
        <div className="ceo-toolbar">
          <input className="ceo-input" placeholder="Search title, manager or summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="ceo-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {error && <div className="ceo-msg err">{error}</div>}
        {loading ? <div className="ceo-skeleton" style={{ height: 120 }} />
          : shown.length === 0 ? <div className="ceo-empty">📭 No reports match these filters.</div>
          : shown.map((r) => <ReportRow key={r.id} r={r} onReviewed={load} />)}
      </div>
    </div>
  );
}