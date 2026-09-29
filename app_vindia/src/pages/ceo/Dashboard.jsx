import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { useAuth } from "../../context/useAuth.jsx";
import API from "../../services/authService";
import { getCeoDashboard, inr, inrShort, cap, timeAgo } from "../../services/ceoService";
import "./CEOTheme.css";
import "./Dashboard.css";

const REFRESH_MS = 60000;
const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];

/* number that counts up when its value changes */
function useCountUp(target, ms = 700) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(target) || 0;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Kpi({ icon, color, label, value, format = (x) => Math.round(x), sub, onClick }) {
  const shown = useCountUp(value);
  return (
    <button type="button" className={`ceo-kpi ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div className="ceo-kpi-icon" style={{ background: color }}>{icon}</div>
      <div>
        <span className="ceo-kpi-label">{label}</span>
        <strong>{format(shown)}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </button>
  );
}

const statusTone = (s = "") => {
  const x = s.toLowerCase();
  if (x.includes("complet")) return "ok";
  if (x.includes("delay") || x.includes("hold") || x.includes("cancel")) return "bad";
  if (x.includes("progress") || x.includes("active") || x.includes("ongoing")) return "info";
  return "";
};

function Skeleton() {
  return (
    <div className="ceo-page">
      <div className="ceo-skeleton" style={{ height: 110, marginBottom: 22 }} />
      <div className="ceo-grid kpi">{[...Array(4)].map((_, i) => <div key={i} className="ceo-skeleton" style={{ height: 88 }} />)}</div>
      <div className="ceo-skeleton" style={{ height: 300, marginTop: 22 }} />
    </div>
  );
}

function CeoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [auto, setAuto] = useState(true);

  const [range, setRange] = useState(6);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [sort, setSort] = useState({ key: "id", dir: "desc" });

  const load = useCallback(async (silent) => {
    if (!silent) setRefreshing(true);
    try {
      setData(await getCeoDashboard(projectId || undefined));
      setError(null);
    } catch {
      setError("Could not load dashboard data. Check that the server is running.");
    } finally { setRefreshing(false); }
  }, [projectId]);

  useEffect(() => { load(true); }, [load]);
  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [auto, load]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const projects = useMemo(() => data?.projects || [], [data]);
  const activeCount = projects.filter((p) => !/complet|cancel/i.test(p.status || "")).length;
  const monthly = useMemo(() => (data?.monthly || []).slice(-range), [data, range]);

  const rows = useMemo(() => {
    let r = projects.filter((p) =>
      (statusF === "all" || (p.status || "").toLowerCase() === statusF) &&
      `${p.name} ${p.client}`.toLowerCase().includes(q.toLowerCase()));
    r = [...r].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      const c = typeof x === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
      return sort.dir === "asc" ? c : -c;
    });
    return r;
  }, [projects, q, statusF, sort]);

  const statuses = useMemo(() => [...new Set(projects.map((p) => (p.status || "").toLowerCase()).filter(Boolean))], [projects]);
  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const arrow = (k) => (sort.key === k ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  if (!data && !error) return <Skeleton />;
  if (!data) return <div className="ceo-page"><div className="ceo-msg err">{error}</div><button className="ceo-btn" style={{ marginTop: 12 }} onClick={() => load()}>Retry</button></div>;

  const { finance, hr, leads, wbsCost, wbsOverview, managers } = data;
  const leadTotal = leads.reduce((s, l) => s + l.count, 0);
  const leadMax = Math.max(1, ...leads.map((l) => l.count));
  const costTotal = wbsCost.reduce((s, c) => s + c.value, 0);
  const presentPct = hr.employees ? Math.round((hr.presentToday / hr.employees) * 100) : 0;
  const pendingMgr = managers.pendingReports + managers.pendingFinanceUpdates;

  return (
    <div className="ceo-page">
      {/* HERO */}
      <div className="ceo-hero">
        <div>
          <h1>{greeting}, {user?.name} 👋</h1>
          <p>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · updated {timeAgo(data.generatedAt)}</p>
        </div>
        <div className="ceo-hero-actions">
          <select className="ceo-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Filter by project">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="ceo-btn ghost" onClick={() => setAuto((a) => !a)}>{auto ? "⏸ Live" : "▶ Paused"}</button>
          <button className="ceo-btn ghost" onClick={() => load()} disabled={refreshing}>{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
        </div>
      </div>
      {error && <div className="ceo-msg err" style={{ marginBottom: 14 }}>{error}</div>}

      {/* FINANCIAL SNAPSHOT */}
      <h2 className="ceo-section-title">💰 Financial Snapshot</h2>
      <div className="ceo-grid kpi">
        <Kpi icon="📈" color="#16a34a" label="Revenue (paid invoices)" value={finance.revenue} format={inrShort} sub={`Receivable ${inrShort(finance.receivable)}`} onClick={() => navigate("/finance-manager/dashboard")} />
        <Kpi icon="💸" color="#dc2626" label="Expenses (approved)" value={finance.expenses} format={inrShort} onClick={() => navigate("/finance-manager/dashboard")} />
        <Kpi icon="🏦" color={finance.profit >= 0 ? "#2563eb" : "#dc2626"} label="Net profit" value={finance.profit} format={inrShort} sub={finance.profit >= 0 ? "In profit" : "In loss"} />
        <Kpi icon="⏰" color="#f59e0b" label="Overdue invoices" value={finance.overdueInvoices} sub="Needs follow-up" onClick={() => navigate("/finance-manager/dashboard")} />
      </div>

      {/* OPERATIONS TODAY */}
      <h2 className="ceo-section-title">🏗️ Operations Today</h2>
      <div className="ceo-grid kpi">
        <Kpi icon="📁" color="#7c3aed" label="Active projects" value={activeCount} sub={`${projects.length} total`} onClick={() => navigate("/project-manager/dashboard")} />
        <Kpi icon="🧑‍💼" color="#0891b2" label="Employees present" value={hr.presentToday} sub={`of ${hr.employees} · ${presentPct}%`} onClick={() => navigate("/hr/attendance")} />
        <Kpi icon="🎯" color="#db2777" label="Leads in pipeline" value={leadTotal} onClick={() => navigate("/bda/leads")} />
        <Kpi icon="📝" color="#2563eb" label="Awaiting your review" value={pendingMgr} sub="Manager reports & updates" onClick={() => navigate("/ceo/manager-updates?status=pending")} />
      </div>

      {/* FINANCE OVERVIEW */}
      <h2 className="ceo-section-title">📊 Finance Overview</h2>
      <div className="ceo-card">
        <div className="ceo-card-head">
          <div><h3>Income vs Expense</h3><div className="ceo-sub">Paid invoices vs approved expenses</div></div>
          <div className="ceo-chips">
            {[3, 6].map((n) => <button key={n} className={`ceo-chip ${range === n ? "active" : ""}`} onClick={() => setRange(n)}>{n} months</button>)}
          </div>
        </div>
        {monthly.every((m) => !m.income && !m.expense) ? <div className="ceo-empty">No finance activity recorded in this period.</div> : (
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} /><stop offset="100%" stopColor="#dc2626" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={2.5} fill="url(#gInc)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2.5} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* PROJECTS */}
      <h2 className="ceo-section-title">🗂️ Projects</h2>
      <div className="ceo-card">
        <div className="ceo-toolbar">
          <input className="ceo-input" placeholder="Search project or client…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="ceo-select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
          <span className="ceo-sub" style={{ margin: 0 }}>{rows.length} of {projects.length}</span>
        </div>
        {rows.length === 0 ? <div className="ceo-empty">No projects match.</div> : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead><tr>
                <th onClick={() => toggleSort("name")}>Project{arrow("name")}</th>
                <th onClick={() => toggleSort("client")}>Client{arrow("client")}</th>
                <th onClick={() => toggleSort("status")}>Status{arrow("status")}</th>
                <th onClick={() => toggleSort("budget")}>Budget{arrow("budget")}</th>
                <th onClick={() => toggleSort("spent")}>Spent{arrow("spent")}</th>
                <th onClick={() => toggleSort("progress")}>Progress{arrow("progress")}</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => {
                  const over = p.budget > 0 && p.spent > p.budget;
                  return (
                    <tr key={p.id} onClick={() => setProjectId(String(p.id))} title="Click to focus the dashboard on this project">
                      <td><b>{p.name}</b></td>
                      <td>{p.client || "—"}</td>
                      <td><span className={`ceo-badge ${statusTone(p.status)}`}>{cap(p.status) || "—"}</span></td>
                      <td>{inrShort(p.budget)}</td>
                      <td className={over ? "dash-over" : ""}>{inrShort(p.spent)}{over && " ⚠"}</td>
                      <td style={{ minWidth: 130 }}>
                        <div className="ceo-bar"><i className={p.progress >= 100 ? "ok" : ""} style={{ width: `${Math.min(100, p.progress)}%` }} /></div>
                        <small>{p.progress}%</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WBS */}
      <h2 className="ceo-section-title">🧱 WBS Overview & Cost Tracking</h2>
      <div className="ceo-grid two">
        <div className="ceo-card">
          <h3>WBS progress</h3><div className="ceo-sub">Across {projectId ? "selected project" : "all projects"}</div>
          <div className="dash-wbs-stats">
            <div><strong>{wbsOverview.total}</strong><span>Work packages</span></div>
            <div><strong>{wbsOverview.inProgress}</strong><span>In progress</span></div>
            <div><strong>{wbsOverview.completed}</strong><span>Completed</span></div>
          </div>
          <div className="ceo-bar" style={{ height: 12 }}><i className="ok" style={{ width: `${wbsOverview.avgProgress}%` }} /></div>
          <small className="ceo-sub">Average completion {wbsOverview.avgProgress}%</small>
        </div>
        <div className="ceo-card">
          <h3>Cost breakdown</h3><div className="ceo-sub">Labour · Material · Equipment · Misc</div>
          {costTotal === 0 ? <div className="ceo-empty">No WBS costs recorded yet.</div> : (
            <div className="dash-cost">
              <div style={{ width: 170, height: 170 }}>
                <ResponsiveContainer>
                  <PieChart><Pie data={wbsCost} dataKey="value" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {wbsCost.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 4]} />)}
                  </Pie><Tooltip formatter={(v) => inr(v)} /></PieChart>
                </ResponsiveContainer>
              </div>
              <ul>
                {wbsCost.map((c, i) => (
                  <li key={c.key}><i style={{ background: PIE_COLORS[i % 4] }} />{c.label}<b>{inrShort(c.value)}</b><small>{Math.round((c.value / costTotal) * 100)}%</small></li>
                ))}
                <li className="tot">Total<b>{inrShort(costTotal)}</b></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* LEADS + HR */}
      <div className="ceo-grid two" style={{ marginTop: 18 }}>
        <div className="ceo-card">
          <div className="ceo-card-head"><div><h3>Lead pipeline</h3><div className="ceo-sub">{leadTotal} leads</div></div>
            <button className="ceo-btn outline" onClick={() => navigate("/bda/leads")}>Open CRM →</button></div>
          {leads.length === 0 ? <div className="ceo-empty">No leads yet.</div> : leads.map((l, i) => (
            <div className="dash-funnel" key={l.status}>
              <span>{cap(l.status)}</span>
              <div className="ceo-bar"><i style={{ width: `${(l.count / leadMax) * 100}%`, background: PIE_COLORS[i % 4] }} /></div>
              <b>{l.count}</b>
            </div>
          ))}
        </div>
        <div className="ceo-card">
          <div className="ceo-card-head"><div><h3>HR overview</h3><div className="ceo-sub">Today's workforce</div></div>
            <button className="ceo-btn outline" onClick={() => navigate("/hr")}>Open HR →</button></div>
          <div className="dash-hr">
            <div className="dash-ring" style={{ "--p": presentPct }}><span>{presentPct}%</span><small>present</small></div>
            <ul>
              <li onClick={() => navigate("/hr/employees")}><span>Total employees</span><b>{hr.employees}</b></li>
              <li onClick={() => navigate("/hr/attendance")}><span>Present today</span><b>{hr.presentToday}</b></li>
              <li><span>On leave</span><b>{hr.onLeave}</b></li>
              <li><span>Pending leave requests</span><b>{hr.pendingLeaves}</b></li>
            </ul>
          </div>
        </div>
      </div>

      {/* MANAGER DAILY UPDATES */}
      <h2 className="ceo-section-title">👔 Manager Daily Updates</h2>
      <div className="ceo-card">
        <div className="ceo-card-head">
          <div><h3>{managers.submittedToday} of {managers.total} managers reported today</h3>
            <div className="ceo-sub">{managers.pendingReports} report(s) and {managers.pendingFinanceUpdates} finance update(s) awaiting review</div></div>
          <button className="ceo-btn" onClick={() => navigate("/ceo/manager-updates")}>View all updates →</button>
        </div>
        <div className="ceo-bar" style={{ marginBottom: 14 }}><i className="ok" style={{ width: `${managers.total ? (managers.submittedToday / managers.total) * 100 : 0}%` }} /></div>
        {managers.list.length === 0 ? <div className="ceo-empty">No manager accounts found.</div> : (
          <div className="dash-mgrs">
            {managers.list.map((m) => (
              <button key={m.id} type="button" className={`dash-mgr ${m.submittedToday ? "done" : ""}`} onClick={() => navigate(`/ceo/manager-updates?role=${m.role}`)}>
                <span className="dash-dot" />
                <div><b>{m.name}</b><small>{m.roleLabel}</small></div>
                <em>{m.submittedToday ? (m.lastSubmittedAt ? timeAgo(m.lastSubmittedAt) : "Submitted") : "Not yet"}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* QUICK MODULES */}
      <h2 className="ceo-section-title">⚡ Quick Modules</h2>
      <div className="dash-modules">
        {[
          ["👥", "HR Management", "/hr"], ["💰", "Finance", "/finance-manager/dashboard"],
          ["🏗️", "Projects", "/project-manager/dashboard"], ["🕘", "Attendance", "/hr/attendance"],
          ["💳", "Payroll", "/hr/payroll"], ["📄", "Manager Reports", "/reports"],
          ["📊", "Analytics", "/analytics"], ["👔", "Manager Updates", "/ceo/manager-updates"],
        ].map(([icon, label, path]) => (
          <button key={path} type="button" className="dash-module" onClick={() => navigate(path)}>
            <span>{icon}</span><b>{label}</b><small>Open →</small>
          </button>
        ))}
      </div>
    </div>
  );
}


/* The /dashboard route is shared with the HR Manager, who must NOT see company
   finance. They get a light HR view backed by the existing /api/dashboard. */
function HrView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    API.get("/dashboard").then((r) => setD(r.data)).catch(() => setErr("Could not load HR dashboard."));
  }, []);
  return (
    <div className="ceo-page">
      <div className="ceo-hero"><div><h1>Welcome, {user?.name} 👋</h1><p>HR overview</p></div>
        <div className="ceo-hero-actions"><button className="ceo-btn ghost" onClick={() => navigate("/hr")}>Open HR →</button></div></div>
      {err && <div className="ceo-msg err">{err}</div>}
      {!d && !err && <div className="ceo-skeleton" style={{ height: 90 }} />}
      {d && (
        <div className="ceo-grid kpi">
          <Kpi icon="🧑‍💼" color="#2563eb" label="Total employees" value={d.totalEmployees} />
          <Kpi icon="✅" color="#16a34a" label="Present" value={d.attendance?.present || 0} />
          <Kpi icon="🏠" color="#7c3aed" label="Work from home" value={d.attendance?.wfh || 0} />
          <Kpi icon="🌴" color="#f59e0b" label="On leave" value={d.onLeave} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "ceo" ? <CeoDashboard /> : <HrView />;
}