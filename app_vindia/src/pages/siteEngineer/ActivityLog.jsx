// src/pages/siteEngineer/ActivityLog.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/ActivityLog.css";
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
        <div className="al-header-actions">
          <button className="al-btn al-btn--ghost" onClick={loadEntries}>↻ Refresh</button>
          <span className="al-pill al-pill--muted">{filtered.length} entries</span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="al-panel al-panel--spaced">
        <div className="al-panel-head">
          <div className="al-panel-title">Filters</div>
          <button className="al-btn al-btn--ghost al-btn--sm" onClick={resetFilters}>Reset</button>
        </div>
        <div className="al-panel-body">
          <div className="al-filters-grid">
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

      {/* MAIN CONTENT: Two-column layout */}
      <div className="al-container">
        {/* LEFT COLUMN: Activity Entries */}
        <div className="al-main-column">
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
                <div className="al-list-grid">
                  {pageItems.map((a, i) => (
                    <div
                      key={a.id || `${a.createdAt}-${i}`}
                      className="al-list-item"
                      onClick={() => setSelected(a)}
                    >
                    <div className="al-list-main">
                      {/* Module icon */}
                      <div
                        className="al-module-icon"
                        style={{
                          background: `${MODULE_COLOR[a.type] || "#49769F"}18`,
                          border: `1px solid ${MODULE_COLOR[a.type] || "#49769F"}30`,
                        }}
                      >
                        {MODULE_ICON[a.type] || "•"}
                      </div>

                      <div className="al-list-content">
                        <div className="al-item-tags">
                          <strong className="al-item-user">{a.userName || a.user || "System"}</strong>
                          {a.type && (
                            <span className="al-meta-item" style={{
                              background: `${MODULE_COLOR[a.type]}18`,
                              color: MODULE_COLOR[a.type],
                              border: `1px solid ${MODULE_COLOR[a.type]}30`,
                            }}>
                              {a.type}
                            </span>
                          )}
                          {a.zone && <span className="al-meta-item">{a.zone}</span>}
                          <span className="al-meta-item">{fmtDT(a.createdAt || a.date)}</span>
                        </div>
                        <div className="al-item-message">
                          {(a.message || "—").slice(0, 200)}{a.message?.length > 200 ? "…" : ""}
                        </div>
                        {a.ref && <div className="al-item-ref">Ref: {a.ref}</div>}
                      </div>
                    </div>
                    <div className="al-item-view">View →</div>
                  </div>
                ))}
                </div>
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
        </div>

        {/* RIGHT COLUMN: Quick Actions, Labour Summary, Tips */}
        <div className="al-sidebar">
          {/* Quick Actions */}
          <div className="al-panel al-panel--spaced">
            <div className="al-panel-head">
              <div className="al-panel-title">Quick Actions</div>
            </div>
            <div className="al-panel-body">
              <div className="al-actions-list">
                <button className="al-btn al-btn--primary al-btn--block">Export to CSV</button>
                <button className="al-btn al-btn--secondary al-btn--block">Generate Report</button>
                <button className="al-btn al-btn--ghost al-btn--block" onClick={resetFilters}>Clear All Filters</button>
                <button className="al-btn al-btn--ghost al-btn--block" onClick={loadEntries}>Refresh Data</button>
              </div>
            </div>
          </div>

          {/* Labour Summary */}
          <div className="al-panel al-panel--spaced">
            <div className="al-panel-head">
              <div className="al-panel-title">Labour Summary</div>
            </div>
            <div className="al-panel-body">
              <div className="al-labour-stats">
                <div className="al-stat-item">
                  <span className="al-stat-label">Total Workers</span>
                  <span className="al-stat-value">24</span>
                </div>
                <div className="al-stat-item">
                  <span className="al-stat-label">Active Today</span>
                  <span className="al-stat-value">18</span>
                </div>
                <div className="al-stat-item">
                  <span className="al-stat-label">Overtime Hours</span>
                  <span className="al-stat-value">12.5</span>
                </div>
                <div className="al-stat-item">
                  <span className="al-stat-label">Absent</span>
                  <span className="al-stat-value">2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="al-panel">
            <div className="al-panel-head">
              <div className="al-panel-title">Tips</div>
            </div>
            <div className="al-panel-body">
              <div className="al-tips-list">
                <div className="al-tip-item">
                  <div className="al-tip-icon">💡</div>
                  <div className="al-tip-text">Use filters to narrow down activities by date, zone, or module type.</div>
                </div>
                <div className="al-tip-item">
                  <div className="al-tip-icon">📊</div>
                  <div className="al-tip-text">Click on any activity entry to view detailed information and attachments.</div>
                </div>
                <div className="al-tip-item">
                  <div className="al-tip-icon">🔄</div>
                  <div className="al-tip-text">Data refreshes automatically, but you can manually refresh using the button above.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {selected && (
        <div className="al-modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="al-modal-panel"
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-md)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="al-modal-header">
              <div className="al-modal-header-left">
                <div
                  className="al-module-icon"
                  style={{
                    background: `${MODULE_COLOR[selected.type] || "#49769F"}18`,
                    border: `1px solid ${MODULE_COLOR[selected.type] || "#49769F"}30`,
                    fontSize: 18,
                  }}
                >
                  {MODULE_ICON[selected.type] || "•"}
                </div>
                <div className="al-modal-meta">
                  <div className="al-modal-title">
                    {selected.type?.toUpperCase() || "Activity"} — {selected.userName || "System"}
                  </div>
                  <div className="al-modal-timestamp">{fmtDT(selected.createdAt)}</div>
                </div>
              </div>
              <button className="al-modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Modal body */}
            <div className="al-modal-body">
              {/* Meta grid */}
              <div className="al-modal-grid">
                {[
                  ["User", selected.userName || "System"],
                  ["Zone", selected.zone || "—"],
                  ["Reference", selected.ref || "—"],
                  ["Module", selected.type || "—"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="al-modal-label">{l}</div>
                    <div className="al-modal-value">{v}</div>
                  </div>
                ))}
              </div>

              {/* Message */}
              <div>
                <div className="al-modal-section-title">Message</div>
                <div className="al-modal-message">
                  {selected.message || "—"}
                </div>
              </div>

              {/* Attachments */}
              {selected.attachments?.length > 0 && (
                <div>
                  <div className="al-modal-section-title">Attachments</div>
                  <div className="al-file-list">
                    {selected.attachments.map((f, i) => (
                      <div key={i} className="al-file-item"><span>{f.name || f}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {(selected.ip || selected.device) && (
                <div className="al-modal-aux">
                  {selected.ip && <span>IP: {selected.ip} &nbsp;</span>}
                  {selected.device && <span>Device: {selected.device}</span>}
                </div>
              )}
            </div>

            <div className="al-modal-footer">
              <button className="al-btn al-btn--ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
