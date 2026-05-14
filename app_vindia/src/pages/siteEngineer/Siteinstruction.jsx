// src/pages/siteEngineer/SiteInstruction.jsx
// Architect issues Site Instructions → Site Engineer receives, acknowledges, implements
// Fix: removed duplicate "gap" key in style object (was gap:0 AND gap:8 on same element)
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import { useNotifications } from "../../context/Notificationcontext";
import "../../styles/shared-pages.css";

const PAGE_SIZE = 8;

const STATUS_CFG = {
  issued:       { label: "Issued",       bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
  acknowledged: { label: "Acknowledged", bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  implementing: { label: "Implementing", bg: "#F3EDF8", color: "#4A1A6E", border: "#C49FDC" },
  implemented:  { label: "Implemented",  bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
  disputed:     { label: "Disputed",     bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
};

function stableKey(it) {
  return it?.id != null ? String(it.id) : `${it?.si_number || ""}|${it?.createdAt || ""}`;
}

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function StatusBadge({ s }) {
  const c = STATUS_CFG[s] || STATUS_CFG.issued;
  return (
    <span className="si-badge" style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      {c.label}
    </span>
  );
}

/* ── WORKFLOW STEPS ──────────────────────────────────────── */
const FLOW_STEPS = [
  { role: "Architect",    action: "Issues SI",             color: "#185FA5" },
  null,
  { role: "Site Engineer", action: "Acknowledges (24h)",   color: "#BA7517" },
  null,
  { role: "Site Engineer", action: "Implements on site",   color: "#085041" },
  null,
  { role: "Daily Diary",  action: "Records implementation", color: "#3B3A37" },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function SiteInstruction() {
  const { push } = useNotifications();

  const [sis,        setSIs]      = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [search,     setSearch]   = useState("");
  const [filterStat, setFS]       = useState("all");
  const [page,       setPage]     = useState(1);
  const [updating,   setUpdating] = useState(null);
  const [expandedId, setExp]      = useState(null);
  const alive = useRef(true);

  /* ── load ─────────────────────────────────────────────── */
  useEffect(() => {
    alive.current = true;
    loadSIs();
    return () => { alive.current = false; };
  }, []);

  async function loadSIs() {
    setLoading(true);
    try {
      const res = await api.get("/site-instructions");
      if (!alive.current) return;
      const raw  = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      setSIs(raw.filter(it => {
        const k = stableKey(it);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }));
    } catch { /* offline */ }
    finally { if (alive.current) setLoading(false); }
  }

  /* ── actions ──────────────────────────────────────────── */
  const acknowledge = useCallback(async (si) => {
    if (updating) return;
    setUpdating(si.id);
    try {
      await api.patch(`/site-instructions/${si.id}`, { status: "acknowledged" });
      setSIs(s => s.map(it => it.id === si.id ? { ...it, status: "acknowledged" } : it));
      push(`SI acknowledged: "${si.title || si.si_number}"`, "approval", { linked_ref: si.si_number });
    } catch { alert("Could not update — check connection"); }
    finally { setUpdating(null); }
  }, [updating, push]);

  const markImplemented = useCallback(async (si) => {
    if (updating) return;
    setUpdating(si.id);
    try {
      await api.patch(`/site-instructions/${si.id}`, {
        status: "implemented",
        implemented_at: new Date().toISOString(),
      });
      setSIs(s => s.map(it => it.id === si.id ? { ...it, status: "implemented" } : it));
      push(`SI implemented: "${si.title || si.si_number}"`, "approval", { linked_ref: si.si_number });
    } catch { alert("Could not update — check connection"); }
    finally { setUpdating(null); }
  }, [updating, push]);

  /* ── filter ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let l = sis.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(it =>
        (it.title       || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q) ||
        (it.si_number   || "").toLowerCase().includes(q)
      );
    }
    if (filterStat !== "all") l = l.filter(it => (it.status || "issued") === filterStat);
    return l;
  }, [sis, search, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    issued:       sis.filter(s => s.status === "issued").length,
    acknowledged: sis.filter(s => s.status === "acknowledged").length,
    implementing: sis.filter(s => s.status === "implementing").length,
    implemented:  sis.filter(s => s.status === "implemented").length,
  }), [sis]);

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="si-page">

      {/* ── PAGE HEADER ── */}
      <div className="si-page-header">
        <div>
          <div className="si-eyebrow">Architect → Site Engineer</div>
          <h1 className="si-title">Site Instructions</h1>
          <div className="si-sub">
            Issued by Architect — acknowledge within 24h and implement on site
          </div>
        </div>
        <div className="si-header-pills">
          {stats.issued > 0 && (
            <span className="si-pill si-pill--danger">{stats.issued} Need Action</span>
          )}
          <span className="si-pill si-pill--muted">{sis.length} Total</span>
        </div>
      </div>

      {/* ── WORKFLOW FLOW STRIP ── */}
      {/* FIX: single gap value — was gap:0 and gap:8 together causing Vite warning */}
      <div className="si-flow-strip">
        {FLOW_STEPS.map((step, i) =>
          step === null ? (
            <div key={i} className="si-flow-arrow">→</div>
          ) : (
            <div key={i} className="si-flow-node">
              <div className="si-flow-role" style={{ color: step.color }}>{step.role}</div>
              <div className="si-flow-action">{step.action}</div>
            </div>
          )
        )}
      </div>

      {/* ── STAT CHIPS ── */}
      <div className="si-stats-bar">
        {[
          { label: "Issued",       val: stats.issued,       cls: "issued",       filter: "issued"       },
          { label: "Acknowledged", val: stats.acknowledged, cls: "acknowledged", filter: "acknowledged" },
          { label: "Implementing", val: stats.implementing, cls: "implementing", filter: "implementing" },
          { label: "Implemented",  val: stats.implemented,  cls: "implemented",  filter: "implemented"  },
        ].map(({ label, val, cls, filter }) => (
          <div
            key={label}
            className={`si-stat si-stat--${cls}${filterStat === filter ? " si-stat--active" : ""}`}
            onClick={() => { setFS(prev => prev === filter ? "all" : filter); setPage(1); }}
          >
            <div className="si-stat-num">{val}</div>
            <div className="si-stat-lbl">{label}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="si-layout">

        {/* LEFT — LIST */}
        <div className="si-main">

          {/* Controls */}
          <div className="si-controls">
            <div className="si-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search SIs by title, ref or description…"
                aria-label="Search site instructions"
              />
            </div>
            <select
              className="si-select"
              value={filterStat}
              onChange={e => { setFS(e.target.value); setPage(1); }}
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* SI List */}
          <div className="si-panel">
            {loading ? (
              <div className="si-loading">
                <div className="si-spinner" />
                Loading site instructions…
              </div>
            ) : pageItems.length === 0 ? (
              <div className="si-empty">
                <div className="si-empty-icon">📋</div>
                <div>No site instructions found</div>
              </div>
            ) : (
              <>
                {pageItems.map(si => {
                  const isOpen = expandedId === si.id;
                  return (
                    <div key={stableKey(si)} className={`si-item si-item--${si.status || "issued"}`}>

                      {/* Summary row */}
                      <div
                        className="si-item-header"
                        onClick={() => setExp(isOpen ? null : si.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && setExp(isOpen ? null : si.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="si-item-tags">
                          <span className="si-ref">
                            {si.si_number || `SI-${String(si.id || "").padStart(3, "0")}`}
                          </span>
                          <StatusBadge s={si.status || "issued"} />
                          {si.priority === "urgent" && (
                            <span className="si-urgent-tag">Urgent</span>
                          )}
                          <span className={`si-chevron${isOpen ? " si-chevron--open" : ""}`}>▼</span>
                        </div>

                        <div className="si-item-title">{si.title || "Untitled SI"}</div>

                        <div className="si-item-meta">
                          {si.issued_date         && <span>Issued: {fmtDate(si.issued_date)}</span>}
                          {si.zone                && <span>Zone: {si.zone}</span>}
                          {si.linked_rfi          && <span className="si-meta-rfi">Ref: {si.linked_rfi}</span>}
                          {si.response_required_by && <span>Respond by: {fmtDate(si.response_required_by)}</span>}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="si-expand">

                          {si.description && (
                            <div>
                              <div className="si-expand-label">Instruction</div>
                              <div className="si-desc-box">{si.description}</div>
                            </div>
                          )}

                          {si.drawing_ref && (
                            <div className="si-drawing-ref">
                              Drawing ref: <strong>{si.drawing_ref}</strong>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="si-action-row">
                            {si.status === "issued" && (
                              <button
                                className="si-btn si-btn--acknowledge"
                                onClick={() => acknowledge(si)}
                                disabled={updating === si.id}
                              >
                                {updating === si.id ? "Updating…" : "✓ Acknowledge"}
                              </button>
                            )}

                            {(si.status === "acknowledged" || si.status === "implementing") && (
                              <button
                                className="si-btn si-btn--implement"
                                onClick={() => markImplemented(si)}
                                disabled={updating === si.id}
                              >
                                {updating === si.id ? "Updating…" : "✓ Mark Implemented"}
                              </button>
                            )}

                            {si.status === "implemented" && (
                              <div className="si-implemented-msg">
                                ✓ Implementation complete — record in Daily Diary
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                {filtered.length > PAGE_SIZE && (
                  <div className="si-pagination">
                    <span className="si-page-info">
                      Page {page} of {totalPages} · {filtered.length} records
                    </span>
                    <div className="si-page-btns">
                      <button className="si-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}>← Prev</button>
                      <button className="si-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — ASIDE */}
        <aside className="si-aside">

          <div className="si-aside-card">
            <div className="si-aside-title">Status Summary</div>
            {[
              ["Issued (action needed)", stats.issued,       "#b83232"],
              ["Acknowledged",          stats.acknowledged,  "#BA7517"],
              ["Implementing",          stats.implementing,  "#4A1A6E"],
              ["Implemented",           stats.implemented,   "#085041"],
            ].map(([l, v, c]) => (
              <div key={l} className="si-aside-row">
                <span>{l}</span>
                <strong style={{ color: c }}>{v}</strong>
              </div>
            ))}
          </div>

          <div className="si-aside-card">
            <div className="si-aside-title">Contract Rules</div>
            <ul className="si-rules">
              <li>Acknowledge within <strong>24h</strong> of receipt</li>
              <li>Record implementation in Daily Diary</li>
              <li>Dispute via RFI — never verbally</li>
              <li>An SI is a <strong>contract document</strong> — never ignore</li>
              <li>Implemented = photo evidence required</li>
            </ul>
          </div>

        </aside>
      </div>
    </div>
  );
}