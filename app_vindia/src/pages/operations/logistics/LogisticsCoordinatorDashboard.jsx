import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CountUp from "react-countup";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Truck, Clock, PackageCheck, AlertTriangle, CalendarClock, RefreshCw, ArrowRight, Inbox } from "lucide-react";
import { getLogisticsDashboard } from "../../../services/logisticsService";
import CheckInButton from "../../../SharedResourse/CheckInButton";
import "./LogisticsCoordinatorDashboard.css";

const DashboardSkeleton = () => (
  <div className="ops-page">
    <div className="ops-skeleton" style={{ height: 28, width: 260 }} />
    <div className="ops-kpi-grid">
      {[...Array(5)].map((_, i) => <div key={i} className="ops-skeleton" style={{ height: 92 }} />)}
    </div>
    <div className="ops-skeleton" style={{ height: 260 }} />
  </div>
);

const KpiCard = ({ icon: Icon, label, value, tone, to }) => {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className="ops-kpi-card">
      <div className={`ops-kpi-icon ops-tone-${tone}`}><Icon size={22} /></div>
      <div style={{ flex: 1 }}>
        <p className="ops-kpi-label">{label}</p>
        <p className="ops-kpi-value"><CountUp end={Number(value) || 0} duration={1.1} /></p>
      </div>
      {to && <ArrowRight size={16} className="logd-card-arrow" />}
    </Wrapper>
  );
};

const STATUS_BADGE = {
  scheduled: "ops-badge-gray", dispatched: "ops-badge-sky", in_transit: "ops-badge-indigo",
  delivered: "ops-badge-emerald", delayed: "ops-badge-red", cancelled: "ops-badge-gray",
};
const STATUS_DOTCOLOR = {
  scheduled: "#94a3b8", dispatched: "#0ea5e9", in_transit: "#6366f1",
  delivered: "#10b981", delayed: "#ef4444", cancelled: "#cbd5e1",
};
const PIE_COLORS = { Scheduled: "#94a3b8", Dispatched: "#0ea5e9", "In Transit": "#6366f1", Delivered: "#10b981", Delayed: "#ef4444" };

const LogisticsCoordinatorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId = currentUser?.id || null;
  const designation = currentUser?.designation || currentUser?.role || null;

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    getLogisticsDashboard().then((res) => setData(res.data)).finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;

  const { kpis, recent } = data;
  const pieData = [
    { name: "Scheduled", value: kpis.scheduled },
    { name: "Dispatched", value: kpis.dispatched },
    { name: "In Transit", value: kpis.in_transit },
    { name: "Delivered", value: kpis.delivered },
    { name: "Delayed", value: kpis.delayed },
  ].filter((d) => d.value > 0);

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div>
          <h1 className="ops-title">Logistics Dashboard</h1>
          <p className="ops-subtitle">Deliveries across all active sites</p>
        </div>
        <div className="ops-flex-center">
          <CheckInButton employeeId={employeeId} designation={designation} />
          <button className="ops-icon-btn" onClick={() => load(true)} title="Refresh">
            <RefreshCw size={16} className={refreshing ? "logd-spin" : ""} />
          </button>
          <Link to="/operations/logistics/deliveries" className="ops-btn ops-btn-primary">New Delivery</Link>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <KpiCard icon={Clock} label="Scheduled" value={kpis.scheduled} tone="gray" to="/operations/logistics/deliveries" />
        <KpiCard icon={Truck} label="Dispatched" value={kpis.dispatched} tone="sky" to="/operations/logistics/deliveries" />
        <KpiCard icon={Truck} label="In Transit" value={kpis.in_transit} tone="indigo" to="/operations/logistics/deliveries" />
        <KpiCard icon={PackageCheck} label="Delivered" value={kpis.delivered} tone="emerald" to="/operations/logistics/deliveries" />
        <KpiCard icon={AlertTriangle} label="Delayed" value={kpis.delayed} tone="red" to="/operations/logistics/deliveries" />
      </div>

      {kpis.due_today > 0 && (
        <div className="logd-due-strip">
          <CalendarClock size={20} className="logd-due-icon" />
          <p><strong><CountUp end={kpis.due_today} duration={0.8} /></strong> deliverie(s) expected today.</p>
        </div>
      )}

      <div className="logd-grid">
        <div className="ops-card">
          <div className="ops-card-header"><h2>Recent Deliveries</h2></div>
          {recent.length === 0 ? (
            <div className="ops-empty"><Inbox size={26} />No deliveries yet — create your first one.</div>
          ) : (
            <ul className="logd-recent-list">
              {recent.map((d) => (
                <li key={d.id} className="logd-recent-item">
                  <div className="ops-flex-center">
                    <span className="logd-dot" style={{ background: STATUS_DOTCOLOR[d.status] }} />
                    <div>
                      <p className="logd-recent-code">{d.delivery_code} <span className="logd-recent-project">· {d.project_name}</span></p>
                      <p className="logd-recent-meta">{d.vendor_name || "No vendor"} {d.expected_date ? `· Expected ${d.expected_date}` : ""}</p>
                    </div>
                  </div>
                  <span className={`ops-badge ${STATUS_BADGE[d.status]}`}>
                    <span className="ops-badge-dot" />{d.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ops-card">
          <div className="ops-card-header"><h2>Status Breakdown</h2></div>
          {pieData.length === 0 ? (
            <div className="ops-empty">No deliveries to chart yet.</div>
          ) : (
            <div style={{ height: 260, padding: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={PIE_COLORS[d.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticsCoordinatorDashboard;