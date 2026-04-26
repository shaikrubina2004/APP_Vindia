import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import "./Milestone.css";

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const API = "http://localhost:5000";
const today = new Date();

const STATUS_CFG = {
  "completed":   { label: "Completed",   bg: "#d1fae5", color: "#065f46", border: "#10b981", bar: "#10b981" },
  "in-progress": { label: "In Progress", bg: "#dbeafe", color: "#1e3a8a", border: "#2563eb", bar: "#2563eb" },
  "delayed":     { label: "Delayed",     bg: "#fee2e2", color: "#991b1b", border: "#ef4444", bar: "#ef4444" },
  "not-started": { label: "Not Started", bg: "#f1f5f9", color: "#475569", border: "#94a3b8", bar: "#cbd5e1" },
};
const SUBTASK_STATUS_CFG = {
  "completed":   { color: "#10b981", bg: "#d1fae5", border: "#10b981" },
  "in-progress": { color: "#2563eb", bg: "#dbeafe", border: "#2563eb" },
  "delayed":     { color: "#ef4444", bg: "#fee2e2", border: "#ef4444" },
  "not-started": { color: "#94a3b8", bg: "#f8fafc", border: "#e2eaf4" },
};
const TABS = ["All", "In Progress", "Completed", "Delayed", "Not Started"];
const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "Delayed"];

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const normalizeStatus = (raw) => {
  if (!raw) return "not-started";
  const s = String(raw).toLowerCase().replace(/\s+/g, "-");
  if (s === "completed") return "completed";
  if (s === "in-progress" || s === "inprogress") return "in-progress";
  if (s === "delayed") return "delayed";
  return "not-started";
};
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtCr = (n) => {
  const v = parseFloat(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${v.toLocaleString()}`;
};
const daysLeft = (due) =>
  due ? Math.ceil((new Date(due) - today) / 86400000) : null;

const toInputDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
const toDisplayDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ══════════════════════════════════════════
   convertWBS — handles flat + nested API shapes
══════════════════════════════════════════ */
const convertWBS = (data, projects) => {
  if (!Array.isArray(data) || !data.length) return [];
  const getName = (pid) =>
    projects.find((p) => String(p.id) === String(pid))?.name || "Unknown";
  const nested   = Array.isArray(data[0]?.tasks);
  const roots    = nested ? data : data.filter((r) => !r.parent_id);
  const children = nested ? data.flatMap((r) => r.tasks || []) : data.filter((r) => r.parent_id);

  const items = roots.map((ms) => {
    const rawSubs = nested ? ms.tasks || [] : children.filter((c) => String(c.parent_id) === String(ms.id));
    const subtasks = rawSubs.map((t) => ({
      id: t.id, code: t.code, title: t.name,
      status: normalizeStatus(t.status), progress: t.progress || 0,
    }));

    let status = normalizeStatus(ms.status);
    if (status === "not-started") {
      const done   = subtasks.filter((s) => s.status === "completed").length;
      const active = subtasks.filter((s) => ["in-progress","delayed"].includes(s.status)).length;
      if (done === subtasks.length && subtasks.length > 0) status = "completed";
      else if (active > 0 || done > 0) status = "in-progress";
    }

    let progress = ms.progress || 0;
    if (progress === 0 && subtasks.length > 0) {
      progress = Math.round(subtasks.filter((s) => s.status === "completed").length / subtasks.length * 100);
    }

    return {
      id: ms.id, title: ms.name, code: ms.code,
      project:      getName(ms.project_id),
      project_id:   ms.project_id,
      status, progress,
      budget:       parseFloat(ms.budget) || 0,
      spent:        parseFloat(ms.spent)  || 0,
      subtasks,
      payment:      { amount: parseFloat(ms.spent) || 0 },
      visibleToClient: true,
      dueDate:      ms.due_date    || null,
      startDate:    ms.start_date  || null,
      description:  ms.description || "",
      assignedTo:   ms.assigned_to || "",
      phase:        ms.phase       || "",
      dependencies: ms.dependencies|| "",
      risks:        ms.risks       || "",
    };
  });

  const firstActive = items.findIndex((m) => m.status !== "completed");
  return items.map((m, i) => ({
    ...m,
    milestoneType: i < firstActive ? "completed" : i === firstActive ? "current" : "upcoming",
  }));
};

const flattenForBackend = (tasks, parentId = null) => {
  let out = [];
  tasks.forEach((t) => {
    const tid = `${Date.now()}_${Math.random()}`;
    out.push({ temp_id: tid, name: t.title, code: t.code, parent_id: parentId });
    if (t.subtasks?.length) out = out.concat(flattenForBackend(t.subtasks, tid));
  });
  return out;
};

/* ══════════════════════════════════════════
   usePortalDropdown
   Single hook used by ALL dropdowns.
   Menu is rendered via createPortal into document.body —
   completely escapes every overflow/transform/z-index parent.
   Position is recalculated on every open and on scroll/resize.
══════════════════════════════════════════ */
function usePortalDropdown() {
  const [open,  setOpen]  = useState(false);
  const [btnRect, setBtnRect] = useState(null);
  const triggerRef = useRef(null);

  const recalc = useCallback(() => {
    if (triggerRef.current) setBtnRect(triggerRef.current.getBoundingClientRect());
  }, []);

  const toggle = useCallback((e) => {
    if (e) e.stopPropagation();
    recalc();
    setOpen((v) => !v);
  }, [recalc]);

  const close = useCallback(() => setOpen(false), []);

  /* outside click → close */
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        /* tiny delay lets click handler on menu items fire first */
        setTimeout(close, 80);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, close]);

  /* keep position fresh while open */
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, recalc]);

  return { open, toggle, close, triggerRef, btnRect };
}

/* ══════════════════════════════════════════
   STATUS BADGE (read-only pill)
══════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG["not-started"];
  return (
    <span className="ms-badge" style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>
      <span className="ms-badge__dot" style={{ background: c.color }} />
      {c.label}
    </span>
  );
};

/* ══════════════════════════════════════════
   PROJECT DROPDOWN
══════════════════════════════════════════ */
const ProjectDropdown = ({ projects, selectedProject, onChange }) => {
  const { open, toggle, close, triggerRef, btnRect } = usePortalDropdown();

  const label =
    !selectedProject || selectedProject === "All"
      ? "All Projects"
      : projects.find((p) => String(p.id) === String(selectedProject))?.name || "All Projects";

  return (
    <div className="ms-proj-dd">
      <button
        ref={triggerRef}
        className={`ms-proj-dd__btn ${open ? "open" : ""}`}
        onClick={toggle}
      >
        <span className="ms-proj-dd__label">{label}</span>
        <span className="ms-proj-dd__arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && btnRect && createPortal(
        <div
          className="ms-portal-menu"
          style={{
            top:      btnRect.bottom + 4,
            right:    window.innerWidth - btnRect.right,
            minWidth: Math.max(btnRect.width, 200),
          }}
        >
          <div
            className={`ms-portal-item ${(!selectedProject || selectedProject === "All") ? "active" : ""}`}
            onClick={() => { onChange("All"); close(); }}
          >
            <span className="ms-portal-dot" style={{ background: "#94a3b8" }} />
            All Projects
          </div>
          {projects.map((p) => (
            <div
              key={p.id}
              className={`ms-portal-item ${String(selectedProject) === String(p.id) ? "active" : ""}`}
              onClick={() => { onChange(p.id); close(); }}
            >
              <span className="ms-portal-dot" style={{ background: "#2563eb" }} />
              {p.name}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   STATUS CHANGER DROPDOWN
══════════════════════════════════════════ */
const StatusChanger = ({ milestoneId, currentStatus, onStatusChange }) => {
  const { open, toggle, close, triggerRef, btnRect } = usePortalDropdown();
  const dotColors = {
    "Not Started": "#94a3b8", "In Progress": "#2563eb",
    "Completed": "#10b981",   "Delayed": "#ef4444",
  };

  return (
    <div className="ms-sc">
      <button ref={triggerRef} className="ms-sc__btn" onClick={toggle}>
        Set Status ▾
      </button>

      {open && btnRect && createPortal(
        <div
          className="ms-portal-menu"
          style={{
            top:      btnRect.bottom + 4,
            right:    window.innerWidth - btnRect.right,
            minWidth: 200,
          }}
        >
          <p className="ms-portal-heading">Update milestone status</p>
          {STATUS_OPTIONS.map((s) => (
            <div
              key={s}
              className={`ms-portal-item ${currentStatus === normalizeStatus(s) ? "active" : ""}`}
              onClick={() => { onStatusChange(milestoneId, s); close(); }}
            >
              <span className="ms-portal-dot" style={{ background: dotColors[s] }} />
              {s}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   INLINE EDITABLE FIELD
══════════════════════════════════════════ */
const EditableField = ({ label, value, fieldKey, milestoneId, type = "text", onSave, wide }) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setDraft(type === "date" ? toInputDate(value) : (value || ""));
  }, [value, type]);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const commit = async () => {
    const orig = type === "date" ? toInputDate(value) : (value || "");
    if (draft === orig) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(milestoneId, fieldKey, draft || null); setEditing(false); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && type !== "textarea") commit();
    if (e.key === "Escape") { setDraft(type === "date" ? toInputDate(value) : (value || "")); setEditing(false); }
  };

  const displayVal = type === "date" ? toDisplayDate(draft) : draft;

  return (
    <div
      className={`ms-detail-block ms-detail-block--edit ${wide ? "ms-detail-block--wide" : ""}`}
      onClick={() => !editing && setEditing(true)}
      title="Click to edit"
    >
      <p className="ms-detail-label">
        {label}
        {!editing && <span className="ms-pencil">✏</span>}
      </p>
      {editing ? (
        <div className="ms-ef-wrap">
          {type === "textarea" ? (
            <textarea ref={ref} className="ms-ef-input ms-ef-ta" value={draft}
              onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} rows={3} />
          ) : (
            <input ref={ref} type={type} className="ms-ef-input" value={draft}
              onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
          )}
          <div className="ms-ef-actions">
            <button className="ms-ef-ok" disabled={saving} onClick={commit}>{saving ? "…" : "✓"}</button>
            <button className="ms-ef-cancel" onClick={() => { setDraft(type === "date" ? toInputDate(value) : (value || "")); setEditing(false); }}>✕</button>
          </div>
        </div>
      ) : (
        <p className="ms-detail-val" style={{ color: displayVal ? "#0a2540" : "#b0bec5", fontStyle: displayVal ? "normal" : "italic" }}>
          {displayVal || `Add ${label.toLowerCase()}…`}
        </p>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   SUBTASK TRACKER — interactive checkboxes
══════════════════════════════════════════ */
const SubtaskTracker = ({ subtasks = [], title = "Subtasks", milestoneId, onToggle }) => {
  const done = subtasks.filter((s) => s.status === "completed").length;
  return (
    <div className="ms-st">
      <div className="ms-st__header">
        <p className="ms-st__title">{title}</p>
        {subtasks.length > 0 && <span className="ms-st__count">{done}/{subtasks.length} done</span>}
      </div>
      {subtasks.length === 0 ? (
        <p className="ms-st__empty">No subtasks defined.</p>
      ) : (
        <>
          <div className="ms-st__list">
            {subtasks.map((st, idx) => {
              const cfg  = SUBTASK_STATUS_CFG[st.status] || SUBTASK_STATUS_CFG["not-started"];
              const isDone = st.status === "completed";
              const last   = idx === subtasks.length - 1;
              const nextCfg = !last ? (SUBTASK_STATUS_CFG[subtasks[idx+1]?.status] || SUBTASK_STATUS_CFG["not-started"]) : null;
              return (
                <div key={st.id} className="ms-st__row">
                  <div className="ms-st__line-col">
                    <button
                      className={`ms-st__circle ${isDone ? "done" : st.status === "in-progress" ? "active" : ""}`}
                      style={{ borderColor: cfg.color, background: isDone ? cfg.color : "#fff" }}
                      title={isDone ? "Click to unmark" : "Click to mark complete"}
                      onClick={() => onToggle && onToggle(st.id, isDone ? "Not Started" : "Completed", milestoneId)}
                    >
                      {isDone && <span className="ms-st__tick">✓</span>}
                      {!isDone && st.status === "in-progress" && <span className="ms-st__pulse" style={{ background: cfg.color }} />}
                    </button>
                    {!last && <div className="ms-st__connector" style={{ background: nextCfg?.color || "#e2eaf4" }} />}
                  </div>
                  <div className={`ms-st__content ${isDone ? "done" : ""}`}>
                    <span className="ms-st__code">{st.code}</span>
                    <span className="ms-st__name">{st.title}</span>
                    <span className="ms-st__badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                      {isDone ? "Done" : st.status === "in-progress" ? "Active" : st.status === "delayed" ? "Delayed" : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="ms-st__hint">💡 Click circle to toggle completion</p>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   SE ALERT BANNER
   Polls /api/wbs/se-alerts?project_id=X for
   unread alerts generated when SE engineers
   submit daily reports mentioning a milestone/subtask.
   Shows a notification-style list; project coordinator
   clicks "Update Milestone" to apply the change.
══════════════════════════════════════════ */
const SEAlertBanner = ({ projectId, milestones, onApply }) => {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(null); // alert id being applied

  const load = useCallback(async () => {
    if (!projectId || projectId === "All") return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/wbs/se-alerts?project_id=${projectId}`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (alert) => {
    setApplying(alert.id);
    try {
      await fetch(`${API}/api/wbs/se-alerts/${alert.id}/apply`, { method: "POST" });
      await load();
      onApply();
    } catch (e) { alert("Apply failed: " + e.message); }
    finally { setApplying(null); }
  };

  const handleDismiss = async (alertId) => {
    try {
      await fetch(`${API}/api/wbs/se-alerts/${alertId}/dismiss`, { method: "POST" });
      setAlerts((p) => p.filter((a) => a.id !== alertId));
    } catch (e) { console.error(e); }
  };

  if (!projectId || projectId === "All") return null;
  if (!loading && alerts.length === 0) return null;

  const unread = alerts.filter((a) => !a.applied && !a.dismissed);

  return (
    <div className="ms-alert-banner">
      <div className="ms-alert-banner__hd" onClick={() => setExpanded((v) => !v)}>
        <div className="ms-alert-banner__left">
          <div className="ms-alert-banner__bell">
            🔔
            {unread.length > 0 && <span className="ms-alert-banner__badge">{unread.length}</span>}
          </div>
          <div>
            <p className="ms-alert-banner__title">Site Engineer Updates</p>
            <p className="ms-alert-banner__sub">
              {loading ? "Loading…" : unread.length > 0
                ? `${unread.length} pending milestone update${unread.length > 1 ? "s" : ""} from SE daily reports`
                : "No new updates"}
            </p>
          </div>
        </div>
        <span className="ms-alert-banner__toggle">{expanded ? "▲ Hide" : "▼ View"}</span>
      </div>

      {expanded && (
        <div className="ms-alert-banner__body">
          {loading && <p className="ms-alert-banner__loading">Checking SE reports…</p>}
          {!loading && unread.length === 0 && (
            <p className="ms-alert-banner__empty">All updates have been reviewed.</p>
          )}
          {unread.map((a) => {
            const ms  = milestones.find((m) => m.id === a.milestone_id);
            const sub = ms?.subtasks.find((s) => s.id === a.subtask_id);
            return (
              <div key={a.id} className="ms-alert-item">
                <div className="ms-alert-item__left">
                  <span className="ms-alert-item__icon">
                    {a.suggested_status === "Completed" ? "✅" : a.suggested_status === "In Progress" ? "🔄" : "⚠️"}
                  </span>
                  <div>
                    <p className="ms-alert-item__title">
                      <strong>{ms?.title || `Milestone #${a.milestone_id}`}</strong>
                      {sub && <> → <em>{sub.title}</em></>}
                    </p>
                    <p className="ms-alert-item__desc">{a.note}</p>
                    <p className="ms-alert-item__meta">
                      📅 {a.report_date} · 👷 {a.submitted_by} · Suggested: <strong style={{ color: a.suggested_status === "Completed" ? "#10b981" : "#2563eb" }}>{a.suggested_status}</strong>
                    </p>
                  </div>
                </div>
                <div className="ms-alert-item__actions">
                  <button
                    className="ms-alert-item__apply"
                    disabled={applying === a.id}
                    onClick={() => handleApply(a)}
                  >
                    {applying === a.id ? "Updating…" : "✓ Update Milestone"}
                  </button>
                  <button className="ms-alert-item__dismiss" onClick={() => handleDismiss(a.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   MILESTONE PLANNING POPUP
══════════════════════════════════════════ */
const PlanningPopup = ({ projects, templates, selectedTemplate, existingProjectIds, onClose, onSave }) => {
  const [step,       setStep]       = useState(1);
  const [projId,     setProjId]     = useState("");
  const [tasks,      setTasks]      = useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [expanded,   setExpanded]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [isExisting, setIsExisting] = useState(false);

  useEffect(() => {
    setIsExisting(!!projId && existingProjectIds.includes(String(projId)));
  }, [projId, existingProjectIds]);

  const loadTemplate = async () => {
    try {
      const res  = await fetch(`${API}/api/templates/${selectedTemplate}`);
      const data = await res.json();
      const map = {}; const roots = [];
      data.forEach((item) => { map[item.id] = { id: item.id, code: item.code, title: item.name, subtasks: [] }; });
      data.forEach((item) => { item.parent_id ? map[item.parent_id]?.subtasks.push(map[item.id]) : roots.push(map[item.id]); });
      setTasks(roots); setStep(2);
    } catch (e) { alert("Template load failed: " + e.message); }
  };

  const loadExisting = async () => {
    try {
      const res  = await fetch(`${API}/api/wbs/${projId}`);
      const data = await res.json();
      const t = data.map((p) => ({ id: p.id, code: p.code, title: p.name, subtasks: (p.tasks||[]).map((s) => ({ id: s.id, code: s.code, title: s.name })) }));
      setTasks(t); setEditMode(true); setStep(2);
    } catch (e) { alert("Load failed: " + e.message); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const items = flattenForBackend(tasks);
      const res = await fetch(`${API}/api/wbs/auto-plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projId, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onSave(null); setTimeout(() => onSave(projId), 120); onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const addMs    = () => setTasks((p) => [...p, { id:`n_${Date.now()}`, code:`${p.length+1}`, title:"New Milestone", subtasks:[] }]);
  const delMs    = (id) => setTasks((p) => p.filter((t) => t.id !== id));
  const renameMs = (id, v) => setTasks((p) => p.map((t) => t.id===id ? {...t,title:v} : t));
  const addSub   = (tid) => setTasks((p) => p.map((t) => t.id!==tid ? t : {...t, subtasks:[...t.subtasks,{id:`n_${Date.now()}`,code:`${t.code}.${t.subtasks.length+1}`,title:"New Subtask"}]}));
  const delSub   = (tid,sid) => setTasks((p) => p.map((t) => t.id!==tid ? t : {...t, subtasks:t.subtasks.filter((s)=>s.id!==sid)}));
  const renameSub= (tid,sid,v) => setTasks((p) => p.map((t) => t.id!==tid ? t : {...t, subtasks:t.subtasks.map((s)=>s.id===sid?{...s,title:v}:s)}));
  const projName = projects.find((p) => String(p.id) === String(projId))?.name || "";

  return (
    <div className="ms-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ms-popup">
        <div className="ms-popup__hd">
          <div>
            <h2 className="ms-popup__title">Milestone Planning</h2>
            <p className="ms-popup__sub">{step===1 ? "Select a project to plan or edit milestones" : `Planning: ${projName}`}</p>
          </div>
          <button className="ms-popup__x" onClick={onClose}>✕</button>
        </div>

        <div className="ms-popup__steps">
          {[{n:1,label:"Choose Project"},{n:2,label:"Review & Plan"}].map((s,i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div className="ms-popup__step-line" />}
              <div className={`ms-popup__step ${step>=s.n?"active":""} ${step>s.n?"done":""}`}>
                <span className="ms-popup__step-num">{step>s.n?"✓":s.n}</span>
                <span className="ms-popup__step-label">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="ms-popup__body">
            <label className="ms-popup__label">Select Project</label>
            <select className="ms-popup__select" value={projId} onChange={(e) => setProjId(e.target.value)}>
              <option value="">— Choose a project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {isExisting && projId && (
              <div className="ms-popup__warn">
                <span>⚠️</span>
                <div>
                  <p className="ms-popup__warn-title">Plan already exists for "{projName}"</p>
                  <p className="ms-popup__warn-sub">Edit the existing plan, or replace with a fresh template.</p>
                </div>
              </div>
            )}

            {!isExisting && projId && (
              <div className="ms-popup__tcard">
                <span className="ms-popup__tcard-icon">📋</span>
                <div>
                  <p className="ms-popup__tcard-name">{templates[0]?.name || "Standard Construction Template"}</p>
                  <p className="ms-popup__tcard-meta">Default template · {templates.length} template(s) in DB</p>
                  <p className="ms-popup__tcard-desc">Site Prep → Foundation → Superstructure → MEP → Finishing → Handover</p>
                </div>
                <span className="ms-popup__tcard-badge">Default</span>
              </div>
            )}

            <div className="ms-popup__foot">
              <button className="ms-btn ms-btn--ghost" onClick={onClose}>Cancel</button>
              {isExisting ? (
                <>
                  <button className="ms-btn ms-btn--ghost" disabled={!projId} onClick={loadTemplate}>🔄 Replace</button>
                  <button className="ms-btn ms-btn--primary" disabled={!projId} onClick={loadExisting}>✏ Edit Existing →</button>
                </>
              ) : (
                <button className="ms-btn ms-btn--primary" disabled={!projId} onClick={loadTemplate}>Next →</button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ms-popup__body ms-popup__body--scroll">
            <div className="ms-wbs-bar">
              <p className="ms-wbs-bar__info">
                <strong>{tasks?.length}</strong> milestones · <strong>{tasks?.reduce((s,t)=>s+t.subtasks.length,0)}</strong> subtasks
                {isExisting && <span className="ms-wbs-bar__tag">Editing existing</span>}
              </p>
              <div style={{display:"flex",gap:8}}>
                <button className={`ms-btn ms-btn--sm ${editMode?"ms-btn--active":"ms-btn--ghost"}`} onClick={() => setEditMode((v)=>!v)}>
                  {editMode ? "✓ Done" : "✏ Edit"}
                </button>
                {editMode && <button className="ms-btn ms-btn--sm ms-btn--green" onClick={addMs}>+ Milestone</button>}
              </div>
            </div>

            <div className="ms-wbs-list">
              {tasks?.map((t) => (
                <div key={t.id} className="ms-wbs-task">
                  <div className="ms-wbs-task__hd" onClick={() => !editMode && setExpanded((p)=>({...p,[t.id]:!p[t.id]}))}>
                    <div className="ms-wbs-task__l">
                      <span className="ms-wbs-task__code">{t.code}</span>
                      {editMode
                        ? <input className="ms-wbs-inp" value={t.title} onChange={(e)=>renameMs(t.id,e.target.value)} onClick={(e)=>e.stopPropagation()} />
                        : <span className="ms-wbs-task__name">{t.title}</span>
                      }
                      <span className="ms-ms-chip">Milestone</span>
                    </div>
                    <div className="ms-wbs-task__r">
                      <span className="ms-wbs-task__cnt">{t.subtasks.length} subtasks</span>
                      {editMode
                        ? <button className="ms-wbs-del" onClick={(e)=>{e.stopPropagation();delMs(t.id);}}>🗑</button>
                        : <span>{expanded[t.id]?"▲":"▼"}</span>
                      }
                    </div>
                  </div>
                  {(editMode || expanded[t.id]) && (
                    <div className="ms-wbs-subs">
                      {t.subtasks.map((s) => (
                        <div key={s.id} className="ms-wbs-sub">
                          <span className="ms-wbs-sub__code">{s.code}</span>
                          {editMode
                            ? <input className="ms-wbs-inp ms-wbs-inp--sm" value={s.title} onChange={(e)=>renameSub(t.id,s.id,e.target.value)} />
                            : <span className="ms-wbs-sub__name">{s.title}</span>
                          }
                          {editMode && <button className="ms-wbs-del ms-wbs-del--sm" onClick={()=>delSub(t.id,s.id)}>✕</button>}
                        </div>
                      ))}
                      {editMode && <button className="ms-wbs-add-sub" onClick={()=>addSub(t.id)}>+ Add Subtask</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ms-popup__foot">
              <button className="ms-btn ms-btn--ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="ms-btn ms-btn--primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "✓ Save Plan"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Milestone() {
  const [milestones,        setMilestones]        = useState([]);
  const [activeTab,         setActiveTab]         = useState("All");
  const [expandedId,        setExpanded]          = useState(null);
  const [clientView,        setClientView]        = useState(false);
  const [activeSection,     setActiveSection]     = useState({});
  const [showPlanning,      setShowPlanning]      = useState(false);
  const [selectedProject,   setSelectedProject]   = useState("All");
  const [templates,         setTemplates]         = useState([]);
  const [selectedTemplate,  setSelectedTemplate]  = useState(null);
  const [projects,          setProjects]          = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [existingProjIds,   setExistingProjIds]   = useState([]);

  /* ── fetch projects & templates once ── */
  useEffect(() => {
    fetch(`${API}/api/projects`).then(r=>r.json()).then(d=>setProjects(Array.isArray(d)?d:[])).catch(console.error);
    fetch(`${API}/api/templates`).then(r=>r.json()).then(d=>{
      const a=Array.isArray(d)?d:[];
      setTemplates(a);
      if(a.length) setSelectedTemplate(a[0].id);
    }).catch(console.error);
  }, []);

  /* ── which projects already have WBS ── */
  const refreshExisting = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/wbs`);
      const data = await res.json();
      if(Array.isArray(data)) setExistingProjIds([...new Set(data.map(r=>String(r.project_id)))]);
    } catch(e) { console.error(e); }
  }, []);
  useEffect(() => { refreshExisting(); }, [refreshExisting]);

  /* ── fetch WBS ── */
  const fetchWBS = useCallback(async (pid) => {
    setLoading(true);
    try {
      const url = (!pid || pid==="All") ? `${API}/api/wbs` : `${API}/api/wbs/${pid}`;
      const res  = await fetch(url);
      const data = await res.json();
      setMilestones(Array.isArray(data) ? convertWBS(data, projects) : []);
    } catch(e) { console.error(e); setMilestones([]); }
    finally { setLoading(false); }
  }, [projects]);

  useEffect(() => { fetchWBS(selectedProject); }, [selectedProject, fetchWBS]);

  /* ── PATCH single WBS row ── */
  const patchWBS = useCallback(async (id, body) => {
    const res = await fetch(`${API}/api/wbs/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
    });
    if(!res.ok) throw new Error("Update failed");
    return res.json();
  }, []);

  /* ── subtask toggle ── */
  const handleSubtaskToggle = useCallback(async (subId, newStatus, msId) => {
    try {
      await patchWBS(subId, { status: newStatus });
      setMilestones((prev) => prev.map((m) => {
        if(m.id !== msId) return m;
        const subs    = m.subtasks.map((s) => s.id===subId ? {...s,status:normalizeStatus(newStatus)} : s);
        const done    = subs.filter((s)=>s.status==="completed").length;
        const progress= subs.length ? Math.round(done/subs.length*100) : 0;
        const status  = done===subs.length && subs.length ? "completed" : done>0 ? "in-progress" : m.status;
        return {...m, subtasks:subs, progress, status};
      }));
    } catch(e) { alert("Subtask update failed: "+e.message); }
  }, [patchWBS]);

  /* ── milestone field save ── */
  const handleFieldSave = useCallback(async (msId, fieldKey, value) => {
    await patchWBS(msId, {[fieldKey]:value});
    const jsKey = {due_date:"dueDate",start_date:"startDate",assigned_to:"assignedTo"}[fieldKey] || fieldKey;
    setMilestones((prev)=>prev.map((m)=>m.id===msId?{...m,[jsKey]:value}:m));
  }, [patchWBS]);

  /* ── milestone status change ── */
  const handleStatusChange = useCallback(async (msId, newStatus) => {
    try {
      await patchWBS(msId, {status:newStatus});
      setMilestones((prev)=>prev.map((m)=>m.id===msId?{...m,status:normalizeStatus(newStatus)}:m));
    } catch(e) { alert("Status update failed: "+e.message); }
  }, [patchWBS]);

  /* ── derived ── */
  const visible  = clientView ? milestones.filter((m)=>m.visibleToClient) : milestones;
  const filtered = visible.filter((m) =>
    activeTab==="All"         ? true :
    activeTab==="In Progress" ? m.status==="in-progress" :
    activeTab==="Completed"   ? m.status==="completed"   :
    activeTab==="Delayed"     ? m.status==="delayed"     :
    m.status==="not-started"
  );
  const counts = {
    total:      visible.length,
    completed:  visible.filter(m=>m.status==="completed").length,
    inProgress: visible.filter(m=>m.status==="in-progress").length,
    delayed:    visible.filter(m=>m.status==="delayed").length,
    notStarted: visible.filter(m=>m.status==="not-started").length,
  };
  const totalBudget = visible.reduce((s,m)=>s+(m.budget||0),0);
  const totalPaid   = visible.reduce((s,m)=>s+(m.payment?.amount||0),0);
  const payPct      = totalBudget ? Math.round(totalPaid/totalBudget*100) : 0;
  const overallPct  = visible.length ? Math.round(visible.reduce((s,m)=>s+m.progress,0)/visible.length) : 0;
  const radialData  = [
    {name:"Completed",   value:counts.completed,  fill:"#10b981"},
    {name:"In Progress", value:counts.inProgress, fill:"#2563eb"},
    {name:"Delayed",     value:counts.delayed,    fill:"#ef4444"},
    {name:"Not Started", value:counts.notStarted, fill:"#cbd5e1"},
  ];
  const getSec = (id) => activeSection[id] || "details";
  const setSec = (id,s) => setActiveSection((p)=>({...p,[id]:s}));

  /* ════════════ RENDER ════════════ */
  return (
    <div className="ms-page">
      {showPlanning && (
        <PlanningPopup
          projects={projects} templates={templates} selectedTemplate={selectedTemplate}
          existingProjectIds={existingProjIds}
          onClose={() => setShowPlanning(false)}
          onSave={(pid) => { refreshExisting(); pid ? setSelectedProject(String(pid)) : fetchWBS(selectedProject); }}
        />
      )}

      {/* ── HEADER ── */}
      <div className="ms-header">
        <h1 className="ms-title">Milestones</h1>
        <div className="ms-header-controls">
          <button className="ms-plan-btn" onClick={() => setShowPlanning(true)}>
            <span>📋</span> Milestone Planning
          </button>
          <div className="ms-toggle-wrap">
            <span className="ms-toggle-label">Client View</span>
            <button className={`ms-toggle ${clientView?"on":""}`} onClick={() => setClientView(v=>!v)}>
              <span className="ms-toggle__knob" />
            </button>
          </div>
          <ProjectDropdown projects={projects} selectedProject={selectedProject}
            onChange={(v) => { setSelectedProject(v); setExpanded(null); }} />
        </div>
      </div>

      {clientView && (
        <div className="ms-client-banner">
          <span className="ms-client-banner__dot" />
          Client View — {counts.total} milestones visible
        </div>
      )}

      {/* ── SE ALERT BANNER ── */}
      {selectedProject !== "All" && selectedProject && (
        <SEAlertBanner
          projectId={selectedProject}
          milestones={milestones}
          onApply={() => fetchWBS(selectedProject)}
        />
      )}

      {/* ── SUMMARY ── */}
      <div className="ms-summary">
        <div className="ms-stat-grid">
          {[
            {label:"Total",       val:counts.total,      color:"#0a2540"},
            {label:"Completed",   val:counts.completed,  color:"#10b981"},
            {label:"In Progress", val:counts.inProgress, color:"#2563eb"},
            {label:"Delayed",     val:counts.delayed,    color:"#ef4444"},
          ].map((s) => (
            <div key={s.label} className="ms-stat-card">
              <p className="ms-stat-card__label">{s.label}</p>
              <p className="ms-stat-card__val" style={{color:s.color}}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="ms-summary-row2">
          <div className="ms-chart-card">
            <div className="ms-chart-card__left">
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%"
                  data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{fill:"#f0f6ff"}} />
                  <Tooltip content={({active,payload}) => active&&payload?.length ? (
                    <div className="ms-tooltip">
                      <p style={{color:payload[0].payload.fill,fontWeight:700}}>{payload[0].payload.name}</p>
                      <p>{payload[0].value} milestones</p>
                    </div>
                  ) : null} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="ms-chart-card__right">
              <p className="ms-chart-card__pct">{overallPct}%</p>
              <p className="ms-chart-card__sublabel">Overall Progress</p>
              <div className="ms-chart-legend">
                {radialData.map((d) => (
                  <div key={d.name} className="ms-legend-row">
                    <span className="ms-legend-dot" style={{background:d.fill}} />
                    <span className="ms-legend-label">{d.name}</span>
                    <span className="ms-legend-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ms-pay-summary">
            <p className="ms-pay-summary__title">Payment Overview</p>
            <div className="ms-pay-summary__row">
              <div><p className="ms-pay-summary__label">Total Budget</p><p className="ms-pay-summary__val">{fmtCr(totalBudget)}</p></div>
              <div><p className="ms-pay-summary__label">Received</p><p className="ms-pay-summary__val" style={{color:"#10b981"}}>{fmtCr(totalPaid)}</p></div>
            </div>
            <div className="ms-pay-bar-track"><div className="ms-pay-bar-fill" style={{width:`${payPct}%`}} /></div>
            <p className="ms-pay-pct">{payPct}% received · {fmtCr(totalBudget-totalPaid)} outstanding</p>
            <p className="ms-pay-note">Full details in Payments section.</p>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="ms-tabs">
        {TABS.map((t) => {
          const cnt = t==="All"?counts.total:t==="In Progress"?counts.inProgress:t==="Completed"?counts.completed:t==="Delayed"?counts.delayed:counts.notStarted;
          return (
            <button key={t} className={`ms-tab ${activeTab===t?"active":""}`} onClick={()=>setActiveTab(t)}>
              {t}<span className="ms-tab__count">{cnt}</span>
            </button>
          );
        })}
      </div>

      {loading  && <div className="ms-loading">Loading milestones…</div>}
      {!loading && filtered.length===0 && <div className="ms-empty">No milestones found for this filter.</div>}

      {/* ── CARDS ── */}
      <div className="ms-list">
        {filtered.map((m) => {
          const sc       = STATUS_CFG[m.status] || STATUS_CFG["not-started"];
          const isOpen   = expandedId === m.id;
          const days     = daysLeft(m.dueDate);
          const isOverdue= m.status === "delayed";
          const isCurrent= m.milestoneType === "current";
          const sec      = getSec(m.id);
          const doneSubs = m.subtasks.filter(s=>s.status==="completed").length;

          return (
            <div key={m.id} className={`ms-card ${isOpen?"open":""} ${isOverdue?"overdue":""} ms-card--${m.milestoneType}`}>
              <div className="ms-card__accent" style={{background:sc.bar}} />

              <div className="ms-card__header" onClick={()=>setExpanded(isOpen?null:m.id)}>
                <div className="ms-card__main">
                  <div className="ms-card__top">
                    <span className="ms-card__code">{m.code}</span>
                    <h3 className="ms-card__title">{m.title}</h3>
                    <StatusBadge status={m.status} />
                    {m.visibleToClient && <span className="ms-client-chip">Client</span>}
                    {isCurrent && (
                      <span className="ms-current-chip">
                        <span className="ms-current-chip__dot" />🔥 Current
                      </span>
                    )}
                  </div>
                  <p className="ms-card__project">{m.project}</p>
                  {/* ── info row: NO budget, only Subtasks + Due + Left ── */}
                  <div className="ms-card__info-row">
                    <span className="ms-info-item">
                      <span className="ms-info-lbl">Subtasks</span>
                      <span className="ms-info-val">{doneSubs}/{m.subtasks.length}</span>
                    </span>
                    {m.dueDate && <>
                      <span className="ms-info-sep">·</span>
                      <span className="ms-info-item">
                        <span className="ms-info-lbl">Due</span>
                        <span className="ms-info-val">{fmt(m.dueDate)}</span>
                      </span>
                      <span className="ms-info-sep">·</span>
                      <span className="ms-info-item">
                        <span className="ms-info-lbl">{isOverdue?"Overdue":"Left"}</span>
                        <span className="ms-info-val" style={{color:isOverdue?"#ef4444":days<=7?"#f59e0b":"#0a2540"}}>
                          {days!==null?(isOverdue?`${Math.abs(days)}d`:days>0?`${days}d`:"Today"):"—"}
                        </span>
                      </span>
                    </>}
                  </div>
                  <div className="ms-card__prog-row">
                    <div className="ms-bar-track"><div className="ms-bar-fill" style={{width:`${m.progress}%`,background:sc.bar}} /></div>
                    <span className="ms-card__pct" style={{color:sc.bar}}>{m.progress}%</span>
                  </div>
                </div>
                <span className="ms-chevron">{isOpen?"▲":"▼"}</span>
              </div>

              {isOpen && (
                <div className="ms-card__body">
                  <div className="ms-inner-tabs">
                    {["details","next"].map((s) => (
                      <button key={s} className={`ms-inner-tab ${sec===s?"active":""}`} onClick={()=>setSec(m.id,s)}>
                        {s==="details"?"Milestone Details":"Next Planning"}
                      </button>
                    ))}
                    <div style={{marginLeft:"auto"}}>
                      <StatusChanger milestoneId={m.id} currentStatus={m.status} onStatusChange={handleStatusChange} />
                    </div>
                  </div>

                  {sec === "details" && (
                    <div className="ms-two-col">
                      <div className="ms-col-l">
                        <SubtaskTracker subtasks={m.subtasks} title="Subtasks" milestoneId={m.id} onToggle={handleSubtaskToggle} />
                      </div>
                      <div className="ms-col-r">
                        <div className="ms-detail-grid">
                          <EditableField label="Description"  value={m.description}  fieldKey="description"  milestoneId={m.id} type="textarea" onSave={handleFieldSave} wide />
                          <EditableField label="Start Date"   value={m.startDate}    fieldKey="start_date"   milestoneId={m.id} type="date"     onSave={handleFieldSave} />
                          <EditableField label="Due Date"     value={m.dueDate}      fieldKey="due_date"     milestoneId={m.id} type="date"     onSave={handleFieldSave} />
                          <EditableField label="Assigned To"  value={m.assignedTo}   fieldKey="assigned_to"  milestoneId={m.id}                 onSave={handleFieldSave} />
                          <EditableField label="Phase"        value={m.phase}        fieldKey="phase"        milestoneId={m.id}                 onSave={handleFieldSave} />
                          <EditableField label="Dependencies" value={m.dependencies} fieldKey="dependencies" milestoneId={m.id}                 onSave={handleFieldSave} />
                          <EditableField label="Risks/Issues" value={m.risks}        fieldKey="risks"        milestoneId={m.id}                 onSave={handleFieldSave} />
                          <div className="ms-detail-block">
                            <p className="ms-detail-label">Visible to Client</p>
                            <p className="ms-detail-val" style={{color:m.visibleToClient?"#10b981":"#94a3b8",fontWeight:700}}>
                              {m.visibleToClient?"Yes — visible":"No — internal only"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {sec === "next" && (() => {
                    const idx  = milestones.findIndex((x)=>x.id===m.id);
                    const nextM= milestones[idx+1] || null;
                    return (
                      <div className="ms-two-col">
                        <div className="ms-col-l">
                          <SubtaskTracker subtasks={nextM?.subtasks||[]} title="Next Milestone Subtasks"
                            milestoneId={nextM?.id} onToggle={handleSubtaskToggle} />
                        </div>
                        <div className="ms-col-r">
                          <div className="ms-next-card">
                            <div className="ms-next-card__hd">
                              <p className="ms-detail-label">Next Milestone</p>
                              <h3 className="ms-next-card__title">{nextM?.title||"—"}</h3>
                            </div>
                            <p className="ms-detail-label" style={{marginBottom:4}}>Summary</p>
                            <p className="ms-next-card__note">
                              {nextM ? `${nextM.subtasks.length} subtasks in "${nextM.title}"` : "This is the last milestone."}
                            </p>
                            {nextM && (
                              <div className="ms-timeline">
                                <div className="ms-tl-item">
                                  <div className="ms-tl-dot" style={{background:sc.bar}} />
                                  <div><p className="ms-tl-title">{m.title}</p><p className="ms-tl-sub">{m.progress}% complete</p></div>
                                </div>
                                <div className="ms-tl-line" />
                                <div className="ms-tl-item">
                                  <div className="ms-tl-dot ms-tl-dot--next" />
                                  <div><p className="ms-tl-title">{nextM.title}</p><p className="ms-tl-sub">Up next · {nextM.subtasks.length} subtasks</p></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}