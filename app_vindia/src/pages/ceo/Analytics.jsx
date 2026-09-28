import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import API from "../../services/authService";
import "../../styles/portalPages.css";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const cap = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const Unavailable = () => <div className="pp-empty">Data unavailable for this section.</div>;
const NoData = () => <div className="pp-empty">No data yet.</div>;

function Card({ title, sub, data, children }) {
  return (
    <div className="pp-card">
      <h3>{title}</h3>
      {sub && <div className="pp-sub">{sub}</div>}
      {data?.error ? <Unavailable /> : children}
    </div>
  );
}

function Pie1({ rows, nameKey, valueKey }) {
  if (!rows?.length) return <NoData />;
  const data = rows.map((r) => ({ name: cap(r[nameKey]), value: r[valueKey] }));
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Bars({ rows, xKey, bars, fmt }) {
  if (!rows?.length) return <NoData />;
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={cap} />
          <YAxis tickFormatter={fmt} />
          <Tooltip formatter={fmt} labelFormatter={cap} />
          <Legend />
          {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Analytics() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.get("/analytics/overview")
      .then((r) => setD(r.data))
      .catch(() => setError("Could not load analytics."));
  }, []);

  if (error) return <div className="pp-page"><div className="pp-msg err">{error}</div></div>;
  if (!d) return <div className="pp-page"><div className="pp-empty">Loading analytics…</div></div>;

  const { projects, leads, hr, finance, reports } = d;
  const pending = reports?.byStatus?.find((s) => s.status === "submitted")?.count || 0;

  return (
    <div className="pp-page">
      <div className="pp-head">
        <h1>Analytics</h1>
        <p>Company-wide overview · updated {new Date(d.generatedAt).toLocaleString("en-IN")}</p>
      </div>

      <div className="pp-grid kpi" style={{ marginBottom: 18 }}>
        <div className="pp-kpi"><span>Projects</span><strong>{projects.error ? "–" : projects.total}</strong></div>
        <div className="pp-kpi"><span>Total project budget</span><strong>{projects.error ? "–" : inr(projects.totalBudget)}</strong></div>
        <div className="pp-kpi"><span>Leads</span><strong>{leads.error ? "–" : leads.total}</strong></div>
        <div className="pp-kpi"><span>Lead conversion</span><strong>{leads.error ? "–" : `${leads.conversionRate}%`}</strong></div>
        <div className="pp-kpi"><span>Employees</span><strong>{hr.error ? "–" : hr.headcount}</strong></div>
        <div className="pp-kpi"><span>Reports awaiting review</span><strong>{reports.error ? "–" : pending}</strong></div>
      </div>

      <div className="pp-grid two">
        <Card title="Projects by status" data={projects}><Pie1 rows={projects.byStatus} nameKey="status" valueKey="count" /></Card>
        <Card title="Budget by project status" data={projects}><Bars rows={projects.byStatus} xKey="status" bars={[{ key: "budget", name: "Budget" }]} fmt={inr} /></Card>

        <Card title="Lead funnel" sub="Leads by status" data={leads}><Pie1 rows={leads.byStatus} nameKey="status" valueKey="count" /></Card>
        <Card title="Leads per BDA" sub="Total vs converted" data={leads}>
          <Bars rows={leads.perBda} xKey="bda" bars={[{ key: "total", name: "Total" }, { key: "converted", name: "Converted" }]} fmt={(v) => v} />
        </Card>

        <Card title="Attendance (latest per employee)" data={hr}><Pie1 rows={hr.attendance} nameKey="status" valueKey="count" /></Card>
        <Card title="Manager reports by role" data={reports}><Pie1 rows={reports.byRole} nameKey="role" valueKey="count" /></Card>

        <Card title="Invoices" sub="Amount by status" data={finance}>
          <Bars rows={finance.invoices} xKey="status" bars={[{ key: "amount", name: "Amount" }]} fmt={inr} />
        </Card>
        <Card title="Payments" sub="Amount by status" data={finance}>
          <Bars rows={finance.payments} xKey="status" bars={[{ key: "amount", name: "Amount" }]} fmt={inr} />
        </Card>
      </div>
    </div>
  );
}