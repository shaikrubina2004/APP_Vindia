import { useCallback, useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import API from "../../services/authService";
import { inrShort, cap, timeAgo } from "../../services/ceoService";
import "./CEOBase.css";
import "./Analytics.css";

const COLORS = ["#2d6cf6", "#7aa7ff", "#b9cffb", "#1b2a4e", "#8b98b5", "#dbe5fb"];
const TABS = [["overview", "Overview"], ["projects", "Projects"], ["leads", "Leads"], ["people", "People"], ["finance", "Finance"]];
const axis = { fill: "#8b98b5", fontSize: 12 };
const tip = {
  contentStyle: { background: "#1b2a4e", border: 0, borderRadius: 12, color: "#fff", fontSize: 12.5, boxShadow: "0 12px 26px rgba(27,42,78,.28)" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#a9b8dc", marginBottom: 4 },
};

const NoData = () => <div className="cx-empty">No data yet.</div>;

function Card({ title, sub, data, children }) {
  return (
    <div className="cx-card an-card">
      <div className="cx-card-head"><div><h3>{title}</h3>{sub && <div className="cx-sub">{sub}</div>}</div></div>
      {data?.error ? <div className="cx-empty">Data unavailable for this section.</div> : children}
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
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={86} paddingAngle={3} cornerRadius={8} stroke="none" isAnimationActive={false}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={active == null || active === i ? 1 : 0.35} />)}
            </Pie>
            <Tooltip {...tip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="an-donut-center"><strong>{cur ? cur.value : total}</strong><span>{cur ? cur.name : centerLabel}</span></div>
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
    <div style={{ height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
          <defs><linearGradient id="anBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b93ff" /><stop offset="100%" stopColor="#2d6cf6" /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#eef2f9" />
          <XAxis dataKey={xKey} tickFormatter={cap} tickLine={false} axisLine={false} tick={axis} />
          <YAxis tickFormatter={fmt} tickLine={false} axisLine={false} width={56} tick={axis} />
          <Tooltip formatter={fmt} labelFormatter={cap} cursor={{ fill: "rgba(45,108,246,.06)" }} {...tip} />
          {bars.length > 1 && <Legend iconType="circle" iconSize={8} />}
          {bars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} name={b.name} fill={i === 0 ? "url(#anBar)" : "#b9cffb"} radius={[12, 12, 12, 12]} maxBarSize={38}
              background={i === 0 ? { fill: "#f1f5fe", radius: 12 } : undefined} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const Stat = ({ label, value, sub }) => <div className="cx-kpi"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>;

export default function Analytics() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    API.get("/analytics/overview").then((r) => { setD(r.data); setError(null); })
      .catch(() => setError("Could not load analytics.")).finally(() => setBusy(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !d) return <div className="cx-page"><div className="cx-msg err">{error}</div><div><button className="cx-pill primary" onClick={load}>Retry</button></div></div>;
  if (!d) return <div className="cx-page"><div className="cx-skel" style={{ height: 44, width: 240 }} /><div className="cx-skel" style={{ height: 120 }} /><div className="cx-skel" style={{ height: 320 }} /></div>;

  const { projects, leads, hr, finance, reports } = d;
  const pending = reports?.byStatus?.find((s) => s.status === "submitted")?.count || 0;
  const v = (sec, val) => (sec.error ? "–" : val);
  const show = (k) => tab === "overview" || tab === k;

  return (
    <div className="cx-page">
      <div className="cx-header">
        <div><h1 className="cx-hello">Analytics</h1><p className="cx-lead">Company-wide overview · updated {timeAgo(d.generatedAt)}</p></div>
        <button className="cx-pill primary" onClick={load} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button>
      </div>

      <div className="cx-pillbar">
        <div className="cx-seg">{TABS.map(([k, l]) => <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      </div>

      <div className="cx-grid an-kpis">
        <div className="cx-feature">
          <h3>Total project budget</h3>
          <div className="big">{v(projects, inrShort(projects.totalBudget))}</div>
          <p>Across {v(projects, projects.total)} project{projects.total === 1 ? "" : "s"}</p>
        </div>
        <Stat label="Leads" value={v(leads, leads.total)} sub={leads.error ? "" : `${leads.conversionRate}% converted`} />
        <Stat label="Employees" value={v(hr, hr.headcount)} />
        <Stat label="Reports to review" value={v(reports, pending)} />
        <Stat label="Projects" value={v(projects, projects.total)} />
      </div>

      <div className="cx-grid an-charts">
        {show("projects") && <Card title="Projects by status" data={projects}><Donut rows={projects.byStatus} nameKey="status" valueKey="count" centerLabel="Projects" /></Card>}
        {show("projects") && <Card title="Budget by project status" data={projects}><Bars rows={projects.byStatus} xKey="status" bars={[{ key: "budget", name: "Budget" }]} fmt={inrShort} /></Card>}
        {show("leads") && <Card title="Lead funnel" sub="Leads by status" data={leads}><Donut rows={leads.byStatus} nameKey="status" valueKey="count" centerLabel="Leads" /></Card>}
        {show("leads") && <Card title="Leads per BDA" sub="Total vs converted" data={leads}><Bars rows={leads.perBda} xKey="bda" bars={[{ key: "total", name: "Total" }, { key: "converted", name: "Converted" }]} fmt={(x) => x} /></Card>}
        {show("people") && <Card title="Attendance" sub="Latest status per employee" data={hr}><Donut rows={hr.attendance} nameKey="status" valueKey="count" centerLabel="Employees" /></Card>}
        {show("people") && <Card title="Manager reports by role" data={reports}><Donut rows={reports.byRole} nameKey="role" valueKey="count" centerLabel="Reports" /></Card>}
        {show("finance") && <Card title="Invoices" sub="Amount by status" data={finance}><Bars rows={finance.invoices} xKey="status" bars={[{ key: "amount", name: "Amount" }]} fmt={inrShort} /></Card>}
        {show("finance") && <Card title="Payments" sub="Amount by status" data={finance}><Bars rows={finance.payments} xKey="status" bars={[{ key: "amount", name: "Amount" }]} fmt={inrShort} /></Card>}
      </div>
    </div>
  );
}