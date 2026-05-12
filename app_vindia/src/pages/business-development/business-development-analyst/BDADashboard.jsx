import React, { useState, useEffect, useMemo, useRef } from "react";
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
───────────────────────────────────────── */
function normalizeSource(raw) {
  if (!raw) return "Manual";
  const s = raw.toLowerCase().trim();
  if (s === "justdial" || s === "just dial") return "JustDial";
  if (["meta","facebook","facebook/meta","fb","meta ads"].includes(s)) return "Facebook/Meta";
  if (s === "manual" || s === "excel") return "Manual";
  return raw;
}

/* ─────────────────────────────────────────
   TIMEZONE-SAFE DATE HELPERS
───────────────────────────────────────── */
function toLocalDateStr(date) {
  return date.toLocaleDateString("en-CA");
}
function getTodayStr() {
  return toLocalDateStr(new Date());
}

/* ─────────────────────────────────────────
   COLOUR HELPERS
───────────────────────────────────────── */
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
  { key: "New",            label: "New Leads",       color: "#2563eb", bg: "#eff6ff" },
  { key: "Interested",     label: "Interested",       color: "#8b5cf6", bg: "#fdf4ff" },
  { key: "Follow Up",      label: "Follow-up",        color: "#f59e0b", bg: "#fff7ed" },
  { key: "Converted",      label: "Converted",        color: "#10b981", bg: "#f0fdf4" },
  { key: "Not Interested", label: "Not Interested",   color: "#64748b", bg: "#f8fafc" },
  { key: "Junk",           label: "Junk / Lost",      color: "#ef4444", bg: "#fef2f2" },
  { key: "__other__",      label: "Other / Untagged", color: "#94a3b8", bg: "#f1f5f9" },
];

/* ─────────────────────────────────────────
   DATE FILTER
───────────────────────────────────────── */
function filterByTab(leads, tab) {
  if (tab === "all") return leads;
  const now      = new Date();
  const todayStr = getTodayStr();
  return leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    if (tab === "today") return toLocalDateStr(d) === todayStr;
    if (tab === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return d >= weekAgo;
    }
    if (tab === "month") {
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth()    === now.getMonth();
    }
    return true;
  });
}

/* ─────────────────────────────────────────
   TIME FORMATTER
───────────────────────────────────────── */
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
const Sk = ({ w = "100%", h = 16, r = 8, mb = 0 }) => (
  <div className="bda-skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />
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
        <p key={p.dataKey} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const SourcePill = ({ source }) => {
  const norm  = normalizeSource(source);
  const color = getSourceColor(norm);
  return (
    <span className="bda-source-pill" style={{
      background: color + "22",
      color,
      border: `1px solid ${color}44`,
    }}>
      {source || "—"}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const norm = (status || "").toLowerCase();
  const map = {
    new:              { bg: "#eff6ff", color: "#2563eb" },
    interested:       { bg: "#fdf4ff", color: "#7c3aed" },
    intrested:        { bg: "#fdf4ff", color: "#7c3aed" },
    "follow up":      { bg: "#fff7ed", color: "#ea580c" },
    converted:        { bg: "#f0fdf4", color: "#16a34a" },
    contacted:        { bg: "#ecfdf5", color: "#059669" },
    junk:             { bg: "#fef2f2", color: "#dc2626" },
    junk_requested:   { bg: "#fef2f2", color: "#dc2626" },
    "not interested": { bg: "#f8fafc", color: "#64748b" },
  };
  const cfg = map[norm] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span className="bda-status-pill" style={{ background: cfg.bg, color: cfg.color }}>
      {status || "—"}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════
   CHECK-IN / CHECK-OUT BUTTON
   (reused from ProjectCoordinatorDashboard — same logic)
══════════════════════════════════════════════════════════ */
const CheckInButton = ({ employeeId }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);
  const [elapsed, setElapsed]       = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTodayAttendance();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (attendance?.check_in && !attendance?.check_out) {
      const tick = () => {
        const [h, m, s] = attendance.check_in.split(":").map(Number);
        const inMs  = (h * 3600 + m * 60 + s) * 1000;
        const nowMs = new Date() - new Date().setHours(0, 0, 0, 0);
        const diff  = Math.max(0, nowMs - inMs);
        const th = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const tm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const ts = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${th}:${tm}:${ts}`);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("");
    }
  }, [attendance]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/attendance/today?employee_id=${employeeId}`
      );
      setAttendance(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const now       = new Date();
      const timeStr   = now.toTimeString().slice(0, 8);
      const dateStr   = now.toISOString().slice(0, 10);
      const shiftStart = new Date();
      shiftStart.setHours(9, 0, 0, 0);
      const lateMinutes = Math.floor(Math.max(0, now - shiftStart) / 60000);

      const res = await axios.post(`${API}/attendance`, {
        employee_id:  employeeId,
        date:         dateStr,
        check_in:     timeStr,
        status:       "Present",
        shift:        "morning",
        late_minutes: lateMinutes,
        remarks:      lateMinutes > 0 ? `Late by ${lateMinutes} min` : "",
      });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      alert("Check-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendance?.id) return;
    setBusy(true);
    try {
      const timeStr = new Date().toTimeString().slice(0, 8);
      const res = await axios.put(`${API}/attendance/${attendance.id}`, {
        check_out: timeStr,
      });
      setAttendance(res.data);
      clearInterval(timerRef.current);
    } catch (err) {
      console.error(err);
      alert("Check-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isCheckedIn  = attendance?.check_in && !attendance?.check_out;
  const isCheckedOut = attendance?.check_in && attendance?.check_out;

  /* Loading */
  if (loading) {
    return (
      <button disabled style={{
        padding: "8px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0",
        background: "#f8fafc", color: "#94a3b8", fontSize: 13, fontWeight: 600,
        cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1", display: "inline-block" }} />
        Loading…
      </button>
    );
  }

  /* Done for today */
  if (isCheckedOut) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <button disabled style={{
          padding: "8px 18px", borderRadius: 10, border: "1.5px solid #86efac",
          background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700,
          cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          ✓ Done for Today
        </button>
        <span style={{ fontSize: 10, color: "#64748b" }}>
          {fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}
        </span>
      </div>
    );
  }

  /* Checked in — show Check Out */
  if (isCheckedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <button
          onClick={handleCheckOut}
          disabled={busy}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: busy ? "#fca5a5" : "#dc2626",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all .2s",
            boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#fff",
            display: "inline-block",
            animation: "bda-pulse 1.2s ease-in-out infinite",
          }} />
          {busy ? "Saving…" : "Check Out"}
        </button>
        <span style={{ fontSize: 10, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
          In: {fmtTime(attendance.check_in)}
          {elapsed && <> &nbsp;·&nbsp; <strong style={{ color: "#2563eb" }}>{elapsed}</strong></>}
        </span>
      </div>
    );
  }

  /* Not yet checked in */
  return (
    <button
      onClick={handleCheckIn}
      disabled={busy}
      style={{
        padding: "8px 18px", borderRadius: 10, border: "none",
        background: busy ? "#86efac" : "#16a34a",
        color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: busy ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 6,
        transition: "all .2s",
        boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
      {busy ? "Saving…" : "Check In"}
    </button>
  );
};

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════ */
const BDADashboard = () => {
  const navigate = useNavigate();

  const [loading,   setLoading]   = useState(true);
  const [allLeads,  setAllLeads]  = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [dbSummary, setDbSummary] = useState(null);

  // ── Get logged-in user id from localStorage ──
  const employeeId = JSON.parse(localStorage.getItem("user") || "{}")?.id || null;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, leadsRes] = await Promise.all([
        axios.get(`${API}/leads/dashboard-summary`),
        axios.get(`${API}/leads`),
      ]);
      setDbSummary(summaryRes.data);
      setAllLeads(leadsRes.data.leads || []);
    } catch (err) {
      console.error("BDA Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const leads = useMemo(() => filterByTab(allLeads, activeTab), [allLeads, activeTab]);

  const summary = useMemo(() => {
    const todayStr = getTodayStr();
    const converted = activeTab === "today"
      ? (dbSummary?.todayConverted ?? 0)
      : leads.filter(l => (l.status || "").toLowerCase() === "converted").length;

    return {
      totalLeads: leads.length,
      todayLeads: allLeads.filter(l => {
        if (!l.created_at) return false;
        return toLocalDateStr(new Date(l.created_at)) === todayStr;
      }).length,
      converted,
      todayFollowUps:   dbSummary?.todayFollowUps   ?? 0,
      pendingFollowUps: dbSummary?.pendingFollowUps ?? 0,
    };
  }, [leads, allLeads, activeTab, dbSummary]);

  const sourceData = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const src = normalizeSource(l.source);
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [leads]);

  const trendData = useMemo(() => {
    const now = new Date();
    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = MONTHS[d.getMonth()];
      buckets[key] = { month: key, JustDial: 0, "Facebook/Meta": 0, Manual: 0 };
    }
    allLeads.forEach(l => {
      if (!l.created_at) return;
      const m    = MONTHS[new Date(l.created_at).getMonth()];
      if (!buckets[m]) return;
      const norm = normalizeSource(l.source);
      if (norm === "JustDial")           buckets[m].JustDial++;
      else if (norm === "Facebook/Meta") buckets[m]["Facebook/Meta"]++;
      else                               buckets[m].Manual++;
    });
    return Object.values(buckets);
  }, [allLeads]);

  const funnelData = useMemo(() => {
    const KNOWN = [
      "new","interested","intrested","follow up",
      "converted","not interested","junk","junk_requested",
    ];
    return STATUS_FUNNEL.map(s => {
      if (s.key === "__other__") {
        return {
          ...s,
          count: leads.filter(l => !KNOWN.includes((l.status || "").toLowerCase())).length,
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

  const maxFunnel   = Math.max(...funnelData.map(f => f.count), 1);
  const recentLeads = leads.slice(0, 6);

  const convRate = (() => {
    if (activeTab === "today") {
      const base = summary.todayLeads || 0;
      return base > 0 ? ((summary.converted / base) * 100).toFixed(1) : "0.0";
    }
    return summary.totalLeads > 0
      ? ((summary.converted / summary.totalLeads) * 100).toFixed(1)
      : "0.0";
  })();

  const TAB_LABEL   = { today: "Today", week: "This Week", month: "This Month", all: "All Time" };
  const currentYear = new Date().getFullYear();

  return (
    <div className="bda-dashboard">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Dashboard</p>
          <h1 className="bda-title">Business Development Analyst</h1>
        </div>
        <div className="bda-header-actions">

          {/* ── CHECK IN / OUT ── */}
          {employeeId && <CheckInButton employeeId={employeeId} />}

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
            <StatCard
              label="Total Leads"
              value={summary.totalLeads}
              sub={`Showing: ${TAB_LABEL[activeTab]}`}
              accent="#2563eb"
              icon="🎯"
            />
            <StatCard
              label="New Today"
              value={summary.todayLeads}
              sub="Added today"
              accent="#10b981"
              icon="✨"
            />
            <StatCard
              label="Follow-ups Due"
              value={summary.todayFollowUps}
              sub={summary.pendingFollowUps > 0
                ? `⚠ ${summary.pendingFollowUps} overdue`
                : "All on track"}
              subColor={summary.pendingFollowUps > 0 ? "#ef4444" : "#10b981"}
              accent="#f59e0b"
              icon="📞"
            />
            <StatCard
              label="Converted"
              value={summary.converted}
              sub={`${convRate}% conversion rate`}
              accent="#7c3aed"
              icon="🏆"
            />
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
            <span className="bda-badge bda-badge--blue">{currentYear}</span>
          </div>
          <div className="bda-legend-row">
            {[
              { name: "JustDial",      color: "#2563eb" },
              { name: "Facebook/Meta", color: "#8b5cf6" },
              { name: "Manual",        color: "#10b981" },
            ].map(({ name, color }) => (
              <span key={name} className="bda-legend-item">
                <span className="bda-legend-dot" style={{ background: color }} />{name}
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
                <Line type="monotone" dataKey="JustDial" name="JustDial" stroke="#2563eb" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Facebook/Meta" name="Facebook/Meta" stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Manual" name="Manual" stroke="#10b981" strokeWidth={2.5}
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
              <p className="bda-card-sub">Distribution — {TAB_LABEL[activeTab].toLowerCase()}</p>
            </div>
            <span className="bda-badge bda-badge--green">Live</span>
          </div>
          {loading ? <Sk h={220} r={10} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value"
                >
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={getSourceColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend
                  iconType="square"
                  iconSize={10}
                  formatter={v => <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span>}
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
              <p className="bda-card-sub">Pipeline — {TAB_LABEL[activeTab].toLowerCase()}</p>
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
                        style={{ width: `${(f.count / maxFunnel) * 100}%`, background: f.color }}
                      />
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
                        No leads for {TAB_LABEL[activeTab].toLowerCase()}
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