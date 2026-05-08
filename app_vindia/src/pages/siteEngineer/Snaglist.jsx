// src/pages/siteEngineer/SnagList.jsx
// Production-level snag list for Site Engineer role
// Fixes applied: CSS Refactoring using SnagList.css

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import { useNotifications } from "../../context/Notificationcontext";
import "../../styles/Snaglist.css";

const PAGE_SIZE = 10;

const STATUS_FLOW = ["open", "in_progress", "resolved", "reinspection", "closed"];

const STATUS_CFG = {
  open:         { label: "Open" },
  in_progress:  { label: "In Progress" },
  resolved:     { label: "Resolved" },
  reinspection: { label: "Re-inspection" },
  closed:       { label: "Closed ✓" },
};

// Which next status can each role set?
const ROLE_ALLOWED_TRANSITIONS = {
  site_engineer: ["in_progress", "resolved"],
  architect:     ["reinspection", "closed"],
  qc_engineer:   ["reinspection", "closed"],
  project_manager: ["in_progress", "resolved", "reinspection", "closed"],
  ceo:           ["in_progress", "resolved", "reinspection", "closed"],
};

const NEXT_BTN_LABEL = {
  open:         "▶ Start Work",
  in_progress:  "✓ Mark Resolved",
  resolved:     "🔍 Request Re-inspection",
  reinspection: "✓ Close Snag",
};

const NEXT_BTN_CLASS = {
  open:         "start",
  in_progress:  "resolve",
  resolved:     "reinspect",
  reinspection: "close",
};

function stableKey(it) { return it?.id != null ? String(it.id) : `${it?.snag_number || ""}|${it?.createdAt || ""}`; }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"; }
function isOverdue(snag) {
  return snag.status !== "closed" && snag.due_date && new Date(snag.due_date) < new Date();
}

export default function SnagList() {
  const { push } = useNotifications();

  // ── Get current user role ──
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { role: "site_engineer", id: null, name: "Site Engineer" };
  }, []);
  const path = window.location.pathname;

const userRole = path.includes("site-engineer")
  ? "site_engineer"
  : currentUser?.role || "site_engineer";

//   const userRole = currentUser?.role || "site_engineer";

  function canTransition(nextStatus) {
    const allowed = ROLE_ALLOWED_TRANSITIONS[userRole] || ROLE_ALLOWED_TRANSITIONS.site_engineer;
    return allowed.includes(nextStatus);
  }

  // ── State ──────────────────────────────────────────────────
  const [snags, setSnags]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterStat, setFS]     = useState("all");
  const [filterPri, setFP]      = useState("all");
  const [page, setPage]         = useState(1);
  const [expandedId, setExp]    = useState(null);
  const [updating, setUpdating] = useState(null);

  // Per-snag resolution state
  const [resolution, setRes]   = useState({}); // { [id]: string }
  const [photos, setPhotos]    = useState({});  // { [id]: File[] }

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, []);

  async function load() {
  setLoading(true);
  try {
    const res = await api.get("/snags");

    const data = Array.isArray(res.data)
      ? res.data
      : res.data?.snags || [];

    setSnags(data);

  } catch (err) {
    console.error("Error loading snags:", err);
  } finally {
    setLoading(false);
  }
}

  // ── Status update ──────────────────────────────────────────
  const updateStatus = useCallback(async (snag, newStatus) => {
    if (updating) return;
    if (snag.status === "closed") return;

    if (!canTransition(newStatus)) {
      alert(`Your role (${userRole}) cannot set status to "${newStatus}".`);
      return;
    }

    if (newStatus === "resolved") {
      const notes = resolution[snag.id]?.trim();
      if (!notes || notes.length < 10) {
        alert("Please describe the resolution (minimum 10 characters) before marking as resolved.");
        return;
      }
    }

    setUpdating(snag.id);

    try {
      const body = { status: newStatus };

      if (newStatus === "in_progress") {
        body.started_at   = new Date().toISOString();
        body.assigned_to  = currentUser?.id || null;
        body.assigned_name = currentUser?.name || "Site Engineer";
      }

      if (newStatus === "resolved") {
        body.resolved_at       = new Date().toISOString();
        body.resolution_notes  = resolution[snag.id] || "";

        const snagPhotos = photos[snag.id] || [];
        if (snagPhotos.length > 0) {
          const fd = new FormData();
          Object.entries(body).forEach(([k, v]) => fd.append(k, String(v ?? "")));
          snagPhotos.forEach(f => fd.append("photos", f, f.name));

          await api.patch(`/snags/${snag.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });

          if (snag.linked_rfi) {
            api.patch(`/site-engineer/rfi/${snag.linked_rfi}`, { related_snag_status: "resolved" }).catch(() => {});
          }

          setSnags(s => s.map(it => it.id === snag.id ? { ...it, ...body } : it));
          push(`Snag resolved: "${snag.title || snag.snag_number}"`, "approval", { linked_ref: snag.snag_number });
          setUpdating(null);
          return;
        }
      }

      if (newStatus === "closed") {
        body.closed_at = new Date().toISOString();
      }

    // TEMP: simulate success
await api.patch(`/api/snags/${snag.id}`, body);

   setSnags(s => s.map(it => it.id === snag.id ? { ...it, ...body } : it));
      push(`Snag ${newStatus.replace("_", " ")}: "${snag.title || snag.snag_number}"`, "approval", { linked_ref: snag.snag_number });

    } catch {
      alert("Update failed — check your connection and try again.");
    } finally {
      if (alive.current) setUpdating(null);
    }
  }, [updating, resolution, photos, currentUser, userRole, push]);

  // ── Filters ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let l = snags.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(it =>
        (it.title       || "").toLowerCase().includes(q) ||
        (it.zone        || "").toLowerCase().includes(q) ||
        (it.snag_number || "").toLowerCase().includes(q)
      );
    }
    if (filterStat !== "all") l = l.filter(it => (it.status   || "open")   === filterStat);
    if (filterPri  !== "all") l = l.filter(it => (it.priority || "medium") === filterPri);
    return l;
  }, [snags, search, filterStat, filterPri]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    open:        snags.filter(s => s.status === "open").length,
    in_progress: snags.filter(s => s.status === "in_progress").length,
    resolved:    snags.filter(s => s.status === "resolved" || s.status === "reinspection").length,
    closed:      snags.filter(s => s.status === "closed").length,
    overdue:     snags.filter(s => isOverdue(s)).length,
  }), [snags]);

  function nextStatus(current) {
    const idx = STATUS_FLOW.indexOf(current || "open");
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="snag-page">

      {/* HEADER */}
      <header className="snag-page-header">
        <div>
          <div className="snag-eyebrow">Architect → Site Engineer</div>
          <h1 className="snag-title">Snag / Punch List</h1>
          <div className="snag-sub">
            Raised by Architect during inspections — you resolve each item with proof
          </div>
        </div>
      </header>

      {/* STATS */}
      <div className="snag-stats-bar">
        {[
          { label: "Open", val: stats.open, status: "open" },
          { label: "In Progress", val: stats.in_progress, status: "in-progress" },
          { label: "Pending Re-insp.", val: stats.resolved, status: "pending" },
          { label: "Closed", val: stats.closed, status: "closed" },
        ].map(stat => (
          <div key={stat.label} className={`snag-stat-card snag-stat-card--${stat.status}`}>
            <div className="snag-stat-info">
              <span className="snag-stat-num">{stat.val}</span>
              <span className="snag-stat-lbl">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ROLE INFO */}
      <div className="snag-role-lock" style={{ marginBottom: "16px" }}>
        <span>Your role: <strong>{userRole.replace("_", " ")}</strong></span>
        <span>·</span>
        <span>
          {userRole === "site_engineer"
            ? "You can: Start Work → Mark Resolved (with notes + photos). Architect/QC closes."
            : ["architect", "qc_engineer"].includes(userRole)
              ? "You can: Request Re-inspection → Close Snag. SE resolves first."
              : "Full access — all status transitions available."
          }
        </span>
      </div>

      {/* CONTROLS */}
      <div className="snag-controls">
        <div className="snag-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            placeholder="Search snag, zone…" 
          />
        </div>
        <select className="snag-select" value={filterStat} onChange={e => { setFS(e.target.value); setPage(1); }}>
          <option value="all">All status</option>
          {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="snag-select" value={filterPri} onChange={e => { setFP(e.target.value); setPage(1); }}>
          <option value="all">All priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* LIST PANEL */}
      <div className="snag-panel">
        {loading ? (
          <div className="snag-loading">
            <div className="snag-spinner"></div>
            Loading snags…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="snag-empty">
            <div className="snag-empty-icon">✅</div>
            <div>No matching snags found — great work!</div>
          </div>
        ) : pageItems.map(snag => {
          const scLabel   = STATUS_CFG[snag.status || "open"]?.label || "Unknown";
          const priority  = snag.priority || "medium";
          const statusCls = (snag.status || "open").replace("_", "-");
          const next      = nextStatus(snag.status);
          const locked    = snag.status === "closed";
          const overdue   = isOverdue(snag);
          const canDoNext = next && canTransition(next) && !locked;

          return (
            <div 
              key={stableKey(snag)} 
              className={`snag-item snag-item--${priority} ${overdue ? 'snag-item--overdue' : ''}`}
              style={{ opacity: locked ? 0.7 : 1 }}
            >
              {/* Summary row */}
              <div className="snag-item-header" onClick={() => setExp(expandedId === snag.id ? null : snag.id)}>
                <div className="snag-item-tags">
                  <span className="snag-ref">
                    {snag.snag_number || `SNS-${String(snag.id || "").padStart(3, "0")}`}
                  </span>
                  <span className={`snag-badge snag-badge--${statusCls}`}>{scLabel}</span>
                  <span className={`snag-badge snag-badge--${priority}`}>{priority.toUpperCase()}</span>
                  
                  {overdue && <span className="snag-overdue-tag">⏰ OVERDUE</span>}
                  {locked  && <span className="snag-pill snag-pill--success">🔒 Closed</span>}
                  {snag.linked_rfi && <span className="snag-pill snag-pill--muted">RFI: {snag.linked_rfi}</span>}
                  
                  <span className={`snag-item-chevron ${expandedId === snag.id ? 'snag-item-chevron--open' : ''}`}>▼</span>
                </div>
                
                <div className="snag-item-title">{snag.title || "Untitled snag"}</div>
                
                <div className="snag-item-meta">
                  {snag.zone && <span>Zone: {snag.zone}</span>}
                  {snag.raised_date && <span>Raised: {fmtDate(snag.raised_date)}</span>}
                  {snag.due_date && <span>Due: {fmtDate(snag.due_date)}</span>}
                  {snag.drawing_ref && <span>Dwg: {snag.drawing_ref}</span>}
                  {snag.assigned_name && <span>Assigned: {snag.assigned_name}</span>}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === snag.id && (
                <div className="snag-expand">
                  {/* Snag description from Architect */}
                  {snag.description && (
                    <div>
                      <div className="snag-expand-label">Snag Description (from Architect)</div>
                      <div className="snag-description-box">{snag.description}</div>
                    </div>
                  )}

                  {/* Existing resolution notes */}
                  {snag.resolution_notes && snag.status !== "in_progress" && (
                    <div>
                      <div className="snag-expand-label">Resolution (by Site Engineer)</div>
                      <div className="snag-resolution-box">{snag.resolution_notes}</div>
                    </div>
                  )}

                  {/* Resolution notes input */}
                  {snag.status === "in_progress" && canTransition("resolved") && !locked && (
                    <div>
                      <div className="snag-expand-label">
                        Resolution Notes *
                        <span style={{ fontSize: 10, fontWeight: 400, color: "var(--c-danger, #b83232)", marginLeft: 6, textTransform: "none" }}>
                          Required before marking resolved
                        </span>
                      </div>
                      <textarea
                        className="snag-textarea"
                        value={resolution[snag.id] || snag.resolution_notes || ""}
                        onChange={e => setRes(r => ({ ...r, [snag.id]: e.target.value }))}
                        placeholder="Describe exactly what was done to fix this snag — include materials used, method, date of fix, and who carried out the work (minimum 10 characters)…"
                        style={{ borderColor: (resolution[snag.id] || "").length < 10 ? "var(--c-danger, #b83232)" : "" }}
                      />
                      {(resolution[snag.id] || "").length > 0 && (resolution[snag.id] || "").length < 10 && (
                        <div style={{ fontSize: 11, color: "var(--c-danger, #b83232)", marginTop: 4 }}>
                          Please add more detail ({10 - (resolution[snag.id] || "").length} more characters needed)
                        </div>
                      )}

                      {/* Photo upload proof */}
                      <div className="snag-photo-zone" style={{ marginTop: "14px" }}>
                        <div className="snag-photo-label">
                          Proof Photos
                          <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6 }}>
                            Recommended — attach before / after photos
                          </span>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="snag-file-input"
                          onChange={e => setPhotos(p => ({ ...p, [snag.id]: [...(p[snag.id] || []), ...Array.from(e.target.files)] }))}
                        />
                        {(photos[snag.id] || []).length > 0 && (
                          <div className="snag-photo-list">
                            {(photos[snag.id] || []).map((f, i) => (
                              <span key={`${f.name}-${i}`} className="snag-photo-chip">
                                📷 {f.name}
                                <button type="button" className="snag-photo-remove" onClick={() => setPhotos(p => ({ ...p, [snag.id]: (p[snag.id] || []).filter((_, j) => j !== i) }))}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTON */}
                  {!locked && next && (
                    <div className="snag-action-row">
                      {canDoNext ? (
                        <button
                          onClick={() => updateStatus(snag, next)}
                          disabled={updating === snag.id}
                          className={`snag-action-btn snag-action-btn--${NEXT_BTN_CLASS[snag.status || "open"]}`}
                        >
                          {updating === snag.id ? "Updating…" : NEXT_BTN_LABEL[snag.status || "open"] || `→ ${next}`}
                        </button>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--c-text-3, #7D9AB5)" }}>
                          {next === "resolved" || next === "in_progress"
                            ? "⏳ Waiting for Site Engineer to resolve this snag"
                            : "⏳ Waiting for Architect / QC to inspect and close"
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {locked && (
                    <div className="snag-closed-msg" style={{ marginTop: 14 }}>
                      🔒 Snag closed on {fmtDate(snag.closed_at)} — verified by Architect/QC. No further edits.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* PAGINATION */}
        {filtered.length > PAGE_SIZE && (
          <div className="snag-pagination">
            <span className="snag-page-info">Page {page} of {totalPages} · {filtered.length} snags</span>
            <div className="snag-page-btns">
              <button className="snag-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
              <button className="snag-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}