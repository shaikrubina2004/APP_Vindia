import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import CountUp from "react-countup";
import { ClipboardList, Users, Laptop, AlertTriangle, RefreshCw, Plus, Inbox, DoorOpen } from "lucide-react";
import officeAdminService from "../../../services/officeAdminService";
import CheckInButton from "../../../SharedResourse/CheckInButton";
import StatusBadge from "../shared/StatusBadge";
import { fmtDate, fmtDateTime, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const Kpi = ({ icon: Icon, tone, label, value, sub, to }) => (
  <Link to={to} className="ops-kpi-card">
    <div className={`ops-kpi-icon ops-tone-${tone}`}><Icon size={22} /></div>
    <div><p className="ops-kpi-label">{label}</p>
      <p className="ops-kpi-value"><CountUp end={Number(value) || 0} duration={1} /></p>
      {sub && <p className="hub-kpi-sub">{sub}</p>}</div>
  </Link>
);

export default function OfficeAdministratorDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();

  const load = useCallback(async () => {
    setError("");
    try { setData((await officeAdminService.getDashboard()).data); }
    catch (e) { setError(errorText(e, "Failed to load the office dashboard")); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return (<div className="ops-page"><div className="ops-alert ops-alert-error">{error}</div>
    <button className="ops-btn ops-btn-outline" style={{ width: "fit-content" }} onClick={load}>Retry</button></div>);
  if (!data) return (<div className="ops-page"><div className="ops-skeleton" style={{ height: 28, width: 260 }} />
    <div className="ops-kpi-grid hub-kpi-4">{[...Array(4)].map((_, i) => <div key={i} className="ops-skeleton" style={{ height: 92 }} />)}</div>
    <div className="ops-skeleton" style={{ height: 260 }} /></div>);

  const s = data.stats;
  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Office Administration</h1><p className="ops-subtitle">Requests, visitors and company assets</p></div>
        <div className="ops-flex-center">
          <CheckInButton employeeId={user?.id || null} designation={user?.designation || user?.role || null} />
          <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <Link to="/operations/administrator/requests" className="ops-btn ops-btn-primary"><Plus size={16} /> New request</Link>
        </div>
      </div>

      <div className="ops-kpi-grid hub-kpi-4">
        <Kpi icon={ClipboardList} tone="indigo" label="Open requests" value={s.open_requests}
          sub={`${s.urgent} urgent · ${s.overdue} overdue`} to="/operations/administrator/requests" />
        <Kpi icon={AlertTriangle} tone="amber" label="Awaiting manager approval" value={s.awaiting_approval}
          sub="Above the office spend limit" to="/operations/administrator/requests" />
        <Kpi icon={Users} tone="emerald" label="Visitors in office" value={s.visitors_in}
          sub={`${s.visitors_today} today`} to="/operations/administrator/visitors" />
        <Kpi icon={Laptop} tone="sky" label="Assets in use" value={s.assets_assigned}
          sub={`${s.assets_total} total · ${s.assets_maintenance} in maintenance`} to="/operations/administrator/assets" />
      </div>

      <div className="hub-grid-2">
        <div className="ops-card">
          <div className="ops-card-header"><h2>Latest requests</h2>
            <Link className="ops-btn ops-btn-outline ops-btn-sm" to="/operations/administrator/requests">View all</Link></div>
          {data.recent_requests.length === 0 ? <div className="ops-empty"><Inbox size={26} />No requests yet.</div> : (
            <div className="ops-table-wrap"><table className="ops-table">
              <thead><tr><th>Request</th><th>Category</th><th>Priority</th><th>Needed by</th><th>Status</th></tr></thead>
              <tbody>{data.recent_requests.map((r) => (
                <tr key={r.id}><td><span className="hub-strong">{r.title}</span><br /><span className="ops-muted hub-mono">{r.request_code}</span></td>
                  <td style={{ textTransform: "capitalize" }}>{String(r.category).replace("_", " ")}</td>
                  <td><StatusBadge status={r.priority} /></td><td>{fmtDate(r.needed_by)}</td><td><StatusBadge status={r.status} /></td></tr>))}</tbody>
            </table></div>)}
        </div>

        <div className="ops-card">
          <div className="ops-card-header"><h2><DoorOpen size={16} /> In the office now</h2></div>
          {data.visitors_now.length === 0 ? <div className="ops-empty">No visitors checked in.</div> : (
            <ul className="hub-feed">{data.visitors_now.map((v) => (
              <li key={v.id}><span className="hub-feed-ico"><Users size={15} /></span>
                <div className="hub-feed-main"><p><b>{v.visitor_name}</b>{v.company ? ` · ${v.company}` : ""}</p>
                  <small>Meeting {v.host_name || "—"} · since {fmtDateTime(v.check_in)}</small></div></li>))}</ul>)}
        </div>
      </div>

      {data.by_category.length > 0 && (
        <div className="ops-card"><div className="ops-card-header"><h2>Open requests by category</h2></div>
          <div className="hub-stat-tiles">{data.by_category.map((c) => (
            <div className="hub-tile" key={c.category}><b>{c.count}</b><span style={{ textTransform: "capitalize" }}>{String(c.category).replace("_", " ")}</span></div>))}</div></div>)}
    </div>
  );
}
