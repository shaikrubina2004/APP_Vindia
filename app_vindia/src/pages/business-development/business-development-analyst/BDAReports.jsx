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
const BDAReports = () => {
  const [loading, setLoading]   = useState(true);
  const [overview, setOverview] = useState(null);
  const [bda, setBda]           = useState([]);
  const [sources, setSources]   = useState([]);
  const [leads, setLeads]       = useState([]);
  const [exporting, setExporting] = useState(false);

  /* Filters */
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");
  const [statusF, setStatusF]       = useState("");
  const [sourceF, setSourceF]       = useState("");
  const [assignedF, setAssignedF]   = useState("");
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

      const [ovRes, bdaRes, srcRes, leadsRes] = await Promise.all([
        axios.get(`${API}/reports/overview`, { params }),
        axios.get(`${API}/reports/user-performance`),
        axios.get(`${API}/reports/source-performance`),
        axios.get(`${API}/reports/leads`, { params }),
      ]);

      setOverview(ovRes.data);
      setBda(bdaRes.data.data || []);
      setSources(srcRes.data.data || []);
      setLeads(leadsRes.data.leads || []);
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (from)      params.from        = from;
      if (to)        params.to          = to;
      if (statusF)   params.status      = statusF;
      if (sourceF)   params.source      = sourceF;
      if (assignedF) params.assigned_to = assignedF;

      const res = await axios.get(`${API}/reports/export`, {
        params, responseType:"blob",
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `leads-report-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  /* Pie data for status */
  const statusPieData = useMemo(() => {
    if (!overview?.byStatus) return [];
    return overview.byStatus.map(s => ({
      name:  s.status || "Unknown",
      value: parseInt(s.count),
    }));
  }, [overview]);

  /* Bar data for BDA performance */
  const bdaBarData = useMemo(() =>
    bda.map(b => ({
      name:       b.bda_name?.split("@")[0] || "Unassigned",
      total:      parseInt(b.total_leads),
      converted:  parseInt(b.converted),
      followups:  parseInt(b.followups),
    }))
  , [bda]);

  const bdaNames = useMemo(() => [...new Set(leads.map(l => l.assigned_to).filter(Boolean))], [leads]);

  const SECTIONS = [
    { key:"overview",    label:"📊 Overview" },
    { key:"bda",         label:"👤 BDA Performance" },
    { key:"sources",     label:"🎯 Source Analysis" },
    { key:"leads",       label:"📋 Lead Details" },
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
          <button className="bda-btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "📥 Export Excel"}
          </button>
        </div>
      </div>

      {/* ── FILTERS ── */}
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

      {/* ════════════ OVERVIEW ════════════ */}
      {activeSection === "overview" && (
        <>
          {/* KPI Cards */}
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
                  <p className="rp-kpi__value">{bda.filter(b => b.bda_name !== "Unassigned").length}</p>
                </div>
              </>
            )}
          </div>

          <div className="rp-charts-row">
            {/* Monthly trend */}
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

            {/* Status pie */}
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
                  <Bar dataKey="total"     name="Total"     fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="followups" name="Follow-ups" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="rp-table-wrap" style={{ marginTop:20 }}>
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th>BDA Name</th>
                      <th>Total Leads</th>
                      <th>Converted</th>
                      <th>Interested</th>
                      <th>Follow-ups</th>
                      <th>Junk</th>
                      <th>Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bda.map((b, i) => (
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
                <BarChart data={sources} margin={{ top:10, right:12, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="source" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total"     name="Total"     radius={[4,4,0,0]}>
                    {sources.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
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
                    {sources.map((s, i) => (
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

      {/* ════════════ LEAD DETAILS ════════════ */}
      {activeSection === "leads" && (
        <div className="rp-card rp-card--full">
          <div className="rp-card__header">
            <h3 className="rp-card__title">Lead Details</h3>
            <p className="rp-card__sub">{leads.length} leads matching filters</p>
          </div>
          {loading ? <Sk h={300} /> : (
            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Phone</th><th>Source</th>
                    <th>Status</th><th>City</th><th>Assigned</th>
                    <th>Follow-ups</th><th>Last Follow-up</th><th>Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign:"center", color:"#94a3b8", padding:"32px 0" }}>
                      No leads match the selected filters
                    </td></tr>
                  ) : leads.map(l => (
                    <tr key={l.id}>
                      <td className="rp-td-name">{l.name}</td>
                      <td style={{ fontSize:12, color:"#64748b" }}>{l.phone}</td>
                      <td>
                        <span className="rp-src-pill">{l.source || "—"}</span>
                      </td>
                      <td>
                        <span className="rp-badge" style={{
                          background: STATUS_COLORS[(l.status||"").toLowerCase()]+"22",
                          color: STATUS_COLORS[(l.status||"").toLowerCase()] || "#475569",
                        }}>{l.status || "—"}</span>
                      </td>
                      <td style={{ fontSize:12, color:"#64748b" }}>{l.city || "—"}</td>
                      <td style={{ fontSize:12, color:"#64748b" }}>{l.assigned_to || "—"}</td>
                      <td style={{ textAlign:"center" }}>{l.followup_count || 0}</td>
                      <td style={{ fontSize:11, color:"#94a3b8" }}>
                        {l.last_followup ? new Date(l.last_followup).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ fontSize:11, color:"#94a3b8" }}>
                        {new Date(l.created_at).toLocaleDateString("en-IN",{ day:"2-digit", month:"short", year:"numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BDAReports;