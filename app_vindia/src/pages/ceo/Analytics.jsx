import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import API from "../../services/authService";
import { inrShort, cap, timeAgo } from "../../services/ceoService";
import "./CEOTheme.css";
import "./Analytics.css";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const TABS = [
  { key: "overview", label: "Overview" }, { key: "projects", label: "Projects" },
  { key: "leads", label: "Leads" }, { key: "people", label: "People" }, { key: "finance", label: "Finance" },
];

const NoData = () => <div className="ceo-empty">No data yet.</div>;

function Card({ title, sub, data, children }) {
  return (
    <div className="ceo-card an-card">
      <h3>{title}</h3>
      {sub && <div className="ceo-sub">{sub}</div>}
      {data?.error ? <div className="ceo-empty">Data unavailable for this section.</div> : children}
    </div>
  );
}

function Donut({ rows, nameKey, valueKey, centerLabel }) {
  const [active, setActive] = useState(null);
  if (!rows?.length) return <NoData />;
  const data = rows.map((r) => ({ name: cap(r[nameKey]), value: r[valueKey] }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const cur = active != null ? data[active] : null;
  return (
    <div className="an-donut">
      <div className="an-donut-chart">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={active == null || active === i ? 1 : 0.35} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="an-donut-center">
          <strong>{cur ? cur.value : total}</strong>
          <span>{cur ? cur.name : centerLabel || "Total"}</span>
        </div>
      </div>
      <ul className="an-legend">
        {data.map((d, i) => (
          <li key={d.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <i style={{ background: COLORS[i % COLORS.length] }} />{d.name}<b>{d.value}</b>
            <small>{total ? Math.round((d.value / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bars({ rows, xKey, bars, fmt }) {
  if (!rows?.length) return <NoData />;
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tickFormatter={cap} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmt} tickLine={false} axisLine={false} width={58} />
          <Tooltip formatter={fmt} labelFormatter={cap} cursor={{ fill: "rgba(37,99,235,.06)" }} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0" }} />
          {bars.length > 1 && <Legend />}
          {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={44} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="ceo-kpi">
      <div className="ceo-kpi-icon" style={{ background: color }}>{icon}</div>
      <div><span className="ceo-kpi-label">{label}</span><strong>{value}</strong></div>
    </div>
  );
}

export default function Analytics() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    API.get("/analytics/overview")
      .then((r) => { setD(r.data); setError(null); })
      .catch(() => setError("Could not load analytics."))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !d) return <div className="ceo-page"><div className="ceo-msg err">{error}</div><button className="ceo-btn" style={{ marginTop: 12 }} onClick={load}>Retry</button></div>;
  if (!d) return <div className="ceo-page"><div className="ceo-skeleton" style={{ height: 110, marginBottom: 20 }} /><div className="ceo-skeleton" style={{ height: 320 }} /></div>;

  const { projects, leads, hr, finance, reports } = d;
  const pending = reports?.byStatus?.find((s) => s.status === "submitted")?.count || 0;
  const dash = (x, v) => (x.error ? "–" : v);
  const show = (...k) => tab === "overview" || k.includes(tab);

  return (
    <div className="ceo-page">
      <div className="ceo-hero">
        <div><h1>Analytics</h1><p>Company-wide overview · updated {timeAgo(d.generatedAt)}</p></div>
        <div className="ceo-hero-actions"><button className="ceo-btn ghost" onClick={load} disabled={busy}>{busy ? "Refreshing…" : "↻ Refresh"}</button></div>
      </div>

      <div className="ceo-grid kpi">
        <Stat icon="📁" color="#2563eb" label="Projects" value={dash(projects, projects.total)} />
        <Stat icon="💼" color="#16a34a" label="Total project budget" value={dash(projects, inrShort(projects.totalBudget))} />
        <Stat icon="🎯" color="#f59e0b" label="Leads" value={dash(leads, leads.total)} />
        <Stat icon="📈" color="#7c3aed" label="Lead conversion" value={dash(leads, `${leads.conversionRate}%`)} />
        <Stat icon="🧑‍💼" color="#0891b2" label="Employees" value={dash(hr, hr.headcount)} />
        <Stat icon="📝" color="#dc2626" label="Reports awaiting review" value={dash(reports, pending)} />
      </div>

      <div className="ceo-chips an-tabs">
        {TABS.map((t) => <button key={t.key} className={`ceo-chip ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      <div className="ceo-grid two">
        {show("projects") && <Card title="Projects by status" data={projects}><Donut rows={projects.byStatus} nameKey="status" valueKey="count" centerLabel="Projects" /></Card>}
        {show("projects") && <Card title="Budget by project status" data={projects}><Bars rows={projects.byStatus} xKey="status" bars={[{ key: "budget", name: "Budget" }]} fmt={inrShort} /></Card>}

        {show("leads") && <Card title="Lead funnel" sub="Leads by status" data={leads}><Donut rows={leads.byStatus} nameKey="status" valueKey="count" centerLabel="Leads" /></Card>}
        {show("leads") && <Card title="Leads per BDA" sub="Total vs converted" data={leads}>
          <Bars rows={leads.perBda} xKey="bda" bars={[{ key: "total", name: "Total" }, { key: "converted", name: "Converted" }]} fmt={(v) => v} /></Card>}

        {show("people") && <Card title="Attendance" sub="Latest status per employee" data={hr}><Donut rows={hr.attendance} nameKey="status" valueKey="count" centerLabel="Employees" /></Card>}
        {show("people") && <Card title="Manager reports by role" data={reports}><Donut rows={reports.byRole} nameKey="role" valueKey="count" centerLabel="Reports" /></Card>}

        {show("finance") && <Card title="Invoices" sub="Amount by status" data={finance}><Bars rows={finance.invoices} xKey="status" bars={[{ key: "amount", name: "Amount" }]} fmt={inrShort} /></Card>}
        {show("finance") && <Card title="Payments" sub="Amount by status" data={finance}><Bars rows={finance.payments} xKey="status" bars={[{ key: "amount", name: "Amount" }]} fmt={inrShort} /></Card>}
      </div>
    </div>
  );
}