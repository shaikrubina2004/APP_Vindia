// src/pages/siteEngineer/LabourReport.jsx
// SE submits daily labour headcount → PM can view all reports
// Different from LabourRegistry (permanent worker records)
// This is: "who was on site today, how many, doing what"

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/LabourReport.css";

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 8;

const TRADES = [
  "Mason", "Carpenter", "Steel Fixer / Rebar", "Plumber", "Electrician",
  "Welder", "Painter", "Plasterer", "Tiler", "Waterproofing Applicator",
  "MEP Technician", "Crane Operator", "Excavator Operator", "Scaffolder",
  "Formwork Carpenter", "General Labour", "Supervisor", "Foreman",
];

const STATUS_CFG = {
  submitted:    { label: "Submitted",     bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
  acknowledged: { label: "Acknowledged", bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
  flagged:      { label: "Flagged",       bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
};

const BLANK_TRADE_ROW = { trade: "", count: "", contractor: "", zone: "", activity: "" };

function nowISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
}
function stableKey(it) { return it?.id != null ? String(it.id) : `${it?.date || ""}|${it?.created_at || ""}`; }

function StatusBadge({ s }) {
  const c = STATUS_CFG[s] || STATUS_CFG.submitted;
  return <span className="lr2-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{c.label}</span>;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function LabourReport() {
  /* ── Form state ─────────────────────────────────────────── */
  const [date,      setDate]      = useState(nowISO());
  const [project,   setProject]   = useState("");
  const [milestone, setMilestone] = useState("");
  const [dailyDiaryId, setDailyDiaryId] = useState(null);
  const [weather,   setWeather]   = useState("clear");
  const [shift,     setShift]     = useState("day");
  const [notes,     setNotes]     = useState("");
  const [trades,    setTrades]    = useState([{ ...BLANK_TRADE_ROW }]);
  const [errors,    setErrors]    = useState({});
  const [status,    setStatus]    = useState("");
  const [submitting, setSub]      = useState(false);
  const [showForm,  setShowForm]  = useState(true);

  /* ── List state ─────────────────────────────────────────── */
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filterStat,setFS]        = useState("all");
  const [page,      setPage]      = useState(1);
  const [expanded,  setExpanded]  = useState(null);

  /* ── Dropdown data ──────────────────────────────────────── */
  const [projects,    setProjects]    = useState([]);
  const [milestones,  setMilestones]  = useState([]);

  const alive = useRef(true);

 useEffect(() => {
  alive.current = true;

  loadReports();
  loadProjects();

  const diary = JSON.parse(
    sessionStorage.getItem("selectedDailyDiary")
  );

  if (diary) {
    setDailyDiaryId(diary.id);

    setDate(diary.report_date);

    setProject(diary.project_id);

    setMilestone(diary.milestone_id);

    setShift(diary.shift || "day");

    setWeather(diary.weather_am || "clear");

    setNotes(diary.notes || "");

    if (diary.project_id) {
      loadMilestones(diary.project_id);
    }
  }

  return () => {
    alive.current = false;
  };
}, []);
  /* ── Loaders ────────────────────────────────────────────── */
  async function loadReports() {
    setLoading(true);
    try {
      const res = await api.get("/labour-report");
      if (!alive.current) return;
      setReports(Array.isArray(res?.data) ? res.data.slice().reverse() : []);
    } catch { /* offline */ }
    finally { if (alive.current) setLoading(false); }
  }

  async function loadProjects() {
    try { const r = await api.get("/projects"); setProjects(Array.isArray(r?.data) ? r.data : []); } catch {}
  }

  async function loadMilestones(pid) {
    try { const r = await api.get(`/diary/milestones?project_id=${pid}`); setMilestones(r?.data || []); } catch {}
  }

  /* ── Trade row helpers ──────────────────────────────────── */
  const addTrade    = () => setTrades(p => [...p, { ...BLANK_TRADE_ROW }]);
  const removeTrade = i  => setTrades(p => p.filter((_, j) => j !== i));
  const updateTrade = (i, k, v) => setTrades(p => { const c = [...p]; c[i] = { ...c[i], [k]: v }; return c; });

  /* ── Validate ───────────────────────────────────────────── */
  function validate() {
    const e = {};
    if (!date) e.date = "Date required";
    const valid = trades.filter(t => t.trade && Number(t.count) > 0);
    if (!valid.length) e.trades = "Add at least one trade with headcount";
    trades.forEach((t, i) => {
      if (t.trade && !t.count) e[`count_${i}`] = "Enter headcount";
      if (!t.trade && t.count) e[`trade_${i}`] = "Select trade";
    });
    return e;
  }

  /* ── Submit ─────────────────────────────────────────────── */
  const submit = useCallback(async ev => {
    ev?.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Submitting…");
    try {
      const validTrades = trades.filter(t => t.trade && Number(t.count) > 0);
      const payload = {
  daily_diary_id: dailyDiaryId,
  date,
  project_id: project,
  milestone_id: milestone || null,
  weather,
  shift,
  notes,
  trades: validTrades.map(t => ({
    trade: t.trade,
    count: Number(t.count),
    contractor: t.contractor || "",
    zone: t.zone || "",
    activity: t.activity || "",
  })),
  total_headcount: validTrades.reduce(
    (s, t) => s + (Number(t.count) || 0),
    0
  ),
};
      await api.post("/labour-report", payload);
      await loadReports();
      setTrades([{ ...BLANK_TRADE_ROW }]);
      setNotes("");
      setStatus("Labour report submitted to PM ✓");
      setShowForm(false);
    } catch (err) {
      setStatus(err?.response?.data?.error || "Submission failed — check connection");
    } finally {
      if (alive.current) setSub(false);
    }
}, [
    dailyDiaryId,
    date,
    project,
    milestone,
    weather,
    shift,
    notes,
    trades,
]);
  /* ── Filters ────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = reports.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.date || "").includes(q) ||
        (r.notes || "").toLowerCase().includes(q) ||
        (r.project_name || "").toLowerCase().includes(q)
      );
    }
    if (filterStat !== "all") list = list.filter(r => (r.status || "submitted") === filterStat);
    return list;
  }, [reports, search, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  /* ── Stats ──────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalWorkers = reports.reduce((s, r) => s + (Number(r.total_headcount) || 0), 0);
    const today = reports.find(r => r.date === nowISO());
    return {
      total:       reports.length,
      totalWorkers,
      todayCount:  today?.total_headcount || 0,
      avgPerDay:   reports.length ? Math.round(totalWorkers / reports.length) : 0,
    };
  }, [reports]);

  /* ── Trade totals for form preview ──────────────────────── */
  const totalHeadcount = trades.reduce((s, t) => s + (Number(t.count) || 0), 0);

  return (
    <div className="lr2-page">

      {/* HEADER */}
      <div className="lr2-page-header">
        <div>
          <div className="lr2-eyebrow">Daily Report → Project Manager</div>
          <h1 className="lr2-title">Labour Headcount Report</h1>
          <div className="lr2-sub">Submit daily workforce count by trade — PM monitors labour across all sites</div>
        </div>
        <button className="lr2-btn lr2-btn--primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? "▲ Hide Form" : "+ New Daily Report"}
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="lr2-stats-bar">
        {[
          { icon: "👷", num: stats.todayCount,  label: "On Site Today",    cls: "lr2-stat--highlight" },
          { icon: "📋", num: stats.total,        label: "Reports Submitted", cls: "" },
          { icon: "📊", num: stats.totalWorkers, label: "Total Man-Days",   cls: "" },
          { icon: "📈", num: stats.avgPerDay,    label: "Avg / Day",        cls: "" },
        ].map((s, i) => (
          <div key={i} className={`lr2-stat-card ${s.cls}`}>
            <div className="lr2-stat-icon">{s.icon}</div>
            <div className="lr2-stat-info">
              <div className="lr2-stat-num">{s.num}</div>
              <div className="lr2-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FORM ────────────────────────────────────────────── */}
      {showForm && (
        <div className="lr2-panel lr2-panel--form">
          <div className="lr2-panel-head">
            <div className="lr2-panel-title">Submit Daily Labour Report</div>
            <div className="lr2-panel-sub">Record headcount by trade — sent to PM on submission</div>
          </div>
          <div className="lr2-panel-body">
            <form onSubmit={submit} noValidate>

              {/* Header row */}
              <div className="lr2-section">
                <div className="lr2-section-title">Report Header</div>
                <div className="lr2-grid-4">
                  <div className="lr2-field">
                    <label className="lr2-label">Date *</label>
                    <input type="date" className="lr2-input" value={date}
                      onChange={e => { setDate(e.target.value); setErrors({}); }}/>
                    {errors.date && <div className="lr2-error">{errors.date}</div>}
                  </div>
                  <div className="lr2-field">
                    <label className="lr2-label">Shift</label>
                    <select className="lr2-select" value={shift} onChange={e => setShift(e.target.value)}>
                      <option value="day">Day Shift</option>
                      <option value="night">Night Shift</option>
                      <option value="double">Double Shift</option>
                    </select>
                  </div>
                  <div className="lr2-field">
                    <label className="lr2-label">Weather</label>
                    <select className="lr2-select" value={weather} onChange={e => setWeather(e.target.value)}>
                      <option value="clear">☀️ Clear</option>
                      <option value="cloudy">🌤 Cloudy</option>
                      <option value="rain">🌧 Rain</option>
                      <option value="heavy_rain">⛈ Heavy Rain</option>
                      <option value="hot">🌡 Extreme Heat</option>
                    </select>
                  </div>
                  <div className="lr2-field">
                    <label className="lr2-label">Project</label>
                    <select className="lr2-select" value={project} onChange={e => {
                      setProject(e.target.value); setMilestone("");
                      setMilestones([]); if (e.target.value) loadMilestones(e.target.value);
                    }}>
                      <option value="">Select project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="lr2-field">
                    <label className="lr2-label">Milestone / Zone</label>
                    <select className="lr2-select" value={milestone} disabled={!project}
                      onChange={e => setMilestone(e.target.value)}>
                      <option value="">Select milestone</option>
                      {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Trade rows */}
              <div className="lr2-section">
                <div className="lr2-section-title">
                  Labour by Trade *
                  <button type="button" className="lr2-btn lr2-btn--ghost lr2-btn--sm"
                    style={{ marginLeft: "auto" }} onClick={addTrade}>
                    + Add Trade
                  </button>
                </div>

                {/* Column headers */}
                <div className="lr2-trade-head">
                  <span>#</span>
                  <span>Trade / Skill</span>
                  <span>Headcount *</span>
                  <span>Contractor</span>
                  <span>Zone</span>
                  <span>Activity</span>
                  <span></span>
                </div>

                {trades.map((t, i) => (
                  <div key={i} className="lr2-trade-row">
                    <span className="lr2-trade-num">{i + 1}</span>
                    <div>
                      <select className="lr2-select" value={t.trade}
                        onChange={e => { updateTrade(i, "trade", e.target.value); setErrors(e2 => { const c = { ...e2 }; delete c[`trade_${i}`]; return c; }); }}>
                        <option value="">Select trade…</option>
                        {TRADES.map(tr => <option key={tr} value={tr}>{tr}</option>)}
                      </select>
                      {errors[`trade_${i}`] && <div className="lr2-error">{errors[`trade_${i}`]}</div>}
                    </div>
                    <div>
                      <input type="number" min="1" className="lr2-input lr2-input--count"
                        value={t.count} placeholder="0"
                        onChange={e => { updateTrade(i, "count", e.target.value); setErrors(e2 => { const c = { ...e2 }; delete c[`count_${i}`]; return c; }); }}/>
                      {errors[`count_${i}`] && <div className="lr2-error">{errors[`count_${i}`]}</div>}
                    </div>
                    <div>
                      <input className="lr2-input" value={t.contractor}
                        onChange={e => updateTrade(i, "contractor", e.target.value)}
                        placeholder="Contractor name"/>
                    </div>
                    <div>
                      <input className="lr2-input" value={t.zone}
                        onChange={e => updateTrade(i, "zone", e.target.value)}
                        placeholder="Level 2 / Grid A"/>
                    </div>
                    <div>
                      <input className="lr2-input" value={t.activity}
                        onChange={e => updateTrade(i, "activity", e.target.value)}
                        placeholder="e.g. Column Casting"/>
                    </div>
                    <div>
                      <button type="button" className="lr2-remove-btn" onClick={() => removeTrade(i)}
                        disabled={trades.length === 1}>×</button>
                    </div>
                  </div>
                ))}

                {errors.trades && <div className="lr2-error" style={{ marginTop: 6 }}>{errors.trades}</div>}

                {/* Total preview */}
                {totalHeadcount > 0 && (
                  <div className="lr2-total-row">
                    <span>Total Workforce on Site Today</span>
                    <strong className="lr2-total-num">{totalHeadcount} workers</strong>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="lr2-section">
                <div className="lr2-section-title">Notes to PM</div>
                <textarea className="lr2-textarea" value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes about productivity, delays, safety incidents, site conditions, early departures, absenteeism…"
                  style={{ minHeight: 80 }}/>
              </div>

              {/* Submit */}
              <div className="lr2-submit-row">
                <button type="submit" className="lr2-btn lr2-btn--primary" disabled={submitting}>
                  {submitting ? "Submitting…" : `👷 Submit Report (${totalHeadcount} workers) to PM`}
                </button>
                <button type="button" className="lr2-btn lr2-btn--ghost"
                  onClick={() => { setTrades([{ ...BLANK_TRADE_ROW }]); setNotes(""); setErrors({}); setStatus(""); }}>
                  Clear
                </button>
                {status && (
                  <span className={`lr2-status ${status.includes("✓") ? "lr2-status--ok" : status.includes("Fix") || status.includes("fail") ? "lr2-status--err" : "lr2-status--saving"}`}>
                    {status}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REPORT HISTORY ──────────────────────────────────── */}
      <div className="lr2-panel">
        <div className="lr2-panel-head">
          <div className="lr2-panel-title">Submitted Labour Reports</div>
          <span className="lr2-pill">{filtered.length} reports</span>
        </div>

        <div className="lr2-filter-bar">
          <div className="lr2-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search date, project, notes…"/>
          </div>
          <select className="lr2-select lr2-select--sm" value={filterStat}
            onChange={e => { setFS(e.target.value); setPage(1); }}>
            <option value="all">All status</option>
            {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="lr2-loading"><div className="lr2-spinner"/>Loading…</div>
        ) : pageItems.length === 0 ? (
          <div className="lr2-empty">
            <div style={{ fontSize: 36, opacity: .3, marginBottom: 10 }}>👷</div>
            <div>{reports.length === 0 ? "No reports submitted yet" : "No reports match this filter"}</div>
          </div>
        ) : pageItems.map(r => {
          const rTrades = Array.isArray(r.trades) ? r.trades : [];
          const isOpen  = expanded === r.id;
          return (
            <div key={stableKey(r)} className="lr2-report-row">

              {/* Summary */}
              <div className="lr2-report-summary" onClick={() => setExpanded(isOpen ? null : r.id)}>
                <div className="lr2-report-left">
                  <div className="lr2-report-tags">
                    <span className="lr2-date-chip">{fmtDate(r.date)}</span>
                    <StatusBadge s={r.status || "submitted"}/>
                    {r.shift === "night"  && <span className="lr2-shift-tag">🌙 Night</span>}
                    {r.shift === "double" && <span className="lr2-shift-tag">⏰ Double</span>}
                    {r.weather === "rain"       && <span className="lr2-weather-tag">🌧 Rain</span>}
                    {r.weather === "heavy_rain" && <span className="lr2-weather-tag lr2-weather-tag--bad">⛈ Heavy Rain</span>}
                  </div>
                  <div className="lr2-report-headline">
                    <span className="lr2-headcount-num">{r.total_headcount || 0}</span>
                    <span className="lr2-headcount-label">workers on site</span>
                    {r.project_name && <span className="lr2-report-project">· {r.project_name}</span>}
                  </div>
                  <div className="lr2-report-meta">
                    {rTrades.length > 0 && (
                      <span>{rTrades.slice(0,3).map(t=>`${t.trade} (${t.count})`).join(" · ")}{rTrades.length>3?` +${rTrades.length-3} more`:""}</span>
                    )}
                  </div>
                </div>
                <div className="lr2-report-right">
                  <div className="lr2-report-total">
                    <div className="lr2-report-total-num">{r.total_headcount || 0}</div>
                    <div className="lr2-report-total-lbl">Total</div>
                  </div>
                  <span className="lr2-expand-btn">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="lr2-report-detail">

                  {/* Trade breakdown table */}
                  {rTrades.length > 0 && (
                    <div className="lr2-detail-section">
                      <div className="lr2-detail-title">Labour Breakdown by Trade</div>
                      <table className="lr2-trade-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Trade</th>
                            <th>Headcount</th>
                            <th>Contractor</th>
                            <th>Zone</th>
                            <th>Activity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rTrades.map((t, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: "monospace", color: "#7D9AB5", width: 32 }}>{i + 1}</td>
                              <td style={{ fontWeight: 700, color: "#001D39" }}>{t.trade}</td>
                              <td>
                                <span className="lr2-count-badge">{t.count}</span>
                              </td>
                              <td style={{ color: "#49769F" }}>{t.contractor || "—"}</td>
                              <td style={{ fontFamily: "monospace", fontSize: 11, color: "#7D9AB5" }}>{t.zone || "—"}</td>
                              <td style={{ color: "#49769F" }}>{t.activity || "—"}</td>
                            </tr>
                          ))}
                          <tr className="lr2-total-footer">
                            <td colSpan={2} style={{ fontWeight: 700, color: "#001D39" }}>Total</td>
                            <td><span className="lr2-count-badge lr2-count-badge--total">{r.total_headcount || 0}</span></td>
                            <td colSpan={3}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Notes */}
                  {r.notes && (
                    <div className="lr2-detail-section">
                      <div className="lr2-detail-title">Notes to PM</div>
                      <div className="lr2-detail-notes">{r.notes}</div>
                    </div>
                  )}

                  {/* PM acknowledgment */}
                  {r.pm_comment && (
                    <div className="lr2-detail-section">
                      <div className="lr2-detail-title">PM Comment</div>
                      <div className="lr2-pm-comment">{r.pm_comment}</div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="lr2-detail-meta">
                    <span>Submitted: {r.submitted_at ? new Date(r.submitted_at).toLocaleString("en-GB") : fmtDate(r.date)}</span>
                    {r.submitted_by_name && <span>By: {r.submitted_by_name}</span>}
                    <span>Weather: {r.weather || "—"}</span>
                    <span>Shift: {r.shift || "day"}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length > PAGE_SIZE && (
          <div className="lr2-pagination">
            <span className="lr2-page-info">Page {page} of {totalPages} · {filtered.length} reports</span>
            <div className="lr2-page-btns">
              <button className="lr2-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
              <button className="lr2-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}