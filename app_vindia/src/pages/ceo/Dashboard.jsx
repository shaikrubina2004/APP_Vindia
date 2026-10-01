import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { useAuth } from "../../context/useAuth.jsx";
import API from "../../services/authService";
import { getCeoDashboard, inr, inrShort, cap, timeAgo } from "../../services/ceoService";
import "./CEOBase.css";
import "./Dashboard.css";

const REFRESH_MS = 60000;
const COST_COLORS = ["#2d6cf6", "#7aa7ff", "#b9cffb", "#1b2a4e"];
const tip = {
  contentStyle: { background: "#1b2a4e", border: 0, borderRadius: 12, color: "#fff", fontSize: 12.5, boxShadow: "0 12px 26px rgba(27,42,78,.28)" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#a9b8dc", marginBottom: 4 }, cursor: { stroke: "#c9d8f7", strokeDasharray: "4 4" },
};
const axis = { fill: "#8b98b5", fontSize: 12 };
const ini = (n = "") => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
const tone = (s = "") => {
  const x = s.toLowerCase();
  if (x.includes("complet")) return "ok";
  if (x.includes("delay") || x.includes("hold") || x.includes("cancel")) return "bad";
  if (x.includes("progress") || x.includes("active") || x.includes("ongoing")) return "info";
  return "";
};

/* rotating blue card, like the "news" card in the reference */
function Brief({ slides, onGo }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold || slides.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [hold, slides.length]);
  const s = slides[i % slides.length];
  return (
    <div className="cx-feature dsh-brief" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="dsh-brief-top"><span className="dsh-orb" /><span className="dsh-tag">Today's brief</span></div>
      <h3 key={`t${i}`}>{s.title}</h3>
      <p key={`p${i}`}>{s.text}</p>
      <button className="dsh-cta" onClick={() => onGo(s.path)}>{s.cta}</button>
      <div className="dsh-segs">{slides.map((_, k) => <button key={k} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} />)}</div>
    </div>
  );
}

function BudgetTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="dsh-tip"><b>{p.full}</b>
      <div><i style={{ background: "#cfdcfa" }} />Budget<span>{inrShort(p.budget)}</span></div>
      <div><i style={{ background: "#5b93ff" }} />Spent<span>{inrShort(p.spent)}</span></div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="cx-page">
      <div className="cx-skel" style={{ height: 44, width: 340 }} />
      <div className="cx-skel" style={{ height: 38, width: 520, borderRadius: 99 }} />
      <div className="cx-grid dsh-row1">{[...Array(4)].map((_, i) => <div key={i} className="cx-skel" style={{ height: 250 }} />)}</div>
      <div className="cx-skel" style={{ height: 300 }} />
    </div>
  );
}

function CeoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState(6);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [sort, setSort] = useState({ key: "id", dir: "desc" });

  const load = useCallback(async (fresh) => {
    setBusy(true);
    try { setData(await getCeoDashboard(projectId || undefined, fresh)); setError(null); }
    catch { setError("Could not load dashboard data. Check that the server is running."); }
    finally { setBusy(false); }
  }, [projectId]);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(false); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const projects = useMemo(() => data?.projects || [], [data]);
  const monthly = useMemo(() => (data?.monthly || []).slice(-range), [data, range]);
  const profitSeries = useMemo(() => monthly.map((m) => ({ label: m.label, profit: m.income - m.expense })), [monthly]);
  const statuses = useMemo(() => [...new Set(projects.map((p) => (p.status || "").toLowerCase()).filter(Boolean))], [projects]);
  const rows = useMemo(() => {
    const r = projects.filter((p) =>
      (statusF === "all" || (p.status || "").toLowerCase() === statusF) &&
      `${p.name} ${p.client}`.toLowerCase().includes(q.toLowerCase()));
    return r.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      const c = typeof x === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
      return sort.dir === "asc" ? c : -c;
    });
  }, [projects, q, statusF, sort]);
  const by = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const arrow = (k) => (sort.key === k ? (sort.dir === "asc" ? " ↑" : " ↓") : "");

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Project", "Client", "Status", "Budget", "Spent", "Progress %"].map(esc).join(","),
      ...rows.map((p) => [p.name, p.client, p.status, p.budget, p.spent, p.progress].map(esc).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `projects-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!data && !error) return <Skeleton />;
  if (!data) return <div className="cx-page"><div className="cx-msg err">{error}</div><div><button className="cx-pill primary" onClick={() => load(true)}>Retry</button></div></div>;

  const { finance, hr, leads, wbsCost, wbsOverview, managers } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const activeCount = projects.filter((p) => !/complet|cancel/i.test(p.status || "")).length;
  const leadTotal = leads.reduce((s, l) => s + l.count, 0);
  const leadMax = Math.max(1, ...leads.map((l) => l.count));
  const costTotal = wbsCost.reduce((s, c) => s + c.value, 0);
  const presentPct = hr.employees ? Math.round((hr.presentToday / hr.employees) * 100) : 0;
  const awaiting = managers.pendingReports + managers.pendingFinanceUpdates;
  const last = profitSeries.length ? profitSeries[profitSeries.length - 1].profit : 0;
  const prev = profitSeries.length > 1 ? profitSeries[profitSeries.length - 2].profit : 0;
  const delta = prev ? Math.round(((last - prev) / Math.abs(prev)) * 100) : null;
  const focus = (projects.filter((p) => !/complet|cancel/i.test(p.status || "")).length ? projects.filter((p) => !/complet|cancel/i.test(p.status || "")) : projects).slice(0, 4);
  const budgetRows = projects.filter((p) => p.budget > 0).slice(0, 6).reverse()
    .map((p) => ({ full: p.name, name: p.name.length > 10 ? `${p.name.slice(0, 9)}…` : p.name, budget: p.budget, spent: p.spent }));
  const avgBudget = budgetRows.length ? budgetRows.reduce((s, r) => s + r.budget, 0) / budgetRows.length : 0;

  const slides = [
    { title: "Manager updates", text: `${managers.submittedToday} of ${managers.total} managers have reported today. ${awaiting} item${awaiting === 1 ? " is" : "s are"} waiting for your review.`, cta: "Open reports", path: "/reports?tab=daily" },
    { title: "Receivables", text: `${inrShort(finance.receivable)} is still outstanding, with ${finance.overdueInvoices} overdue invoice${finance.overdueInvoices === 1 ? "" : "s"}.`, cta: "Open finance", path: "/finance-manager/dashboard" },
    { title: "People today", text: `${hr.presentToday} of ${hr.employees} employees are present. ${hr.pendingLeaves} leave request${hr.pendingLeaves === 1 ? " is" : "s are"} pending.`, cta: "Open HR", path: "/hr" },
  ];

  return (
    <div className="cx-page">
      <div className="cx-header">
        <div>
          <h1 className="cx-hello">{greeting}, <span>{user?.name}!</span></h1>
          <p className="cx-lead">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · updated {timeAgo(data.generatedAt)}</p>
        </div>
        <button className="cx-pill primary" onClick={() => navigate("/reports?tab=daily")}>+ Open reports</button>
      </div>

      <div className="cx-pillbar">
        <select className="cx-pill" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Filter by project">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="cx-seg">{[3, 6].map((n) => <button key={n} className={range === n ? "active" : ""} onClick={() => setRange(n)}>{n} months</button>)}</div>
        <button className="cx-pill" onClick={() => load(true)} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button>
        <span className="grow" />
        <button className="cx-pill" onClick={exportCsv}>Download data</button>
        <button className="cx-pill" onClick={() => navigate("/analytics")}>Analytics</button>
      </div>
      {error && <div className="cx-msg err">{error}</div>}

      {/* ROW 1 */}
      <div className="cx-grid dsh-row1">
        <div className="cx-card">
          <div className="cx-card-head"><div><h3>Income vs expense</h3><div className="cx-sub">Paid invoices and approved expenses</div></div></div>
          {monthly.every((m) => !m.income && !m.expense) ? <div className="cx-empty">No finance activity in this period.</div> : (
            <div style={{ height: 190 }}>
              <ResponsiveContainer>
                <AreaChart data={monthly} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d6cf6" stopOpacity={0.18} /><stop offset="100%" stopColor="#2d6cf6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#eef2f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
                  <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} tick={axis} />
                  <Tooltip formatter={(v) => inr(v)} {...tip} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#b9cffb" strokeWidth={2.5} fill="none" isAnimationActive={false} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#2d6cf6" strokeWidth={2.5} fill="url(#gInc)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <Brief slides={slides} onGo={navigate} />

        <div className="cx-card">
          <div className="cx-card-head"><h3>Net profit</h3></div>
          <div className="dsh-profit">
            <span className="cx-big">{inrShort(finance.profit)}</span>
            {delta !== null && <span className={`cx-delta ${delta < 0 ? "neg" : ""}`}>{delta > 0 ? "+" : ""}{delta}%</span>}
          </div>
          <div className="cx-sub" style={{ marginBottom: 6 }}>{finance.profit >= 0 ? "Revenue minus approved expenses" : "Expenses exceed revenue"}</div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer>
              <AreaChart data={profitSeries} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs><linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d6cf6" stopOpacity={0.22} /><stop offset="100%" stopColor="#2d6cf6" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
                <Tooltip formatter={(v) => inr(v)} {...tip} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#2d6cf6" strokeWidth={2.5} fill="url(#gProf)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cx-card">
          <div className="cx-card-head"><h3>Project progress</h3><button className="cx-more" onClick={() => navigate("/project-manager/dashboard")}>See details</button></div>
          {focus.length === 0 ? <div className="cx-empty">No projects yet.</div> : (
            <div className="dsh-plist">
              {focus.map((p) => (
                <div key={p.id} className="dsh-pitem" onClick={() => setProjectId(String(p.id))} title="Focus dashboard on this project">
                  <span className="dsh-pico">{ini(p.name)}</span>
                  <div className="body"><b>{p.name}</b><div className="cx-bar"><i style={{ width: `${Math.min(100, p.progress)}%` }} /></div></div>
                  <span className="cx-sub" style={{ margin: 0 }}>{p.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROW 2 */}
      <div className="cx-grid dsh-row2">
        <div className="cx-card">
          <div className="cx-card-head"><h3>Company snapshot</h3><button className="cx-more" onClick={() => navigate("/finance-manager/dashboard")}>See details</button></div>
          <div className="dsh-user"><span className="cx-avatar">{ini(user?.name)}</span><div><b>{user?.name}</b><small>Chief Executive Officer</small></div></div>
          <div className="dsh-facts">
            <div className="dsh-fact"><span>Revenue</span><b>{inrShort(finance.revenue)}</b></div>
            <div className="dsh-fact"><span>Expenses</span><b>{inrShort(finance.expenses)}</b></div>
            <div className="dsh-fact"><span>Receivable</span><b>{inrShort(finance.receivable)}</b></div>
            <div className="dsh-fact"><span>Overdue invoices</span><b>{finance.overdueInvoices}</b></div>
            <div className="dsh-fact link" onClick={() => navigate("/project-manager/dashboard")}><span>Active projects</span><b>{activeCount} of {projects.length}</b></div>
            <div className="dsh-fact link" onClick={() => navigate("/hr/attendance")}><span>Employees present</span><b>{hr.presentToday} of {hr.employees}</b></div>
          </div>
        </div>

        <div className="cx-card dsh-wide">
          <div className="cx-card-head">
            <div><h3>Project budget report</h3><div className="cx-sub">Budget against spend, latest projects</div></div>
            <div className="dsh-legend"><span><i style={{ background: "#cfdcfa" }} />Budget</span><span><i style={{ background: "#2d6cf6" }} />Spent</span></div>
          </div>
          {budgetRows.length === 0 ? <div className="cx-empty">No project budgets recorded yet.</div> : (
            <div style={{ height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={budgetRows} barGap={-46} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs><linearGradient id="gSpent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b93ff" /><stop offset="100%" stopColor="#2d6cf6" /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#eef2f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={axis} />
                  <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} tick={axis} />
                  <Tooltip content={<BudgetTip />} cursor={{ fill: "transparent" }} />
                  <ReferenceLine y={avgBudget} stroke="#2d6cf6" strokeDasharray="6 6" strokeOpacity={0.55} />
                  <Bar dataKey="budget" barSize={46} fill="#f1f5fe" stroke="#dbe5fb" radius={[14, 14, 14, 14]} isAnimationActive={false} />
                  <Bar dataKey="spent" barSize={46} fill="url(#gSpent)" radius={[14, 14, 14, 14]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="cx-card">
          <div className="cx-card-head"><div><h3>Managers</h3><div className="cx-sub">{managers.submittedToday} of {managers.total} reported today</div></div>
            <button className="cx-more" onClick={() => navigate("/reports?tab=daily")}>See details</button></div>
          {managers.list.length === 0 ? <div className="cx-empty">No manager accounts found.</div> : managers.list.map((m) => (
            <div key={m.id} className="dsh-mgr" onClick={() => navigate(`/reports?tab=daily&role=${m.role}`)}>
              <span className="cx-avatar">{ini(m.name)}</span>
              <div className="body"><b>{m.name}</b><small>{m.roleLabel}</small></div>
              <span className={`cx-status ${m.submittedToday ? "ok" : "warn"}`}>{m.submittedToday ? "Reported" : "Pending"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 3 */}
      <div className="cx-grid dsh-row3">
        <div className="cx-card">
          <div className="cx-card-head"><div><h3>WBS overview</h3><div className="cx-sub">{projectId ? "Selected project" : "All projects"}</div></div></div>
          <div className="dsh-trio">
            <div><strong>{wbsOverview.total}</strong><span>Packages</span></div>
            <div><strong>{wbsOverview.inProgress}</strong><span>In progress</span></div>
            <div><strong>{wbsOverview.completed}</strong><span>Completed</span></div>
          </div>
          <div className="cx-bar"><i style={{ width: `${wbsOverview.avgProgress}%` }} /></div>
          <div className="cx-sub" style={{ marginTop: 6 }}>Average completion {wbsOverview.avgProgress}%</div>
          {costTotal > 0 && (
            <>
              <div className="dsh-split">{wbsCost.map((c, i) => <i key={c.key} title={c.label} style={{ width: `${(c.value / costTotal) * 100}%`, background: COST_COLORS[i] }} />)}</div>
              <ul className="dsh-key">{wbsCost.map((c, i) => <li key={c.key}><i style={{ background: COST_COLORS[i] }} />{c.label}<b>{inrShort(c.value)}</b><small>{Math.round((c.value / costTotal) * 100)}%</small></li>)}</ul>
            </>
          )}
        </div>

        <div className="cx-card">
          <div className="cx-card-head"><div><h3>Lead pipeline</h3><div className="cx-sub">{leadTotal} leads</div></div><button className="cx-more" onClick={() => navigate("/bda/leads")}>See details</button></div>
          {leads.length === 0 ? <div className="cx-empty">No leads yet.</div> : leads.map((l) => (
            <div className="dsh-lead" key={l.status}><span>{cap(l.status)}</span><div className="cx-bar"><i style={{ width: `${(l.count / leadMax) * 100}%` }} /></div><b>{l.count}</b></div>
          ))}
        </div>

        <div className="cx-card">
          <div className="cx-card-head"><div><h3>HR overview</h3><div className="cx-sub">Today's workforce</div></div><button className="cx-more" onClick={() => navigate("/hr")}>See details</button></div>
          <div className="dsh-hr-big"><span className="cx-big">{presentPct}%</span><span className="cx-sub" style={{ margin: 0 }}>present today</span></div>
          <div className="cx-bar"><i style={{ width: `${presentPct}%` }} /></div>
          <ul className="dsh-list">
            <li className="link" onClick={() => navigate("/hr/employees")}><span>Total employees</span><b>{hr.employees}</b></li>
            <li className="link" onClick={() => navigate("/hr/attendance")}><span>Present today</span><b>{hr.presentToday}</b></li>
            <li><span>On leave</span><b>{hr.onLeave}</b></li>
            <li><span>Pending leave requests</span><b>{hr.pendingLeaves}</b></li>
          </ul>
        </div>
      </div>

      {/* PROJECTS */}
      <div className="cx-card">
        <div className="cx-card-head"><div><h3>Projects</h3><div className="cx-sub">{rows.length} of {projects.length} · click a row to focus the dashboard</div></div></div>
        <div className="cx-pillbar" style={{ marginBottom: 12 }}>
          <input className="cx-pill" placeholder="Search project or client" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="cx-pill" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
        </div>
        {rows.length === 0 ? <div className="cx-empty">No projects match.</div> : (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead><tr>
                <th className="sort" onClick={() => by("name")}>Project{arrow("name")}</th>
                <th className="sort" onClick={() => by("client")}>Client{arrow("client")}</th>
                <th className="sort" onClick={() => by("status")}>Status{arrow("status")}</th>
                <th className="sort" onClick={() => by("budget")}>Budget{arrow("budget")}</th>
                <th className="sort" onClick={() => by("spent")}>Spent{arrow("spent")}</th>
                <th className="sort" onClick={() => by("progress")}>Progress{arrow("progress")}</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => {
                  const over = p.budget > 0 && p.spent > p.budget;
                  return (
                    <tr key={p.id} className="click" onClick={() => setProjectId(String(p.id))}>
                      <td><b style={{ fontWeight: 600 }}>{p.name}</b></td>
                      <td className="cx-muted">{p.client || "—"}</td>
                      <td><span className={`cx-tag ${tone(p.status)}`}>{cap(p.status) || "—"}</span></td>
                      <td>{inrShort(p.budget)}</td>
                      <td className={over ? "dsh-over" : ""}>{inrShort(p.spent)}</td>
                      <td style={{ minWidth: 140 }}><div className="cx-bar"><i style={{ width: `${Math.min(100, p.progress)}%` }} /></div><small className="cx-muted">{p.progress}%</small></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dsh-links">
        {[["HR management", "/hr"], ["Finance", "/finance-manager/dashboard"], ["Projects", "/project-manager/dashboard"], ["Attendance", "/hr/attendance"], ["Payroll", "/hr/payroll"], ["Reports", "/reports"], ["Analytics", "/analytics"]]
          .map(([label, path]) => <button key={path} type="button" className="cx-pill" onClick={() => navigate(path)}>{label}</button>)}
      </div>
    </div>
  );
}

/* /dashboard is shared with the HR Manager, who must not see company finance. */
function HrView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { API.get("/dashboard").then((r) => setD(r.data)).catch(() => setErr("Could not load HR dashboard.")); }, []);
  const K = ({ label, value }) => <div className="cx-kpi"><span>{label}</span><strong>{value}</strong></div>;
  return (
    <div className="cx-page">
      <div className="cx-header">
        <div><h1 className="cx-hello">Welcome, <span>{user?.name}!</span></h1><p className="cx-lead">HR overview</p></div>
        <button className="cx-pill primary" onClick={() => navigate("/hr")}>Open HR</button>
      </div>
      {err && <div className="cx-msg err">{err}</div>}
      {!d && !err && <div className="cx-skel" style={{ height: 96 }} />}
      {d && (
        <div className="cx-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <K label="Total employees" value={d.totalEmployees} /><K label="Present" value={d.attendance?.present || 0} />
          <K label="Work from home" value={d.attendance?.wfh || 0} /><K label="On leave" value={d.onLeave} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "ceo" ? <CeoDashboard /> : <HrView />;
}