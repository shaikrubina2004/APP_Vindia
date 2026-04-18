// src/pages/siteEngineer/ActivityLog.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
const FILTERS_KEY = "activityLog:filters:v3";
const PAGE_SIZE   = 12;

const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const MODULE_COLOR = {
  dsr:        "#6EA2B3",
  task:       "#4E8EA2",
  incident:   "#b83232",
  material:   "#49769F",
  inspection: "#0A4174",
  attendance: "#BDD8E9",
  progress:   "#7BBDE8",
  safety:     "#b07020",
};

const MODULE_ICON = {
  dsr: "📋", task: "✅", incident: "⚠️", material: "📦",
  inspection: "🔍", attendance: "👷", progress: "📊", safety: "🦺",
};

function fmtDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityLog() {
  const saved = ls.load(FILTERS_KEY) || {};
  const [filters, setFilters] = useState({ q: "", zone: "", type: "all", from: "", to: "", ...saved });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadEntries();
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => ls.save(FILTERS_KEY, filters), 700);
  }, [filters]);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await api.get("/activity-log");
      if (alive.current) setEntries(Array.isArray(res?.data) ? res.data.slice().reverse() : []);
    } catch (e) { console.error(e); }
    finally { if (alive.current) setLoading(false); }
  }

  const setF = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const filtered = useMemo(() => {
    let list = entries.slice();
    const q = (filters.q || "").toLowerCase().trim();
    if (q) list = list.filter(it =>
      (it.message || "").toLowerCase().includes(q) ||
      (it.userName || "").toLowerCase().includes(q) ||
      (it.zone || "").toLowerCase().includes(q)
    );
    if (filters.zone.trim()) list = list.filter(it => (it.zone || "").toLowerCase().includes(filters.zone.toLowerCase()));
    if (filters.type !== "all") list = list.filter(it => (it.type || "").toLowerCase() === filters.type);
    if (filters.from) list = list.filter(it => (it.date || it.createdAt || "").slice(0, 10) >= filters.from);
    if (filters.to)   list = list.filter(it => (it.date || it.createdAt || "").slice(0, 10) <= filters.to);
    return list;
  }, [entries, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const resetFilters = () => { setFilters({ q: "", zone: "", type: "all", from: "", to: "" }); setPage(1); };

  return (
    <div className="al-page">
      <div className="al-page-header">
        <div>
          <div className="al-eyebrow">Audit Trail</div>
          <h1 className="al-title">Activity Log</h1>
          <div className="al-sub">Chronological record of all site events and user actions</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="al-btn al-btn--ghost" onClick={loadEntries}>↻ Refresh</button>
          <span className="al-pill al-pill--muted">{filtered.length} entries</span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="al-panel" style={{ marginBottom: 18 }}>
        <div className="al-panel-head">
          <div className="al-panel-title">Filters</div>
          <button className="al-btn al-btn--ghost" style={{ fontSize: 11, padding: "4px 12px" }} onClick={resetFilters}>Reset</button>
        </div>
        <div className="al-panel-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 160px 160px", gap: 12 }}>
            <div className="al-field">
              <label className="al-label">Search</label>
              <div className="al-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={filters.q} onChange={e => setF("q", e.target.value)} placeholder="Message, user, zone…" />
              </div>
            </div>
            <div className="al-field">
              <label className="al-label">Zone</label>
              <input className="al-input" value={filters.zone} onChange={e => setF("zone", e.target.value)} placeholder="Filter by zone" />
            </div>
            <div className="al-field">
              <label className="al-label">Module Type</label>
              <select className="al-select" value={filters.type} onChange={e => setF("type", e.target.value)}>
                <option value="all">All types</option>
                {Object.keys(MODULE_ICON).map(t => (
                  <option key={t} value={t}>{MODULE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="al-field">
              <label className="al-label">From Date</label>
              <input type="date" className="al-input" value={filters.from} onChange={e => setF("from", e.target.value)} />
            </div>
            <div className="al-field">
              <label className="al-label">To Date</label>
              <input type="date" className="al-input" value={filters.to} onChange={e => setF("to", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="al-panel">
        <div className="al-panel-head">
          <div className="al-panel-title">Activity Entries</div>
          <span className="al-pill al-pill--muted">{filtered.length} results</span>
        </div>

        {loading
          ? <div className="al-loading"><div className="al-spinner" />Loading entries…</div>
          : pageItems.length === 0
            ? <div className="al-empty">No activity entries match this filter</div>
            : <>
                {pageItems.map((a, i) => (
                  <div
                    key={a.id || `${a.createdAt}-${i}`}
                    className="al-list-item"
                    onClick={() => setSelected(a)}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                      {/* Module icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${MODULE_COLOR[a.type] || "#49769F"}18`,
                        border: `1px solid ${MODULE_COLOR[a.type] || "#49769F"}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                      }}>
                        {MODULE_ICON[a.type] || "•"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="al-item-tags">
                          <strong style={{ fontSize: 13, color: "var(--c-navy-900)" }}>{a.userName || a.user || "System"}</strong>
                          {a.type && (
                            <span style={{
                              fontFamily: "var(--c-mono)", fontSize: 9, fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: ".1em",
                              background: `${MODULE_COLOR[a.type]}18`, color: MODULE_COLOR[a.type],
                              border: `1px solid ${MODULE_COLOR[a.type]}30`,
                              padding: "2px 8px", borderRadius: 99,
                            }}>
                              {a.type}
                            </span>
                          )}
                          {a.zone && <span className="al-meta-item">{a.zone}</span>}
                          <span className="al-meta-item">{fmtDT(a.createdAt || a.date)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.55, marginTop: 4 }}>
                          {(a.message || "—").slice(0, 200)}{a.message?.length > 200 ? "…" : ""}
                        </div>
                        {a.ref && <div style={{ fontFamily: "var(--c-mono)", fontSize: 11, color: "var(--c-teal-400)", marginTop: 4 }}>Ref: {a.ref}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--c-teal-400)", whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>View →</div>
                  </div>
                ))}
                <div className="al-pagination">
                  <span className="al-page-info">Page {page} of {totalPages} · {filtered.length} total entries</span>
                  <div className="al-page-btns">
                    <button className="al-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                    <button className="al-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                  </div>
                </div>
              </>
        }
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,29,57,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-md)", borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,29,57,.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${MODULE_COLOR[selected.type] || "#49769F"}18`,
                  border: `1px solid ${MODULE_COLOR[selected.type] || "#49769F"}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>
                  {MODULE_ICON[selected.type] || "•"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-navy-900)" }}>
                    {selected.type?.toUpperCase() || "Activity"} — {selected.userName || "System"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", fontFamily: "var(--c-mono)", marginTop: 1 }}>{fmtDT(selected.createdAt)}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--c-text-3)", lineHeight: 1 }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["User", selected.userName || "System"],["Zone", selected.zone || "—"],["Reference", selected.ref || "—"],["Module", selected.type || "—"]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontFamily: "var(--c-mono)", fontSize: 13, fontWeight: 600, color: "var(--c-navy-900)" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Message */}
              <div>
                <div style={{ fontSize: 9, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>Message</div>
                <div style={{ background: "var(--c-surface-2)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {selected.message || "—"}
                </div>
              </div>

              {/* Attachments */}
              {selected.attachments?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>Attachments</div>
                  <div className="al-file-list">
                    {selected.attachments.map((f, i) => (
                      <div key={i} className="al-file-item"><span>{f.name || f}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              {(selected.ip || selected.device) && (
                <div style={{ fontSize: 11, color: "var(--c-text-3)", fontFamily: "var(--c-mono)" }}>
                  {selected.ip && <span>IP: {selected.ip} &nbsp;</span>}
                  {selected.device && <span>Device: {selected.device}</span>}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 22px", borderTop: "1px solid var(--c-border)", display: "flex", justifyContent: "flex-end" }}>
              <button className="al-btn al-btn--ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
