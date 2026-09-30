import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "../../context/useAuth.jsx";
import API from "../../services/authService";
import { getCeoDashboard, inr, inrShort, cap, timeAgo } from "../../services/ceoService";
import "./CEOBase.css";
import "./Dashboard.css";

const REFRESH_MS = 60000;
const COST_COLORS = ["#2563eb", "#64748b", "#94a3b8", "#cbd5e1"];

const tone = (s = "") => {
  const x = s.toLowerCase();
  if (x.includes("complet")) return "ok";
  if (x.includes("delay") || x.includes("hold") || x.includes("cancel")) return "bad";
  if (x.includes("progress") || x.includes("active") || x.includes("ongoing")) return "info";
  return "";
};

function Kpi({ label, value, sub, onClick }) {
  return (
    <button type="button" className={`cx-kpi ${onClick ? "link" : ""}`} onClick={onClick}>
      <span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="cx-page">
      <div className="cx-skel" style={{ height: 46, width: 320 }} />
      <div className="cx-grid kpi">{[...Array(4)].map((_, i) => <div key={i} className="cx-skel" style={{ height: 88 }} />)}</div>
      <div className="cx-skel" style={{ height: 280 }} />
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
  useEffect(() => {          // quiet auto-refresh, only while the tab is visible
    const t = setInterval(() => { if (!document.hidden) load(false); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const projects = useMemo(() => data?.projects || [], [data]);
  const monthly = useMemo(() => (data?.monthly || []).slice(-range), [data, range]);
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

  if (!data && !error) return <Skeleton />;
  if (!data) return <div className="cx-page"><div className="cx-msg err">{error}</div><div><button className="cx-btn" onClick={() => load(true)}>Retry</button></div></div>;

  const { finance, hr, leads, wbsCost, wbsOverview, managers } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const activeCount = projects.filter((p) => !/complet|cancel/i.test(p.status || "")).length;
  const leadTotal = leads.reduce((s, l) => s + l.count, 0);
  const leadMax = Math.max(1, ...leads.map((l) => l.count));
  const costTotal = wbsCost.reduce((s, c) => s + c.value, 0);
  const presentPct = hr.employees ? Math.round((hr.presentToday / hr.employees) * 100) : 0;
  const awaiting = managers.pendingReports + managers.pendingFinanceUpdates;

  return (
    <div className="cx-page">
      <div className="cx-header">
        <div>
          <div className="cx-crumb">Overview</div>
          <h1 className="cx-title">{greeting}, {user?.name}</h1>
          <p className="cx-subtitle">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="cx-actions">
          <span className="cx-updated">Updated {timeAgo(data.generatedAt)}</span>
          <select className="cx-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Filter by project">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="cx-btn outline" onClick={() => load(true)} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button>
        </div>
      </div>
      {error && <div className="cx-msg err">{error}</div>}

      <div className="cx-section">Financial snapshot</div>
      <div className="cx-grid kpi">
        <Kpi label="Revenue (paid invoices)" value={inrShort(finance.revenue)} sub={`${inrShort(finance.receivable)} receivable`} onClick={() => navigate("/finance-manager/dashboard")} />
        <Kpi label="Expenses (approved)" value={inrShort(finance.expenses)} onClick={() => navigate("/finance-manager/dashboard")} />
        <Kpi label="Net profit" value={inrShort(finance.profit)} sub={finance.profit >= 0 ? "In profit" : "In loss"} />
        <Kpi label="Overdue invoices" value={finance.overdueInvoices} sub="Need follow-up" onClick={() => navigate("/finance-manager/dashboard")} />
      </div>

      <div className="cx-section">Operations today</div>
      <div className="cx-grid kpi">
        <Kpi label="Active projects" value={activeCount} sub={`${projects.length} in total`} onClick={() => navigate("/project-manager/dashboard")} />
        <Kpi label="Employees present" value={hr.presentToday} sub={`of ${hr.employees} (${presentPct}%)`} onClick={() => navigate("/hr/attendance")} />
        <Kpi label="Leads in pipeline" value={leadTotal} onClick={() => navigate("/bda/leads")} />
        <Kpi label="Awaiting your review" value={awaiting} sub="Manager reports and updates" onClick={() => navigate("/reports?tab=daily&status=pending")} />
      </div>

      <div className="cx-card">
        <div className="cx-card-head">
          <div><h3>Income vs expense</h3><div className="cx-card-sub">Paid invoices against approved expenses</div></div>
          <div className="cx-seg">{[3, 6].map((n) => <button key={n} className={range === n ? "active" : ""} onClick={() => setRange(n)}>{n} months</button>)}</div>
        </div>
        {monthly.every((m) => !m.income && !m.expense) ? <div className="cx-empty">No finance activity in this period.</div> : (
          <div style={{ height: 270 }}>
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={62} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#2563eb" strokeWidth={2} fill="#2563eb" fillOpacity={0.07} isAnimationActive={false} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#94a3b8" strokeWidth={2} fill="#94a3b8" fillOpacity={0.07} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h3>Projects</h3><div className="cx-card-sub">{rows.length} of {projects.length} · click a row to focus the dashboard</div></div></div>
        <div className="cx-toolbar">
          <input className="cx-input" placeholder="Search project or client" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="cx-select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
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
                      <td><b style={{ fontWeight: 500 }}>{p.name}</b></td>
                      <td className="cx-muted">{p.client || "—"}</td>
                      <td><span className={`cx-status ${tone(p.status)}`}>{cap(p.status) || "—"}</span></td>
                      <td>{inrShort(p.budget)}</td>
                      <td className={over ? "dsh-over" : ""}>{inrShort(p.spent)}</td>
                      <td style={{ minWidth: 130 }}>
                        <div className="cx-bar"><i style={{ width: `${Math.min(100, p.progress)}%` }} /></div>
                        <small className="cx-muted">{p.progress}%</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cx-grid two">
        <div className="cx-card">
          <div className="cx-card-head"><div><h3>WBS progress</h3><div className="cx-card-sub">{projectId ? "Selected project" : "All projects"}</div></div></div>
          <div className="dsh-mini">
            <div><strong>{wbsOverview.total}</strong><span>Work packages</span></div>
            <div><strong>{wbsOverview.inProgress}</strong><span>In progress</span></div>
            <div><strong>{wbsOverview.completed}</strong><span>Completed</span></div>
          </div>
          <div className="cx-bar"><i style={{ width: `${wbsOverview.avgProgress}%` }} /></div>
          <div className="cx-card-sub" style={{ marginTop: 6 }}>Average completion {wbsOverview.avgProgress}%</div>
        </div>
        <div className="cx-card">
          <div className="cx-card-head"><div><h3>WBS cost breakdown</h3><div className="cx-card-sub">Total {inrShort(costTotal)}</div></div></div>
          {costTotal === 0 ? <div className="cx-empty">No WBS costs recorded yet.</div> : (
            <>
              <div className="dsh-split">{wbsCost.map((c, i) => <i key={c.key} title={c.label} style={{ width: `${(c.value / costTotal) * 100}%`, background: COST_COLORS[i] }} />)}</div>
              <ul className="dsh-legend">
                {wbsCost.map((c, i) => (
                  <li key={c.key}><i style={{ background: COST_COLORS[i] }} />{c.label}<b>{inrShort(c.value)}</b><small>{Math.round((c.value / costTotal) * 100)}%</small></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="cx-grid two">
        <div className="cx-card">
          <div className="cx-card-head"><div><h3>Lead pipeline</h3><div className="cx-card-sub">{leadTotal} leads</div></div>
            <button className="cx-btn outline sm" onClick={() => navigate("/bda/leads")}>Open CRM</button></div>
          {leads.length === 0 ? <div className="cx-empty">No leads yet.</div> : leads.map((l) => (
            <div className="dsh-row" key={l.status}>
              <span>{cap(l.status)}</span>
              <div className="cx-bar"><i style={{ width: `${(l.count / leadMax) * 100}%` }} /></div>
              <b>{l.count}</b>
            </div>
          ))}
        </div>
        <div className="cx-card">
          <div className="cx-card-head"><div><h3>HR overview</h3><div className="cx-card-sub">Today's workforce</div></div>
            <button className="cx-btn outline sm" onClick={() => navigate("/hr")}>Open HR</button></div>
          <ul className="dsh-list">
            <li className="link" onClick={() => navigate("/hr/employees")}><span>Total employees</span><b>{hr.employees}</b></li>
            <li className="link" onClick={() => navigate("/hr/attendance")}><span>Present today</span><b>{hr.presentToday}</b></li>
            <li><span>On leave</span><b>{hr.onLeave}</b></li>
            <li><span>Pending leave requests</span><b>{hr.pendingLeaves}</b></li>
          </ul>
        </div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head">
          <div><h3>Manager daily updates</h3>
            <div className="cx-card-sub">{managers.submittedToday} of {managers.total} reported today · {awaiting} awaiting review</div></div>
          <button className="cx-btn outline sm" onClick={() => navigate("/reports?tab=daily")}>Open reports</button>
        </div>
        {managers.list.length === 0 ? <div className="cx-empty">No manager accounts found.</div> : managers.list.map((m) => (
          <div key={m.id} className="dsh-mgr" onClick={() => navigate(`/reports?tab=daily&role=${m.role}`)}>
            <div><b>{m.name}</b><small>{m.roleLabel}</small></div>
            <span className={`cx-status ${m.submittedToday ? "ok" : "warn"}`}>{m.submittedToday ? (m.lastSubmittedAt ? `Reported ${timeAgo(m.lastSubmittedAt)}` : "Reported") : "Not yet today"}</span>
          </div>
        ))}
      </div>

      <div className="cx-section">Quick links</div>
      <div className="dsh-links">
        {[["HR management", "/hr"], ["Finance", "/finance-manager/dashboard"], ["Projects", "/project-manager/dashboard"],
          ["Attendance", "/hr/attendance"], ["Payroll", "/hr/payroll"], ["Reports", "/reports"], ["Analytics", "/analytics"]].map(([label, path]) => (
          <button key={path} type="button" className="dsh-link" onClick={() => navigate(path)}>{label}<span>→</span></button>
        ))}
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
  return (
    <div className="cx-page">
      <div className="cx-header">
        <div><div className="cx-crumb">Overview</div><h1 className="cx-title">Welcome, {user?.name}</h1><p className="cx-subtitle">HR overview</p></div>
        <div className="cx-actions"><button className="cx-btn outline" onClick={() => navigate("/hr")}>Open HR</button></div>
      </div>
      {err && <div className="cx-msg err">{err}</div>}
      {!d && !err && <div className="cx-skel" style={{ height: 88 }} />}
      {d && (
        <div className="cx-grid kpi">
          <Kpi label="Total employees" value={d.totalEmployees} />
          <Kpi label="Present" value={d.attendance?.present || 0} />
          <Kpi label="Work from home" value={d.attendance?.wfh || 0} />
          <Kpi label="On leave" value={d.onLeave} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "ceo" ? <CeoDashboard /> : <HrView />;
}