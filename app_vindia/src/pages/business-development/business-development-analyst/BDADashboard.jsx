import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import "./BDADashboard.css";

/* ─────────────────────────────────────────
   API BASE — same backend as rest of app
───────────────────────────────────────── */
const API = "http://localhost:5000/api";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const SOURCE_COLORS = {
  JustDial:        "#2563eb",
  "Facebook/Meta": "#8b5cf6",
  facebook:        "#8b5cf6",
  Manual:          "#10b981",
  manual:          "#10b981",
  Excel:           "#f59e0b",
};

const STATUS_FUNNEL = [
  { key: "New",            label: "New Leads",   color: "#2563eb", bg: "#eff6ff" },
  { key: "Interested",     label: "Interested",  color: "#8b5cf6", bg: "#fdf4ff" },
  { key: "Follow Up",      label: "Follow-up",   color: "#f59e0b", bg: "#fff7ed" },
  { key: "Converted",      label: "Converted",   color: "#10b981", bg: "#f0fdf4" },
  { key: "Not Interested", label: "Not Interested", color: "#64748b", bg: "#f8fafc" },
  { key: "Junk",           label: "Junk / Lost", color: "#ef4444", bg: "#fef2f2" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getMonthLabel(dateStr) {
  return MONTHS[new Date(dateStr).getMonth()];
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
const Sk = ({ w = "100%", h = 16, r = 8, mb = 0 }) => (
  <div className="bda-skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />
);

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
const StatCard = ({ label, value, sub, subColor, accent, icon }) => (
  <div className="bda-stat-card" style={{ "--accent": accent }}>
    <div className="bda-stat-card__top">
      <span className="bda-stat-card__icon">{icon}</span>
    </div>
    <p className="bda-stat-card__label">{label}</p>
    <p className="bda-stat-card__value" style={{ color: accent }}>{value ?? "—"}</p>
    {sub && (
      <p className="bda-stat-card__sub" style={{ color: subColor || "#64748b" }}>{sub}</p>
    )}
  </div>
);

/* ─────────────────────────────────────────
   CUSTOM CHART TOOLTIP
───────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bda-tooltip">
      <p className="bda-tooltip__label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────
   SOURCE PILL
───────────────────────────────────────── */
const SourcePill = ({ source }) => {
  const map = {
    JustDial:        { bg: "#fff3cd", color: "#b45309" },
    "Facebook/Meta": { bg: "#dbeafe", color: "#1d4ed8" },
    facebook:        { bg: "#dbeafe", color: "#1d4ed8" },
    Manual:          { bg: "#f3e8ff", color: "#7c3aed" },
    manual:          { bg: "#f3e8ff", color: "#7c3aed" },
    Excel:           { bg: "#dcfce7", color: "#16a34a" },
  };
  const cfg = map[source] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span className="bda-source-pill" style={{ background: cfg.bg, color: cfg.color }}>
      {source || "—"}
    </span>
  );
};

/* ─────────────────────────────────────────
   STATUS PILL
───────────────────────────────────────── */
const StatusPill = ({ status }) => {
  const map = {
    New:              { bg: "#eff6ff", color: "#2563eb" },
    Interested:       { bg: "#fdf4ff", color: "#7c3aed" },
    "Follow Up":      { bg: "#fff7ed", color: "#ea580c" },
    Converted:        { bg: "#f0fdf4", color: "#16a34a" },
    Junk:             { bg: "#fef2f2", color: "#dc2626" },
    JUNK_REQUESTED:   { bg: "#fef2f2", color: "#dc2626" },
    "Not Interested": { bg: "#f8fafc", color: "#64748b" },
  };
  const cfg = map[status] || { bg: "#f8fafc", color: "#64748b" };
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
  const [loading, setLoading]   = useState(true);
  const [summary, setSummary]   = useState(null);
  const [leads, setLeads]       = useState([]);
  const [activeTab, setActiveTab] = useState("month");
  const [error, setError]       = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  /* ── Fetch summary + all leads from your MySQL backend ── */
  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, leadsRes] = await Promise.all([
        axios.get(`${API}/leads/dashboard-summary`),
        axios.get(`${API}/leads`),
      ]);

      setSummary(summaryRes.data);
      setLeads(leadsRes.data.leads || []);
    } catch (err) {
      console.error("BDA Dashboard fetch error:", err);
      setError("Could not load dashboard data. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Source donut data ── */
  const sourceData = (() => {
    const counts = {};
    leads.forEach(l => {
      const src = l.source || "Manual";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  /* ── Trend line: last 6 months by source ── */
  const trendData = (() => {
    const now = new Date();
    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = MONTHS[d.getMonth()];
      buckets[key] = { month: key, JustDial: 0, "Facebook/Meta": 0, Manual: 0 };
    }
    leads.forEach(l => {
      if (!l.created_at) return;
      const m = getMonthLabel(l.created_at);
      if (!buckets[m]) return;
      const src = l.source || "Manual";
      if (src === "JustDial")                        buckets[m].JustDial++;
      else if (src === "facebook" || src === "Facebook/Meta") buckets[m]["Facebook/Meta"]++;
      else                                            buckets[m].Manual++;
    });
    return Object.values(buckets);
  })();

  /* ── Funnel counts ── */
  const funnelData = STATUS_FUNNEL.map(s => ({
    ...s,
    count: leads.filter(l => l.status === s.key).length,
  }));
  const maxFunnel = Math.max(...funnelData.map(f => f.count), 1);

  /* ── Recent 6 leads ── */
  const recentLeads = leads.slice(0, 6);

  const convRate = summary?.totalLeads
    ? ((summary.converted / summary.totalLeads) * 100).toFixed(1)
    : "0.0";

  /* ── Error state ── */
  if (error) {
    return (
      <div className="bda-dashboard">
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 12, padding: "20px 24px", color: "#dc2626",
          fontSize: 14, marginTop: 20,
        }}>
          ⚠ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bda-dashboard">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Dashboard</p>
          <h1 className="bda-title">Business Development Analyst</h1>
        </div>
        <div className="bda-header-actions">
          <button className="bda-btn-outline" onClick={() => navigate("/bda/reports")}>
            Export Report
          </button>
          <button className="bda-btn-primary" onClick={() => navigate("/bda/add-lead")}>
            + Add Lead
          </button>
        </div>
      </div>

      {/* ── TAB ROW ── */}
      <div className="bda-tab-row">
        {[
          { key: "today", label: "Today" },
          { key: "week",  label: "This Week" },
          { key: "month", label: "This Month" },
        ].map(t => (
          <button
            key={t.key}
            className={`bda-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="bda-stats-row">
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="bda-stat-card">
              <Sk h={80} />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total Leads"
              value={summary?.totalLeads}
              sub="All time"
              accent="#2563eb"
              icon="🎯"
            />
            <StatCard
              label="New Today"
              value={summary?.todayLeads}
              sub="Added today"
              accent="#10b981"
              icon="✨"
            />
            <StatCard
              label="Follow-ups Due"
              value={summary?.todayFollowUps}
              sub={
                summary?.pendingFollowUps > 0
                  ? `⚠ ${summary.pendingFollowUps} overdue`
                  : "All on track"
              }
              subColor={summary?.pendingFollowUps > 0 ? "#ef4444" : "#10b981"}
              accent="#f59e0b"
              icon="📞"
            />
            <StatCard
              label="Converted"
              value={summary?.converted}
              sub={`${convRate}% conversion rate`}
              accent="#7c3aed"
              icon="🏆"
            />
          </>
        )}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="bda-charts-row">

        {/* Trend Line */}
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
              { name: "JustDial",        color: "#2563eb" },
              { name: "Facebook/Meta",   color: "#8b5cf6" },
              { name: "Manual",          color: "#10b981" },
            ].map(({ name, color }) => (
              <span key={name} className="bda-legend-item">
                <span className="bda-legend-dot" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
          {loading ? <Sk h={210} r={10} /> : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={trendData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="JustDial" name="JustDial"
                  stroke="#2563eb" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Facebook/Meta" name="Facebook/Meta"
                  stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Manual" name="Manual"
                  stroke="#10b981" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source Donut */}
        <div className="bda-card">
          <div className="bda-card-header">
            <div>
              <h3 className="bda-card-title">Lead Sources</h3>
              <p className="bda-card-sub">Distribution — all leads</p>
            </div>
            <span className="bda-badge bda-badge--green">Live</span>
          </div>
          {loading ? <Sk h={220} r={10} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend
                  iconType="square"
                  iconSize={10}
                  formatter={v => (
                    <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span>
                  )}
                />
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
              <p className="bda-card-sub">Current pipeline status</p>
            </div>
          </div>
          <div className="bda-funnel">
            {loading ? (
              [1,2,3,4,5,6].map(i => <Sk key={i} h={52} r={10} mb={8} />)
            ) : (
              funnelData.map(f => (
                <div key={f.key} className="bda-funnel-item" style={{ background: f.bg }}>
                  <div style={{ flex: 1 }}>
                    <div className="bda-funnel-label" style={{ color: f.color }}>{f.label}</div>
                    <div className="bda-funnel-bar-bg">
                      <div
                        className="bda-funnel-bar"
                        style={{
                          width: `${(f.count / maxFunnel) * 100}%`,
                          background: f.color,
                        }}
                      />
                    </div>
                  </div>
                  <div className="bda-funnel-count" style={{ color: f.color }}>{f.count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bda-card">
          <div className="bda-card-header">
            <div>
              <h3 className="bda-card-title">Recent Leads</h3>
              <p className="bda-card-sub">Latest 6 entries</p>
            </div>
            <button
              className="bda-badge bda-badge--blue"
              style={{ cursor: "pointer", border: "none" }}
              onClick={() => navigate("/bda/leads")}
            >
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
                      <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}>
                        No leads yet
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map(lead => (
                      <tr
                        key={lead.id}
                        className="bda-table-row"
                        onClick={() => navigate("/bda/leads")}
                        style={{ cursor: "pointer" }}
                      >
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