import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import "./BDAReports.css";

const API = "http://localhost:5000/api";

const SOURCE_COLORS  = ["#2563eb","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899"];
const STATUS_COLORS  = {
  new:"#2563eb", interested:"#8b5cf6", "follow up":"#f59e0b",
  converted:"#10b981", contacted:"#059669", "not interested":"#94a3b8", junk:"#ef4444",
};

function fmtNum(n) { return Number(n||0).toLocaleString("en-IN"); }

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

  const [loading, setLoading]     = useState(true);
  const [overview, setOverview]   = useState(null);
  const [bda, setBda]             = useState([]);
  const [sources, setSources]     = useState([]);
  const [exporting, setExporting] = useState(null); // null | "all" | "converted" | "bda"

  /* Filters */
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [statusF, setStatusF]   = useState("");
  const [sourceF, setSourceF]   = useState("");
  const [assignedF, setAssignedF] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => { loadAll(); }, []);

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

  const applyFilters = () => {
    loadAll({ from, to, status: statusF, source: sourceF, assigned_to: assignedF });
  };

  const clearFilters = () => {
    setFrom(""); setTo(""); setStatusF(""); setSourceF(""); setAssignedF("");
    loadAll({});
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

  /* Export all leads */
  const handleExportAll = async () => {
    setExporting("all");
    try {
      const params = {};
      if (from)      params.from        = from;
      if (to)        params.to          = to;
      if (statusF)   params.status      = statusF;
      if (sourceF)   params.source      = sourceF;
      if (assignedF) params.assigned_to = assignedF;
      const res = await axios.get(`${API}/reports/export`, { params, responseType:"blob" });
      triggerDownload(res.data, `all-leads-${Date.now()}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    finally { setExporting(null); }
  };

  /* Export converted leads only */
  const handleExportConverted = async () => {
    setExporting("converted");
    try {
      const params = { status: "Converted" };
      if (from)      params.from        = from;
      if (to)        params.to          = to;
      if (sourceF)   params.source      = sourceF;
      if (assignedF) params.assigned_to = assignedF;
      const res = await axios.get(`${API}/reports/export`, { params, responseType:"blob" });
      triggerDownload(res.data, `converted-leads-${Date.now()}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    finally { setExporting(null); }
  };

  /* Export BDA performance report */
  const handleExportBDA = async () => {
    setExporting("bda");
    try {
      const res = await axios.get(`${API}/reports/export-bda-performance`, { responseType:"blob" });
      triggerDownload(res.data, `bda-performance-${Date.now()}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    finally { setExporting(null); }
  };

  /* ── Pie data — normalize status to fix "New" vs "new" duplicates ── */
  const statusPieData = useMemo(() => {
    if (!overview?.byStatus) return [];
    // Merge entries that differ only by case
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

  /* ── BDA bar data — filter out Unassigned ── */
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

  /* ── BDA table — filter out Unassigned ── */
  const bdaTableData = useMemo(() =>
    bda.filter(b => b.bda_name !== "Unassigned")
  , [bda]);

  /* ── Sources — normalize source casing to fix "meta" vs "Meta" duplicates ── */
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

  /* ── Assigned-to names for filter dropdown — deduplicated ── */
  const bdaNames = useMemo(() =>
    [...new Set(bda.filter(b => b.bda_name !== "Unassigned").map(b => b.bda_name))]
  , [bda]);

  /* ── Tabs — Lead Details removed ── */
  const SECTIONS = [
    { key:"overview", label:"📊 Overview" },
    { key:"bda",      label:"👤 BDA Performance" },
    { key:"sources",  label:"🎯 Source Analysis" },
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
          <button className="bda-btn-outline" onClick={() => loadAll({})}>↻ Refresh</button>
          {/* 3 export buttons — CEO only */}
          {isCEO && (
            <>
              <button
                className="bda-btn-outline"
                onClick={handleExportAll}
                disabled={exporting !== null}
                title="Export all leads to Excel"
              >
                {exporting === "all" ? "Exporting…" : "📥 All Leads"}
              </button>
              <button
                className="bda-btn-outline rp-btn--green"
                onClick={handleExportConverted}
                disabled={exporting !== null}
                title="Export only converted leads"
              >
                {exporting === "converted" ? "Exporting…" : "✅ Converted Leads"}
              </button>
              <button
                className="bda-btn-primary"
                onClick={handleExportBDA}
                disabled={exporting !== null}
                title="Download BDA performance report"
              >
                {exporting === "bda" ? "Exporting…" : "👤 BDA Report"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── FILTERS — CEO only ── */}
      {isCEO && (
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
              <button className="bda-btn-primary" style={{ fontSize:12, padding:"7px 16px" }} onClick={applyFilters}>
                Apply
              </button>
              {(from||to||statusF||sourceF||assignedF) && (
                <button className="bda-btn-outline" style={{ fontSize:12, padding:"7px 14px" }} onClick={clearFilters}>
                  Clear
                </button>
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

        {/* ════════════ BDA PERFORMANCE — no Unassigned ════════════ */}
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

        {/* ════════════ SOURCE ANALYSIS — normalized casing ════════════ */}
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

        {/* ════════════ MASK — BDA users see this, CEO does not ════════════ */}
        {!isCEO && (
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