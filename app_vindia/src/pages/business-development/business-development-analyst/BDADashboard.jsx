import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import "./BDADashboard.css";

const API = "http://localhost:5000/api";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─────────────────────────────────────────
   NORMALIZE SOURCE
   Converts any DB value → canonical bucket
───────────────────────────────────────── */
function normalizeSource(raw) {
  if (!raw) return "Manual";
  const s = raw.toLowerCase().trim();
  if (s === "justdial" || s === "just dial") return "JustDial";
  if (s === "meta" || s === "facebook" || s === "facebook/meta" || s === "fb") return "Facebook/Meta";
  if (s === "manual" || s === "excel") return "Manual";
  // Everything else (Website, Walk-in, Referral, modified, etc.) keep as-is
  // but still give them a colour
  return raw;
}

/* Colour palette — first 3 are fixed, rest auto-assigned */
const FIXED_COLORS = {
  JustDial:        "#2563eb",
  "Facebook/Meta": "#8b5cf6",
  Manual:          "#10b981",
};
const EXTRA_COLORS = ["#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316"];
let _extraIdx = 0;
const _colorCache = {};
function getSourceColor(name) {
  if (FIXED_COLORS[name]) return FIXED_COLORS[name];
  if (_colorCache[name])  return _colorCache[name];
  _colorCache[name] = EXTRA_COLORS[_extraIdx++ % EXTRA_COLORS.length];
  return _colorCache[name];
}

const STATUS_FUNNEL = [
  { key: "New",            label: "New Leads",      color: "#2563eb", bg: "#eff6ff" },
  { key: "Interested",     label: "Interested",      color: "#8b5cf6", bg: "#fdf4ff" },
  { key: "Follow Up",      label: "Follow-up",       color: "#f59e0b", bg: "#fff7ed" },
  { key: "Converted",      label: "Converted",       color: "#10b981", bg: "#f0fdf4" },
  { key: "Not Interested", label: "Not Interested",  color: "#64748b", bg: "#f8fafc" },
  { key: "Junk",           label: "Junk / Lost",     color: "#ef4444", bg: "#fef2f2" },
  { key: "__other__",      label: "Other / Untagged", color: "#94a3b8", bg: "#f1f5f9" },
];
/* ─────────────────────────────────────────
   DATE FILTER HELPER
───────────────────────────────────────── */
function filterByTab(leads, tab) {
  if (tab === "all") return leads;   // ← All Time shows everything

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    if (tab === "today") {
      return d >= today;
    }
    if (tab === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return d >= weekAgo;
    }
    if (tab === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= monthStart;
    }
    return true;
  });
}

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
const Sk = ({ w="100%", h=16, r=8, mb=0 }) => (
  <div className="bda-skeleton" style={{ width:w, height:h, borderRadius:r, marginBottom:mb }} />
);

const StatCard = ({ label, value, sub, subColor, accent, icon }) => (
  <div className="bda-stat-card" style={{ "--accent": accent }}>
    <div className="bda-stat-card__top">
      <span className="bda-stat-card__icon">{icon}</span>
    </div>
    <p className="bda-stat-card__label">{label}</p>
    <p className="bda-stat-card__value" style={{ color: accent }}>{value ?? 0}</p>
    {sub && <p className="bda-stat-card__sub" style={{ color: subColor || "#64748b" }}>{sub}</p>}
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bda-tooltip">
      <p className="bda-tooltip__label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontSize:12, fontWeight:600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const SourcePill = ({ source }) => {
  const norm = normalizeSource(source);
  const color = getSourceColor(norm);
  // Lighten for background
  return (
    <span className="bda-source-pill" style={{
      background: color + "22",
      color: color,
      border: `1px solid ${color}44`,
    }}>
      {source || "—"}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const norm = (status || "").toLowerCase();
  const map = {
    new:            { bg: "#eff6ff", color: "#2563eb" },
    interested:     { bg: "#fdf4ff", color: "#7c3aed" },
    intrested:      { bg: "#fdf4ff", color: "#7c3aed" },
    "follow up":    { bg: "#fff7ed", color: "#ea580c" },
    converted:      { bg: "#f0fdf4", color: "#16a34a" },
    contacted:      { bg: "#ecfdf5", color: "#059669" },
    junk:           { bg: "#fef2f2", color: "#dc2626" },
    junk_requested: { bg: "#fef2f2", color: "#dc2626" },
    "not interested":{ bg: "#f8fafc", color: "#64748b" },
  };
  const cfg = map[norm] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span className="bda-status-pill" style={{ background: cfg.bg, color: cfg.color }}>
      {status || "—"}
    </span>
  );
};

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════ */
const BDADashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading]     = useState(true);
  const [allLeads, setAllLeads]   = useState([]);   // raw from backend
  const [fullSummary, setFullSummary] = useState(null); // backend summary (all-time)
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, leadsRes] = await Promise.all([
        axios.get(`${API}/leads/dashboard-summary`),
        axios.get(`${API}/leads`),
      ]);
      setFullSummary(summaryRes.data);
      setAllLeads(leadsRes.data.leads || []);
    } catch (err) {
      console.error("BDA Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Filtered leads based on active tab ── */
  const leads = useMemo(() => filterByTab(allLeads, activeTab), [allLeads, activeTab]);

  /* ── Tab-aware summary computed client-side ── */
  const summary = useMemo(() => {
    if (!leads.length && activeTab === "month") return fullSummary;
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalLeads:       leads.length,
      todayLeads:       allLeads.filter(l => l.created_at?.slice(0,10) === today).length,
      converted:        leads.filter(l => l.status?.toLowerCase() === "converted").length,
      todayFollowUps:   leads.filter(l => l.snooze_until?.slice(0,10) === today).length,
      pendingFollowUps: leads.filter(l => l.snooze_until && l.snooze_until.slice(0,10) < today).length,
    };
  }, [leads, allLeads, activeTab, fullSummary]);

  /* ── Source donut — normalized ── */
  const sourceData = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const src = normalizeSource(l.source);
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a,b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [leads]);

  /* ── Trend line: last 6 months, 3 buckets (JustDial / Facebook / Manual+others) ── */
  const trendData = useMemo(() => {
    const now = new Date();
    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = MONTHS[d.getMonth()];
      buckets[key] = { month: key, JustDial: 0, "Facebook/Meta": 0, Manual: 0 };
    }
    allLeads.forEach(l => {          // trend always uses ALL leads (not filtered)
      if (!l.created_at) return;
      const m = MONTHS[new Date(l.created_at).getMonth()];
      if (!buckets[m]) return;
      const norm = normalizeSource(l.source);
      if (norm === "JustDial")          buckets[m].JustDial++;
      else if (norm === "Facebook/Meta") buckets[m]["Facebook/Meta"]++;
      else                              buckets[m].Manual++;
    });
    return Object.values(buckets);
  }, [allLeads]);

  /* ── Funnel — case-insensitive match ── */
  const funnelData = useMemo(() => {
  const KNOWN_STATUSES = ["new", "interested", "intrested", "follow up",
    "converted", "not interested", "junk", "junk_requested"];

  return STATUS_FUNNEL.map(s => {
    if (s.key === "__other__") {
      return {
        ...s,
        count: leads.filter(l => {
          const norm = (l.status || "").toLowerCase();
          return !KNOWN_STATUSES.includes(norm);
        }).length,
      };
    }
    return {
      ...s,
      count: leads.filter(l =>
        (l.status || "").toLowerCase() === s.key.toLowerCase() ||
        (s.key === "Interested" && (l.status || "").toLowerCase() === "intrested")
      ).length,
    };
  });
}, [leads]);
  const maxFunnel = Math.max(...funnelData.map(f => f.count), 1);

  const recentLeads = leads.slice(0, 6);
  const convRate    = summary?.totalLeads
    ? ((summary.converted / summary.totalLeads) * 100).toFixed(1)
    : "0.0";

  const TAB_LABEL = { today: "Today", week: "This Week", month: "This Month", all: "All Time" };

  return (
    <div className="bda-dashboard">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Dashboard</p>
          <h1 className="bda-title">Business Development Analyst</h1>
        </div>
        <div className="bda-header-actions">
          <button className="bda-btn-outline" onClick={() => navigate("/bda/reports")}>Export Report</button>
          <button className="bda-btn-primary" onClick={() => navigate("/bda/add-lead")}>+ Add Lead</button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="bda-tab-row">
        {["all","today","week","month"].map(t => (
          <button
            key={t}
            className={`bda-tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="bda-stats-row">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="bda-stat-card"><Sk h={80} /></div>)
        ) : (
          <>
            <StatCard label="Total Leads"     value={summary?.totalLeads}
              sub={`Showing: ${TAB_LABEL[activeTab]}`} accent="#2563eb" icon="🎯" />
            <StatCard label="New Today"       value={summary?.todayLeads}
              sub="Added today" accent="#10b981" icon="✨" />
            <StatCard
              label="Follow-ups Due"
              value={summary?.todayFollowUps}
              sub={summary?.pendingFollowUps > 0 ? `⚠ ${summary.pendingFollowUps} overdue` : "All on track"}
              subColor={summary?.pendingFollowUps > 0 ? "#ef4444" : "#10b981"}
              accent="#f59e0b" icon="📞"
            />
            <StatCard label="Converted"       value={summary?.converted}
              sub={`${convRate}% conversion rate`} accent="#7c3aed" icon="🏆" />
          </>
        )}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="bda-charts-row">

        {/* Trend */}
        <div className="bda-card">
          <div className="bda-card-header">
            <div>
              <h3 className="bda-card-title">Lead Trend</h3>
              <p className="bda-card-sub">Monthly leads by source — last 6 months</p>
            </div>
            <span className="bda-badge bda-badge--blue">2025</span>
          </div>
          <div className="bda-legend-row">
            {[
              { name:"JustDial", color:"#2563eb" },
              { name:"Facebook/Meta", color:"#8b5cf6" },
              { name:"Manual", color:"#10b981" },
            ].map(({ name, color }) => (
              <span key={name} className="bda-legend-item">
                <span className="bda-legend-dot" style={{ background: color }} />{name}
              </span>
            ))}
          </div>
          {loading ? <Sk h={210} r={10} /> : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={trendData} margin={{ top:10, right:12, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="JustDial" name="JustDial" stroke="#2563eb" strokeWidth={2.5}
                  dot={{ r:4, fill:"#2563eb", stroke:"#fff", strokeWidth:2 }} activeDot={{ r:6 }} />
                <Line type="monotone" dataKey="Facebook/Meta" name="Facebook/Meta" stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ r:4, fill:"#8b5cf6", stroke:"#fff", strokeWidth:2 }} activeDot={{ r:6 }} />
                <Line type="monotone" dataKey="Manual" name="Manual" stroke="#10b981" strokeWidth={2.5}
                  dot={{ r:4, fill:"#10b981", stroke:"#fff", strokeWidth:2 }} activeDot={{ r:6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source Donut */}
        <div className="bda-card">
          <div className="bda-card-header">
            <div>
              <h3 className="bda-card-title">Lead Sources</h3>
              <p className="bda-card-sub">Distribution — {TAB_LABEL[activeTab].toLowerCase()}</p>
            </div>
            <span className="bda-badge bda-badge--green">Live</span>
          </div>
          {loading ? <Sk h={220} r={10} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={getSourceColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="square" iconSize={10}
                  formatter={v => <span style={{ fontSize:12, color:"#64748b" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="bda-bottom-row">

        {/* Funnel */}
        <div className="bda-card">
          <div className="bda-card-header">
            <div>
              <h3 className="bda-card-title">Lead Funnel</h3>
              <p className="bda-card-sub">Pipeline — {TAB_LABEL[activeTab].toLowerCase()}</p>
            </div>
          </div>
          <div className="bda-funnel">
            {loading ? (
              [1,2,3,4,5,6].map(i => <Sk key={i} h={52} r={10} mb={8} />)
            ) : (
              funnelData.map(f => (
                <div key={f.key} className="bda-funnel-item" style={{ background: f.bg }}>
                  <div style={{ flex:1 }}>
                    <div className="bda-funnel-label" style={{ color: f.color }}>{f.label}</div>
                    <div className="bda-funnel-bar-bg">
                      <div className="bda-funnel-bar"
                        style={{ width:`${(f.count/maxFunnel)*100}%`, background:f.color }} />
                    </div>
                  </div>
                  <div className="bda-funnel-count" style={{ color: f.color }}>{f.count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bda-card">
          <div className="bda-card-header">
            <div>
              <h3 className="bda-card-title">Recent Leads</h3>
              <p className="bda-card-sub">Latest 6 entries</p>
            </div>
            <button className="bda-badge bda-badge--blue"
              style={{ cursor:"pointer", border:"none" }}
              onClick={() => navigate("/bda/leads")}>
              View All →
            </button>
          </div>
          <div className="bda-table-wrap">
            {loading ? (
              [1,2,3,4,5].map(i => <Sk key={i} h={40} r={6} mb={6} />)
            ) : (
              <table className="bda-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign:"center", color:"#94a3b8", padding:"24px 0" }}>
                        No leads for {TAB_LABEL[activeTab].toLowerCase()}
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map(lead => (
                      <tr key={lead.id} className="bda-table-row"
                        onClick={() => navigate("/bda/leads")} style={{ cursor:"pointer" }}>
                        <td>
                          <div className="bda-lead-name">{lead.name}</div>
                          <div className="bda-lead-phone">{lead.phone}</div>
                        </td>
                        <td><SourcePill source={lead.source} /></td>
                        <td><StatusPill status={lead.status} /></td>
                        <td className="bda-assigned">{lead.assigned_to || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BDADashboard;