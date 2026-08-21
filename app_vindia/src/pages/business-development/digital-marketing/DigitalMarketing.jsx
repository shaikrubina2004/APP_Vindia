import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CheckInButton from "../../../SharedResourse/CheckInButton";
// ^ This import assumes DigitalMarketing.jsx sits alongside BDADashboard.jsx
// at src/pages/business-development/digital-marketing/DigitalMarketing.jsx
// (3 folders under src/). If Vite complains the file doesn't exist,
// recount the folders to src/ and adjust the "../".
import "./DigitalMarketing.css";

const API = "http://localhost:5000/api";

/* ─── helpers ─── */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getMonthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
const STATUS_STYLE = {
  new:              { bg: "#dbeafe", color: "#1d4ed8" },
  interested:       { bg: "#ede9fe", color: "#6d28d9" },
  contacted:        { bg: "#d1fae5", color: "#065f46" },
  converted:        { bg: "#dcfce7", color: "#15803d" },
  "follow up":      { bg: "#fef3c7", color: "#92400e" },
  "not interested": { bg: "#f1f5f9", color: "#475569" },
  junk:             { bg: "#fee2e2", color: "#b91c1c" },
};
function statusStyle(s) {
  return STATUS_STYLE[(s || "").toLowerCase()] || { bg: "#f1f5f9", color: "#475569" };
}
const SRC_COLOR = {
  Meta: "#6d28d9", Manual: "#2563eb", Website: "#0891b2",
  Referral: "#059669", "Walk-In": "#d97706", Modified: "#64748b",
};
function srcColor(s) { return SRC_COLOR[s] || "#3b82f6"; }

/* ════════════════════════════════════════
   SVG LINE CHART
════════════════════════════════════════ */
const LineChart = ({ data, color = "#2563eb", height = 160 }) => {
  if (!data || data.length === 0) return <p className="dm-no-data">No data yet</p>;
  const W = 540, PAD = { t: 20, r: 16, b: 30, l: 30 };
  const iW = W - PAD.l - PAD.r, iH = height - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: PAD.l + i * (iW / Math.max(data.length - 1, 1)),
    y: PAD.t + iH - (d.value / max) * iH,
    ...d,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length-1].x.toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l},${(PAD.t+iH).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1].map(t => ({ y: PAD.t + iH - t * iH, v: Math.round(t * max) }));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }}>
      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
          <text x={PAD.l - 5} y={t.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{t.v}</text>
        </g>
      ))}
      <path d={area} fill={color} fillOpacity="0.07" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(p => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{p.value}</text>
          <text x={p.x} y={height - 5} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.label}</text>
        </g>
      ))}
    </svg>
  );
};

/* ════════════════════════════════════════
   SVG BAR CHART
════════════════════════════════════════ */
const BarChart = ({ data, colorFn, height = 160 }) => {
  if (!data || data.length === 0) return <p className="dm-no-data">No data yet</p>;
  const W = 480, PAD = { t: 20, r: 12, b: 32, l: 30 };
  const iW = W - PAD.l - PAD.r, iH = height - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.value), 1);
  const bW  = (iW / data.length) * 0.55;
  const gap = iW / data.length;
  const ticks = [0, 0.5, 1].map(t => ({ y: PAD.t + iH - t * iH, v: Math.round(t * max) }));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }}>
      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
          <text x={PAD.l - 5} y={t.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{t.v}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const bH  = Math.max((d.value / max) * iH, 4);
        const x   = PAD.l + i * gap + (gap - bW) / 2;
        const y   = PAD.t + iH - bH;
        const col = colorFn ? colorFn(d.label, i) : "#2563eb";
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={bW} height={bH} rx="4" fill={col} />
            <text x={x + bW / 2} y={y - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={col}>{d.value}</text>
            <text x={x + bW / 2} y={height - 5} textAnchor="middle" fontSize="9" fill="#64748b">
              {d.label.length > 7 ? d.label.slice(0, 7) : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ════════════════════════════════════════
   SVG DONUT CHART
════════════════════════════════════════ */
const DonutChart = ({ segments, size = 120 }) => {
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (!total) return <p className="dm-no-data">No data</p>;
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  let cum = -90;
  const slices = segments.map(s => {
    const pct = s.value / total, deg = pct * 360, start = cum;
    cum += deg;
    const rad = a => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(start)), y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(start + deg)), y2 = cy + r * Math.sin(rad(start + deg));
    return { ...s, pct, path: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${deg > 180 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` };
  });
  return (
    <div className="dm-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
        {slices.map(s => <path key={s.label} d={s.path} fill={s.color} fillOpacity="0.9" />)}
        <circle cx={cx} cy={cy} r={r * 0.6} fill="#fff" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e3a5f">{total}</text>
      </svg>
      <div className="dm-donut-legend">
        {slices.map(s => (
          <div key={s.label} className="dm-legend-row">
            <span className="dm-legend-dot" style={{ background: s.color }} />
            <span className="dm-legend-lbl">{s.label}</span>
            <span className="dm-legend-val">{s.value}</span>
            <span className="dm-legend-pct">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   STAT CARD
════════════════════════════════════════ */
const StatCard = ({ label, value, icon, sub, accent = "#2563eb" }) => (
  <div className="dm-stat" style={{ "--acc": accent }}>
    <div className="dm-stat-icon" aria-hidden="true"><i className={`ti ti-${icon}`} /></div>
    <p className="dm-stat-val">{value}</p>
    <p className="dm-stat-lbl">{label}</p>
    {sub && <p className="dm-stat-sub">{sub}</p>}
  </div>
);

const Sk = ({ h = 16 }) => <div className="dm-sk" style={{ height: h }} />;

/* ════════════════════════════════════════
   MAIN
════════════════════════════════════════ */
const DigitalMarketing = () => {
  const [leads,     setLeads]     = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [tab,       setTab]       = useState("overview");
  const [refreshed, setRefreshed] = useState(new Date());

  // ── Current user, for the check-in button ──────────────────
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId  = currentUser?.employee_id || currentUser?.id || null;
  const designation = currentUser?.designation || currentUser?.role || null;

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const [lr, fr] = await Promise.all([
        axios.get(`${API}/leads`),
        axios.get(`${API}/leads/followups`).catch(() => ({ data: [] })),
      ]);
      setLeads(lr.data.leads || []);
      const fu = fr.data.followUps || fr.data || [];
      setFollowUps(Array.isArray(fu) ? fu : []);
      setRefreshed(new Date());
    } catch { setError("Could not connect to server."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus = {}, bySource = {}, byBuilding = {}, byMonth = {}, byCity = {};
    leads.forEach(l => {
      const st = l.status || "New"; byStatus[st] = (byStatus[st] || 0) + 1;
      const src = l.source || "Manual"; bySource[src] = (bySource[src] || 0) + 1;
      if (l.building_type) byBuilding[l.building_type] = (byBuilding[l.building_type] || 0) + 1;
      if (l.city) byCity[l.city] = (byCity[l.city] || 0) + 1;
      const mk = getMonthKey(l.created_at); byMonth[mk] = (byMonth[mk] || 0) + 1;
    });
    const converted = byStatus["Converted"] || 0;
    const interested = byStatus["Interested"] || 0;
    const contacted = byStatus["Contacted"] || 0;
    const newLeads = byStatus["New"] || 0;
    const convRate = total > 0 ? +((converted / total) * 100).toFixed(1) : 0;
    const quotSent = leads.filter(l => l.quotation_sent === true).length;

    const monthData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([k, v]) => ({ label: getMonthLabel(k), value: v }));

    const srcPalette = ["#2563eb", "#6d28d9", "#0891b2", "#059669", "#d97706", "#64748b"];
    const sourceSegs = Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: srcPalette[i % srcPalette.length] }));

    const stColors = { New: "#2563eb", Interested: "#6d28d9", Contacted: "#0891b2", Converted: "#16a34a", "Follow Up": "#d97706", "Not Interested": "#94a3b8", Junk: "#ef4444" };
    const statusSegs = Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: stColors[label] || "#94a3b8" }));

    const buildData = Object.entries(byBuilding).map(([label, value]) => ({ label, value }));
    const cityData = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));

    const recent = [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
    const topBudget = [...leads].filter(l => l.budget).sort((a, b) => +b.budget - +a.budget).slice(0, 5);

    const today = new Date().toISOString().slice(0, 10);
    const fuToday = followUps.filter(f => f.next_followup?.slice(0, 10) === today).length;
    const fuOver = followUps.filter(f => f.next_followup && f.next_followup.slice(0, 10) < today).length;

    return { total, converted, interested, contacted, newLeads, convRate, quotSent, monthData, sourceSegs, statusSegs, buildData, cityData, recent, topBudget, fuToday, fuOver, fuTotal: followUps.length };
  }, [leads, followUps]);

  if (error) return (
    <div className="dm-page">
      <div className="dm-error">
        <i className="ti ti-wifi-off" style={{ fontSize: 40, color: "#ef4444" }} />
        <p>{error}</p>
        <button className="dm-btn" onClick={loadData}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="dm-page">

      {/* TOP BAR */}
      <div className="dm-topbar">
        <div>
          <p className="dm-crumb">Business Development · Digital Marketing</p>
          <h1 className="dm-title">Dashboard</h1>
        </div>
        <div className="dm-topbar-right">
          {employeeId && (
            <CheckInButton employeeId={employeeId} designation={designation} />
          )}
          <span className="dm-updated">
            <i className="ti ti-clock" style={{ fontSize: 13 }} />
            Updated {refreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button className="dm-btn" onClick={loadData} disabled={loading}>
            <i className="ti ti-refresh" />
            {loading ? " Loading…" : " Refresh"}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="dm-tabs">
        {[
          { key: "overview", icon: "layout-dashboard", label: "Overview" },
          { key: "leads",    icon: "users",            label: "Leads"    },
          { key: "followup", icon: "phone-call",       label: "Follow-ups"},
        ].map(t => (
          <button key={t.key} className={`dm-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            <i className={`ti ti-${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ════ OVERVIEW ════ */}
      {tab === "overview" && (
        <>
          <div className="dm-kpi-row">
            {loading ? [1,2,3,4,5].map(i => <div key={i} className="dm-stat"><Sk h={90} /></div>) : <>
              <StatCard label="Total leads"      value={stats.total}          icon="users"         accent="#2563eb" sub="All time" />
              <StatCard label="New leads"        value={stats.newLeads}       icon="bell"          accent="#6d28d9" sub="Pending action" />
              <StatCard label="Converted"        value={stats.converted}      icon="circle-check"  accent="#16a34a" sub="Successfully closed" />
              <StatCard label="Conversion rate"  value={`${stats.convRate}%`} icon="trending-up"   accent="#0891b2" sub={`${stats.converted} of ${stats.total}`} />
              <StatCard label="Quotations sent"  value={stats.quotSent}       icon="file-invoice"  accent="#d97706" sub="Proposals shared" />
            </>}
          </div>

          <div className="dm-row2">
            <div className="dm-card dm-card--tall">
              <div className="dm-card-head"><i className="ti ti-chart-line" /><h2>Monthly lead trend</h2></div>
              {loading ? <Sk h={160} /> : <LineChart data={stats.monthData} color="#2563eb" height={160} />}
            </div>
            <div className="dm-card dm-card--tall">
              <div className="dm-card-head"><i className="ti ti-chart-pie" /><h2>Lead sources</h2></div>
              {loading ? <Sk h={160} /> : <DonutChart segments={stats.sourceSegs} size={120} />}
            </div>
          </div>

          <div className="dm-row3">
            <div className="dm-card">
              <div className="dm-card-head"><i className="ti ti-circle-half" /><h2>Status breakdown</h2></div>
              {loading ? <Sk h={150} /> : <DonutChart segments={stats.statusSegs} size={100} />}
            </div>
            <div className="dm-card">
              <div className="dm-card-head"><i className="ti ti-building" /><h2>Building types</h2></div>
              {loading ? <Sk h={150} /> : (
                <BarChart data={stats.buildData} height={150}
                  colorFn={l => l === "Residential" ? "#2563eb" : l === "Commercial" ? "#6d28d9" : "#0891b2"} />
              )}
            </div>
            <div className="dm-card">
              <div className="dm-card-head"><i className="ti ti-map-pin" /><h2>Top cities</h2></div>
              {loading ? <Sk h={150} /> : (
                <BarChart data={stats.cityData} height={150}
                  colorFn={(_, i) => ["#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd"][i] || "#93c5fd"} />
              )}
            </div>
          </div>

          {/* follow-up strip */}
          <div className="dm-fu-strip">
            {[
              { label: "Total follow-ups", val: stats.fuTotal, icon: "clipboard-list",  cls: "blue"  },
              { label: "Due today",        val: stats.fuToday, icon: "calendar-event",  cls: "amber" },
              { label: "Overdue",          val: stats.fuOver,  icon: "alert-circle",    cls: "red"   },
              { label: "Quotations sent",  val: stats.quotSent,icon: "file-invoice",    cls: "green" },
            ].map(f => (
              <div key={f.label} className={`dm-fu-block dm-fu-block--${f.cls}`}>
                <i className={`ti ti-${f.icon}`} />
                <div>
                  <p className="dm-fu-num">{loading ? "—" : f.val}</p>
                  <p className="dm-fu-lbl">{f.label}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════ LEADS ════ */}
      {tab === "leads" && (
        <>
          <div className="dm-row2" style={{ marginBottom: 16 }}>
            <div className="dm-card">
              <div className="dm-card-head"><i className="ti ti-filter" /><h2>Lead pipeline</h2></div>
              {loading ? [1,2,3,4].map(i => <Sk key={i} h={14} />) : (
                <div className="dm-pipeline">
                  {[
                    { label: "New",        count: stats.newLeads,   color: "#2563eb" },
                    { label: "Interested", count: stats.interested, color: "#6d28d9" },
                    { label: "Contacted",  count: stats.contacted,  color: "#0891b2" },
                    { label: "Converted",  count: stats.converted,  color: "#16a34a" },
                  ].map(row => {
                    const pct = Math.round((row.count / Math.max(stats.total, 1)) * 100);
                    return (
                      <div key={row.label} className="dm-pipe-row">
                        <span className="dm-pipe-lbl">{row.label}</span>
                        <div className="dm-pipe-track">
                          <div className="dm-pipe-fill" style={{ width: `${pct}%`, background: row.color }} />
                        </div>
                        <span className="dm-pipe-num">{row.count}</span>
                        <span className="dm-pipe-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="dm-card">
              <div className="dm-card-head"><i className="ti ti-currency-rupee" /><h2>Top budget leads</h2></div>
              {loading ? <Sk h={140} /> : stats.topBudget.length === 0 ? <p className="dm-no-data">No budget data</p> : (
                <div className="dm-budget-list">
                  {stats.topBudget.map((l, i) => (
                    <div key={l.id} className="dm-budget-row">
                      <span className="dm-rank" style={{ background: ["#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd"][i] }}>{i + 1}</span>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <p className="dm-budget-name">{l.name}</p>
                        <p className="dm-budget-meta">{l.building_type || "—"} · {l.city || "—"}</p>
                      </div>
                      <span className="dm-budget-val">₹{Number(l.budget).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dm-card">
            <div className="dm-card-head">
              <i className="ti ti-list" /><h2>Recent leads</h2>
              <span className="dm-badge">{stats.total} total</span>
            </div>
            {loading ? [1,2,3,4,5].map(i => <Sk key={i} h={44} />) : (
              <div className="dm-table-wrap">
                <table className="dm-table">
                  <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Source</th><th>Status</th><th>Building</th><th>Budget</th><th>City</th><th>Date</th></tr></thead>
                  <tbody>
                    {stats.recent.map((l, idx) => {
                      const ss = statusStyle(l.status);
                      return (
                        <tr key={l.id}>
                          <td className="dm-td-num">{idx + 1}</td>
                          <td className="dm-td-name">{l.name}</td>
                          <td className="dm-td-muted">{l.phone}</td>
                          <td><span className="dm-pill" style={{ background: srcColor(l.source) + "18", color: srcColor(l.source) }}>{l.source || "Manual"}</span></td>
                          <td><span className="dm-pill" style={{ background: ss.bg, color: ss.color }}>{l.status || "New"}</span></td>
                          <td className="dm-td-muted">{l.building_type || "—"}</td>
                          <td className="dm-td-muted">{l.budget ? `₹${Number(l.budget).toLocaleString("en-IN")}` : "—"}</td>
                          <td className="dm-td-muted">{l.city || "—"}</td>
                          <td className="dm-td-date">{formatDate(l.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════ FOLLOW-UPS ════ */}
      {tab === "followup" && (
        <>
          <div className="dm-kpi-row">
            {loading ? [1,2,3].map(i => <div key={i} className="dm-stat"><Sk h={90} /></div>) : <>
              <StatCard label="Total follow-ups" value={stats.fuTotal} icon="clipboard-list" accent="#2563eb" sub="All recorded" />
              <StatCard label="Due today"        value={stats.fuToday} icon="calendar-event" accent="#d97706" sub="Needs action" />
              <StatCard label="Overdue"          value={stats.fuOver}  icon="alert-circle"   accent="#ef4444" sub="Missed follow-ups" />
            </>}
          </div>
          <div className="dm-card">
            <div className="dm-card-head"><i className="ti ti-history" /><h2>Follow-up history</h2><span className="dm-badge">{followUps.length}</span></div>
            {loading ? [1,2,3,4].map(i => <Sk key={i} h={44} />) : followUps.length === 0 ? (
              <div className="dm-empty-state">
                <i className="ti ti-phone-off" />
                <p>No follow-ups recorded yet</p>
              </div>
            ) : (
              <div className="dm-table-wrap">
                <table className="dm-table">
                  <thead><tr><th>#</th><th>Lead ID</th><th>Note</th><th>Status</th><th>Next follow-up</th><th>Recorded</th></tr></thead>
                  <tbody>
                    {[...followUps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((f, i) => {
                      const ss  = statusStyle(f.status);
                      const tod = new Date().toISOString().slice(0, 10);
                      const ov  = f.next_followup && f.next_followup.slice(0, 10) < tod;
                      const td  = f.next_followup && f.next_followup.slice(0, 10) === tod;
                      return (
                        <tr key={f.id}>
                          <td className="dm-td-num">{i + 1}</td>
                          <td className="dm-td-num">#{f.lead_id}</td>
                          <td style={{ fontSize: 13, color: "#374151", maxWidth: 220 }}>{f.note || "—"}</td>
                          <td><span className="dm-pill" style={{ background: ss.bg, color: ss.color }}>{f.status || "—"}</span></td>
                          <td>
                            {f.next_followup
                              ? <span className="dm-pill" style={{ background: ov ? "#fee2e2" : td ? "#fef3c7" : "#dbeafe", color: ov ? "#b91c1c" : td ? "#92400e" : "#1d4ed8" }}>
                                  {formatDate(f.next_followup)}{ov ? " ⚠" : td ? " 📅" : ""}
                                </span>
                              : "—"}
                          </td>
                          <td className="dm-td-date">{formatDate(f.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DigitalMarketing;