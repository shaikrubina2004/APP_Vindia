// src/pages/siteEngineer/DailyDiary.jsx
// MODIFIED: Added delay_type dropdown, linked_rfi, linked_incident fields
import React, { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/DailyDiary.css";

const DRAFT_KEY = "dailyDiary:draft:v3";
const QUEUE_KEY = "dailyDiary:queue:v3";
const WEATHER_OPTS = ["Sunny / Clear","Partly Cloudy","Overcast","Light Rain","Heavy Rain","Fog / Mist"];
const DELAY_TYPES  = [
  { value: "",                label: "No delay today" },
  { value: "material",        label: "Material shortage / late delivery" },
  { value: "weather",         label: "Adverse weather" },
  { value: "design",          label: "Design / drawing conflict" },
  { value: "labour",          label: "Labour shortage" },
  { value: "equipment",       label: "Equipment breakdown" },
  { value: "rfi_pending",     label: "Waiting for RFI response" },
  { value: "inspection_hold", label: "Inspection / approval hold" },
  { value: "ncr_hold",        label: "NCR work hold" },
  { value: "other",           label: "Other" },
];


const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
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
    } catch {
      rem.push(item);
    }
  }

  ls.save(QUEUE_KEY, rem);
}

function nowISO() { return new Date().toISOString().slice(0, 10); }

function validate(f) {
  const e = {};
  if (!f.date) e.date = "Date is required";
  if (!f.work_done || f.work_done.trim().length < 5) e.work_done = "Describe work done (min 5 chars)";
  if (isNaN(Number(f.labour_skilled)) || Number(f.labour_skilled) < 0) e.labour_skilled = "Enter a valid number";
  if (isNaN(Number(f.labour_unskilled)) || Number(f.labour_unskilled) < 0) e.labour_unskilled = "Enter a valid number";
  return e;
}

const BLANK = {
  date: "", shift: "morning", site: "", zone: "",
  weather_am: "Partly Cloudy", weather_pm: "Partly Cloudy", temp_c: "",
  work_done: "", plant: "",
  labour_carpenters: 0, labour_steel: 0, labour_masons: 0,
  labour_mep: 0, labour_general: 0, labour_supervisors: 0,
  labour_skilled: 0, labour_unskilled: 0,
  materials: [{ name: "", qty: "", notes: "" }],
  issues: "",
  // NEW fields
  delay_type: "",
  delay_description: "",
  linked_rfi: "",
  linked_incident: "",
  //
  instructions: "", next_day: "", notes: "",
};

export default function DailyDiary() {
const [projects, setProjects] = useState([]);
  const draft = ls.load(DRAFT_KEY);
const [form, setForm] = useState({
  ...BLANK,
  date: nowISO(),
  ...draft,
  attachments: draft?.attachments || []
});
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("");
  const [submitting, setSub]  = useState(false);
  useEffect(() => {
    console.log("ATTACHMENTS STATE 👉", form.attachments);
  }, [form.attachments]);

  const [diaries, setDiaries] = useState([]);
  const [milestones, setMilestones] = useState([]);
const [wbsList, setWbsList] = useState([]);
  const [viewIdx, setViewIdx] = useState(null);
  const [tab, setTab]         = useState("new");
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
  alive.current = true;
  loadHistory();
  flushQueue().catch(() => {});
  return () => { alive.current = false; };
}, []);

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.attachments; ls.save(DRAFT_KEY, c);
    }, 1200);
  }, [form]);

  async function loadHistory() {
    try {
      const res = await api.get("/diary");
      if (alive.current) setDiaries(Array.isArray(res?.data) ? res.data.slice().reverse() : []);
    } catch { /* empty list */ }
  }
  useEffect(() => {
  loadProjects();
}, []);

async function loadProjects() {
  try {
    const res = await api.get("/projects");

    console.log("PROJECTS 👉", res.data); // debug

    // ✅ ensure array
    if (Array.isArray(res.data)) {
      setProjects(res.data);
    } else {
      setProjects([]);
    }

  } catch (err) {
    console.error("Failed to load projects", err);
    setProjects([]);
  }
}
 async function loadMilestones(projectId) {
  try {
    const res = await api.get(`/diary/milestones?project_id=${projectId}`);

    console.log("MILESTONES 👉", res.data); // 🔥 ADD THIS

    setMilestones(res.data || []);

  } catch (err) {
    console.error("Failed to load milestones", err);
    setMilestones([]);
  }
}
async function loadWbsByMilestone(milestoneId) {
  try {
    const res = await api.get(
      `/diary/wbs?milestone_id=${milestoneId}&project_id=${form.project_id}`
    );

    console.log("WBS 👉", res.data); // 🔥 ADD THIS

    setWbsList(res.data || []);

  } catch (err) {
    console.error("Failed to load WBS", err);
    setWbsList([]);
  }
}
  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  };
  const setMat = (i, k, v) => setForm(f => { const m = [...f.materials]; m[i] = { ...m[i], [k]: v }; return { ...f, materials: m }; });
  const addMat  = () => setForm(f => ({ ...f, materials: [...f.materials, { name: "", qty: "", notes: "" }] }));

const handleFiles = (e) => {
  const files = Array.from(e.target.files || []);
  console.log("FILES 👉", files);

  setForm(f => ({
    ...f,
    attachments: [...(f.attachments || []), ...files]
  }));
};
  const removeFile  = i => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }));

  const totalLabour = ["labour_carpenters","labour_steel","labour_masons","labour_mep","labour_general","labour_supervisors"]
    .reduce((s, k) => s + (Number(form[k]) || 0), 0);

  const submit = async (ev) => {
  ev?.preventDefault();

  if (submitting) return;

  const errs = validate({
    ...form,
    labour_skilled:
      Number(form.labour_carpenters) +
      Number(form.labour_steel) +
      Number(form.labour_masons) +
      Number(form.labour_mep),
    labour_unskilled: Number(form.labour_general),
  });

  setErrors(errs);

  if (Object.keys(errs).length) {
    setStatus("Fix errors above");
    return;
  }

  setSub(true);
  setStatus("Saving…");

  try {
    const fd = new FormData();

    // ✅ IMPORTANT: append all fields properly
    fd.append("project_id", form.project_id || "");
    fd.append("date", form.date || "");
    fd.append("shift", form.shift || "");
    fd.append("site", form.site || "");
    fd.append("zone", form.zone || "");
    fd.append("weather_am", form.weather_am || "");
    fd.append("weather_pm", form.weather_pm || "");
    fd.append("temp_c", form.temp_c || "");
    fd.append("work_done", form.work_done || "");
    fd.append("plant", form.plant || "");

    // labour
    fd.append("labour_carpenters", form.labour_carpenters || 0);
    fd.append("labour_steel", form.labour_steel || 0);
    fd.append("labour_masons", form.labour_masons || 0);
    fd.append("labour_mep", form.labour_mep || 0);
    fd.append("labour_general", form.labour_general || 0);
    fd.append("labour_supervisors", form.labour_supervisors || 0);

  const skilled =
  Number(form.labour_carpenters) +
  Number(form.labour_steel) +
  Number(form.labour_masons) +
  Number(form.labour_mep);

const unskilled = Number(form.labour_general);

fd.append("labour_skilled", skilled);
fd.append("labour_unskilled", unskilled);

    // ✅ FIX materials
    fd.append("materials", JSON.stringify(form.materials || []));

    fd.append("issues", form.issues || "");
    fd.append("instructions", form.instructions || "");
    fd.append("next_day", form.next_day || "");
    fd.append("notes", form.notes || "");

    fd.append("subtask_id", form.subtask_id || "");
    fd.append("milestone_id", form.milestone_id || "");

    fd.append("delay_type", form.delay_type || "");
    fd.append("delay_description", form.delay_description || "");

    fd.append("linked_rfi", form.linked_rfi || "");
    fd.append("linked_incident", form.linked_incident || "");

    // ✅ FILES (VERY IMPORTANT)
   form.attachments.forEach(file => {
  fd.append("attachments", file);
});
    const res =await api.post("/diary", fd);

    console.log("SUCCESS", res.data);

    await loadHistory();
    ls.del(DRAFT_KEY);

    setForm({ ...BLANK, date: nowISO(), attachments: [] });
    setStatus("Diary submitted ✓");
    setTab("history");

  } catch (err) {
    console.error("ERROR 👉", err.response?.data || err.message);
    setStatus("Failed to submit ❌");
  } finally {
    if (alive.current) setSub(false);
  }
};

  const fmtDate = s => s
    ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="dd-page">
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
        {[["new","New Entry"],["history","History"]].map(([v, l]) => (
          <div key={v} className={`dd-tab${tab === v ? " dd-tab--active" : ""}`} onClick={() => setTab(v)}>{l}</div>
        ))}
      </div>

      {tab === "new" && (
        <div className="dd-layout">
          <div className="dd-main">
            <div className="dd-panel">
              <div className="dd-panel-head">
                <div className="dd-panel-title">Site Diary Entry — {fmtDate(form.date)}</div>
                <div className="dd-panel-actions">
                  <button type="button" className="dd-btn dd-btn--ghost" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>Save Draft</button>
                  <button type="button" className="dd-btn dd-btn--ghost" onClick={() => { ls.del(DRAFT_KEY); setForm({ ...BLANK, date: nowISO() }); }}>Clear</button>
                </div>
              </div>
              <div className="dd-panel-body">
                <form onSubmit={submit} noValidate>

                  {/* SITE DETAILS */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Site Details</div>
                    <div className="dd-grid-2">
                      <div className="dd-field">
                        <label className="dd-label">Date</label>
                        <input type="date" className="dd-input" value={form.date} onChange={e => setF("date", e.target.value)} />
                        {errors.date && <div className="dd-error">{errors.date}</div>}
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Shift</label>
                        <select className="dd-select" value={form.shift} onChange={e => setF("shift", e.target.value)}>
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="night">Night</option>
                        </select>
                      </div>
                      <div className="dd-field">
  <label className="dd-label">Project</label>
  <select
  className="dd-select"
  value={form.project_id || ""}
 onChange={(e) => {
  const projectId = e.target.value;

  // set project
  setF("project_id", projectId);

  // ✅ RESET dependent fields (THIS IS WHAT YOU ASKED)
  setF("milestone_id", "");
  setF("subtask_id", "");

  // reset lists
  setMilestones([]);
  setWbsList([]);

  // load new data
  if (projectId) {
    loadMilestones(projectId);
  }
}}
>
  <option value="">Select Project</option>

  {projects.length > 0 ? (
    projects.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))
  ) : (
    <option disabled>Loading...</option>
  )}
</select>
</div>
                      <div className="dd-field">
                      <label className="dd-label">Milestone</label>
                     <select
  className="dd-select"
  value={form.milestone_id || ""}
  onChange={(e) => {
    const val = e.target.value;

    setF("milestone_id", val);
    setF("subtask_id", ""); // 🔥 RESET subtask

    if (val) {
      loadWbsByMilestone(val);
    } else {
      setWbsList([]);
    }
  }}
>
  <option value="">Select milestone</option>

  {milestones.length > 0 ? (
    milestones.map(m => (
      <option key={m.id} value={m.id}>
        {m.name}
      </option>
    ))
  ) : (
    <option disabled>No milestones</option>
  )}
</select>
                    </div>

                    <div className="dd-field">
                      <label className="dd-label">Task (WBS)</label>
                    <select
  className="dd-select"
  value={form.subtask_id || ""}
  onChange={e => setF("subtask_id", e.target.value)}
  disabled={!form.milestone_id}
>
  <option value="">Select task</option>

  {wbsList.length > 0 ? (
    wbsList.map(w => (
      <option key={w.id} value={w.id}>
        {w.name}
      </option>
    ))
  ) : (
    <option disabled>No tasks</option>
  )}
</select>
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Zone / Area</label>
                        <input className="dd-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2–3" />
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Weather — Morning</label>
                        <select className="dd-select" value={form.weather_am} onChange={e => setF("weather_am", e.target.value)}>
                          {WEATHER_OPTS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Weather — Afternoon</label>
                        <select className="dd-select" value={form.weather_pm} onChange={e => setF("weather_pm", e.target.value)}>
                          {WEATHER_OPTS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Temperature (°C)</label>
                        <input type="number" className="dd-input" value={form.temp_c} onChange={e => setF("temp_c", e.target.value)} placeholder="e.g. 29" />
                      </div>
                    </div>
                  </div>

                  {/* LABOUR */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Labour Headcount</div>
                    <div className="dd-grid-3">
                      {[
                        ["labour_carpenters","Carpenters"],
                        ["labour_steel","Steel Fixers"],
                        ["labour_masons","Masons"],
                        ["labour_mep","MEP Trades"],
                        ["labour_general","General Labour"],
                        ["labour_supervisors","Supervisors"],
                      ].map(([k, l]) => (
                        <div key={k} className="dd-field">
                          <label className="dd-label">{l}</label>
                          <input type="number" min="0" className="dd-input" value={form[k]} onChange={e => setF(k, e.target.value)} placeholder="0" />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontFamily: "var(--c-mono)", fontSize: 12, color: "var(--c-text-3)", marginTop: 6 }}>
                      Total on site: <strong style={{ color: "var(--c-navy-700)" }}>{totalLabour} workers</strong>
                    </div>
                  </div>

                  {/* WORK DONE */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Work Executed</div>
                    <div className="dd-field">
                      <label className="dd-label">Activities — Zone by Zone</label>
                      <textarea
                        className="dd-textarea"
                        style={{ minHeight: 130 }}
                        value={form.work_done}
                        onChange={e => setF("work_done", e.target.value)}
                        placeholder={"Describe all work completed today, zone by zone.\n\ne.g. Level 3 / Grid A–D: Completed rebar fixing for 12 of 18 column bases.\nLevel 2 / Grid E: Formwork striking complete."}
                      />
                      {errors.work_done && <div className="dd-error">{errors.work_done}</div>}
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Plant &amp; Equipment</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.plant} onChange={e => setF("plant", e.target.value)} placeholder="List all plant/machinery on site today with hours worked." />
                    </div>
                  </div>

                  {/* MATERIALS */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Material Deliveries</div>
                    {form.materials.map((m, i) => (
                      <div key={i} className="dd-grid-3" style={{ marginBottom: 10 }}>
                        <div className="dd-field">
                          {i === 0 && <label className="dd-label">Material</label>}
                          <input className="dd-input" value={m.name} onChange={e => setMat(i, "name", e.target.value)} placeholder="e.g. Ready-mix C30" />
                        </div>
                        <div className="dd-field">
                          {i === 0 && <label className="dd-label">Quantity / Unit</label>}
                          <input className="dd-input" value={m.qty} onChange={e => setMat(i, "qty", e.target.value)} placeholder="e.g. 24 m³" />
                        </div>
                        <div className="dd-field">
                          {i === 0 && <label className="dd-label">Notes</label>}
                          <input className="dd-input" value={m.notes} onChange={e => setMat(i, "notes", e.target.value)} placeholder="Certs OK / on hold" />
                        </div>
                      </div>
                    ))}
                    <button type="button" className="dd-btn dd-btn--ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={addMat}>+ Add Delivery</button>
                  </div>

                  {/* ISSUES, DELAYS & LINKS — MODIFIED SECTION */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Issues, Delays &amp; Links</div>

                    <div className="dd-field">
                      <label className="dd-label">Issues / Problems Encountered</label>
                      <textarea className="dd-textarea" value={form.issues} onChange={e => setF("issues", e.target.value)} placeholder="Any delays, material shortages, design conflicts, safety issues, NCRs raised today…" />
                    </div>

                    {/* NEW: Delay Type */}
                    <div className="dd-grid-2" style={{ marginTop: 12 }}>
                      <div className="dd-field">
                        <label className="dd-label">Delay Reason</label>
                        <select className="dd-select" value={form.delay_type} onChange={e => setF("delay_type", e.target.value)}>
                          {DELAY_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      {form.delay_type && (
                        <div className="dd-field">
                          <label className="dd-label">Delay Details</label>
                          <input className="dd-input" value={form.delay_description} onChange={e => setF("delay_description", e.target.value)} placeholder="Brief description of the delay…" />
                        </div>
                      )}
                    </div>

                    {/* NEW: Linked RFI / Incident */}
                    <div className="dd-grid-2" style={{ marginTop: 8 }}>
                      <div className="dd-field">
                        <label className="dd-label">Linked RFI</label>
                        <input className="dd-input" value={form.linked_rfi} onChange={e => setF("linked_rfi", e.target.value)} placeholder="e.g. RFI-007 (if raised today)" />
                      </div>
                      <div className="dd-field">
                        <label className="dd-label">Linked Incident</label>
                        <input className="dd-input" value={form.linked_incident} onChange={e => setF("linked_incident", e.target.value)} placeholder="e.g. INC-002 (if raised today)" />
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="dd-field">
                        <label className="dd-label">Instructions Received</label>
                        <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.instructions} onChange={e => setF("instructions", e.target.value)} placeholder="Verbal or written instructions from PM, Architect, or other team members…" />
                      </div>
                      <div className="dd-field" style={{ marginTop: 10 }}>
                        <label className="dd-label">Next Day Plan</label>
                        <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.next_day} onChange={e => setF("next_day", e.target.value)} placeholder="Planned activities for tomorrow…" />
                      </div>
                    </div>
                  </div>

                  {/* ATTACHMENTS */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Attachments &amp; Notes</div>
                    <div className="dd-field">
                      <label className="dd-label">Additional Notes</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.notes} onChange={e => setF("notes", e.target.value)} placeholder="Any other observations or safety items…" />
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Attachments (photos, PDFs)</label>
                       <input type="file" multiple onChange={handleFiles} />
                      {form.attachments?.length > 0 && (
                        <div className="dd-file-list">
                        {form.attachments.map((f, i) => (
                          <div key={i} className="dd-file-item">
                            <span>{f?.name || "file"}</span>
                            <button
                              type="button"
                              className="dd-file-remove"
                              onClick={() => removeFile(i)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="dd-submit-row">
                    <button type="submit" className="dd-btn dd-btn--primary" disabled={submitting}>{submitting ? "Saving…" : "Submit Diary"}</button>
                    <button type="button" className="dd-btn dd-btn--ghost" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>Save Draft</button>
                    {status && <span className={`dd-status ${status.includes("✓") ? "dd-status--ok" : status.includes("Offline") ? "dd-status--err" : "dd-status--saving"}`}>{status}</span>}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ASIDE */}
          <aside className="dd-aside">
            <div className="dd-aside-card">
              <div className="dd-aside-title">Quick Summary</div>
              {[
                ["Date",          fmtDate(form.date)],
                ["Shift",         form.shift],
                ["Site",          form.site || "—"],
                ["Zone",          form.zone || "—"],
                ["Total Labour",  `${totalLabour} workers`],
                ["Delay",         form.delay_type ? DELAY_TYPES.find(d => d.value === form.delay_type)?.label : "None"],
                ["Linked RFI",    form.linked_rfi || "—"],
                ["Linked Incident", form.linked_incident || "—"],
              ].map(([l, v]) => (
                <div key={l} className="dd-aside-row"><span>{l}</span><strong>{v}</strong></div>
              ))}
            </div>
            <div className="dd-aside-card">
              <div className="dd-aside-title">Labour Breakdown</div>
              {[
                ["Carpenters", form.labour_carpenters],
                ["Steel Fixers", form.labour_steel],
                ["Masons", form.labour_masons],
                ["MEP Trades", form.labour_mep],
                ["General", form.labour_general],
                ["Supervisors", form.labour_supervisors],
              ].map(([l, v]) => (
                <div key={l} className="dd-aside-row"><span>{l}</span><strong>{Number(v) || 0}</strong></div>
              ))}
            </div>
            <div className="dd-aside-card">
              <div className="dd-aside-title">Tips</div>
              <ul className="dd-tips">
                <li>Always link RFI or Incident refs raised today.</li>
                <li>Select a delay reason if work was impacted.</li>
                <li>Attach photos for critical observations.</li>
                <li>Record all verbal instructions received.</li>
                <li>Drafts auto-save every second.</li>
                <li>Submit by 17:30 daily.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {tab === "history" && (
        <div className="dd-panel">
          <div className="dd-panel-head">
            <div className="dd-panel-title">Diary History</div>
            <span className="dd-pill dd-pill--navy">{diaries.length} entries</span>
          </div>
          {diaries.length === 0
            ? <div className="dd-empty">No diary entries submitted yet</div>
            : diaries.map((d, i) => (
                <div key={d.id || i} className="dd-list-item" onClick={() => setViewIdx(viewIdx === i ? null : i)}>
                  <div className="dd-item-main">
                    <div className="dd-item-tags">
                      <span style={{ fontFamily: "var(--c-mono)", fontSize: 12, fontWeight: 700, color: "var(--c-navy-700)" }}>{fmtDate(d.date)}</span>
                      <span className="dd-badge dd-badge--closed">Submitted</span>
                      {d.delay_type && (
                        <span style={{ fontSize: 11, padding: "2px 8px", background: "#FAEEDA", color: "#633806", borderRadius: 20, border: "0.5px solid #EF9F27" }}>
                          Delay: {DELAY_TYPES.find(dt => dt.value === d.delay_type)?.label || d.delay_type}
                        </span>
                      )}
                      {d.linked_rfi && <span style={{ fontSize: 11, padding: "2px 8px", background: "#E6F1FB", color: "#185FA5", borderRadius: 20 }}>{d.linked_rfi}</span>}
                      {d.linked_incident && <span style={{ fontSize: 11, padding: "2px 8px", background: "#FCEBEB", color: "#791F1F", borderRadius: 20 }}>{d.linked_incident}</span>}
                    </div>
                    <div className="dd-item-meta">
                      <span>Labour: {d.labour_total || d.labour_skilled || 0} workers</span>
                      <span>Shift: {d.shift || "—"}</span>
                      <span>Zone: {d.zone || "—"}</span>
                    </div>
                    {viewIdx === i && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        {d.work_done && (
                          <div>
                            <div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Work Done</div>
                            <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap", background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: "var(--c-r)" }}>{d.work_done}</div>
                          </div>
                        )}
                        {d.issues && (
                          <div>
                            <div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Issues</div>
                            <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: "var(--c-r)" }}>{d.issues}</div>
                          </div>
                        )}
                        {d.delay_type && (
                          <div>
                            <div style={{ fontSize: 10, color: "#BA7517", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Delay</div>
                            <div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, background: "#FAEEDA", padding: "10px 12px", borderRadius: "var(--c-r)" }}>
                              {DELAY_TYPES.find(dt => dt.value === d.delay_type)?.label || d.delay_type}
                              {d.delay_description && ` — ${d.delay_description}`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-teal-400)", flexShrink: 0 }}>{viewIdx === i ? "▲ Collapse" : "▼ Expand"}</div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}