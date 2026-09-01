// src/pages/siteEngineer/DailyDiary.jsx
// Labour input REMOVED — reads from LabourReport (single source of truth)
// LabourSummaryCard shows today's crew + "Edit →" link to LabourReport page
// All other diary fields unchanged

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/DailyDiary.css";

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const DRAFT_KEY    = "dailyDiary:draft:v4";
const QUEUE_KEY    = "dailyDiary:queue:v4";

const WEATHER_OPTS = [
  "Sunny / Clear","Partly Cloudy","Overcast",
  "Light Rain","Heavy Rain","Fog / Mist",
];

const DELAY_TYPES = [
  { value: "",                label: "No delay today"                   },
  { value: "material",        label: "Material shortage / late delivery" },
  { value: "weather",         label: "Adverse weather"                  },
  { value: "design",          label: "Design / drawing conflict"        },
  { value: "labour",          label: "Labour shortage"                  },
  { value: "equipment",       label: "Equipment breakdown"              },
  { value: "rfi_pending",     label: "Waiting for RFI response"         },
  { value: "inspection_hold", label: "Inspection / approval hold"       },
  { value: "ncr_hold",        label: "NCR work hold"                    },
  { value: "other",           label: "Other"                            },
];

const BLANK = {
  date: "", shift: "morning", site: "", zone: "",
  project_id: "", milestone_id: "", subtask_id: "",
  weather_am: "Partly Cloudy", weather_pm: "Partly Cloudy", temp_c: "",
  work_done: "", plant: "",
  materials: [{ name: "", qty: "", notes: "" }],
  issues: "",
  delay_type: "", delay_description: "",
  linked_rfi: "", linked_incident: "",
  instructions: "", next_day: "", notes: "",
};

/* ─────────────────────────────────────────────────────────
   LOCAL STORAGE
───────────────────────────────────────────────────────── */
const ls = {
  load: k  => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k  => { try { localStorage.removeItem(k); } catch {} },
};

function enqueue(payload) {
  const q = ls.load(QUEUE_KEY) || [];
  q.push({ id: `q_${Date.now()}`, payload, createdAt: new Date().toISOString() });
  ls.save(QUEUE_KEY, q);
}

async function flushQueue() {
  const q = ls.load(QUEUE_KEY);
  if (!Array.isArray(q) || !q.length) return;
  const rem = [];
  for (const item of q) {
    try {
      const res = await api.post("/diary", item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}

function nowISO() { return new Date().toISOString().slice(0, 10); }

function validate(f) {
  const e = {};
  if (!f.date)                                       e.date      = "Date is required";
  if (!f.work_done || f.work_done.trim().length < 5) e.work_done = "Describe work done (min 5 chars)";
  return e;
}

/* ─────────────────────────────────────────────────────────
   LABOUR SUMMARY CARD
   Read-only — pulls from LabourReport by date + project
───────────────────────────────────────────────────────── */
function LabourSummaryCard({ date, projectId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    // Fetch by date only — project filter is optional
    const params = new URLSearchParams({ date });
    api.get(`/labour-report?${params}`)
      .then(r => {
        const list = Array.isArray(r?.data) ? r.data : [];
        if (!list.length) { setData(null); return; }

        // Prefer matching project, fall back to first result for that date
        const match = projectId
  ? list.find(
      lr => String(lr.project_id) === String(projectId)
    )
  : list[0];

setData(match || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date, projectId]);

  if (loading) return (
    <div style={{ padding: "14px 0", fontSize: 12, color: "var(--c-text-3)" }}>
      Loading labour data…
    </div>
  );

  if (!data) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px",
      background: "rgba(239,159,39,.06)",
      border: "1px dashed #EF9F27",
      borderRadius: 12, gap: 12, flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#633806", marginBottom: 3 }}>
          No labour report for {date}
        </div>
        <div style={{ fontSize: 12, color: "#7D9AB5" }}>
          Submit a Labour Report first — it will appear here automatically.
        </div>
      </div>
      <button type="button" className="dd-btn dd-btn--primary"
        onClick={() => navigate("/site-engineer/labour-report")}>
        Submit Labour Report →
      </button>
    </div>
  );

  const trades = Array.isArray(data.trades) ? data.trades : [];

  return (
    <div style={{
      background: "var(--c-surface-2,#F4F8FB)",
      border: "1px solid var(--c-border,rgba(10,65,116,.10))",
      borderLeft: "4px solid #085041",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--c-border,rgba(10,65,116,.10))",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 28, fontWeight: 900, fontFamily: "var(--c-mono,monospace)",
            color: "var(--c-navy-900,#001D39)", letterSpacing: "-1px",
          }}>{data.total_headcount || 0}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-navy-900)" }}>
              workers on site
            </div>
            <div style={{ fontSize: 11, color: "#085041", fontWeight: 600 }}>
              ✓ From Labour Report · {data.shift || "day"} shift
              {data.project_name ? ` · ${data.project_name}` : ""}
            </div>
          </div>
        </div>
        <button type="button"
          style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--c-border-md,rgba(10,65,116,.18))",
            color: "var(--c-navy-700,#0A4174)", cursor: "pointer", fontWeight: 600,
          }}
          onClick={() => navigate("/site-engineer/labour-report")}>
          Edit →
        </button>
      </div>

      {trades.length > 0 && (
        <div style={{ padding: "6px 0" }}>
          {trades.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 16px", fontSize: 12,
              borderBottom: i < trades.length - 1
                ? "1px solid var(--c-border,rgba(10,65,116,.06))" : "none",
            }}>
              <span style={{ color: "var(--c-text-2,#49769F)" }}>{t.trade}</span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {t.zone && <span style={{ fontSize: 10, color: "var(--c-text-3)", fontFamily: "monospace" }}>{t.zone}</span>}
                <strong style={{
                  fontFamily: "var(--c-mono,monospace)", fontWeight: 800,
                  fontSize: 14, color: "var(--c-navy-700,#0A4174)",
                  minWidth: 24, textAlign: "right",
                }}>{t.count}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        padding: "8px 16px", fontSize: 11, color: "var(--c-text-3)",
        borderTop: "1px solid var(--c-border,rgba(10,65,116,.06))",
      }}>
        ✓ Labour pulled automatically — no re-entry needed
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function DailyDiary() {
  const navigate   = useNavigate();
  const draft      = ls.load(DRAFT_KEY);
  const autoSave   = useRef(null);
  const alive      = useRef(true);

  const [form, setForm] = useState({
    ...BLANK,
    date: nowISO(),
    ...draft,
    attachments: [],   // never restore file objects from draft
  });
  const [errors,     setErrors]     = useState({});
  const [status,     setStatus]     = useState("");
  const [submitting, setSub]        = useState(false);
  const [tab,        setTab]        = useState("new");
  const [viewIdx,    setViewIdx]    = useState(null);
  const [diaries,    setDiaries]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [wbsList,    setWbsList]    = useState([]);

  /* ── mount ── */
  useEffect(() => {
    alive.current = true;
    loadHistory();
    loadProjects();
    flushQueue().catch(() => {});
    return () => { alive.current = false; };
  }, []);

  /* ── auto-save draft (no attachments) ── */
  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.attachments; ls.save(DRAFT_KEY, c);
    }, 1200);
  }, [form]);

  /* ── loaders ── */
  async function loadHistory() {
    try {
      const res = await api.get("/diary");
      if (alive.current)
        setDiaries(Array.isArray(res?.data) ? res.data.slice().reverse() : []);
    } catch {}
  }

  async function loadProjects() {
    try {
      const res = await api.get("/projects");
      setProjects(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {}
  }

  async function loadMilestones(projectId) {
    try {
      const res = await api.get(`/diary/milestones?project_id=${projectId}`);
      setMilestones(Array.isArray(res.data) ? res.data : []);
    } catch { setMilestones([]); }
  }

  async function loadWbs(milestoneId) {
    try {
      const res = await api.get(
        `/diary/wbs?milestone_id=${milestoneId}&project_id=${form.project_id}`
      );
      setWbsList(Array.isArray(res.data) ? res.data : []);
    } catch { setWbsList([]); }
  }

  /* ── field helpers ── */
  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  };

  const setMat = (i, k, v) =>
    setForm(f => { const m = [...f.materials]; m[i] = { ...m[i], [k]: v }; return { ...f, materials: m }; });

  const addMat = () =>
    setForm(f => ({ ...f, materials: [...f.materials, { name: "", qty: "", notes: "" }] }));

  const handleFiles = e => {
    const files = Array.from(e.target.files || []);
    setForm(f => ({ ...f, attachments: [...(f.attachments || []), ...files] }));
  };

  const removeFile = i =>
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }));

  /* ── submit ── */
  const submit = async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Saving…");
    try {
      const fd = new FormData();

      // basic fields
      [
        "project_id","date","shift","site","zone",
        "weather_am","weather_pm","temp_c",
        "work_done","plant","issues",
        "instructions","next_day","notes",
        "milestone_id","subtask_id",
        "delay_type","delay_description",
        "linked_rfi","linked_incident",
      ].forEach(k => fd.append(k, form[k] || ""));

      fd.append("materials", JSON.stringify(form.materials || []));

      (form.attachments || []).forEach(file => fd.append("attachments", file));

      const res = await api.post("/diary", fd);

sessionStorage.setItem(
    "selectedDailyDiary",
    JSON.stringify(res.data)
);

await loadHistory();

ls.del(DRAFT_KEY);

setForm({
    ...BLANK,
    date: nowISO(),
    attachments: [],
});

setStatus("Diary submitted ✓");
      setTab("history");
    } catch (err) {
      console.error("Diary submit error:", err?.response?.data || err.message);
      enqueue((({ attachments: _, ...p }) => p)(form));
      setStatus("Offline — queued for retry");
    } finally {
      if (alive.current) setSub(false);
    }
  };

  const fmtDate = s => s
    ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div className="dd-page">

      {/* HEADER */}
      <div className="dd-page-header">
        <div>
          <div className="dd-eyebrow">Daily Documentation</div>
          <h1 className="dd-title">Daily Site Diary</h1>
          <div className="dd-sub">Official site record — submit by 17:30 each day</div>
        </div>
        <div className="dd-header-pills">
          <span className="dd-pill dd-pill--navy">{diaries.length} Submitted</span>
        </div>
      </div>

      {/* TABS */}
      <div className="dd-tabs">
        {[["new","New Entry"],["history","History"]].map(([v,l]) => (
          <div key={v} className={`dd-tab${tab===v?" dd-tab--active":""}`} onClick={()=>setTab(v)}>{l}</div>
        ))}
      </div>

      {/* ══ NEW ENTRY ══════════════════════════════════════════ */}
      {tab === "new" && (
        <div className="dd-layout">
          <div className="dd-main">
            <div className="dd-panel">
              <div className="dd-panel-head">
                <div className="dd-panel-title">Site Diary Entry — {fmtDate(form.date)}</div>
                <div className="dd-panel-actions">
                  <button type="button" className="dd-btn dd-btn--ghost"
                    onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>
                    Save Draft
                  </button>
                  <button type="button" className="dd-btn dd-btn--ghost"
                    onClick={() => { ls.del(DRAFT_KEY); setForm({ ...BLANK, date: nowISO(), attachments: [] }); }}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="dd-panel-body">
                <form onSubmit={submit} noValidate>

                  {/* ── SITE DETAILS ─────────────────────────── */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Site Details</div>
                    <div className="dd-grid-2">
                      <div className="dd-field">
                        <label className="dd-label">Date *</label>
                        <input type="date" className="dd-input" value={form.date}
                          onChange={e => setF("date", e.target.value)}/>
                        {errors.date && <div className="dd-error">{errors.date}</div>}
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Shift</label>
                        <select className="dd-select" value={form.shift}
                          onChange={e => setF("shift", e.target.value)}>
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="night">Night</option>
                        </select>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Project</label>
                        <select className="dd-select" value={form.project_id || ""}
                          onChange={e => {
  const projectId = e.target.value;
  const selectedProject = projects.find(
    p => String(p.id) === String(projectId)
  );

  setF("project_id", projectId);
  setF("site", selectedProject?.name || "");

  setF("milestone_id", "");
  setF("subtask_id", "");

  setMilestones([]);
  setWbsList([]);

  if (projectId) {
    loadMilestones(projectId);
  }
}}>
                          <option value="">Select Project</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Milestone</label>
                        <select className="dd-select" value={form.milestone_id || ""}
                          onChange={e => {
                            setF("milestone_id", e.target.value);
                            setF("subtask_id", ""); setWbsList([]);
                            if (e.target.value) loadWbs(e.target.value);
                          }}>
                          <option value="">Select milestone</option>
                          {milestones.length > 0
                            ? milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                            : <option disabled>No milestones</option>
                          }
                        </select>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Task (WBS)</label>
                        <select className="dd-select" value={form.subtask_id || ""}
                          disabled={!form.milestone_id}
                          onChange={e => setF("subtask_id", e.target.value)}>
                          <option value="">Select task</option>
                          {wbsList.length > 0
                            ? wbsList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                            : <option disabled>No tasks</option>
                          }
                        </select>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Zone / Area</label>
                        <input className="dd-input" value={form.zone}
                          onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2–3"/>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Weather — Morning</label>
                        <select className="dd-select" value={form.weather_am}
                          onChange={e => setF("weather_am", e.target.value)}>
                          {WEATHER_OPTS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Weather — Afternoon</label>
                        <select className="dd-select" value={form.weather_pm}
                          onChange={e => setF("weather_pm", e.target.value)}>
                          {WEATHER_OPTS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="dd-field">
                        <label className="dd-label">Temperature (°C)</label>
                        <input type="number" className="dd-input" value={form.temp_c}
                          onChange={e => setF("temp_c", e.target.value)} placeholder="e.g. 29"/>
                      </div>
                    </div>
                  </div>

                  {/* ── LABOUR — READ ONLY FROM LABOUR REPORT ─── */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Labour on Site Today</div>
                    <LabourSummaryCard date={form.date} projectId={form.project_id}/>
                    {/* Quick link if no report yet */}
                    <div style={{
                      marginTop: 12,
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "var(--c-surface-2,#F4F8FB)",
                      border: "1px solid var(--c-border,rgba(10,65,116,.10))",
                      borderLeft: "4px solid var(--c-navy-700,#0A4174)",
                      borderRadius: 10, gap: 16, flexWrap: "wrap",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-navy-900)", marginBottom: 2 }}>
                          Need trade-wise breakdown?
                        </div>
                        <div style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5 }}>
                          Complete the Labour Report after submitting this diary — it carries the diary, project and milestone details forward.
                        </div>
                      </div>
                      <button type="button" className="dd-btn dd-btn--primary" style={{ flexShrink: 0 }}
                       onClick={() => {

sessionStorage.setItem(
    "selectedDailyDiary",
    JSON.stringify({
        id: form.id || null,
        report_date: form.date,
        project_id: form.project_id,
        milestone_id: form.milestone_id,
        zone: form.zone,
        weather_am: form.weather_am,
        shift: form.shift,
        notes: form.notes
    })
);

navigate("/site-engineer/labour-report");

}}>
                        Complete Labour Report →
                      </button>
                    </div>
                  </div>

                  {/* ── WORK DONE ────────────────────────────── */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Work Executed</div>
                    <div className="dd-field">
                      <label className="dd-label">Activities — Zone by Zone *</label>
                      <textarea className="dd-textarea" style={{ minHeight: 130 }}
                        value={form.work_done}
                        onChange={e => setF("work_done", e.target.value)}
                        placeholder={"Describe all work completed today, zone by zone.\n\ne.g. Level 3 / Grid A–D: Completed rebar fixing for 12 of 18 column bases.\nLevel 2 / Grid E: Formwork striking complete."}/>
                      {errors.work_done && <div className="dd-error">{errors.work_done}</div>}
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Plant &amp; Equipment</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }}
                        value={form.plant}
                        onChange={e => setF("plant", e.target.value)}
                        placeholder="List all plant / machinery on site today with hours worked."/>
                    </div>
                  </div>

                  {/* ── MATERIAL DELIVERIES ─────────────────── */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Material Deliveries</div>
                    {form.materials.map((m, i) => (
                      <div key={i} className="dd-grid-3" style={{ marginBottom: 10 }}>
                        <div className="dd-field">
                          {i === 0 && <label className="dd-label">Material</label>}
                          <input className="dd-input" value={m.name}
                            onChange={e => setMat(i, "name", e.target.value)}
                            placeholder="e.g. Ready-mix C30"/>
                        </div>
                        <div className="dd-field">
                          {i === 0 && <label className="dd-label">Quantity / Unit</label>}
                          <input className="dd-input" value={m.qty}
                            onChange={e => setMat(i, "qty", e.target.value)}
                            placeholder="e.g. 24 m³"/>
                        </div>
                        <div className="dd-field">
                          {i === 0 && <label className="dd-label">Notes</label>}
                          <input className="dd-input" value={m.notes}
                            onChange={e => setMat(i, "notes", e.target.value)}
                            placeholder="Certs OK / on hold"/>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="dd-btn dd-btn--ghost"
                      style={{ fontSize: 11, padding: "5px 12px" }} onClick={addMat}>
                      + Add Delivery
                    </button>
                  </div>

                  {/* ── ISSUES, DELAYS & LINKS ────────────────── */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Issues, Delays &amp; Links</div>

                    <div className="dd-field">
                      <label className="dd-label">Issues / Problems Encountered</label>
                      <textarea className="dd-textarea" value={form.issues}
                        onChange={e => setF("issues", e.target.value)}
                        placeholder="Any delays, material shortages, design conflicts, safety issues, NCRs raised today…"/>
                    </div>

                    <div className="dd-grid-2" style={{ marginTop: 12 }}>
                      <div className="dd-field">
                        <label className="dd-label">Delay Reason</label>
                        <select className="dd-select" value={form.delay_type}
                          onChange={e => setF("delay_type", e.target.value)}>
                          {DELAY_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      {form.delay_type && (
                        <div className="dd-field">
                          <label className="dd-label">Delay Details</label>
                          <input className="dd-input" value={form.delay_description}
                            onChange={e => setF("delay_description", e.target.value)}
                            placeholder="Brief description of the delay…"/>
                        </div>
                      )}
                    </div>

                    <div className="dd-grid-2" style={{ marginTop: 8 }}>
                      <div className="dd-field">
                        <label className="dd-label">Linked RFI</label>
                        <input className="dd-input" value={form.linked_rfi}
                          onChange={e => setF("linked_rfi", e.target.value)}
                          placeholder="e.g. RFI-007"/>
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Linked Incident</label>
                        <input className="dd-input" value={form.linked_incident}
                          onChange={e => setF("linked_incident", e.target.value)}
                          placeholder="e.g. INC-002"/>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="dd-field">
                        <label className="dd-label">Instructions Received</label>
                        <textarea className="dd-textarea" style={{ minHeight: 70 }}
                          value={form.instructions}
                          onChange={e => setF("instructions", e.target.value)}
                          placeholder="Verbal or written instructions from PM, Architect, or other team members…"/>
                      </div>
                      <div className="dd-field" style={{ marginTop: 10 }}>
                        <label className="dd-label">Next Day Plan</label>
                        <textarea className="dd-textarea" style={{ minHeight: 70 }}
                          value={form.next_day}
                          onChange={e => setF("next_day", e.target.value)}
                          placeholder="Planned activities for tomorrow…"/>
                      </div>
                    </div>
                  </div>

                  {/* ── ATTACHMENTS & NOTES ─────────────────── */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Attachments &amp; Notes</div>
                    <div className="dd-field">
                      <label className="dd-label">Additional Notes</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }}
                        value={form.notes}
                        onChange={e => setF("notes", e.target.value)}
                        placeholder="Any other observations or safety items…"/>
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Attachments (photos, PDFs)</label>
                      <input type="file" multiple onChange={handleFiles}/>
                      {(form.attachments || []).length > 0 && (
                        <div className="dd-file-list">
                          {form.attachments.map((f, i) => (
                            <div key={i} className="dd-file-item">
                              <span>📎 {f?.name || "file"}</span>
                              <button type="button" className="dd-file-remove"
                                onClick={() => removeFile(i)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── SUBMIT ───────────────────────────────── */}
                  <div className="dd-submit-row">
                    <button type="submit" className="dd-btn dd-btn--primary" disabled={submitting}>
                      {submitting ? "Saving…" : "Submit Diary"}
                    </button>
                    <button type="button" className="dd-btn dd-btn--ghost"
                      onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>
                      Save Draft
                    </button>
                    {status && (
                      <span className={`dd-status${
                        status.includes("✓")       ? " dd-status--ok"
                        : status.includes("Offline")? " dd-status--err"
                        : " dd-status--saving"
                      }`}>
                        {status}
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ── ASIDE ─────────────────────────────────────── */}
          <aside className="dd-aside">
            <div className="dd-aside-card">
              <div className="dd-aside-title">Quick Summary</div>
              {[
                ["Date",            fmtDate(form.date)],
                ["Shift",           form.shift],
                ["Zone",            form.zone || "—"],
                ["Delay",           form.delay_type
                  ? DELAY_TYPES.find(d => d.value === form.delay_type)?.label
                  : "None"],
                ["Linked RFI",      form.linked_rfi      || "—"],
                ["Linked Incident", form.linked_incident || "—"],
              ].map(([l, v]) => (
                <div key={l} className="dd-aside-row"><span>{l}</span><strong>{v}</strong></div>
              ))}
            </div>

            <div className="dd-aside-card">
              <div className="dd-aside-title">Labour</div>
              <div style={{ padding: "10px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 8, lineHeight: 1.5 }}>
                  Labour is entered once in the Labour Report — it appears here automatically.
                </div>
                <button type="button" className="dd-btn dd-btn--ghost"
                  style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
                  onClick={() => navigate("/site-engineer/labour-report")}>
                  👷 Open Labour Report →
                </button>
              </div>
            </div>

            <div className="dd-aside-card">
              <div className="dd-aside-title">Tips</div>
              <ul className="dd-tips">
                <li>Submit the Daily Diary first, then complete the Labour Report.</li>
                <li>Always link RFI or Incident refs raised today.</li>
                <li>Select a delay reason if work was impacted.</li>
                <li>Attach photos for critical observations.</li>
                <li>Record all verbal instructions received.</li>
                <li>Drafts auto-save every 1.2 seconds.</li>
                <li>Submit by <strong>17:30</strong> daily.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* ══ HISTORY TAB ════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="dd-panel">
          <div className="dd-panel-head">
            <div className="dd-panel-title">Diary History</div>
            <span className="dd-pill dd-pill--navy">{diaries.length} entries</span>
          </div>

          {diaries.length === 0 ? (
            <div className="dd-empty">No diary entries submitted yet</div>
          ) : (
            diaries.map((d, i) => (
              <div key={d.id || i} className="dd-list-item"
                onClick={() => setViewIdx(viewIdx === i ? null : i)}>
                <div className="dd-item-main">
                  <div className="dd-item-tags">
                    <span style={{
                      fontFamily: "var(--c-mono)", fontSize: 12,
                      fontWeight: 700, color: "var(--c-navy-700)",
                    }}>
                      {fmtDate(d.date)}
                    </span>
                    <span className="dd-badge dd-badge--closed">Submitted</span>
                    {d.delay_type && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px",
                        background: "#FAEEDA", color: "#633806",
                        borderRadius: 20, border: "0.5px solid #EF9F27",
                      }}>
                        {DELAY_TYPES.find(dt => dt.value === d.delay_type)?.label || d.delay_type}
                      </span>
                    )}
                    {d.linked_rfi && (
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "#E6F1FB", color: "#185FA5", borderRadius: 20 }}>
                        {d.linked_rfi}
                      </span>
                    )}
                    {d.linked_incident && (
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "#FCEBEB", color: "#791F1F", borderRadius: 20 }}>
                        {d.linked_incident}
                      </span>
                    )}
                  </div>
                  <div className="dd-item-meta">
                    <span>Shift: {d.shift || "—"}</span>
                    <span>Zone: {d.zone || "—"}</span>
                    {d.delay_type && <span>Delay: {d.delay_type.replace(/_/g," ")}</span>}
                  </div>

                  {viewIdx === i && (
                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      {d.work_done && (
                        <div>
                          <div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>
                            Work Done
                          </div>
                          <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap", background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
                            {d.work_done}
                          </div>
                        </div>
                      )}
                      {d.issues && (
                        <div>
                          <div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Issues</div>
                          <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
                            {d.issues}
                          </div>
                        </div>
                      )}
                      {d.delay_type && (
                        <div>
                          <div style={{ fontSize: 10, color: "#BA7517", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Delay</div>
                          <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, background: "#FAEEDA", padding: "10px 12px", borderRadius: 8 }}>
                            {DELAY_TYPES.find(dt => dt.value === d.delay_type)?.label || d.delay_type}
                            {d.delay_description && ` — ${d.delay_description}`}
                          </div>
                        </div>
                      )}
                      {d.next_day && (
                        <div>
                          <div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Next Day Plan</div>
                          <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
                            {d.next_day}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--c-teal-400)", flexShrink: 0 }}>
                  {viewIdx === i ? "▲ Collapse" : "▼ Expand"}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}