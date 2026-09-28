import { useEffect, useState, useCallback } from "react";
import API from "../../services/authService";
import "../../styles/portalPages.css";

const ROLE_LABEL = {
  project_manager: "Project Manager", hr_manager: "HR Manager",
  finance_manager: "Finance Manager", operations_manager: "Operations Manager",
  bda: "Business Development", bd_manager: "BD Manager",
};
const STATUS_LABEL = { submitted: "New", reviewed: "Reviewed", needs_changes: "Needs changes" };
const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function Section({ label, text }) {
  if (!text) return null;
  return <><b>{label}</b>{text}</>;
}

function ReportRow({ r, onReviewed }) {
  const [open, setOpen] = useState(r.status === "submitted");
  const [comment, setComment] = useState(r.ceo_comment || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const review = async (status) => {
    setBusy(true); setErr(null);
    try {
      await API.put(`/manager-reports/${r.id}/review`, { status, ceo_comment: comment });
      onReviewed();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not save review.");
    } finally { setBusy(false); }
  };

  return (
    <div className="pp-row">
      <div className="pp-row-top" style={{ cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div>
          <h4>{r.title}</h4>
          <div className="pp-meta">
            {r.submitter_name} · {ROLE_LABEL[r.submitter_role] || r.submitter_role} · {r.report_type}
            {r.period_label ? ` · ${r.period_label}` : ""} · {fmt(r.created_at)}
          </div>
        </div>
        <span className={`pp-badge ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
      </div>

      {open && (
        <>
          <div className="pp-body">
            <Section label="Summary" text={r.summary} />
            <Section label="Highlights" text={r.highlights} />
            <Section label="Issues / risks" text={r.issues} />
            <Section label="Next steps" text={r.next_steps} />
          </div>
          <div className="pp-field" style={{ marginTop: 12 }}>
            <label>Your comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="pp-btn ok" disabled={busy} onClick={() => review("reviewed")}>Mark reviewed</button>
            <button className="pp-btn warn" disabled={busy} onClick={() => review("needs_changes")}>Request changes</button>
          </div>
          {err && <div className="pp-msg err">{err}</div>}
        </>
      )}
    </div>
  );
}

export default function ReportsInbox() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({ submitted: 0, reviewed: 0, needs_changes: 0 });
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
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
    } catch {
      setError("Could not load reports.");
    } finally { setLoading(false); }
  }, [status, role]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pp-page">
      <div className="pp-head">
        <h1>Manager Reports</h1>
        <p>Reports submitted to you by your managers.</p>
      </div>

      <div className="pp-grid kpi" style={{ marginBottom: 18 }}>
        <div className="pp-kpi"><span>New</span><strong>{summary.submitted}</strong></div>
        <div className="pp-kpi"><span>Needs changes</span><strong>{summary.needs_changes}</strong></div>
        <div className="pp-kpi"><span>Reviewed</span><strong>{summary.reviewed}</strong></div>
      </div>

      <div className="pp-card">
        <div className="pp-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="submitted">New</option>
            <option value="needs_changes">Needs changes</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {error && <div className="pp-msg err">{error}</div>}
        {loading ? <div className="pp-empty">Loading…</div>
          : reports.length === 0 ? <div className="pp-empty">No reports match these filters.</div>
          : reports.map((r) => <ReportRow key={r.id} r={r} onReviewed={load} />)}
      </div>
    </div>
  );
}