import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import "./BDAReports.css";
import "./BDAReportsExtra.css";

const API = "http://localhost:5000/api";

const SOURCE_COLORS  = ["#2563eb","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899"];
const STATUS_COLORS  = {
  new:"#2563eb", interested:"#8b5cf6", "follow up":"#f59e0b",
  converted:"#10b981", contacted:"#059669", "not interested":"#94a3b8", junk:"#ef4444",
};
// Source-quality thresholds (used for the "Verdict" column)
const MIN_LEADS_FOR_VERDICT = 10;
const sourceVerdict = (r) => {
  if (r.total < MIN_LEADS_FOR_VERDICT) return { label: "Low data", tone: "gray" };
  if (r.junk_rate >= 40) return { label: "Cut / fix targeting", tone: "red" };
  if (r.qualified_rate >= 40 && r.junk_rate <= 25) return { label: "Invest more", tone: "green" };
  return { label: "Maintain", tone: "amber" };
};
/* Lead "temperature" buckets for the quality chart (derived from lead status).
   Colours are the SAME ones the Overview donut uses for these statuses, so a
   colour means the same thing everywhere on the page. Left → right = best → worst. */
const QUALITY_BUCKETS = [
  { key: "Converted", label: "Converted",                               color: "#10b981" }, // green  = Converted
  { key: "Hot",       label: "Hot (Interested)",                        color: "#8b5cf6" }, // purple = Interested
  { key: "Warm",      label: "Warm (Follow Up)",                        color: "#f59e0b" }, // amber  = Follow up
  { key: "Cool",      label: "Cool (New / Contacted / Not interested)", color: "#06b6d4" }, // cyan
  { key: "Junk",      label: "Junk",                                    color: "#ef4444" }, // red    = Junk
];
const fmtINR = (n) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const monthNow = () => new Date().toISOString().slice(0, 7);

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
  const [options,     setOptions]     = useState({ bdas: [], sources: [] });
  const [costAvailable, setCostAvailable] = useState(true);
  const [spendLog,    setSpendLog]    = useState([]);
  const [spendForm,   setSpendForm]   = useState({ source: "", month: monthNow(), amount: "" });
  const [spendMsg,    setSpendMsg]    = useState(null);

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

  // Only the CEO can see this page's data — skip fetching for anyone else.
  useEffect(() => {
    if (isCEO) {
      loadAll();
      loadTimeData();
      loadOptions();
      loadSpend();
    } else {
      setLoading(false);
      setTimeLoading(false);
    }
  }, []);

  /* Every BDA (even with 0 leads) + every lead source — for the dropdowns */
  const loadOptions = async () => {
    try {
      const res = await axios.get(`${API}/reports/filter-options`, { params: { role } });
      setOptions({ bdas: res.data.bdas || [], sources: res.data.sources || [] });
    } catch (err) { console.error("Filter options error:", err); }
  };

  const loadSpend = async () => {
    try {
      const res = await axios.get(`${API}/reports/source-spend`, { params: { role } });
      setSpendLog(res.data.data || []);
    } catch (err) { console.error("Spend load error:", err); }
  };

  const loadAll = async (filters = {}) => {
    setLoading(true);
    try {
      const params = { role };
      if (filters.from)        params.from        = filters.from;
      if (filters.to)          params.to          = filters.to;
      if (filters.status)      params.status      = filters.status;
      if (filters.source)      params.source      = filters.source;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;

      // the same filters now drive Overview, BDA Performance and Source Analysis
      const [ovRes, bdaRes, srcRes] = await Promise.all([
        axios.get(`${API}/reports/overview`, { params }),
        axios.get(`${API}/reports/user-performance`, { params }),
        axios.get(`${API}/reports/source-performance`, { params }),
      ]);

      setOverview(ovRes.data);
      setBda(bdaRes.data.data || []);
      setSources(srcRes.data.data || []);
      setCostAvailable(srcRes.data.costAvailable !== false);
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeData = async (filters = {}) => {
    setTimeLoading(true);
    try {
      const params = { role };
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

  const saveSpend = async (e) => {
    e.preventDefault();
    setSpendMsg(null);
    try {
      await axios.post(`${API}/reports/source-spend`, {
        role,
        source: spendForm.source,
        month:  spendForm.month,
        amount: spendForm.amount,
      });
      setSpendForm(f => ({ ...f, amount: "" }));
      setSpendMsg({ ok: true, text: "Spend saved." });
      loadSpend();
      loadAll({ from, to, status: statusF, source: sourceF, assigned_to: assignedF });
    } catch (err) {
      setSpendMsg({ ok: false, text: err?.response?.data?.error || "Couldn't save spend." });
    }
  };

  const deleteSpend = async (id) => {
    try {
      await axios.delete(`${API}/reports/source-spend/${id}`, { params: { role } });
      loadSpend();
      loadAll({ from, to, status: statusF, source: sourceF, assigned_to: assignedF });
    } catch (err) { console.error("Delete spend error:", err); }
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
      const params = { role };
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
      const params = { role, status: "Converted" };
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
      const res = await axios.get(`${API}/reports/export-bda-performance`, { params: { role }, responseType:"blob" });
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

  /* ── Sources (already grouped + normalised by the server) ── */
  const sourceRows = useMemo(() =>
    sources.map(s => ({ ...s, verdict: sourceVerdict(s) }))
  , [sources]);

  const sourceTotals = useMemo(() => {
    const t = sourceRows.reduce((a, s) => ({
      total: a.total + s.total, qualified: a.qualified + s.qualified,
      junk: a.junk + s.junk, spend: a.spend + (s.spend || 0),
    }), { total: 0, qualified: 0, junk: 0, spend: 0 });
    return {
      ...t,
      qualifiedRate: t.total ? (t.qualified * 100 / t.total).toFixed(1) : "0.0",
      junkRate: t.total ? (t.junk * 100 / t.total).toFixed(1) : "0.0",
      cpl: t.spend > 0 && t.total > 0 ? t.spend / t.total : null,
      cpql: t.spend > 0 && t.qualified > 0 ? t.spend / t.qualified : null,
    };
  }, [sourceRows]);

  /* 100%-stacked quality mix per source: Converted / Hot / Warm / Cool / Junk.
     Bar values are exact shares (they add up to exactly 100, so the axis never
     shows 100.1%); the rounded % shown in the tooltip is computed from the counts. */
  const qualityMixData = useMemo(() =>
    sourceRows.filter(s => s.total > 0).map(s => {
      const share = (n) => (n * 100) / s.total;
      return {
        source: s.source, total: s.total,
        Converted: share(s.converted), Hot: share(s.hot), Warm: share(s.warm),
        Cool: share(s.cool), Junk: share(s.junk),
        convertedN: s.converted, hotN: s.hot, warmN: s.warm, coolN: s.cool, junkN: s.junk,
      };
    })
  , [sourceRows]);

  const costChartData = useMemo(() =>
    sourceRows.filter(s => s.cost_per_lead != null).map(s => ({
      source: s.source,
      "Cost per lead": s.cost_per_lead,
      "Cost per qualified lead": s.cost_per_qualified,
    }))
  , [sourceRows]);

  /* Headline insights for deciding where to invest */
  const insights = useMemo(() => {
    const eligible = sourceRows.filter(s => s.total >= MIN_LEADS_FOR_VERDICT);
    const best = [...eligible].sort((a, b) => b.qualified_rate - a.qualified_rate)[0];
    const worst = [...eligible].filter(s => s.junk > 0).sort((a, b) => b.junk_rate - a.junk_rate)[0];
    const cheapest = [...sourceRows].filter(s => s.cost_per_qualified != null)
      .sort((a, b) => a.cost_per_qualified - b.cost_per_qualified)[0];
    return { best, worst, cheapest };
  }, [sourceRows]);

  /* ── Time Spent ── */
  const timeTotals = timeData?.totals || {};
  const timeBdaRows = useMemo(() =>
    (timeData?.bdaSummary || []).map(b => ({
      name:        (b.bda_name || b.bda_email || "Unknown"),
      email:       b.bda_email,
      reviewMin:   +(Number(b.review_sec) / 60).toFixed(1),
      updateMin:   +(Number(b.update_sec) / 60).toFixed(1),
      totalSec:    Number(b.total_sec),
      avgLeadMin:  +(Number(b.avg_sec_per_lead) / 60).toFixed(1),
      avgLeadSec:  Number(b.avg_sec_per_lead) || 0,
      leads:       Number(b.leads_engaged),
      sessions:    Number(b.sessions),
    }))
  , [timeData]);

  const avgTimePerLeadSec = Number(timeTotals.leads_engaged) > 0
    ? Math.round(Number(timeTotals.total_sec) / Number(timeTotals.leads_engaged)) : 0;

  const topLeadsData = useMemo(() => timeData?.topLeads || [], [timeData]);

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
          <button className="bda-btn-outline" onClick={() => { loadAll({}); loadTimeData({}); loadOptions(); loadSpend(); }}>↻ Refresh</button>
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
                {options.sources.map(s =>
                  <option key={s.key} value={s.key}>{s.label}</option>
                )}
              </select>
            </div>
            <div className="rp-filter-group">
              <label className="rp-filter-label">Assigned To</label>
              <select className="rp-filter-input" value={assignedF} onChange={e => setAssignedF(e.target.value)}>
                <option value="">All BDA</option>
                {options.bdas.map(b => <option key={b.email || b.name} value={b.name}>{b.name}</option>)}
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
                    <p className="rp-kpi__value">{bdaTableData.filter(b => Number(b.total_leads) > 0).length}</p>
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
          <div className="rpx-stack">

            {/* ── Headline numbers ── */}
            <div className="rp-kpis">
              {loading ? [1,2,3,4].map(i => <Sk key={i} h={90} />) : (
                <>
                  <div className="rp-kpi rp-kpi--blue">
                    <p className="rp-kpi__label">Total Leads</p>
                    <p className="rp-kpi__value">{fmtNum(sourceTotals.total)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--green">
                    <p className="rp-kpi__label">Quality Lead Rate</p>
                    <p className="rp-kpi__value">{sourceTotals.qualifiedRate}%</p>
                  </div>
                  <div className="rp-kpi rp-kpi--red">
                    <p className="rp-kpi__label">Junk Rate</p>
                    <p className="rp-kpi__value">{sourceTotals.junkRate}%</p>
                  </div>
                  <div className="rp-kpi rp-kpi--amber">
                    <p className="rp-kpi__label">Cost per Lead</p>
                    <p className="rp-kpi__value" style={{ fontSize: 24 }}>
                      {costAvailable ? fmtINR(sourceTotals.cpl) : "—"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Where to invest: 3 plain-language insights ── */}
            {!loading && (
              <div className="rpx-insights">
                <div className="rpx-insight rpx-insight--green">
                  <span className="rpx-insight__k">Best quality source</span>
                  <strong>{insights.best ? insights.best.source : "—"}</strong>
                  <span className="rpx-insight__s">
                    {insights.best
                      ? `${insights.best.qualified_rate}% of its ${insights.best.total} leads are qualified`
                      : `Needs ${MIN_LEADS_FOR_VERDICT}+ leads per source`}
                  </span>
                </div>
                <div className="rpx-insight rpx-insight--red">
                  <span className="rpx-insight__k">Most junk</span>
                  <strong>{insights.worst ? insights.worst.source : "—"}</strong>
                  <span className="rpx-insight__s">
                    {insights.worst
                      ? `${insights.worst.junk_rate}% of its ${insights.worst.total} leads are junk`
                      : "No junk recorded"}
                  </span>
                </div>
                <div className="rpx-insight rpx-insight--blue">
                  <span className="rpx-insight__k">Cheapest qualified lead</span>
                  <strong>{insights.cheapest ? insights.cheapest.source : "—"}</strong>
                  <span className="rpx-insight__s">
                    {insights.cheapest
                      ? `${fmtINR(insights.cheapest.cost_per_qualified)} per qualified lead`
                      : costAvailable ? "Add spend below to see costs" : "Clear the BDA filter to see costs"}
                  </span>
                </div>
              </div>
            )}

            {/* ── Charts ── */}
            <div className="rp-charts-row">
              <div className="rp-card rp-card--wide">
                <div className="rp-card__header">
                  <h3 className="rp-card__title">Lead Quality by Source</h3>
                  <p className="rp-card__sub">Share of each source's leads by temperature: converted, hot, warm, cool or junk</p>
                </div>
                {loading ? <Sk h={240} /> : qualityMixData.length === 0 ? (
                  <div className="ts-chart-empty">No leads in this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, qualityMixData.length * 46 + 40)}>
                    <BarChart data={qualityMixData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow unit="%" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="source" width={88} tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(37,99,235,.05)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rp-tooltip">
                              <p className="rp-tooltip__label">{d.source} · {d.total} leads</p>
                              {QUALITY_BUCKETS.map(b => (
                                <p key={b.key} style={{ fontSize: 12, color: "#475569" }}>
                                  <span className="rpx-dot" style={{ background: b.color }} />
                                  {b.key}: <b>{d[b.key.toLowerCase() + "N"]}</b> ({((d[b.key.toLowerCase() + "N"] * 100) / d.total).toFixed(1)}%)
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        content={() => (
                          <div className="rpx-legend">
                            {QUALITY_BUCKETS.map(b => (
                              <span key={b.key}><i style={{ background: b.color }} />{b.label}</span>
                            ))}
                          </div>
                        )}
                      />
                      {QUALITY_BUCKETS.map((b, i) => (
                        <Bar key={b.key} dataKey={b.key} stackId="q" fill={b.color}
                          radius={i === QUALITY_BUCKETS.length - 1 ? [0, 4, 4, 0] : 0} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rp-card">
                <div className="rp-card__header">
                  <h3 className="rp-card__title">Cost by Source</h3>
                  <p className="rp-card__sub">Per lead vs per qualified lead (₹)</p>
                </div>
                {loading ? <Sk h={240} /> : costChartData.length === 0 ? (
                  <div className="ts-chart-empty" style={{ textAlign: "center", padding: "0 16px" }}>
                    {costAvailable ? "Log marketing spend below to see cost per lead" : "Cost is per source — clear the BDA filter"}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, costChartData.length * 60 + 40)}>
                    <BarChart data={costChartData} margin={{ top: 10, right: 8, left: -6, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="source" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => fmtINR(v)} />
                      <Legend iconType="square" iconSize={10} formatter={v => <span style={{ fontSize: 11, color: "#64748b" }}>{v}</span>} />
                      <Bar dataKey="Cost per lead" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Cost per qualified lead" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Scorecard table ── */}
            <div className="rp-card rp-card--full">
              <div className="rp-card__header">
                <h3 className="rp-card__title">Source Scorecard</h3>
                <p className="rp-card__sub">Quality, junk, conversion and cost — use this to decide where to invest</p>
              </div>
              {loading ? <Sk h={200} /> : (
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Source</th><th>Leads</th><th>Qualified</th><th>Hot / Warm / Cool</th><th>Junk</th>
                        <th>Converted</th><th>Spend</th><th>Cost / Lead</th>
                        <th>Cost / Qualified</th><th>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRows.length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: "center", color: "#94a3b8", padding: "28px 0" }}>No source data</td></tr>
                      ) : sourceRows.map((s, i) => (
                        <tr key={s.source_key}>
                          <td>
                            <span className="rp-source-dot" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                            {s.source}
                          </td>
                          <td>{s.total}</td>
                          <td>{s.qualified} <span className="rpx-muted">({s.qualified_rate}%)</span></td>
                          <td>
                            <span className="rpx-temp rpx-temp--hot">{s.hot}</span>
                            <span className="rpx-temp rpx-temp--warm">{s.warm}</span>
                            <span className="rpx-temp rpx-temp--cool">{s.cool}</span>
                          </td>
                          <td>{s.junk} <span className="rpx-muted">({s.junk_rate}%)</span></td>
                          <td>{s.converted} <span className="rpx-muted">({s.conversion_rate}%)</span></td>
                          <td>{costAvailable && s.spend > 0 ? fmtINR(s.spend) : "—"}</td>
                          <td>{costAvailable ? fmtINR(s.cost_per_lead) : "—"}</td>
                          <td>{costAvailable ? fmtINR(s.cost_per_qualified) : "—"}</td>
                          <td><span className={`rpx-pill rpx-pill--${s.verdict.tone}`}>{s.verdict.label}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="rpx-note">
                <b>Hot</b> = Interested, <b>Warm</b> = Follow Up, <b>Cool</b> = New, Contacted or Not Interested,
                <b>Converted</b> = won. <b>Qualified</b> = Converted + Hot + Warm. <b>Junk</b> = marked junk or deleted
                as junk (included here even after deletion, so bad sources can't hide).
                <b> Verdict</b> (needs {MIN_LEADS_FOR_VERDICT}+ leads): <i>Invest more</i> = qualified ≥ 40% and junk ≤ 25%;
                <i> Cut / fix targeting</i> = junk ≥ 40%; otherwise <i>Maintain</i>.
                Sources with no spend logged (Walk-in, Referral, Manual…) show "—" for cost.
              </p>
            </div>

            {/* ── Spend log ── */}
            <div className="rp-card rp-card--full">
              <div className="rp-card__header">
                <h3 className="rp-card__title">Marketing Spend</h3>
                <p className="rp-card__sub">Enter what you spent on each source per month — this powers cost per lead</p>
              </div>
              <form className="rpx-spend-form" onSubmit={saveSpend}>
                <div className="rp-filter-group">
                  <label className="rp-filter-label">Source</label>
                  <select className="rp-filter-input" required value={spendForm.source}
                    onChange={e => setSpendForm(f => ({ ...f, source: e.target.value }))}>
                    <option value="">Select source</option>
                    {options.sources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="rp-filter-group">
                  <label className="rp-filter-label">Month</label>
                  <input className="rp-filter-input" type="month" required value={spendForm.month}
                    onChange={e => setSpendForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div className="rp-filter-group">
                  <label className="rp-filter-label">Amount spent (₹)</label>
                  <input className="rp-filter-input" type="number" min="0" step="1" required placeholder="0"
                    value={spendForm.amount}
                    onChange={e => setSpendForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <button className="bda-btn-primary" type="submit" style={{ fontSize: 12, padding: "9px 18px" }}>Save spend</button>
              </form>
              {spendMsg && <p className={`rpx-msg ${spendMsg.ok ? "ok" : "bad"}`}>{spendMsg.text}</p>}

              {spendLog.length > 0 && (
                <div className="rp-table-wrap" style={{ marginTop: 14 }}>
                  <table className="rp-table">
                    <thead><tr><th>Month</th><th>Source</th><th>Amount</th><th></th></tr></thead>
                    <tbody>
                      {spendLog.map(r => (
                        <tr key={r.id}>
                          <td>{r.month}</td>
                          <td style={{ textTransform: "capitalize" }}>{r.source_key}</td>
                          <td>{fmtINR(r.amount)}</td>
                          <td><button type="button" className="rpx-link-btn" onClick={() => deleteSpend(r.id)}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="rpx-note">
                Spend is matched by month: a date filter includes every month it touches. Saving the same
                source + month again replaces the amount.
              </p>
            </div>
          </div>
        )}

        {/* ════════════ TIME SPENT ════════════ */}
        {activeSection === "time" && (
          <div className="ts-section">

            {/* ── Time filters ── */}
            <div className="rp-filters" style={{ marginBottom: 18 }}>
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
                    {options.bdas.map(b => <option key={b.email} value={b.email}>{b.name}</option>)}
                  </select>
                </div>
                <div className="rp-filter-actions">
                  <button className="bda-btn-primary" style={{ fontSize: 12, padding: "7px 16px" }} onClick={applyTimeFilters}>Apply</button>
                  {(timeFrom || timeTo || timeBdaF) && (
                    <button className="bda-btn-outline" style={{ fontSize: 12, padding: "7px 14px" }} onClick={clearTimeFilters}>Clear</button>
                  )}
                </div>
              </div>
            </div>

            {timeLoading ? (
              <div className="rp-kpis"><Sk h={90} /><Sk h={90} /><Sk h={90} /><Sk h={90} /></div>
            ) : !timeBdaRows.length ? (
              <div className="ts-empty">
                <div className="ts-empty__icon">⏱</div>
                <p className="ts-empty__title">No activity data</p>
                <p className="ts-empty__sub">Time appears here once BDAs open or edit leads.</p>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="rp-kpis" style={{ marginBottom: 18 }}>
                  <div className="rp-kpi rp-kpi--blue">
                    <p className="rp-kpi__label">Total Time on Leads</p>
                    <p className="rp-kpi__value" style={{ fontSize: 22 }}>{fmtSec(timeTotals.total_sec)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--purple">
                    <p className="rp-kpi__label">Leads Engaged</p>
                    <p className="rp-kpi__value">{fmtNum(timeTotals.leads_engaged)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--green">
                    <p className="rp-kpi__label">Avg Time per Lead</p>
                    <p className="rp-kpi__value" style={{ fontSize: 22 }}>{fmtSec(avgTimePerLeadSec)}</p>
                  </div>
                  <div className="rp-kpi rp-kpi--amber">
                    <p className="rp-kpi__label">BDAs Active</p>
                    <p className="rp-kpi__value">{fmtNum(timeTotals.active_bdas)}</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="rp-charts-row" style={{ marginBottom: 16 }}>
                  <div className="rp-card rp-card--wide">
                    <div className="rp-card__header">
                      <div>
                        <h3 className="rp-card__title">Time Invested by BDA</h3>
                        <p className="rp-card__sub">Minutes spent reviewing lead details vs updating leads</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={timeBdaRows} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false}
                          label={{ value: "Minutes", angle: -90, position: "insideLeft", fill: "#cbd5e1", fontSize: 10 }} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(37,99,235,.05)" }} />
                        <Legend iconType="square" iconSize={10} formatter={v => <span style={{ fontSize: 11, color: "#64748b" }}>{v}</span>} />
                        <Bar dataKey="reviewMin" name="Reviewing (min)" stackId="t" fill="#2563eb" />
                        <Bar dataKey="updateMin" name="Updating (min)"  stackId="t" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rp-card">
                    <div className="rp-card__header">
                      <div>
                        <h3 className="rp-card__title">Average Time per Lead</h3>
                        <p className="rp-card__sub">Minutes per lead each BDA works on</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={timeBdaRows} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(139,92,246,.06)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rp-tooltip">
                                <p className="rp-tooltip__label">{d.name}</p>
                                <p style={{ color: "#8b5cf6", fontSize: 12, fontWeight: 600 }}>Avg per lead: {fmtSec(d.avgLeadSec)}</p>
                                <p style={{ color: "#64748b", fontSize: 12 }}>Leads engaged: {d.leads}</p>
                                <p style={{ color: "#64748b", fontSize: 12 }}>Total: {fmtSec(d.totalSec)}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="avgLeadMin" name="Avg min / lead" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tables */}
                <div className="ts-bottom-row">
                  <div className="rp-card ts-card-left">
                    <div className="rp-card__header">
                      <h3 className="rp-card__title">BDA Time Summary</h3>
                      <p className="rp-card__sub">Effort per lead for each team member</p>
                    </div>
                    <div className="rp-table-wrap">
                      <table className="rp-table">
                        <thead>
                          <tr>
                            <th>BDA</th><th>Leads Engaged</th><th>Total Time</th>
                            <th>Avg / Lead</th><th>Reviewing</th><th>Updating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeBdaRows.map(b => (
                            <tr key={b.email}>
                              <td className="rp-td-name">{b.name}</td>
                              <td>{b.leads}</td>
                              <td><span className="ts-time-badge">{fmtSec(b.totalSec)}</span></td>
                              <td>{fmtSec(b.avgLeadSec)}</td>
                              <td>{fmtSec(Math.round(b.reviewMin * 60))}</td>
                              <td>{fmtSec(Math.round(b.updateMin * 60))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rp-card ts-card-right">
                    <div className="rp-card__header">
                      <h3 className="rp-card__title">Top Leads by Time Invested</h3>
                      <p className="rp-card__sub">Time each BDA spent on an individual lead</p>
                    </div>
                    <div className="rp-table-wrap">
                      <table className="rp-table rpx-top-leads">
                        <thead>
                          <tr><th>#</th><th>Lead</th><th>BDA</th><th>Time Spent</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {topLeadsData.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}>No data</td></tr>
                          ) : topLeadsData.map((l, i) => (
                            <tr key={`${l.lead_id}-${l.bda_email}`}>
                              <td style={{ color: "#94a3b8", fontSize: 11 }}>{i + 1}</td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 12, color: "#1a2a4a" }}>{l.lead_name}</div>
                                <div style={{ fontSize: 10, color: "#94a3b8" }}>{l.phone}</div>
                              </td>
                              <td style={{ fontSize: 12 }}>{l.bda_name}</td>
                              <td>
                                <span className="ts-time-badge">{fmtSec(l.total_sec)}</span>
                                <div className="rpx-muted">{l.sessions} {Number(l.sessions) === 1 ? "visit" : "visits"}</div>
                              </td>
                              <td>
                                <span className="rp-badge" style={{ background: "#f0f9ff", color: "#0369a1", fontSize: 10 }}>
                                  {l.lead_status || "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <p className="rpx-note" style={{ marginTop: 14 }}>
                  <b>How time is measured:</b> the clock runs while a lead is open. <b>Reviewing</b> = the lead's
                  details are expanded; <b>Updating</b> = the edit window is open. Each visit is capped at
                  5 minutes so a tab left open doesn't inflate the numbers. <b>Leads Engaged</b> = distinct leads
                  a BDA opened. CEO browsing is excluded.
                </p>
              </>
            )}
          </div>
        )}

        {/* ════════════ MASK — BDA users ════════════
             ✅ Now covers ALL sections, including "time" —
             the Time Spent tab is no longer left unmasked
             for non-CEO users. */}
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