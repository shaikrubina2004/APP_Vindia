// src/pages/siteEngineer/Checklist.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/Checklist.css";

/* ── constants ───────────────────────────────────────────── */
const CL_DRAFT     = "se:checklist:draft:v3";
const CL_TEMPLATES = "se:checklist:templates:v3";
const CL_QUEUE     = "se:checklist:queue:v3";

const BLOCKED_REASONS = [
  { key: "rfi",      label: "Waiting RFI",   icon: "⚠️" },
  { key: "ncr",      label: "NCR / Rework",  icon: "🔴" },
  { key: "material", label: "Material",      icon: "📦" },
  { key: "access",   label: "No Access",     icon: "🚫" },
  { key: "other",    label: "Other",          icon: "❓" },
];

const ROLE_LABELS = {
  site_engineer:          "Site Engineer",
  project_manager:        "Project Manager",
  safety_officer:         "Safety Officer",
  quality_control_officer:"QC Officer",
  planning_engineer:      "Planning Eng.",
  quantity_surveyor:      "Qty Surveyor",
  architect:              "Architect",
};

const QUICK_TASKS = [
  { title: "Site inspection walkthrough",       role: "site_engineer",          dueTime: "08:00" },
  { title: "Record labour attendance",          role: "site_engineer",          dueTime: "08:30" },
  { title: "Supervise concrete pour",           role: "site_engineer",          dueTime: "09:00" },
  { title: "Upload material delivery receipts", role: "site_engineer",          dueTime: "10:00" },
  { title: "Submit RFIs and NCRs today",        role: "site_engineer",          dueTime: "15:00" },
  { title: "ITP inspection request",            role: "quality_control_officer", dueTime: "11:00" },
];

const DEFAULT_ITEMS = [
  { title: "Site access & security check",            role: "site_engineer",           done: false, notes: "", dueTime: "07:00", status: "pending", blockedReason: "" },
  { title: "Toolbox talk with sub-contractor gangs",  role: "safety_officer",          done: false, notes: "", dueTime: "07:30", status: "pending", blockedReason: "" },
  { title: "PPE compliance check at site entrance",   role: "site_engineer",           done: false, notes: "", dueTime: "07:45", status: "pending", blockedReason: "" },
  { title: "Brief labour gangs on daily scope",       role: "site_engineer",           done: false, notes: "", dueTime: "08:00", status: "pending", blockedReason: "" },
  { title: "Confirm material deliveries expected",    role: "site_engineer",           done: false, notes: "", dueTime: "08:15", status: "pending", blockedReason: "" },
  { title: "Check programme — critical path today",   role: "planning_engineer",       done: false, notes: "", dueTime: "08:30", status: "pending", blockedReason: "" },
  { title: "Supervise concrete pour / critical works",role: "site_engineer",           done: false, notes: "", dueTime: "09:00", status: "pending", blockedReason: "" },
  { title: "Inspect previous day's rebar / formwork", role: "quality_control_officer", done: false, notes: "", dueTime: "09:30", status: "pending", blockedReason: "" },
  { title: "Verify setout and levels",               role: "site_engineer",           done: false, notes: "", dueTime: "10:00", status: "pending", blockedReason: "" },
  { title: "Raise any RFIs from morning activities",  role: "site_engineer",           done: false, notes: "", dueTime: "11:00", status: "pending", blockedReason: "" },
  { title: "Progress photo documentation",            role: "site_engineer",           done: false, notes: "", dueTime: "12:00", status: "pending", blockedReason: "" },
  { title: "Update site diary — quantities & work",   role: "site_engineer",           done: false, notes: "", dueTime: "14:00", status: "pending", blockedReason: "" },
  { title: "Submit RFIs and NCRs logged today",       role: "site_engineer",           done: false, notes: "", dueTime: "15:00", status: "pending", blockedReason: "" },
  { title: "Send progress update to Coordinator",     role: "site_engineer",           done: false, notes: "", dueTime: "15:30", status: "pending", blockedReason: "" },
  { title: "Review next-day drawing pack",            role: "site_engineer",           done: false, notes: "", dueTime: "16:00", status: "pending", blockedReason: "" },
  { title: "Security & safety close-out check",       role: "safety_officer",          done: false, notes: "", dueTime: "17:00", status: "pending", blockedReason: "" },
];

/* ── helpers ─────────────────────────────────────────────── */
let _uid = 0;
function uid() { return `${Date.now().toString(36)}-${(++_uid).toString(36)}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }

const lsCl = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export function Checklist() {
  const draft = lsCl.load(CL_DRAFT);

  const [title, setTitle]       = useState(draft?.title || `Daily Checklist — ${todayISO()}`);
  const [date, setDate]         = useState(draft?.date  || todayISO());
  const [items, setItems]       = useState(() =>
    (draft?.items || DEFAULT_ITEMS).map(i => ({ ...i, id: i.id || uid() }))
  );
  const [templates, setTemplates] = useState(() => lsCl.load(CL_TEMPLATES) || []);
  const [filter, setFilter]     = useState("all");
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState("");
  const autoSave = useRef(null);
  const alive    = useRef(true);

  /* ── autosave ─────────────────────────────────────────── */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(autoSave.current); };
  }, []);

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      lsCl.save(CL_DRAFT, { title, date, items });
    }, 1000);
  }, [title, date, items]);

  /* ── item ops ─────────────────────────────────────────── */
  const setItem = useCallback((id, patch) => {
    setItems(s => s.map(it => it.id === id ? { ...it, ...patch } : it));
  }, []);

  const toggle = useCallback(id => {
    setItems(s => s.map(it => {
      if (it.id !== id) return it;
      const done = !it.done;
      return {
        ...it,
        done,
        status: done ? "done" : "pending",
        completedAt: done ? new Date().toISOString() : null,
        blockedReason: done ? "" : it.blockedReason,
      };
    }));
  }, []);

  const setBlocked = useCallback((id, reason) => {
    setItems(s => s.map(it => {
      if (it.id !== id) return it;
      const blocked = it.blockedReason === reason ? "" : reason;
      return { ...it, blockedReason: blocked, status: blocked ? "blocked" : "pending", done: false };
    }));
  }, []);

  const addItem = useCallback(() => {
    const it = { id: uid(), title: "New task", role: "site_engineer", done: false, notes: "", dueTime: "", status: "pending", blockedReason: "" };
    setItems(s => [...s, it]);
    setEditId(it.id);
  }, []);

  const removeItem = useCallback(id => {
    setItems(s => s.filter(i => i.id !== id));
    setEditId(e => e === id ? null : e);
  }, []);

  const markAll = useCallback(done => {
    setItems(s => s.map(i => ({
      ...i, done,
      status: done ? "done" : "pending",
      completedAt: done ? new Date().toISOString() : null,
      blockedReason: done ? "" : i.blockedReason,
    })));
  }, []);

  /* ── templates ────────────────────────────────────────── */
  const saveTemplate = useCallback(() => {
    const name = prompt("Template name:", `Template ${templates.length + 1}`);
    if (!name) return;
    const tpl = { id: uid(), name, items: items.map(({ title, role, dueTime }) => ({ title, role, dueTime })) };
    const next = [tpl, ...templates];
    setTemplates(next);
    lsCl.save(CL_TEMPLATES, next);
    setStatus("Template saved ✓");
  }, [items, templates]);

  const applyTemplate = useCallback(id => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setItems(s => [...tpl.items.map(i => ({ ...i, id: uid(), done: false, notes: "", status: "pending", blockedReason: "" })), ...s]);
    setStatus("Template applied");
  }, [templates]);

  const delTemplate = useCallback(id => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    lsCl.save(CL_TEMPLATES, next);
  }, [templates]);

  /* ── server submit ────────────────────────────────────── */
  const saveToServer = useCallback(async () => {
    setSaving(true); setStatus("Saving…");
    const payload = {
      title, date,
      items: items.map(({ title, role, done, notes, completedAt, dueTime, status, blockedReason }) => ({
        title, role, done, notes, completedAt, dueTime, status, blockedReason,
      })),
    };
    try {
      const res = await api.post("/checklists", payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
      lsCl.del(CL_DRAFT);
      setStatus("Saved to server ✓");
    } catch {
      const q = lsCl.load(CL_QUEUE) || [];
      q.push({ id: `q_${Date.now()}`, payload, createdAt: new Date().toISOString() });
      lsCl.save(CL_QUEUE, q);
      setStatus("Offline — queued for retry");
    } finally {
      if (alive.current) setSaving(false);
    }
  }, [title, date, items]);

  /* ── filtered items ───────────────────────────────────── */
  const filtered = useMemo(() => {
    if (filter === "complete")  return items.filter(i => i.done);
    if (filter === "incomplete") return items.filter(i => !i.done);
    if (filter === "blocked")   return items.filter(i => i.blockedReason);
    return items;
  }, [items, filter]);

  /* ── stats ────────────────────────────────────────────── */
  const doneCount    = useMemo(() => items.filter(i => i.done).length, [items]);
  const blockedCount = useMemo(() => items.filter(i => i.blockedReason).length, [items]);
  const pct = items.length ? Math.round(doneCount / items.length * 100) : 0;

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="cl-page">

      {/* ── PAGE HEADER ── */}
      <div className="cl-page-header">
        <div>
          <div className="cl-eyebrow">Daily Operations</div>
          <h1 className="cl-title">Daily Checklist</h1>
          <div className="cl-sub">Track tasks, flag blockers, link RFIs and NCRs</div>
        </div>
        <div className="cl-header-actions">
          {status && (
            <span className={`cl-status ${status.includes("✓") ? "cl-status--ok" : status.includes("Offline") ? "cl-status--err" : "cl-status--saving"}`}>
              {status}
            </span>
          )}
          <button className="cl-btn cl-btn--ghost" onClick={saveTemplate}>Save Template</button>
          <button className="cl-btn cl-btn--primary" onClick={saveToServer} disabled={saving}>
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>

      {/* ── PROGRESS STRIP ── */}
      <div className="cl-progress-strip">
        <div className="cl-progress-grid">
          <div className="cl-progress-stat">
            <div className="cl-progress-num cl-progress-num--pct">{pct}%</div>
            <div className="cl-progress-lbl">Complete</div>
          </div>
          <div className="cl-progress-stat">
            <div className="cl-progress-num cl-progress-num--done">{doneCount}</div>
            <div className="cl-progress-lbl">Done</div>
          </div>
          <div className="cl-progress-stat">
            <div className="cl-progress-num cl-progress-num--remain">{items.length - doneCount}</div>
            <div className="cl-progress-lbl">Remaining</div>
          </div>
          <div className="cl-bar-wrap">
            <div className="cl-bar-track">
              <div
                className={`cl-bar-fill ${pct === 100 ? "cl-bar-fill--complete" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="cl-bar-meta">
              <span>{date}</span>
              <span>
                {blockedCount > 0 && `${blockedCount} blocked · `}
                {doneCount} / {items.length} tasks
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="cl-layout">

        {/* ══ MAIN — TASK LIST ═════════════════════════════ */}
        <div className="cl-main">
          <div className="cl-panel">
            <div className="cl-panel-head">
              {/* Editable title */}
              <input
                style={{ fontFamily: "var(--c-sans)", fontSize: 13, fontWeight: 600, background: "transparent", border: "none", outline: "none", color: "var(--c-navy-900)", flex: 1, minWidth: 0 }}
                value={title}
                onChange={e => setTitle(e.target.value)}
                aria-label="Checklist title"
              />
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <select
                  className="cl-input"
                  style={{ width: "auto", fontSize: 11, padding: "5px 28px 5px 10px" }}
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  aria-label="Filter tasks"
                >
                  <option value="all">All ({items.length})</option>
                  <option value="incomplete">Incomplete ({items.filter(i => !i.done).length})</option>
                  <option value="complete">Done ({doneCount})</option>
                  {blockedCount > 0 && <option value="blocked">Blocked ({blockedCount})</option>}
                </select>
                <input
                  type="date"
                  className="cl-input"
                  style={{ width: 145, fontSize: 12, padding: "5px 10px" }}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  aria-label="Checklist date"
                />
              </div>
            </div>

            {/* Task list */}
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                className={`cl-list-item ${item.done ? "cl-list-item--done" : item.blockedReason ? "cl-list-item--blocked" : ""}`}
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                {/* Checkbox */}
                <div
                  className={`cl-checkbox${item.done ? " cl-checkbox--done" : item.blockedReason ? " cl-checkbox--blocked" : ""}`}
                  onClick={() => toggle(item.id)}
                  role="checkbox"
                  aria-checked={item.done}
                  tabIndex={0}
                  onKeyDown={e => e.key === " " && toggle(item.id)}
                  title={item.done ? "Mark incomplete" : "Mark complete"}
                />

                {/* Content */}
                <div className="cl-item-main">
                  {editId === item.id ? (
                    /* ── Edit Mode ── */
                    <div className="cl-edit-form">
                      <input
                        className="cl-input"
                        value={item.title}
                        onChange={e => setItem(item.id, { title: e.target.value })}
                        placeholder="Task title"
                        autoFocus
                      />
                      <div className="cl-edit-row">
                        <select className="cl-select" value={item.role} onChange={e => setItem(item.id, { role: e.target.value })}>
                          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input className="cl-input" type="time" value={item.dueTime || ""} onChange={e => setItem(item.id, { dueTime: e.target.value })} />
                      </div>
                      <textarea
                        className="cl-textarea"
                        value={item.notes}
                        onChange={e => setItem(item.id, { notes: e.target.value })}
                        placeholder="Notes, drawing refs, observations…"
                      />
                      <div className="cl-edit-actions">
                        <button className="cl-btn cl-btn--primary cl-btn--sm" onClick={() => setEditId(null)}>Done</button>
                        <button className="cl-btn cl-btn--danger cl-btn--sm" onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    /* ── View Mode ── */
                    <>
                      <div className="cl-item-header">
                        <div
                          className={`cl-item-title${item.done ? " cl-item-title--done" : ""}`}
                          onClick={() => setEditId(item.id)}
                        >
                          {item.title}
                        </div>
                        <div className="cl-item-meta">
                          {item.dueTime && <span className="cl-time-tag">{item.dueTime}</span>}
                          <span className="cl-role-tag">{ROLE_LABELS[item.role] || item.role}</span>
                          {item.blockedReason && (
                            <span className="cl-status-badge cl-status-badge--blocked">
                              🚫 Blocked
                            </span>
                          )}
                          <button className="cl-edit-btn" onClick={() => setEditId(item.id)} aria-label="Edit task">
                            ✎
                          </button>
                        </div>
                      </div>

                      {/* Blocker selector (not shown for done items) */}
                      {!item.done && (
                        <div className="cl-blocked-chips">
                          <span style={{ fontSize: 10, color: "var(--c-text-faint)", fontWeight: 600, fontFamily: "var(--c-mono)", letterSpacing: ".04em", paddingTop: 2 }}>Block:</span>
                          {BLOCKED_REASONS.map(r => (
                            <span
                              key={r.key}
                              className={`cl-blocked-chip${item.blockedReason === r.key ? " cl-blocked-chip--active" : ""}`}
                              onClick={() => setBlocked(item.id, r.key)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => e.key === "Enter" && setBlocked(item.id, r.key)}
                            >
                              {r.icon} {r.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.notes && (
                        <div className="cl-item-notes">{item.notes}</div>
                      )}

                      {item.done && item.completedAt && (
                        <div className="cl-completed-at">
                          ✓ Completed at {new Date(item.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Bottom bar */}
            <div className="cl-bottom-bar">
              <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={addItem}>+ Add Task</button>
              <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => markAll(true)}>Mark All Done</button>
              <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => markAll(false)}>Unmark All</button>
              <div className="cl-bottom-count">{doneCount} / {items.length} complete</div>
            </div>
          </div>
        </div>

        {/* ══ ASIDE ════════════════════════════════════════ */}
        <aside className="cl-aside">

          {/* Summary */}
          <div className="cl-aside-card">
            <div className="cl-aside-head"><div className="cl-aside-title">Summary</div></div>
            <div className="cl-aside-body">
              {[
                ["Total tasks",   items.length],
                ["Done",          doneCount],
                ["Remaining",     items.length - doneCount],
                ["Blocked",       blockedCount],
                ["Completion",    `${pct}%`],
              ].map(([l, v]) => (
                <div key={l} className="cl-aside-row">
                  <span>{l}</span>
                  <strong style={l === "Blocked" && blockedCount > 0 ? { color: "#b83232" } : {}}>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className="cl-aside-card">
            <div className="cl-aside-head">
              <div className="cl-aside-title">Templates</div>
              <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={saveTemplate}>+ Save</button>
            </div>
            <div className="cl-aside-body">
              {templates.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--c-text-3)", fontFamily: "var(--c-mono)" }}>No templates yet</div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="cl-template-item">
                    <div>
                      <div className="cl-template-name">{t.name}</div>
                      <div className="cl-template-count">{t.items.length} tasks</div>
                    </div>
                    <div className="cl-template-actions">
                      <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => applyTemplate(t.id)}>Apply</button>
                      <button onClick={() => delTemplate(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Add */}
          <div className="cl-aside-card">
            <div className="cl-aside-head"><div className="cl-aside-title">Quick Add</div></div>
            <div className="cl-aside-body">
              <div className="cl-quick-add">
                {QUICK_TASKS.map(t => (
                  <button
                    key={t.title}
                    className="cl-quick-btn"
                    onClick={() => setItems(s => [...s, { id: uid(), ...t, done: false, notes: "", status: "pending", blockedReason: "" }])}
                  >
                    + {t.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="cl-aside-card">
            <div className="cl-aside-head"><div className="cl-aside-title">Tips</div></div>
            <div className="cl-aside-body">
              <ul className="cl-tips">
                <li>Use "Block" chips to flag RFI or NCR blockers — this feeds your Daily Diary delay records.</li>
                <li>Save your common task sets as Templates for quick reuse.</li>
                <li>Submit the checklist before 17:30 each day.</li>
                <li>Click the pencil icon to edit tasks inline.</li>
              </ul>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}

export default Checklist;