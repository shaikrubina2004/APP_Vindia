// src/pages/projects/projectmanager/ProjectManagerLabour.jsx
// Project Manager view of all registered labour on their projects.
// Full personal details, trade breakdown, contractor summary,
// search + filter, status management, expandable worker cards.

import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/LabourRegistry.css";

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 12;

const STATUS_CFG = {
  active:    { label: "Active",    bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
  inactive:  { label: "Inactive",  bg: "#F1EFE8", color: "#444441", border: "#B4B2A9" },
  suspended: { label: "Suspended", bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
};

/* ── Helpers ─────────────────────────────────────────────── */
function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function age(dob) {
  if (!dob) return "—";
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + " yrs";
}
function stableKey(w) {
  return w?.id != null ? String(w.id) : `${w?.full_name || ""}|${w?.id_number || ""}`;
}

function StatusBadge({ s }) {
  const c = STATUS_CFG[s] || STATUS_CFG.active;
  return (
    <span className="lr-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function Avatar({ name, size = 40 }) {
  const initials = (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const colors   = ["#185FA5", "#085041", "#633806", "#4A1A6E", "#0A4174", "#791F1F"];
  const color    = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div className="lr-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ProjectManagerLabour() {
  const [workers, setWorkers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFS]     = useState("all");
  const [filterTrade, setFT]      = useState("all");
  const [filterContractor, setFC] = useState("all");
  const [page, setPage]           = useState(1);
  const [expandedId, setExp]      = useState(null);
  const [updating, setUpdating]   = useState(null);
  const [activeTab, setTab]       = useState("workers"); // "workers" | "summary"
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    fetchWorkers();
    return () => { alive.current = false; };
  }, []);

  async function fetchWorkers() {
    setLoading(true);
    try {
      const res = await api.get("/labour-registry");
      if (!alive.current) return;
      setWorkers(Array.isArray(res?.data) ? res.data : []);
    } catch {
      console.error("Failed to load workers");
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    if (updating) return;
    setUpdating(id);
    try {
      await api.patch(`/labour-registry/${id}/status`, { status });
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    } catch {
      alert("Status update failed — check connection");
    } finally {
      if (alive.current) setUpdating(null);
    }
  }

  /* ── Derived filter options ─────────────────────────────── */
  const allTrades       = useMemo(() => [...new Set(workers.map(w => w.trade).filter(Boolean))].sort(), [workers]);
  const allContractors  = useMemo(() => [...new Set(workers.map(w => w.contractor_name).filter(Boolean))].sort(), [workers]);

  /* ── Filtered list ──────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = workers.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        (w.full_name       || "").toLowerCase().includes(q) ||
        (w.id_number       || "").toLowerCase().includes(q) ||
        (w.trade           || "").toLowerCase().includes(q) ||
        (w.contractor_name || "").toLowerCase().includes(q) ||
        (w.phone           || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") list = list.filter(w => (w.status || "active") === filterStatus);
    if (filterTrade  !== "all") list = list.filter(w => w.trade === filterTrade);
    if (filterContractor !== "all") list = list.filter(w => w.contractor_name === filterContractor);
    return list;
  }, [workers, search, filterStatus, filterTrade, filterContractor]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  /* ── Stats ──────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:      workers.length,
    active:     workers.filter(w => !w.status || w.status === "active").length,
    inactive:   workers.filter(w => w.status === "inactive").length,
    suspended:  workers.filter(w => w.status === "suspended").length,
    contractors: allContractors.length,
    trades:      allTrades.length,
    totalWage:   workers.filter(w => !w.status || w.status === "active")
                        .reduce((s, w) => s + (Number(w.daily_wage) || 0), 0),
  }), [workers, allTrades, allContractors]);

  /* ── Trade breakdown ────────────────────────────────────── */
  const tradeBreakdown = useMemo(() => {
    const map = {};
    workers.forEach(w => {
      if (!w.trade) return;
      if (!map[w.trade]) map[w.trade] = { active: 0, total: 0 };
      map[w.trade].total++;
      if (!w.status || w.status === "active") map[w.trade].active++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [workers]);

  /* ── Contractor breakdown ───────────────────────────────── */
  const contractorBreakdown = useMemo(() => {
    const map = {};
    workers.forEach(w => {
      if (!w.contractor_name) return;
      if (!map[w.contractor_name]) map[w.contractor_name] = { count: 0, wage: 0 };
      map[w.contractor_name].count++;
      map[w.contractor_name].wage += Number(w.daily_wage) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [workers]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="lr-page">

      {/* HEADER */}
      <div className="lr-page-header">
        <div>
          <div className="lr-eyebrow">Project Manager View</div>
          <h1 className="lr-title">Labour Registry</h1>
          <div className="lr-sub">All registered workers on your projects — registered by Site Engineers</div>
        </div>
        <button className="lr-btn lr-btn--ghost" onClick={fetchWorkers}>
          🔄 Refresh
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="lr-stats-bar" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { icon: "👷", num: stats.total,        label: "Total Workers",     cls: "" },
          { icon: "✅", num: stats.active,       label: "Active on Site",    cls: "lr-stat--success" },
          { icon: "🏗",  num: stats.contractors,  label: "Contractors",       cls: "" },
          { icon: "💰", num: `₹${stats.totalWage.toLocaleString()}`, label: "Daily Wage (Active)", cls: "" },
        ].map((s, i) => (
          <div key={i} className={`lr-stat-card ${s.cls}`}>
            <div className="lr-stat-icon">{s.icon}</div>
            <div className="lr-stat-info">
              <div className="lr-stat-num">{s.num}</div>
              <div className="lr-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="pm-lr-tabs">
        {[["workers", "👷 Worker List"], ["summary", "📊 Summary"]].map(([v, label]) => (
          <button
            key={v}
            className={`lr-tab-btn${activeTab === v ? " lr-tab-btn--active" : ""}`}
            onClick={() => setTab(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ SUMMARY TAB ════════════════════════════════════ */}
      {activeTab === "summary" && (
        <div className="pm-summary-grid">

          {/* Trade breakdown */}
          <div className="lr-panel">
            <div className="lr-panel-head">
              <div className="lr-panel-title">Workers by Trade</div>
              <span className="lr-pill">{allTrades.length} trades</span>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {tradeBreakdown.length === 0 ? (
                <div className="lr-empty" style={{ padding: 24 }}>No data</div>
              ) : tradeBreakdown.map(([trade, counts]) => {
                const pct = stats.total ? Math.round((counts.total / stats.total) * 100) : 0;
                return (
                  <div key={trade}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: "var(--c-navy-900,#001D39)" }}>{trade}</span>
                      <span style={{ fontFamily: "monospace", color: "var(--c-text-3,#7D9AB5)" }}>
                        {counts.active} active / {counts.total} total
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: "var(--c-surface-3,#EAF0F6)", overflow: "hidden", border: "1px solid var(--c-border,rgba(10,65,116,.10))" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--c-navy-700,#0A4174)", borderRadius: 99, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contractor breakdown */}
          <div className="lr-panel">
            <div className="lr-panel-head">
              <div className="lr-panel-title">Workers by Contractor</div>
              <span className="lr-pill">{allContractors.length} contractors</span>
            </div>
            <div style={{ padding: "0" }}>
              {contractorBreakdown.length === 0 ? (
                <div className="lr-empty" style={{ padding: 24 }}>No data</div>
              ) : contractorBreakdown.map(([name, data]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--c-border,rgba(10,65,116,.10))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-navy-900,#001D39)" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-text-3,#7D9AB5)", fontFamily: "monospace", marginTop: 2 }}>
                      Daily outgoing: ₹{data.wage.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--c-navy-900,#001D39)", fontFamily: "monospace" }}>{data.count}</div>
                    <div style={{ fontSize: 10, color: "var(--c-text-3,#7D9AB5)", textTransform: "uppercase", letterSpacing: ".07em" }}>workers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="lr-panel">
            <div className="lr-panel-head">
              <div className="lr-panel-title">Status Overview</div>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Active",    count: stats.active,    color: "#085041", bg: "#E1F5EE" },
                { label: "Inactive",  count: stats.inactive,  color: "#444441", bg: "#F1EFE8" },
                { label: "Suspended", count: stats.suspended, color: "#791F1F", bg: "#FCEBEB" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "monospace", flexShrink: 0 }}>
                    {s.count}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "var(--c-text-3,#7D9AB5)" }}>
                      {stats.total ? Math.round((s.count / stats.total) * 100) : 0}% of workforce
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ WORKER LIST TAB ════════════════════════════════ */}
      {activeTab === "workers" && (
        <>
          {/* Filter bar */}
          <div className="lr-filter-bar">
            <div className="lr-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, ID, trade, contractor, phone…"
              />
            </div>
            <select className="lr-select lr-select--sm" value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}>
              <option value="all">All status</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select className="lr-select lr-select--sm" value={filterTrade} onChange={e => { setFT(e.target.value); setPage(1); }}>
              <option value="all">All trades</option>
              {allTrades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="lr-select lr-select--sm" value={filterContractor} onChange={e => { setFC(e.target.value); setPage(1); }}>
              <option value="all">All contractors</option>
              {allContractors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(search || filterStatus !== "all" || filterTrade !== "all" || filterContractor !== "all") && (
              <button className="lr-btn lr-btn--ghost lr-btn--sm" onClick={() => { setSearch(""); setFS("all"); setFT("all"); setFC("all"); setPage(1); }}>
                Clear
              </button>
            )}
          </div>

          {/* Panel */}
          <div className="lr-panel">
            <div className="lr-panel-head">
              <div className="lr-panel-title">Registered Workers</div>
              <span className="lr-pill">{filtered.length} workers</span>
            </div>

            {loading ? (
              <div className="lr-loading"><div className="lr-spinner" />Loading workers…</div>
            ) : pageItems.length === 0 ? (
              <div className="lr-empty">
                <div className="lr-empty-icon">👷</div>
                <div>{workers.length === 0 ? "No workers registered yet — Site Engineers can register workers" : "No workers match this filter"}</div>
              </div>
            ) : pageItems.map(w => (
              <div key={stableKey(w)} className="lr-worker-row">

                {/* Summary row */}
                <div className="lr-worker-summary" onClick={() => setExp(expandedId === w.id ? null : w.id)}>
                  <Avatar name={w.full_name} size={42} />
                  <div className="lr-worker-info">
                    <div className="lr-worker-name">{w.full_name}</div>
                    <div className="lr-worker-meta">
                      <span className="lr-trade-tag">{w.trade || "—"}</span>
                      {w.contractor_name && <span>· {w.contractor_name}</span>}
                      {w.phone           && <span>· {w.phone}</span>}
                      {w.daily_wage      && <span>· ₹{Number(w.daily_wage).toLocaleString()}/day</span>}
                    </div>
                  </div>
                  <div className="lr-worker-right">
                    <StatusBadge s={w.status || "active"} />
                    <span className="lr-expand-btn">{expandedId === w.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === w.id && (
                  <div className="lr-worker-detail">
                    <div className="lr-detail-grid">

                      {/* Personal */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Personal</div>
                        {[
                          ["Date of Birth", fmtDate(w.date_of_birth) + (w.date_of_birth ? ` (${age(w.date_of_birth)})` : "")],
                          ["Gender",        w.gender],
                          ["Blood Group",   w.blood_group],
                          ["Nationality",   w.nationality],
                          ["Address",       w.address],
                        ].filter(([, v]) => v && v !== "—").map(([l, v]) => (
                          <div key={l} className="lr-detail-row">
                            <span>{l}</span><strong>{v}</strong>
                          </div>
                        ))}
                      </div>

                      {/* Identity */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Identity</div>
                        {[
                          ["ID Type",     w.id_type?.toUpperCase()],
                          ["ID Number",   w.id_number],
                          ["PF Number",   w.pf_number],
                          ["ESIC Number", w.esic_number],
                        ].filter(([, v]) => v).map(([l, v]) => (
                          <div key={l} className="lr-detail-row">
                            <span>{l}</span><strong>{v}</strong>
                          </div>
                        ))}
                      </div>

                      {/* Contact */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Contact</div>
                        {[
                          ["Mobile",          w.phone],
                          ["Emergency Name",  w.emergency_contact_name],
                          ["Emergency Phone", w.emergency_contact_phone],
                        ].filter(([, v]) => v).map(([l, v]) => (
                          <div key={l} className="lr-detail-row">
                            <span>{l}</span><strong>{v}</strong>
                          </div>
                        ))}
                      </div>

                      {/* Work */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Work</div>
                        {[
                          ["Trade",          w.trade],
                          ["Contractor",     w.contractor_name],
                          ["Contractor Ph",  w.contractor_phone],
                          ["Daily Wage",     w.daily_wage ? `₹${Number(w.daily_wage).toLocaleString()}` : ""],
                          ["Joined Site",    fmtDate(w.date_joined)],
                          ["Registered By",  w.registered_by_name],
                        ].filter(([, v]) => v && v !== "—").map(([l, v]) => (
                          <div key={l} className="lr-detail-row">
                            <span>{l}</span><strong>{v}</strong>
                          </div>
                        ))}
                      </div>

                      {/* Medical */}
                      {(w.medical_conditions || w.allergies) && (
                        <div className="lr-detail-section">
                          <div className="lr-detail-title">Medical</div>
                          {w.blood_group       && <div className="lr-detail-row"><span>Blood Group</span><strong style={{ color: "#b83232", fontWeight: 800 }}>{w.blood_group}</strong></div>}
                          {w.medical_conditions && <div className="lr-detail-row"><span>Conditions</span><strong>{w.medical_conditions}</strong></div>}
                          {w.allergies          && <div className="lr-detail-row"><span>Allergies</span><strong>{w.allergies}</strong></div>}
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    {(w.photo_url || w.id_doc_url) && (
                      <div className="lr-doc-links">
                        {w.photo_url  && <a href={w.photo_url}  target="_blank" rel="noopener noreferrer" className="lr-doc-link">📷 View Photo</a>}
                        {w.id_doc_url && <a href={w.id_doc_url} target="_blank" rel="noopener noreferrer" className="lr-doc-link">🪪 View ID Document</a>}
                      </div>
                    )}

                    {/* PM status actions */}
                    <div className="lr-worker-actions">
                      <span style={{ fontSize: 11, color: "var(--c-text-3,#7D9AB5)", alignSelf: "center" }}>Change status:</span>
                      {(w.status || "active") !== "active" && (
                        <button className="lr-btn lr-btn--success lr-btn--sm" onClick={() => updateStatus(w.id, "active")} disabled={updating === w.id}>
                          ✓ Set Active
                        </button>
                      )}
                      {(w.status || "active") !== "inactive" && (
                        <button className="lr-btn lr-btn--ghost lr-btn--sm" onClick={() => updateStatus(w.id, "inactive")} disabled={updating === w.id}>
                          Mark Inactive
                        </button>
                      )}
                      {(w.status || "active") !== "suspended" && (
                        <button className="lr-btn lr-btn--danger lr-btn--sm" onClick={() => updateStatus(w.id, "suspended")} disabled={updating === w.id}>
                          ⚠ Suspend
                        </button>
                      )}
                      {updating === w.id && <span className="lr-updating">Updating…</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="lr-pagination">
                <span className="lr-page-info">Page {page} of {totalPages} · {filtered.length} workers</span>
                <div className="lr-page-btns">
                  <button className="lr-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                  <button className="lr-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}