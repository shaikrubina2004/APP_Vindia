import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Users, RefreshCw } from "lucide-react";
import { fetchTeamOverview } from "../../../api/teamApi";
import { errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const STATUS_TONE = { Active: "emerald", "On Leave": "amber", Suspended: "amber", Inactive: "gray" };
const SOURCE_LABEL = { team: "Project team", labour_registry: "Labour registry", staff: "Staff record" };
const num = (v) => (v == null ? "—" : Number(v));

// Read-only view for oversight of everyone working on each project: the PM's team,
// the Site Engineer's labour registry and HR staff. Wages and incident/task notes are not sent
// by the API; the Project Manager edits the team from Team Management.
export default function TeamOverview() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [project, setProject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchTeamOverview();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setError(errorText(e, "Failed to load site teams")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const projects = useMemo(() => [...new Set(rows.map((r) => r.project_name).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((r) =>
    (type === "All" || r.type === type) &&
    (project === "All" || r.project_name === project) &&
    (!q || `${r.name} ${r.role} ${r.project_name || ""} ${r.team_head || ""} ${r.detail || ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, type, project]);

  const sum = (key) => filtered.reduce((n, r) => n + Number(r[key] || 0), 0);
  const stats = [
    ["People", filtered.length],
    ["Active", filtered.filter((r) => r.status === "Active").length],
    ["Open tasks", sum("open_tasks")],
    ["Overdue tasks", sum("overdue_tasks")],
    ["Open incidents", sum("open_incidents")],
  ];

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div>
          <h1 className="ops-title">Site Teams</h1>
          <p className="ops-subtitle">Everyone working on each project — team, labour registry and staff (read-only)</p>
        </div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 12 }}>
        {stats.map(([label, value]) => (
          <div className="ops-card" key={label} style={{ padding: 14 }}>
            <span className="ops-muted">{label}</span><br /><span className="hub-strong" style={{ fontSize: 22 }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-tabs">
            {["All", "Staff", "Labour"].map((t) => (
              <button key={t} className={`ops-tab ${type === t ? "ops-tab-active" : ""}`} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
          <select className="ops-input" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project">
            <option value="All">All projects</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="hub-search"><Search size={15} />
            <input className="ops-input" placeholder="Search name, role or team head" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : filtered.length === 0 ? <div className="ops-empty"><Users size={28} />No team members found.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Name</th><th>Project</th><th>Type</th><th>Source</th><th>Status</th><th>Team head</th><th>Days</th><th>Hours</th><th>Open tasks</th><th>Open incidents</th></tr></thead>
          <tbody>{filtered.map((r) => (
            <tr key={`${r.source}-${r.id}-${r.project_id}`}>
              <td><span className="hub-strong">{r.name}</span><br /><span className="ops-muted">{r.role}{r.detail ? ` · ${r.detail}` : ""}</span></td>
              <td>{r.project_name || "—"}</td>
              <td>{r.type}</td>
              <td><span className="ops-muted">{SOURCE_LABEL[r.source] || r.source}</span></td>
              <td><span className={`ops-badge ops-badge-${STATUS_TONE[r.status] || "gray"}`}><span className="ops-badge-dot" />{r.status}</span></td>
              <td>{r.team_head || "—"}</td>
              <td>{num(r.days_worked)}</td>
              <td>{num(r.hours)}</td>
              <td>{num(r.open_tasks)}{r.overdue_tasks > 0 && <span className="ops-badge ops-badge-red" style={{ marginLeft: 6 }}>{r.overdue_tasks} overdue</span>}</td>
              <td>{r.open_incidents == null ? "—" : r.open_incidents > 0 ? <span className="ops-badge ops-badge-amber">{r.open_incidents}</span> : "0"}</td>
            </tr>))}</tbody></table></div>)}
      </div>
    </div>
  );
}
