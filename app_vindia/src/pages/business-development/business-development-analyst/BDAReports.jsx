import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
  AreaChart, Area,
} from "recharts";
import "./BDAReports.css";

const API = "http://localhost:5000/api";

const SOURCE_COLORS  = ["#2563eb","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899"];
const STATUS_COLORS  = {
  new:"#2563eb", interested:"#8b5cf6", "follow up":"#f59e0b",
  converted:"#10b981", contacted:"#059669", "not interested":"#94a3b8", junk:"#ef4444",
};
// Distinct colors for BDA bars in time chart
const BDA_TIME_COLORS = ["#2563eb","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#f43f5e"];

function fmtNum(n) { return Number(n||0).toLocaleString("en-IN"); }

/** Format seconds → "2m 30s" or "4m 55s" */
function fmtSec(s) {
  s = Number(s) || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  if (sec === 0) return `${m}m`;
  return `${m}m ${sec}s`;
}

/** Seconds as a fraction of 300 (5 min cap) → percentage */
function secToPct(s) { return Math.min(((Number(s)||0) / 300) * 100, 100).toFixed(1); }

const Sk = ({ h=120, r=10 }) => (
  <div className="rp-sk" style={{ height:h, borderRadius:r }} />
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rp-tooltip">
      <p className="rp-tooltip__label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color:p.color, fontSize:12, fontWeight:600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
const BDAReports = ({ role }) => {
  const isCEO = role === "ceo";

  const [loading,     setLoading]     = useState(true);
  const [timeLoading, setTimeLoading] = useState(true);
  const [overview,    setOverview]    = useState(null);
  const [bda,         setBda]         = useState([]);
  const [sources,     setSources]     = useState([]);
  const [timeData,    setTimeData]    = useState(null);
  const [exporting,   setExporting]   = useState(null);

  /* Filters */
  const [from, setFrom]           = useState("");
  const [to,   setTo]             = useState("");
  const [statusF,   setStatusF]   = useState("");
  const [sourceF,   setSourceF]   = useState("");
  const [assignedF, setAssignedF] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  /* Time section filter */
  const [timeFrom,   setTimeFrom]   = useState("");
  const [timeTo,     setTimeTo]     = useState("");
  const [timeBdaF,   setTimeBdaF]   = useState("");

  useEffect(() => { loadAll(); loadTimeData(); }, []);

  const loadAll = async (filters = {}) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from)        params.from        = filters.from;
      if (filters.to)          params.to          = filters.to;
      if (filters.status)      params.status      = filters.status;
      if (filters.source)      params.source      = filters.source;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;

      const [ovRes, bdaRes, srcRes] = await Promise.all([
        axios.get(`${API}/reports/overview`, { params }),
        axios.get(`${API}/reports/user-performance`),
        axios.get(`${API}/reports/source-performance`),
      ]);

      setOverview(ovRes.data);
      setBda(bdaRes.data.data || []);
      setSources(srcRes.data.data || []);
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeData = async (filters = {}) => {
    setTimeLoading(true);
    try {
      const params = {};
      if (filters.from)      params.from      = filters.from;
      if (filters.to)        params.to        = filters.to;
      if (filters.bda_email) params.bda_email = filters.bda_email;
      const res = await axios.get(`${API}/reports/time-spent`, { params });
      setTimeData(res.data);
    } catch (err) {
      console.error("Time spent load error:", err);
      setTimeData(null);
    } finally {
      setTimeLoading(false);
    }
  };

  const applyFilters = () => {
    loadAll({ from, to, status: statusF, source: sourceF, assigned_to: assignedF });
  };

  const clearFilters = () => {
    setFrom(""); setTo(""); setStatusF(""); setSourceF(""); setAssignedF("");
    loadAll({});
  };

  const applyTimeFilters = () => {
    loadTimeData({ from: timeFrom, to: timeTo, bda_email: timeBdaF });
  };

  const clearTimeFilters = () => {
    setTimeFrom(""); setTimeTo(""); setTimeBdaF("");
    loadTimeData({});
  };

  /* ── EXPORT HELPER ── */
  const triggerDownload = (blob, filename) => {
    const url  = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportAll = async () => {
    setExporting("all");
    try {
      const params = {};
      if (from) params.from = from; if (to) params.to = to;
      if (statusF) params.status = statusF; if (sourceF) params.source = sourceF;
      if (assignedF) params.assigned_to = assignedF;
      const res = await axios.get(`${API}/reports/export`, { params, responseType:"blob" });
      triggerDownload(res.data, `all-leads-${Date.now()}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    finally { setExporting(null); }
  };

  const handleExportConverted = async () => {
    setExporting("converted");
    try {
      const params = { status: "Converted" };
      if (from) params.from = from; if (to) params.to = to;
      if (sourceF) params.source = sourceF; if (assignedF) params.assigned_to = assignedF;
      const res = await axios.get(`${API}/reports/export`, { params, responseType:"blob" });
      triggerDownload(res.data, `converted-leads-${Date.now()}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    finally { setExporting(null); }
  };

  const handleExportBDA = async () => {
    setExporting("bda");
    try {
      const res = await axios.get(`${API}/reports/export-bda-performance`, { responseType:"blob" });
      triggerDownload(res.data, `bda-performance-${Date.now()}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    finally { setExporting(null); }
  };

  /* ── Pie data ── */
  const statusPieData = useMemo(() => {
    if (!overview?.byStatus) return [];
    const merged = {};
    overview.byStatus.forEach(s => {
      const key = (s.status || "Unknown").toLowerCase();
      merged[key] = (merged[key] || 0) + parseInt(s.count);
    });
    return Object.entries(merged).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [overview]);

  /* ── BDA bar data ── */
  const bdaBarData = useMemo(() =>
    bda
      .filter(b => b.bda_name !== "Unassigned")
      .map(b => ({
        name:      b.bda_name?.split("@")[0] || "Unknown",
        total:     parseInt(b.total_leads),
        converted: parseInt(b.converted),
        followups: parseInt(b.followups),
      }))
  , [bda]);

  const bdaTableData = useMemo(() =>
    bda.filter(b => b.bda_name !== "Unassigned")
  , [bda]);

  /* ── Sources ── */
  const normalizedSources = useMemo(() => {
    const merged = {};
    sources.forEach(s => {
      const key = (s.source || "Unknown").toLowerCase();
      if (!merged[key]) {
        merged[key] = {
          source: s.source.charAt(0).toUpperCase() + s.source.slice(1).toLowerCase(),
          total: 0, converted: 0,
        };
      }
      merged[key].total     += parseInt(s.total);
      merged[key].converted += parseInt(s.converted);
    });
    return Object.values(merged).map(s => ({
      ...s,
      conversion_rate: s.total > 0 ? ((s.converted / s.total) * 100).toFixed(1) : "0.0",
    }));
  }, [sources]);

  const bdaNames = useMemo(() =>
    [...new Set(bda.filter(b => b.bda_name !== "Unassigned").map(b => b.bda_name))]
  , [bda]);

  /* ── Time chart data — BDA summary bar ── */
  const bdaTimeBarData = useMemo(() => {
    if (!timeData?.bdaSummary) return [];
    return timeData.bdaSummary.map(b => ({
      name:          b.bda_name?.split("@")[0] || "Unknown",
      fullName:      b.bda_name,
      totalMin:      (Number(b.total_sec) / 60).toFixed(1),
      avgSec:        Number(b.avg_sec_per_session) || 0,
      leadsTouched:  Number(b.leads_touched),
      sessions:      Number(b.total_sessions),
      editSessions:  Number(b.edit_sessions),
      viewSessions:  Number(b.view_sessions),
    }));
  }, [timeData]);

  /* ── Daily trend ── */
  const dailyTrendData = useMemo(() => {
    if (!timeData?.dailyTrend) return [];
    return timeData.dailyTrend.map(d => ({
      day:           d.day,
      minutesSpent:  (Number(d.total_sec) / 60).toFixed(1),
      leadsTouched:  Number(d.leads_touched),
      activeBDAs:    Number(d.active_bdas),
    }));
  }, [timeData]);

  /* ── Top leads by time ── */
  const topLeadsData = useMemo(() => timeData?.topLeads || [], [timeData]);

  /* ── Session breakdown ── */
  const sessionBreakdown = useMemo(() => {
    if (!timeData?.sessionBreakdown) return { view:0, edit:0 };
    const obj = {};
    timeData.sessionBreakdown.forEach(s => { obj[s.session_type] = s; });
    return obj;
  }, [timeData]);

  /* ── Unique BDA emails for time filter dropdown ── */
  const timeBdaOptions = useMemo(() =>
    [...new Set((timeData?.bdaSummary || []).map(b => b.bda_email))]
  , [timeData]);

  const SECTIONS = [
    { key:"overview", label:"📊 Overview" },
    { key:"bda",      label:"👤 BDA Performance" },
    { key:"sources",  label:"🎯 Source Analysis" },
    { key:"time",     label:"⏱ Time Spent" },
  ];

  return (
    <div className="rp-page">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Business Development Analyst</p>
          <h1 className="bda-title">Reports & Analytics</h1>
        </div>
        <div className="bda-header-actions">
          <button className="bda-btn-outline" onClick={() => { loadAll({}); loadTimeData({}); }}>↻ Refresh</button>
          {isCEO && (
            <>
              <button className="bda-btn-outline" onClick={handleExportAll} disabled={exporting !== null}>
                {exporting === "all" ? "Exporting…" : "📥 All Leads"}
              </button>
              <button className="bda-btn-outline rp-btn--green" onClick={handleExportConverted} disabled={exporting !== null}>
                {exporting === "converted" ? "Exporting…" : "✅ Converted Leads"}
              </button>
              <button className="bda-btn-primary" onClick={handleExportBDA} disabled={exporting !== null}>
                {exporting === "bda" ? "Exporting…" : "👤 BDA Report"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── FILTERS — CEO only ── */}
      {isCEO && activeSection !== "time" && (
        <div className="rp-filters">
          <div className="rp-filters__row">
            <div className="rp-filter-group">
              <label className="rp-filter-label">From</label>
              <input className="rp-filter-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="rp-filter-group">
              <label className="rp-filter-label">To</label>
              <input className="rp-filter-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="rp-filter-group">
              <label className="rp-filter-label">Status</label>
              <select className="rp-filter-input" value={statusF} onChange={e => setStatusF(e.target.value)}>
                <option value="">All Status</option>
                {["New","Interested","Follow Up","Converted","Not Interested","Contacted","Junk"].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div className="rp-filter-group">
              <label className="rp-filter-label">Source</label>
              <select className="rp-filter-input" value={sourceF} onChange={e => setSourceF(e.target.value)}>
                <option value="">All Sources</option>
                {["JustDial","Facebook/Meta","Manual","Website","Walk-in","Referral"].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div className="rp-filter-group">
              <label className="rp-filter-label">Assigned To</label>
              <select className="rp-filter-input" value={assignedF} onChange={e => setAssignedF(e.target.value)}>
                <option value="">All BDA</option>
                {bdaNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="rp-filter-actions">
              <button className="bda-btn-primary" style={{ fontSize:12, padding:"7px 16px" }} onClick={applyFilters}>Apply</button>
              {(from||to||statusF||sourceF||assignedF) && (
                <button className="bda-btn-outline" style={{ fontSize:12, padding:"7px 14px" }} onClick={clearFilters}>Clear</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION TABS ── */}
      <div className="rp-sections">
        {SECTIONS.map(s => (
          <button key={s.key}
            className={`rp-section-tab ${activeSection === s.key ? "active" : ""}`}
            onClick={() => setActiveSection(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ════════════ CONTENT WITH MASK FOR BDA ════════════ */}
      <div style={{ position: "relative" }}>

        {/* ════════════ OVERVIEW ════════════ */}
        {activeSection === "overview" && (
          <>
            <div className="rp-kpis">
              {loading ? [1,2,3,4].map(i => <Sk key={i} h={90} />) : (
                <>
                  <div className="rp-kpi rp-kpi--blue">
                    <p className="rp-kpi__label">Total Leads</p>
                    <p className="rp-kpi__value">{fmtNum(overview?.totalLeads)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--green">
                    <p className="rp-kpi__label">Converted</p>
                    <p className="rp-kpi__value">{fmtNum(overview?.convertedLeads)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--purple">
                    <p className="rp-kpi__label">Conversion Rate</p>
                    <p className="rp-kpi__value">{overview?.conversionRate}%</p>
                  </div>
                  <div className="rp-kpi rp-kpi--amber">
                    <p className="rp-kpi__label">Active BDAs</p>
                    <p className="rp-kpi__value">{bdaTableData.length}</p>
                  </div>
                </>
              )}
            </div>

            <div className="rp-charts-row">
              <div className="rp-card rp-card--wide">
                <div className="rp-card__header">
                  <h3 className="rp-card__title">Monthly Lead Trend</h3>
                  <p className="rp-card__sub">Leads added vs converted per month</p>
                </div>
                {loading ? <Sk h={220} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={overview?.monthly || []} margin={{ top:10, right:12, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="month" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2.5}
                        dot={{ r:4, fill:"#2563eb", stroke:"#fff", strokeWidth:2 }} />
                      <Line type="monotone" dataKey="converted" name="Converted" stroke="#10b981" strokeWidth={2.5}
                        dot={{ r:4, fill:"#10b981", stroke:"#fff", strokeWidth:2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rp-card">
                <div className="rp-card__header">
                  <h3 className="rp-card__title">Leads by Status</h3>
                  <p className="rp-card__sub">Current distribution</p>
                </div>
                {loading ? <Sk h={220} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {statusPieData.map((e, i) => (
                          <Cell key={i} fill={STATUS_COLORS[e.name?.toLowerCase()] || SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend iconType="square" iconSize={10}
                        formatter={v => <span style={{ fontSize:11, color:"#64748b" }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════ BDA PERFORMANCE ════════════ */}
        {activeSection === "bda" && (
          <div className="rp-card rp-card--full">
            <div className="rp-card__header">
              <h3 className="rp-card__title">BDA Performance</h3>
              <p className="rp-card__sub">Leads handled per team member</p>
            </div>
            {loading ? <Sk h={240} /> : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={bdaBarData} margin={{ top:10, right:12, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total"     name="Total"      fill="#2563eb" radius={[4,4,0,0]} />
                    <Bar dataKey="converted" name="Converted"  fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="followups" name="Follow-ups" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="rp-table-wrap" style={{ marginTop:20 }}>
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>BDA Name</th><th>Total Leads</th><th>Converted</th>
                        <th>Interested</th><th>Follow-ups</th><th>Junk</th><th>Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bdaTableData.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign:"center", color:"#94a3b8", padding:"32px 0" }}>
                          No BDA data available
                        </td></tr>
                      ) : bdaTableData.map((b, i) => (
                        <tr key={i}>
                          <td className="rp-td-name">{b.bda_name}</td>
                          <td>{b.total_leads}</td>
                          <td><span className="rp-badge rp-badge--green">{b.converted}</span></td>
                          <td>{b.interested}</td>
                          <td>{b.followups}</td>
                          <td><span className="rp-badge rp-badge--red">{b.junk}</span></td>
                          <td>
                            <span className="rp-rate" style={{
                              color: b.conversion_rate >= 20 ? "#16a34a" : b.conversion_rate >= 10 ? "#f59e0b" : "#ef4444"
                            }}>
                              {b.conversion_rate || 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════ SOURCE ANALYSIS ════════════ */}
        {activeSection === "sources" && (
          <div className="rp-card rp-card--full">
            <div className="rp-card__header">
              <h3 className="rp-card__title">Source Analysis</h3>
              <p className="rp-card__sub">Which sources generate the best leads</p>
            </div>
            {loading ? <Sk h={240} /> : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={normalizedSources} margin={{ top:10, right:12, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="source" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" name="Total" radius={[4,4,0,0]}>
                      {normalizedSources.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                    </Bar>
                    <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="rp-table-wrap" style={{ marginTop:20 }}>
                  <table className="rp-table">
                    <thead>
                      <tr><th>Source</th><th>Total Leads</th><th>Converted</th><th>Conv. Rate</th></tr>
                    </thead>
                    <tbody>
                      {normalizedSources.map((s, i) => (
                        <tr key={i}>
                          <td>
                            <span className="rp-source-dot" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                            {s.source}
                          </td>
                          <td>{s.total}</td>
                          <td><span className="rp-badge rp-badge--green">{s.converted}</span></td>
                          <td>
                            <span className="rp-rate" style={{
                              color: s.conversion_rate >= 20 ? "#16a34a" : s.conversion_rate >= 10 ? "#f59e0b" : "#ef4444"
                            }}>
                              {s.conversion_rate || 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════ TIME SPENT PER LEAD ════════════ */}
        {activeSection === "time" && (
          <div className="ts-section">

            {/* ── Time filters ── */}
            <div className="rp-filters" style={{ marginBottom:18 }}>
              <div className="rp-filters__row">
                <div className="rp-filter-group">
                  <label className="rp-filter-label">From</label>
                  <input className="rp-filter-input" type="date" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
                </div>
                <div className="rp-filter-group">
                  <label className="rp-filter-label">To</label>
                  <input className="rp-filter-input" type="date" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
                </div>
                <div className="rp-filter-group">
                  <label className="rp-filter-label">BDA</label>
                  <select className="rp-filter-input" value={timeBdaF} onChange={e => setTimeBdaF(e.target.value)}>
                    <option value="">All BDA</option>
                    {timeBdaOptions.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="rp-filter-actions">
                  <button className="bda-btn-primary" style={{ fontSize:12, padding:"7px 16px" }} onClick={applyTimeFilters}>Apply</button>
                  {(timeFrom||timeTo||timeBdaF) && (
                    <button className="bda-btn-outline" style={{ fontSize:12, padding:"7px 14px" }} onClick={clearTimeFilters}>Clear</button>
                  )}
                </div>
              </div>
            </div>

            {/* ── KPI row ── */}
            {timeLoading ? (
              <div className="rp-kpis"><Sk h={90} /><Sk h={90} /><Sk h={90} /><Sk h={90} /></div>
            ) : !timeData || (!timeData.bdaSummary?.length && !timeData.topLeads?.length) ? (
              <div className="ts-empty">
                <div className="ts-empty__icon">⏱</div>
                <p className="ts-empty__title">No activity data</p>
                <p className="ts-empty__sub">Time tracking will appear here once BDAs start viewing or editing leads.</p>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="rp-kpis" style={{ marginBottom:18 }}>
                  <div className="rp-kpi rp-kpi--blue">
                    <p className="rp-kpi__label">Total Time Tracked</p>
                    <p className="rp-kpi__value" style={{ fontSize:22 }}>
                      {fmtSec(timeData.bdaSummary.reduce((a,b) => a + Number(b.total_sec), 0))}
                    </p>
                  </div>
                  <div className="rp-kpi rp-kpi--purple">
                    <p className="rp-kpi__label">Leads Touched</p>
                    <p className="rp-kpi__value">{timeData.topLeads?.length || 0}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--green">
                    <p className="rp-kpi__label">Edit Sessions</p>
                    <p className="rp-kpi__value">{fmtNum(sessionBreakdown.edit?.sessions || 0)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--amber">
                    <p className="rp-kpi__label">View Sessions</p>
                    <p className="rp-kpi__value">{fmtNum(sessionBreakdown.view?.sessions || 0)}</p>
                  </div>
                </div>

                {/* Row 1: BDA time bar + daily area */}
                <div className="rp-charts-row" style={{ marginBottom:16 }}>
                  {/* BDA Time Spent Bar Chart */}
                  <div className="rp-card rp-card--wide">
                    <div className="rp-card__header">
                      <div>
                        <h3 className="rp-card__title">Time Spent Per Lead — By BDA</h3>
                        <p className="rp-card__sub">Total minutes each BDA spent on leads (5 min cap per session)</p>
                      </div>
                    </div>
                    {bdaTimeBarData.length === 0 ? (
                      <div className="ts-chart-empty">No data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={bdaTimeBarData} margin={{ top:10, right:12, left:-10, bottom:0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                          <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}
                            label={{ value:"Min", angle:-90, position:"insideLeft", fill:"#cbd5e1", fontSize:10 }} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rp-tooltip">
                                  <p className="rp-tooltip__label">{d?.fullName || label}</p>
                                  <p style={{ color:"#2563eb", fontSize:12, fontWeight:600 }}>Total: {d?.totalMin} min</p>
                                  <p style={{ color:"#8b5cf6", fontSize:12 }}>Leads touched: {d?.leadsTouched}</p>
                                  <p style={{ color:"#10b981", fontSize:12 }}>Edit sessions: {d?.editSessions}</p>
                                  <p style={{ color:"#f59e0b", fontSize:12 }}>View sessions: {d?.viewSessions}</p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="totalMin" name="Minutes" radius={[6,6,0,0]}>
                            {bdaTimeBarData.map((_, i) => (
                              <Cell key={i} fill={BDA_TIME_COLORS[i % BDA_TIME_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Daily Activity Area Chart */}
                  <div className="rp-card">
                    <div className="rp-card__header">
                      <div>
                        <h3 className="rp-card__title">Daily Activity</h3>
                        <p className="rp-card__sub">Minutes tracked per day (last 30 days)</p>
                      </div>
                    </div>
                    {dailyTrendData.length === 0 ? (
                      <div className="ts-chart-empty">No activity yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={dailyTrendData} margin={{ top:10, right:12, left:-20, bottom:0 }}>
                          <defs>
                            <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                          <XAxis dataKey="day" tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}
                            interval={Math.floor(dailyTrendData.length / 6)} />
                          <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="minutesSpent" name="Minutes" stroke="#2563eb" strokeWidth={2}
                            fill="url(#timeGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Row 2: BDA summary table + Top leads */}
                <div className="ts-bottom-row">
                  {/* BDA Summary table */}
                  <div className="rp-card ts-card-left">
                    <div className="rp-card__header">
                      <h3 className="rp-card__title">BDA Time Summary</h3>
                      <p className="rp-card__sub">Engagement depth per team member</p>
                    </div>
                    <div className="rp-table-wrap">
                      <table className="rp-table">
                        <thead>
                          <tr>
                            <th>BDA</th>
                            <th>Leads</th>
                            <th>Total Time</th>
                            <th>Avg / Session</th>
                            <th>Sessions</th>
                            <th>Engagement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bdaTimeBarData.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign:"center", color:"#94a3b8", padding:"24px 0" }}>No data</td></tr>
                          ) : bdaTimeBarData.map((b, i) => (
                            <tr key={i}>
                              <td className="rp-td-name">{b.fullName || b.name}</td>
                              <td>{b.leadsTouched}</td>
                              <td>
                                <span className="ts-time-badge">
                                  {b.totalMin} min
                                </span>
                              </td>
                              <td>{fmtSec(b.avgSec)}</td>
                              <td>
                                <span style={{ fontSize:11, color:"#64748b" }}>
                                  👁 {b.viewSessions} · ✏️ {b.editSessions}
                                </span>
                              </td>
                              <td>
                                {/* Mini engagement bar — fraction of 5min max */}
                                <div className="ts-eng-bar">
                                  <div
                                    className="ts-eng-fill"
                                    style={{
                                      width: `${Math.min((b.avgSec / 300) * 100, 100)}%`,
                                      background: BDA_TIME_COLORS[i % BDA_TIME_COLORS.length],
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize:10, color:"#94a3b8" }}>
                                  {((b.avgSec / 300) * 100).toFixed(0)}% of 5m
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top Leads by time */}
                  <div className="rp-card ts-card-right">
                    <div className="rp-card__header">
                      <h3 className="rp-card__title">Most-Visited Leads</h3>
                      <p className="rp-card__sub">Top 10 leads by total time spent</p>
                    </div>
                    <div className="rp-table-wrap">
                      <table className="rp-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Lead</th>
                            <th>Status</th>
                            <th>Sessions</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topLeadsData.slice(0,10).length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign:"center", color:"#94a3b8", padding:"24px 0" }}>No data</td></tr>
                          ) : topLeadsData.slice(0,10).map((l, i) => {
                            const pct = Math.min((Number(l.total_sec) / 300) * 100, 100);
                            return (
                              <tr key={l.lead_id}>
                                <td style={{ color:"#94a3b8", fontSize:11 }}>{i + 1}</td>
                                <td>
                                  <div style={{ fontWeight:600, fontSize:12, color:"#1a2a4a" }}>{l.lead_name}</div>
                                  <div style={{ fontSize:10, color:"#94a3b8" }}>{l.phone}</div>
                                </td>
                                <td>
                                  <span className="rp-badge" style={{
                                    background: "#f0f9ff",
                                    color: "#0369a1",
                                    fontSize:10,
                                  }}>
                                    {l.lead_status || "—"}
                                  </span>
                                </td>
                                <td style={{ fontSize:12, color:"#64748b" }}>{l.sessions}</td>
                                <td>
                                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <div className="ts-eng-bar" style={{ width:50 }}>
                                      <div className="ts-eng-fill" style={{ width:`${pct}%`, background:"#2563eb" }} />
                                    </div>
                                    <span className="ts-time-badge">{fmtSec(l.total_sec)}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════ MASK — BDA users ════════════ */}
        {!isCEO && activeSection !== "time" && (
          <div className="rp-mask">
            <div className="rp-mask__box">
              <span className="rp-mask__icon">🔒</span>
              <h3 className="rp-mask__title">Restricted Access</h3>
              <p className="rp-mask__sub">
                Full reports are only accessible to the CEO.
                Contact your administrator for access.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BDAReports;