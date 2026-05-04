// SignOffCentre.jsx
// Enterprise ERP — Sign-Off Centre · Final Client Submission Gateway
// Route: /architect/sign-off-centre
// Content area only — sidebar exists separately.
//
// Strict rules:
//   • No mention of PM, MEP, Structural, or any approval chain
//   • No internal workflow language
//   • Only "Ready to Send to Client" state is visible
//   • Sent drawings lock immediately; 24-hour undo window only

import { useState, useEffect, useCallback } from "react";
import "./ArchitectSignOff.css";

/* ── Inline SVG Icons ──────────────────────────────────────── */
const I = {
  Search:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  List:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Grid:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  X:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevR:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Send:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  SendSm:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  CheckLg:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Lock:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  LockSm:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Clock:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  RotateCCW:() => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-6.34L1 10"/></svg>,
  File:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  FileSent: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 10 15 14 11"/></svg>,
  AlertCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Inbox:    () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
};

/* ── Data ─────────────────────────────────────────────────── */
const DRAWINGS = [
  {
    id: "DWG-0041",
    name: "Tower A — Ground Floor Plan",
    project: "Marina Bay Tower",
    discipline: "Architecture",
    rev: "R4",
    updated: "12 Apr 2025, 08:55",
    size: "4.2 MB",
    format: "DWG + PDF",
    pages: 6,
  },
  {
    id: "DWG-0048",
    name: "Detail Drawing — Curtain Wall",
    project: "City Hub Complex",
    discipline: "Facade",
    rev: "R5",
    updated: "01 Apr 2025, 11:40",
    size: "2.8 MB",
    format: "DWG + PDF",
    pages: 3,
  },
  {
    id: "DWG-0052",
    name: "East Facade — Full Elevation",
    project: "Harbour Residences",
    discipline: "Architecture",
    rev: "R3",
    updated: "07 Apr 2025, 09:15",
    size: "6.1 MB",
    format: "DWG + PDF",
    pages: 8,
  },
  {
    id: "DWG-0055",
    name: "Podium Grid Plan — Level B1",
    project: "City Hub Complex",
    discipline: "Architecture",
    rev: "R2",
    updated: "04 Apr 2025, 17:10",
    size: "3.4 MB",
    format: "DWG + PDF",
    pages: 4,
  },
  {
    id: "DWG-0061",
    name: "South Lobby — Interior Layout",
    project: "Marina Bay Tower",
    discipline: "Interior",
    rev: "R2",
    updated: "09 Apr 2025, 14:22",
    size: "2.1 MB",
    format: "PDF",
    pages: 2,
  },
  {
    id: "DWG-0067",
    name: "Roof Plan & Drainage Strategy",
    project: "Harbour Residences",
    discipline: "Architecture",
    rev: "R1",
    updated: "03 Apr 2025, 10:05",
    size: "1.9 MB",
    format: "DWG + PDF",
    pages: 2,
  },
  {
    id: "DWG-0073",
    name: "Section B-B — Core & Stairwell",
    project: "City Hub Complex",
    discipline: "Architecture",
    rev: "R3",
    updated: "08 Apr 2025, 16:50",
    size: "3.7 MB",
    format: "DWG + PDF",
    pages: 4,
  },
  {
    id: "DWG-0079",
    name: "North Elevation — Glazing Detail",
    project: "Marina Bay Tower",
    discipline: "Facade",
    rev: "R4",
    updated: "11 Apr 2025, 13:30",
    size: "5.2 MB",
    format: "DWG + PDF",
    pages: 5,
  },
];

/* ── 24-hour undo window helper ─────────────────────────────
   We store { sentAt: timestamp } per drawing id.
   In a real app this would come from the backend.            */
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
// For demo we use a shorter display window (shows countdown)
const DEMO_UNDO_MS   = 24 * 60 * 60 * 1000; // keep real for display

/* ── Status badge ───────────────────────────────────────────  */
function ReadyBadge() {
  return (
    <span className="soc-status-ready">
      <span className="soc-status-ready-dot"/>
      Ready to Send to Client
    </span>
  );
}
function SentBadge() {
  return (
    <span className="soc-status-sent">
      <I.Check/> Sent to Client
    </span>
  );
}

/* ── Format countdown ─────────────────────────────────────── */
function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  const s  = Math.floor((ms % 60000)   / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ msg, type, visible }) {
  return (
    <div className={`soc-toast ${type} ${visible ? "show" : ""}`}>
      {type === "sent"   && <I.SendSm/>}
      {type === "undone" && <I.RotateCCW/>}
      {msg}
    </div>
  );
}

/* ── List Row ──────────────────────────────────────────────── */
function DrawingRow({ d, sent, selected, onSelect }) {
  return (
    <div
      className={`soc-row ${selected ? "selected" : ""} ${sent ? "sent" : ""}`}
      onClick={() => onSelect(d)}
    >
      <div><span className="soc-row-id">{d.id}</span></div>
      <div className="soc-row-name">
        <div className="soc-row-name-text">{d.name}</div>
        <div className="soc-row-name-sub">{d.discipline} · {d.format}</div>
      </div>
      <div className="soc-row-project">{d.project}</div>
      <div><span className="soc-row-rev">{d.rev}</span></div>
      <div>{sent ? <SentBadge/> : <ReadyBadge/>}</div>
      <div className="soc-row-chevron"><I.ChevR/></div>
    </div>
  );
}

/* ── Grid Card ─────────────────────────────────────────────── */
function DrawingCard({ d, sent, selected, onSelect }) {
  return (
    <div
      className={`soc-card ${selected ? "selected" : ""} ${sent ? "sent" : ""}`}
      onClick={() => onSelect(d)}
    >
      <div className="soc-card-top">
        <span className="soc-card-id">{d.id}</span>
        <span className="soc-card-rev">{d.rev}</span>
      </div>
      <div className="soc-card-name">{d.name}</div>
      <div className="soc-card-project">{d.project} · {d.discipline}</div>
      <div className="soc-card-footer">
        <span className="soc-card-updated">{d.updated.split(",")[0]}</span>
        {sent ? <SentBadge/> : <ReadyBadge/>}
      </div>
    </div>
  );
}

/* ── Drawer ─────────────────────────────────────────────────── */
function Drawer({ drawing, sentMap, onClose, onSend, onUndo }) {
  const open = Boolean(drawing);
  const sentInfo = drawing ? sentMap[drawing.id] : null;
  const isSent   = Boolean(sentInfo);

  // Undo countdown state
  const [remaining, setRemaining] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!sentInfo) { setRemaining(0); return; }
    const update = () => {
      const elapsed = Date.now() - sentInfo.sentAt;
      const left    = Math.max(0, DEMO_UNDO_MS - elapsed);
      setRemaining(left);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [sentInfo]);

  // Reset confirm state when drawing changes
  useEffect(() => { setConfirming(false); }, [drawing?.id]);

  const undoAvailable = isSent && remaining > 0;
  const undoPct       = sentInfo ? (remaining / DEMO_UNDO_MS) * 100 : 0;

  if (!drawing) {
    return (
      <>
        <div className={`soc-drawer-overlay`} onClick={onClose}/>
        <aside className="soc-drawer"/>
      </>
    );
  }

  return (
    <>
      <div className={`soc-drawer-overlay ${open ? "open" : ""}`} onClick={onClose}/>
      <aside className={`soc-drawer ${open ? "open" : ""}`}>

        {/* Accent strip */}
        <div className={`soc-drawer-strip ${isSent ? "sent" : ""}`}/>

        {/* Head */}
        <div className="soc-drawer-head">
          <div className="soc-drawer-head-row">
            <div>
              <span className="soc-drawer-id">{drawing.id}</span>
            </div>
            <button className="soc-drawer-close" onClick={onClose}><I.X/></button>
          </div>
          <div className="soc-drawer-name">{drawing.name}</div>
          <div className="soc-drawer-meta-row">
            <span className="soc-chip">{drawing.project}</span>
            <span className="soc-chip">{drawing.discipline}</span>
            <span className="soc-chip" style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{drawing.rev}</span>
            {isSent && <span className="soc-chip"><I.LockSm/> Locked</span>}
          </div>
        </div>

        {/* Status hero block */}
        <div className="soc-drawer-status-block">
          <div className={`soc-drawer-status-icon ${isSent ? "sent" : ""}`}>
            {isSent ? <I.FileSent/> : <I.File/>}
          </div>
          <div className="soc-drawer-status-text">
            <div className="soc-drawer-status-label">Document Status</div>
            <div className={`soc-drawer-status-badge ${isSent ? "sent" : ""}`}>
              {isSent ? "Sent to Client" : "Ready to Send to Client"}
            </div>
            {isSent && sentInfo && (
              <div className="soc-drawer-status-sub">
                Dispatched {new Date(sentInfo.sentAt).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
              </div>
            )}
            {isSent && (
              <div className="soc-locked-badge"><I.LockSm/> Drawing locked — no further modifications permitted</div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="soc-drawer-body">

          {/* Drawing Details */}
          <div className="soc-drawer-section">
            <div className="soc-drawer-section-title">Drawing Details</div>
            <div className="soc-detail-grid">
              <div className="soc-detail-field">
                <div className="label">Drawing ID</div>
                <div className="value mono">{drawing.id}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">Revision</div>
                <div className="value mono">{drawing.rev}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">Project</div>
                <div className="value">{drawing.project}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">Discipline</div>
                <div className="value">{drawing.discipline}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">Format</div>
                <div className="value mono">{drawing.format}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">File Size</div>
                <div className="value mono">{drawing.size}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">Pages</div>
                <div className="value mono">{drawing.pages}</div>
              </div>
              <div className="soc-detail-field">
                <div className="label">Last Updated</div>
                <div className="value mono" style={{ fontSize:11 }}>{drawing.updated}</div>
              </div>
            </div>
          </div>

          {/* Dispatch Log */}
          <div className="soc-drawer-section">
            <div className="soc-drawer-section-title">Dispatch Record</div>
            <div className="soc-dispatch-log">
              {isSent && sentInfo && (
                <div className="soc-log-item">
                  <span className="soc-log-dot green"/>
                  <div className="soc-log-text">
                    <div className="soc-log-action">Sent to Client Portal</div>
                    <div className="soc-log-time">
                      {new Date(sentInfo.sentAt).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" })}
                    </div>
                  </div>
                  <I.Check/>
                </div>
              )}
              <div className="soc-log-item">
                <span className="soc-log-dot blue"/>
                <div className="soc-log-text">
                  <div className="soc-log-action">Drawing cleared for client submission</div>
                  <div className="soc-log-time">{drawing.updated}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Undo bar — only while window is open */}
          {undoAvailable && (
            <div className="soc-undo-bar">
              <div className="soc-undo-bar-top">
                <span className="soc-undo-label"><I.Clock/> Undo window active</span>
                <span className="soc-undo-timer">{fmtCountdown(remaining)} remaining</span>
              </div>
              <div className="soc-undo-track">
                <div className="soc-undo-fill" style={{ width: `${undoPct}%` }}/>
              </div>
              <button className="soc-undo-btn" onClick={() => onUndo(drawing)}>
                <I.RotateCCW/> Undo Send (Available for 24 Hours)
              </button>
            </div>
          )}

          {/* Expired undo notice */}
          {isSent && !undoAvailable && (
            <div style={{ padding:"12px 14px", background:"var(--locked-bg)", border:"1px solid var(--locked-bd)", borderRadius:"var(--r-md)", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--locked-text)", fontWeight:600 }}>
              <I.Lock/>
              Undo window has expired. Drawing permanently locked as delivered.
            </div>
          )}

        </div>

        {/* Footer — action zone */}
        <div className="soc-drawer-footer">
          {!isSent && !confirming && (
            <button className="soc-send-btn" onClick={() => setConfirming(true)}>
              <I.Send/> Send to Client
            </button>
          )}
          {!isSent && confirming && (
            <div className="soc-confirm-block">
              <div className="soc-confirm-question">Confirm dispatch to client?</div>
              <div className="soc-confirm-sub">
                This will transmit <strong>{drawing.id}</strong> to the client portal and lock the drawing from further modification.
              </div>
              <div className="soc-confirm-actions">
                <button className="soc-confirm-no" onClick={() => setConfirming(false)}>Cancel</button>
                <button className="soc-confirm-yes" onClick={() => { setConfirming(false); onSend(drawing); }}>
                  <I.Send/> Confirm — Send to Client
                </button>
              </div>
            </div>
          )}
          {isSent && (
            <div className="soc-sent-locked-msg">
              <I.CheckLg/> Sent & Locked — Delivered to Client
            </div>
          )}
        </div>

      </aside>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function SignOffCentre() {
  const [view,     setView]     = useState("list");   // "list" | "grid"
  const [search,   setSearch]   = useState("");
  const [project,  setProject]  = useState("");
  const [selected, setSelected] = useState(null);
  // sentMap: { [drawingId]: { sentAt: timestamp } }
  const [sentMap,  setSentMap]  = useState({});
  const [toast,    setToast]    = useState({ visible: false, msg: "", type: "sent" });

  /* Show toast helper */
  const showToast = (msg, type = "sent") => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  };

  /* Send drawing */
  const handleSend = useCallback((drawing) => {
    setSentMap(m => ({ ...m, [drawing.id]: { sentAt: Date.now() } }));
    showToast(`${drawing.id} sent to client portal and locked.`, "sent");
  }, []);

  /* Undo send */
  const handleUndo = useCallback((drawing) => {
    setSentMap(m => {
      const next = { ...m };
      delete next[drawing.id];
      return next;
    });
    showToast(`${drawing.id} dispatch reversed — drawing unlocked.`, "undone");
  }, []);

  /* Filter drawings */
  const filtered = DRAWINGS.filter(d => {
    const q = search.toLowerCase();
    return (
      (!project || d.project === project) &&
      (!q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.project.toLowerCase().includes(q))
    );
  });

  const readyCount = filtered.filter(d => !sentMap[d.id]).length;
  const sentCount  = Object.keys(sentMap).length;

  const projects = [...new Set(DRAWINGS.map(d => d.project))];

  return (
    <div className="soc-root">
      <div className="soc-layout">
        <div className="soc-main">

          {/* ── Header ── */}
          <header className="soc-header">
            <div className="soc-header-inner">
              <div className="soc-wordmark">
                <h1>Sign-Off Centre</h1>
                <p>Final Client Submission Gateway</p>
              </div>
              <div className="soc-header-sep"/>
              <div className="soc-dispatch-count">
                <span className="soc-dispatch-count-dot"/>
                {readyCount} drawing{readyCount !== 1 ? "s" : ""} ready
              </div>
              {sentCount > 0 && (
                <div className="soc-sent-count">
                  <span className="soc-sent-count-dot"/>
                  {sentCount} sent
                </div>
              )}
              <div className="soc-header-controls">
                <div className="soc-search">
                  <I.Search/>
                  <input
                    placeholder="Search drawings…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="soc-select"
                  value={project}
                  onChange={e => setProject(e.target.value)}
                >
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p}>{p}</option>)}
                </select>
                <div className="soc-view-toggle">
                  <button
                    className={`soc-view-btn ${view === "list" ? "active" : ""}`}
                    onClick={() => setView("list")}
                    title="List view"
                  ><I.List/></button>
                  <button
                    className={`soc-view-btn ${view === "grid" ? "active" : ""}`}
                    onClick={() => setView("grid")}
                    title="Grid view"
                  ><I.Grid/></button>
                </div>
              </div>
            </div>
          </header>

          {/* ── Column headers (list view only) ── */}
          {view === "list" && (
            <div className="soc-subheader">
              <div className="soc-subheader-grid">
                <span>Drawing ID</span>
                <span>Drawing Name</span>
                <span>Project</span>
                <span>Rev</span>
                <span>Status</span>
                <span/>
              </div>
            </div>
          )}

          {/* ── Drawing list / grid ── */}
          {view === "list" ? (
            <div className="soc-list-wrap">
              {filtered.length === 0 ? (
                <div className="soc-empty">
                  <div className="soc-empty-icon"><I.Inbox/></div>
                  <p>No drawings match your search.</p>
                </div>
              ) : (
                filtered.map(d => (
                  <DrawingRow
                    key={d.id}
                    d={d}
                    sent={Boolean(sentMap[d.id])}
                    selected={selected?.id === d.id}
                    onSelect={setSelected}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="soc-grid-wrap">
              {filtered.length === 0 ? (
                <div className="soc-empty">
                  <div className="soc-empty-icon"><I.Inbox/></div>
                  <p>No drawings match your search.</p>
                </div>
              ) : (
                <div className="soc-grid">
                  {filtered.map(d => (
                    <DrawingCard
                      key={d.id}
                      d={d}
                      sent={Boolean(sentMap[d.id])}
                      selected={selected?.id === d.id}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Right Drawer ── */}
        <Drawer
          drawing={selected}
          sentMap={sentMap}
          onClose={() => setSelected(null)}
          onSend={handleSend}
          onUndo={handleUndo}
        />

      </div>

      {/* ── Toast ── */}
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible}/>
    </div>
  );
}