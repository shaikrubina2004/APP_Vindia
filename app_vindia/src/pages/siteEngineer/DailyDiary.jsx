// src/pages/dailyDiary/DailyDiary.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/DailyDiary.css";
const DRAFT_KEY = "dailyDiary:draft:v3";
const QUEUE_KEY = "dailyDiary:queue:v3";
const WEATHER_OPTS = ["Sunny / Clear","Partly Cloudy","Overcast","Light Rain","Heavy Rain","Fog / Mist"];

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
      if (item.payload?._fd) { rem.push(item); continue; }
      const res = await api.post("/diary", item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch { rem.push(item); }
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

const BLANK = { date: "", shift: "morning", site: "", zone: "", weather_am: "Partly Cloudy", weather_pm: "Partly Cloudy", temp_c: "", work_done: "", plant: "", labour_carpenters: 0, labour_steel: 0, labour_masons: 0, labour_mep: 0, labour_general: 0, labour_supervisors: 0, labour_skilled: 0, labour_unskilled: 0, materials: [{ name: "", qty: "", notes: "" }], issues: "", instructions: "", next_day: "", notes: "", attachments: [] };

export default function DailyDiary() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]       = useState({ ...BLANK, date: nowISO(), ...draft, attachments: [] });
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("");
  const [submitting, setSub]  = useState(false);
  const [diaries, setDiaries] = useState([]);
  const [viewIdx, setViewIdx] = useState(null); // index of diary to view
  const [tab, setTab]         = useState("new"); // new | history
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

  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  };
  const setMat = (i, k, v) => setForm(f => { const m = [...f.materials]; m[i] = { ...m[i], [k]: v }; return { ...f, materials: m }; });
  const addMat  = () => setForm(f => ({ ...f, materials: [...f.materials, { name: "", qty: "", notes: "" }] }));
  const handleFiles = e => { setForm(f => ({ ...f, attachments: [...f.attachments, ...Array.from(e.target.files || [])] })); e.target.value = null; };
  const removeFile  = i => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }));

  const totalLabour = ["labour_carpenters","labour_steel","labour_masons","labour_mep","labour_general","labour_supervisors"].reduce((s, k) => s + (Number(form[k]) || 0), 0);

  const submit = async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate({ ...form, labour_skilled: form.labour_carpenters + form.labour_steel + form.labour_masons + form.labour_mep, labour_unskilled: form.labour_general });
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Saving…");
    const payload = { ...form, labour_total: totalLabour, labour_skilled: form.labour_carpenters + form.labour_steel + form.labour_masons + form.labour_mep, labour_unskilled: form.labour_general };
    delete payload.attachments;
    try {
      let res;
      if (form.attachments.length) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v ?? "")));
        form.attachments.forEach(f => fd.append("attachments", f, f.name));
        res = await api.post("/diary", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        res = await api.post("/diary", payload);
      }
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadHistory(); ls.del(DRAFT_KEY);
      setForm({ ...BLANK, date: nowISO() });
      setStatus("Diary submitted ✓"); setTab("history");
    } catch {
      enqueue(payload);
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  };

  const fmtDate = s => s ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";

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
                        <label className="dd-label">Site / Project</label>
                        <input className="dd-input" value={form.site} onChange={e => setF("site", e.target.value)} placeholder="Block C · Phase 2" />
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
                      {[["labour_carpenters","Carpenters"],["labour_steel","Steel Fixers"],["labour_masons","Masons"],["labour_mep","MEP Trades"],["labour_general","General Labour"],["labour_supervisors","Supervisors"]].map(([k, l]) => (
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
                      <textarea className="dd-textarea" style={{ minHeight: 130 }} value={form.work_done} onChange={e => setF("work_done", e.target.value)}
                        placeholder={"Describe all work completed today, zone by zone. Reference grid lines and drawing numbers.\n\ne.g. Level 3 / Grid A–D: Completed rebar fixing for 12 of 18 column bases.\nLevel 2 / Grid E: Formwork striking complete."} />
                      {errors.work_done && <div className="dd-error">{errors.work_done}</div>}
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Plant & Equipment</label>
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

                  {/* ISSUES & INSTRUCTIONS */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Issues & Instructions</div>
                    <div className="dd-field">
                      <label className="dd-label">Issues / Problems Encountered</label>
                      <textarea className="dd-textarea" value={form.issues} onChange={e => setF("issues", e.target.value)} placeholder="Any delays, material shortages, design conflicts, safety issues, NCRs raised today…" />
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Instructions Received</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.instructions} onChange={e => setF("instructions", e.target.value)} placeholder="Verbal or written instructions from PM, Architect, or other team members…" />
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Next Day Plan</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.next_day} onChange={e => setF("next_day", e.target.value)} placeholder="Planned activities for tomorrow…" />
                    </div>
                  </div>

                  {/* ATTACHMENTS */}
                  <div className="dd-form-section">
                    <div className="dd-section-title">Attachments & Notes</div>
                    <div className="dd-field">
                      <label className="dd-label">Additional Notes</label>
                      <textarea className="dd-textarea" style={{ minHeight: 70 }} value={form.notes} onChange={e => setF("notes", e.target.value)} placeholder="Any other observations or safety items…" />
                    </div>
                    <div className="dd-field" style={{ marginTop: 10 }}>
                      <label className="dd-label">Attachments (photos, PDFs)</label>
                      <input type="file" multiple onChange={handleFiles} className="dd-file-input" />
                      {form.attachments.length > 0 && (
                        <div className="dd-file-list">
                          {form.attachments.map((f, i) => (
                            <div key={`${f.name}-${i}`} className="dd-file-item">
                              <span>{f.name}</span>
                              <button type="button" className="dd-file-remove" onClick={() => removeFile(i)}>×</button>
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
              {[["Date", fmtDate(form.date)],["Shift", form.shift],["Site", form.site || "—"],["Zone", form.zone || "—"],["Total Labour", `${totalLabour} workers`]].map(([l, v]) => (
                <div key={l} className="dd-aside-row"><span>{l}</span><strong>{v}</strong></div>
              ))}
            </div>
            <div className="dd-aside-card">
              <div className="dd-aside-title">Labour Breakdown</div>
              {[["Carpenters", form.labour_carpenters],["Steel Fixers", form.labour_steel],["Masons", form.labour_masons],["MEP Trades", form.labour_mep],["General", form.labour_general],["Supervisors", form.labour_supervisors]].map(([l, v]) => (
                <div key={l} className="dd-aside-row"><span>{l}</span><strong>{Number(v) || 0}</strong></div>
              ))}
            </div>
            <div className="dd-aside-card">
              <div className="dd-aside-title">Tips</div>
              <ul className="dd-tips">
                <li>Attach photos for critical observations.</li>
                <li>Record all verbal instructions received.</li>
                <li>Include drawing reference numbers.</li>
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
                    </div>
                    <div className="dd-item-meta">
                      <span>Labour: {d.labour_total || d.labour_skilled || 0} workers</span>
                      <span>Shift: {d.shift || "—"}</span>
                      <span>Zone: {d.zone || "—"}</span>
                    </div>
                    {viewIdx === i && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        {d.work_done && <div><div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Work Done</div><div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap", background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: "var(--c-r)" }}>{d.work_done}</div></div>}
                        {d.issues && <div><div style={{ fontSize: 10, color: "var(--c-teal-400)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 5 }}>Issues</div><div style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.65, background: "var(--c-surface-2)", padding: "10px 12px", borderRadius: "var(--c-r)" }}>{d.issues}</div></div>}
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
