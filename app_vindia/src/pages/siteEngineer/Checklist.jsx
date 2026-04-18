import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
const CL_DRAFT    = "se:checklist:draft:v2";
const CL_TEMPLATES= "se:checklist:templates:v2";
const CL_QUEUE    = "se:checklist:queue:v2";

function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }

const ROLE_LABELS = {
  site_engineer: "Site Engineer", project_manager: "Project Manager",
  safety_officer: "Safety Officer", quality_control_officer: "QC Officer",
  planning_engineer: "Planning Eng.", quantity_surveyor: "Qty Surveyor", architect: "Architect",
};

const DEFAULT_ITEMS = [
  { id: uid(), title: "Site access & security check",            role: "site_engineer",          done: false, notes: "", dueTime: "07:00" },
  { id: uid(), title: "Toolbox talk with sub-contractor gangs",  role: "safety_officer",         done: false, notes: "", dueTime: "07:30" },
  { id: uid(), title: "PPE compliance check at site entrance",   role: "site_engineer",          done: false, notes: "", dueTime: "07:45" },
  { id: uid(), title: "Brief labour gangs on daily scope",       role: "site_engineer",          done: false, notes: "", dueTime: "08:00" },
  { id: uid(), title: "Confirm material deliveries expected",    role: "site_engineer",          done: false, notes: "", dueTime: "08:15" },
  { id: uid(), title: "Check programme — critical path today",   role: "planning_engineer",      done: false, notes: "", dueTime: "08:30" },
  { id: uid(), title: "Supervise concrete pour / critical works",role: "site_engineer",          done: false, notes: "", dueTime: "09:00" },
  { id: uid(), title: "Inspect previous day's rebar / formwork", role: "quality_control_officer",done: false, notes: "", dueTime: "09:30" },
  { id: uid(), title: "Verify setout and levels",               role: "site_engineer",          done: false, notes: "", dueTime: "10:00" },
  { id: uid(), title: "Raise any RFIs from morning activities",  role: "site_engineer",          done: false, notes: "", dueTime: "11:00" },
  { id: uid(), title: "Progress photo documentation",            role: "site_engineer",          done: false, notes: "", dueTime: "12:00" },
  { id: uid(), title: "Update site diary — quantities & work",   role: "site_engineer",          done: false, notes: "", dueTime: "14:00" },
  { id: uid(), title: "Submit RFIs and NCRs logged today",       role: "site_engineer",          done: false, notes: "", dueTime: "15:00" },
  { id: uid(), title: "Send progress update to Coordinator",     role: "site_engineer",          done: false, notes: "", dueTime: "15:30" },
  { id: uid(), title: "Review next-day drawing pack",            role: "site_engineer",          done: false, notes: "", dueTime: "16:00" },
  { id: uid(), title: "Security & safety close-out check",       role: "safety_officer",         done: false, notes: "", dueTime: "17:00" },
];

const lsCl = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
};

export function Checklist() {
  const draft = lsCl.load(CL_DRAFT);
  const [title, setTitle]       = useState(draft?.title || `Daily Checklist — ${todayISO()}`);
  const [date, setDate]         = useState(draft?.date  || todayISO());
  const [items, setItems]       = useState(draft?.items || DEFAULT_ITEMS.map(i => ({ ...i, id: uid() })));
  const [templates, setTemplates] = useState(lsCl.load(CL_TEMPLATES) || []);
  const [filter, setFilter]     = useState("all");  // all | incomplete | complete
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState("");
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      lsCl.save(CL_DRAFT, { title, date, items: items.map(i => ({ ...i })) });
    }, 1000);
  }, [title, date, items]);

  const setItem  = (id, patch) => setItems(s => s.map(it => it.id === id ? { ...it, ...patch } : it));
  const toggle   = id => setItem(id, { done: !items.find(i => i.id === id)?.done, completedAt: !items.find(i => i.id === id)?.done ? new Date().toISOString() : null });
  const addItem  = () => { const it = { id: uid(), title: "New task", role: "site_engineer", done: false, notes: "", dueTime: "" }; setItems(s => [...s, it]); setEditId(it.id); };
  const removeItem = id => setItems(s => s.filter(i => i.id !== id));
  const markAll  = done => setItems(s => s.map(i => ({ ...i, done, completedAt: done ? new Date().toISOString() : null })));

  const saveTemplate = () => {
    const name = prompt("Template name:", `Template ${templates.length + 1}`);
    if (!name) return;
    const tpl = { id: uid(), name, items: items.map(({ title, role, dueTime }) => ({ title, role, dueTime })) };
    const next = [tpl, ...templates];
    setTemplates(next); lsCl.save(CL_TEMPLATES, next);
    setStatus("Template saved");
  };
  const applyTemplate = id => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setItems(s => [...tpl.items.map(i => ({ ...i, id: uid(), done: false, notes: "" })), ...s]);
    setStatus("Template applied");
  };
  const delTemplate = id => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next); lsCl.save(CL_TEMPLATES, next);
  };

  const saveToServer = async () => {
    setSaving(true); setStatus("Saving…");
    const payload = { title, date, items: items.map(({ title, role, done, notes, completedAt, dueTime }) => ({ title, role, done, notes, completedAt, dueTime })) };
    try {
      const res = await api.post("/checklists", payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
      lsCl.del(CL_DRAFT); setStatus("Saved to server ✓");
    } catch {
      const q = lsCl.load(CL_QUEUE) || [];
      q.push({ id: `q_${Date.now()}`, payload, createdAt: new Date().toISOString() });
      lsCl.save(CL_QUEUE, q);
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSaving(false); }
  };

  const filtered = useMemo(() => {
    if (filter === "complete")   return items.filter(i => i.done);
    if (filter === "incomplete") return items.filter(i => !i.done);
    return items;
  }, [items, filter]);

  const doneCount  = items.filter(i => i.done).length;
  const pct        = items.length ? Math.round(doneCount / items.length * 100) : 0;

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div>
          <div className="cl-eyebrow">Daily Operations</div>
          <h1 className="cl-title">Daily Checklist</h1>
          <div className="cl-sub">{title}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="cl-btn cl-btn--ghost" onClick={saveTemplate}>Save Template</button>
          <button className="cl-btn cl-btn--primary" onClick={saveToServer} disabled={saving}>{saving ? "Saving…" : "Submit"}</button>
        </div>
      </div>

      {/* PROGRESS STRIP */}
      <div className="cl-panel" style={{ marginBottom: 18 }}>
        <div className="cl-panel-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--c-navy-700)", letterSpacing: "-1px" }}>{pct}%</div>
              <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: ".09em" }}>Complete</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--c-success)", letterSpacing: "-1px" }}>{doneCount}</div>
              <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: ".09em" }}>Done</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--c-warning)", letterSpacing: "-1px" }}>{items.length - doneCount}</div>
              <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: ".09em" }}>Remaining</div>
            </div>
            <div>
              <div style={{ height: 10, background: "var(--c-surface-3)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--c-success)" : "linear-gradient(90deg, var(--c-navy-700), var(--c-teal-400))", borderRadius: 99, transition: "width .4s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--c-text-3)", fontFamily: "var(--c-mono)" }}>
                <span>{date}</span>
                {status && <span style={{ color: status.includes("✓") ? "var(--c-success)" : status.includes("Offline") ? "var(--c-danger)" : "var(--c-text-3)" }}>{status}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>
        {/* TASK LIST */}
        <div>
          <div className="cl-panel">
            <div className="cl-panel-head">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
                <input
                  style={{ fontFamily: "var(--c-sans)", fontSize: 13, fontWeight: 600, background: "transparent", border: "none", outline: "none", color: "var(--c-navy-900)", flex: 1 }}
                  value={title} onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="cl-select" style={{ width: "auto", fontSize: 11, padding: "5px 28px 5px 10px" }} value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="all">All ({items.length})</option>
                  <option value="incomplete">Incomplete ({items.filter(i=>!i.done).length})</option>
                  <option value="complete">Done ({doneCount})</option>
                </select>
                <input type="date" className="cl-input" style={{ width: 150, fontSize: 12, padding: "5px 10px" }} value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            {filtered.map(item => (
              <div key={item.id} className="cl-list-item">
                {/* Checkbox */}
                <div
                  className={`cl-checkbox${item.done ? " cl-checkbox--done" : ""}`}
                  onClick={() => toggle(item.id)}
                  title={item.done ? "Mark incomplete" : "Mark complete"}
                />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === item.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input className="cl-input" value={item.title} onChange={e => setItem(item.id, { title: e.target.value })} placeholder="Task title" autoFocus />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                        <select className="cl-select" value={item.role} onChange={e => setItem(item.id, { role: e.target.value })}>
                          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input className="cl-input" type="time" value={item.dueTime || ""} onChange={e => setItem(item.id, { dueTime: e.target.value })} />
                      </div>
                      <textarea className="cl-textarea" style={{ minHeight: 60 }} value={item.notes} onChange={e => setItem(item.id, { notes: e.target.value })} placeholder="Notes…" />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="cl-btn cl-btn--primary" style={{ fontSize: 11, padding: "5px 14px" }} onClick={() => setEditId(null)}>Done</button>
                        <button className="cl-btn cl-btn--ghost" style={{ fontSize: 11, padding: "5px 14px" }} onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div
                          style={{ fontSize: 13, fontWeight: 600, color: item.done ? "var(--c-text-3)" : "var(--c-navy-900)", textDecoration: item.done ? "line-through" : "none", flex: 1, cursor: "pointer" }}
                          onClick={() => setEditId(item.id)}
                        >
                          {item.title}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                          {item.dueTime && <span style={{ fontFamily: "var(--c-mono)", fontSize: 10, color: "var(--c-text-3)" }}>{item.dueTime}</span>}
                          <span style={{ fontFamily: "var(--c-mono)", fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "var(--c-surface-3)", color: "var(--c-text-3)", border: "1px solid var(--c-border)" }}>{ROLE_LABELS[item.role] || item.role}</span>
                          <button onClick={() => setEditId(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", fontSize: 14, padding: "0 4px" }}>✎</button>
                        </div>
                      </div>
                      {item.notes && <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4, lineHeight: 1.5 }}>{item.notes}</div>}
                      {item.done && item.completedAt && <div style={{ fontFamily: "var(--c-mono)", fontSize: 10, color: "var(--c-success)", marginTop: 3 }}>✓ {new Date(item.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Bottom row */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--c-border)", display: "flex", gap: 10, alignItems: "center", background: "var(--c-surface-2)" }}>
              <button className="cl-btn cl-btn--ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={addItem}>+ Add Task</button>
              <button className="cl-btn cl-btn--ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => markAll(true)}>Mark All Done</button>
              <button className="cl-btn cl-btn--ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => markAll(false)}>Unmark All</button>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--c-text-3)", fontFamily: "var(--c-mono)" }}>{doneCount} / {items.length} complete</div>
            </div>
          </div>
        </div>

        {/* ASIDE */}
        <div>
          <div className="cl-panel" style={{ marginBottom: 14 }}>
            <div className="cl-panel-head"><div className="cl-panel-title">Templates</div></div>
            <div style={{ padding: "12px 16px" }}>
              {templates.length === 0
                ? <div style={{ fontSize: 12, color: "var(--c-text-3)", fontFamily: "var(--c-mono)" }}>No templates saved yet</div>
                : templates.map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-navy-900)" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "var(--c-text-3)", fontFamily: "var(--c-mono)" }}>{t.items.length} tasks</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="cl-btn cl-btn--ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => applyTemplate(t.id)}>Apply</button>
                        <button onClick={() => delTemplate(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", fontSize: 16 }}>×</button>
                      </div>
                    </div>
                  ))
              }
              <button className="cl-btn cl-btn--ghost" style={{ marginTop: 12, fontSize: 11, padding: "6px 12px", width: "100%" }} onClick={saveTemplate}>+ Save Current as Template</button>
            </div>
          </div>

          <div className="cl-panel">
            <div className="cl-panel-head"><div className="cl-panel-title">Quick Add</div></div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Site inspection walkthrough", "site_engineer"],
                ["Record labour attendance", "site_engineer"],
                ["Upload material receipts", "site_engineer"],
                ["Submit NCR / RFI", "site_engineer"],
                ["Concrete pour supervision", "site_engineer"],
                ["ITP inspection request", "quality_control_officer"],
              ].map(([title, role]) => (
                <button key={title} className="cl-btn cl-btn--ghost" style={{ fontSize: 12, padding: "7px 12px", justifyContent: "flex-start" }}
                  onClick={() => { setItems(s => [...s, { id: uid(), title, role, done: false, notes: "", dueTime: "" }]); }}>
                  + {title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/pages/siteEngineer/Checklist.jsx
// ... all your existing code stays exactly the same ...


// ADD THIS LINE at the bottom ↓
export default Checklist;